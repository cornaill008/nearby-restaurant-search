import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Restaurant } from '../domain/restaurant'
import {
  LocationError,
  PlaceSearchError,
  type Coordinates,
  type LocationProvider,
  type PlaceSearchService,
  type SearchPage,
} from '../ports'
import { useRestaurants } from './useRestaurants'

const here: Coordinates = { lat: 37.5666, lng: 126.9784 }

function restaurant(id: string): Restaurant {
  return {
    id,
    name: `식당${id}`,
    category: '한식',
    address: '주소',
    phone: null,
    lat: 37.56,
    lng: 126.97,
    distance: 100,
    placeUrl: '',
  }
}

function locationOk(): LocationProvider {
  return { getCurrentPosition: vi.fn().mockResolvedValue(here) }
}

function locationFails(reason: 'denied' | 'failed'): LocationProvider {
  return { getCurrentPosition: vi.fn().mockRejectedValue(new LocationError(reason)) }
}

function searchReturning(page: SearchPage): PlaceSearchService {
  return {
    searchNearby: vi.fn().mockResolvedValue(page),
    searchByKeyword: vi.fn(),
  }
}

// 훅의 의존성(location, search)은 렌더마다 바뀌면 안 되므로 한 번만 만들어 넘긴다.
function setup(location: LocationProvider, search: PlaceSearchService) {
  return renderHook(() => useRestaurants(location, search))
}

describe('useRestaurants', () => {
  it('위치를 허용하면 주변 식당을 불러온다', async () => {
    const search = searchReturning({ restaurants: [restaurant('1')], loadNext: null })
    const { result } = setup(locationOk(), search)

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.location).toEqual(here)
    expect(result.current.restaurants.map((r) => r.id)).toEqual(['1'])
    expect(result.current.hasMore).toBe(false)
    expect(search.searchNearby).toHaveBeenCalledWith(here)
  })

  it('위치 권한을 거부하면 denied 상태이고 검색하지 않는다', async () => {
    const search = searchReturning({ restaurants: [], loadNext: null })
    const { result } = setup(locationFails('denied'), search)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.locationIssue).toBe('denied')
    expect(result.current.location).toBeNull()
    expect(search.searchNearby).not.toHaveBeenCalled()
  })

  it('위치 조회에 실패하면 failed 상태이다', async () => {
    const search = searchReturning({ restaurants: [], loadNext: null })
    const { result } = setup(locationFails('failed'), search)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.locationIssue).toBe('failed')
  })

  it('주변에 식당이 없으면 빈 목록이다', async () => {
    const search = searchReturning({ restaurants: [], loadNext: null })
    const { result } = setup(locationOk(), search)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.restaurants).toEqual([])
    expect(result.current.searchFailed).toBe(false)
    expect(result.current.locationIssue).toBeNull()
  })

  it('검색 서비스 오류면 searchFailed이고 다시 시도하면 복구된다', async () => {
    const searchNearby = vi
      .fn()
      .mockRejectedValueOnce(new PlaceSearchError())
      .mockResolvedValueOnce({ restaurants: [restaurant('1')], loadNext: null })
    const search: PlaceSearchService = { searchNearby, searchByKeyword: vi.fn() }
    const { result } = setup(locationOk(), search)

    await waitFor(() => expect(result.current.searchFailed).toBe(true))
    expect(result.current.loading).toBe(false)

    await act(async () => {
      await result.current.retry()
    })

    expect(result.current.searchFailed).toBe(false)
    expect(result.current.restaurants.map((r) => r.id)).toEqual(['1'])
  })

  it('더 보기를 누르면 목록 뒤에 이어 붙인다', async () => {
    const second: SearchPage = { restaurants: [restaurant('2')], loadNext: null }
    const first: SearchPage = {
      restaurants: [restaurant('1')],
      loadNext: vi.fn().mockResolvedValue(second),
    }
    const { result } = setup(locationOk(), searchReturning(first))

    await waitFor(() => expect(result.current.hasMore).toBe(true))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(result.current.restaurants.map((r) => r.id)).toEqual(['1', '2'])
    expect(result.current.hasMore).toBe(false)
    expect(result.current.loadingMore).toBe(false)
  })

  it('더 보기에 실패해도 기존 목록은 유지한다', async () => {
    const first: SearchPage = {
      restaurants: [restaurant('1')],
      loadNext: vi.fn().mockRejectedValue(new PlaceSearchError()),
    }
    const { result } = setup(locationOk(), searchReturning(first))

    await waitFor(() => expect(result.current.hasMore).toBe(true))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(result.current.restaurants.map((r) => r.id)).toEqual(['1'])
    expect(result.current.moreFailed).toBe(true)
    expect(result.current.searchFailed).toBe(false)
  })
})

describe('useRestaurants 검색', () => {
  function placesWith(overrides: Partial<PlaceSearchService> = {}): PlaceSearchService {
    return {
      searchNearby: vi
        .fn()
        .mockResolvedValue({ restaurants: [restaurant('n1'), restaurant('n2')], loadNext: null }),
      searchByKeyword: vi
        .fn()
        .mockResolvedValue({ restaurants: [restaurant('s1')], loadNext: null }),
      ...overrides,
    }
  }

  it('위치가 있으면 그 위치를 함께 넘겨 키워드로 검색한다', async () => {
    const places = placesWith()
    const { result } = setup(locationOk(), places)
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.search('국밥')
    })

    expect(places.searchByKeyword).toHaveBeenCalledWith('국밥', here)
    expect(result.current.query).toBe('국밥')
    expect(result.current.restaurants.map((r) => r.id)).toEqual(['s1'])
  })

  it('검색어 앞뒤 공백은 지우고 검색한다', async () => {
    const places = placesWith()
    const { result } = setup(locationOk(), places)
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.search('  국밥  ')
    })

    expect(places.searchByKeyword).toHaveBeenCalledWith('국밥', here)
  })

  it('빈 검색어나 공백만 있는 검색어는 요청하지 않는다', async () => {
    const places = placesWith()
    const { result } = setup(locationOk(), places)
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.search('')
      await result.current.search('   ')
    })

    expect(places.searchByKeyword).not.toHaveBeenCalled()
    expect(result.current.query).toBeNull()
    expect(result.current.restaurants.map((r) => r.id)).toEqual(['n1', 'n2'])
  })

  it('위치를 얻지 못했어도 위치 없이 검색할 수 있다', async () => {
    const places = placesWith()
    const { result } = setup(locationFails('denied'), places)
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.search('국밥')
    })

    expect(places.searchByKeyword).toHaveBeenCalledWith('국밥', null)
    expect(result.current.restaurants.map((r) => r.id)).toEqual(['s1'])
  })

  it('검색 결과가 없으면 빈 목록이다', async () => {
    const places = placesWith({
      searchByKeyword: vi.fn().mockResolvedValue({ restaurants: [], loadNext: null }),
    })
    const { result } = setup(locationOk(), places)
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.search('없는음식')
    })

    expect(result.current.restaurants).toEqual([])
    expect(result.current.searchFailed).toBe(false)
    expect(result.current.query).toBe('없는음식')
  })

  it('검색 중 오류가 나면 같은 검색어로 다시 시도한다', async () => {
    const searchByKeyword = vi
      .fn()
      .mockRejectedValueOnce(new PlaceSearchError())
      .mockResolvedValueOnce({ restaurants: [restaurant('s1')], loadNext: null })
    const places = placesWith({ searchByKeyword })
    const { result } = setup(locationOk(), places)
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.search('국밥')
    })
    expect(result.current.searchFailed).toBe(true)

    await act(async () => {
      await result.current.retry()
    })

    expect(searchByKeyword).toHaveBeenLastCalledWith('국밥', here)
    expect(result.current.searchFailed).toBe(false)
    expect(result.current.restaurants.map((r) => r.id)).toEqual(['s1'])
  })

  it('검색을 초기화하면 현재 위치 기준 주변 식당 목록으로 돌아간다', async () => {
    const places = placesWith()
    const { result } = setup(locationOk(), places)
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.search('국밥')
    })

    await act(async () => {
      await result.current.clearSearch()
    })

    expect(result.current.query).toBeNull()
    expect(result.current.restaurants.map((r) => r.id)).toEqual(['n1', 'n2'])
    expect(places.searchNearby).toHaveBeenLastCalledWith(here)
  })

  it('위치가 없는 상태에서 검색을 초기화하면 위치 안내 상태로 돌아간다', async () => {
    const places = placesWith()
    const { result } = setup(locationFails('denied'), places)
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.search('국밥')
    })

    await act(async () => {
      await result.current.clearSearch()
    })

    expect(result.current.query).toBeNull()
    expect(result.current.locationIssue).toBe('denied')
    expect(result.current.restaurants).toEqual([])
    expect(places.searchNearby).not.toHaveBeenCalled()
  })
})
