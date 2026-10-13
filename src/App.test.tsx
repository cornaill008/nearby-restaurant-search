import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App, { type AppServices } from './App'
import type { Restaurant } from './domain/restaurant'
import { LocationError, PlaceSearchError, type MapView } from './ports'

function restaurant(id: string): Restaurant {
  return {
    id,
    name: `식당${id}`,
    category: '국밥',
    address: '',
    phone: null,
    lat: 37.5,
    lng: 127,
    distance: 100,
    placeUrl: '',
  }
}

function setup(overrides: Partial<AppServices> | ((map: MapView) => Partial<AppServices>) = {}) {
  let pickFromMap: (id: string) => void = () => {}
  const map: MapView = {
    setCurrentLocation: vi.fn(),
    setRestaurants: vi.fn(),
    select: vi.fn(),
    onSelect: vi.fn((handler) => {
      pickFromMap = handler
    }),
    destroy: vi.fn(),
  }
  const services: AppServices = {
    location: { getCurrentPosition: vi.fn().mockResolvedValue({ lat: 37.5, lng: 127 }) },
    search: {
      searchNearby: vi
        .fn()
        .mockResolvedValue({ restaurants: [restaurant('1'), restaurant('2')], loadNext: null }),
      searchByKeyword: vi.fn(),
    },
    loadMapView: vi.fn().mockResolvedValue(map),
    ...(typeof overrides === 'function' ? overrides(map) : overrides),
  }
  render(<App services={services} />)
  return { map, services, pickFromMap: (id: string) => act(() => pickFromMap(id)) }
}

describe('App', () => {
  it('목록과 지도에 같은 식당을 표시한다', async () => {
    const { map } = setup()

    expect(await screen.findByText('식당1')).toBeInTheDocument()
    await waitFor(() => {
      const calls = vi.mocked(map.setRestaurants).mock.calls
      expect(calls[calls.length - 1][0].map((r) => r.id)).toEqual(['1', '2'])
    })
    expect(map.setCurrentLocation).toHaveBeenLastCalledWith({ lat: 37.5, lng: 127 })
  })

  it('목록 항목을 선택하면 지도의 같은 식당이 선택된다', async () => {
    const { map } = setup()

    await userEvent.click(await screen.findByRole('button', { name: /식당2/ }))

    expect(map.select).toHaveBeenLastCalledWith('2')
    expect(screen.getByRole('button', { name: /식당2/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: /식당1/ })).toHaveAttribute('aria-current', 'false')
  })

  it('지도에서 마커를 선택하면 목록에서 같은 식당이 강조된다', async () => {
    const { pickFromMap } = setup()
    await screen.findByText('식당1')
    await waitFor(() => expect(screen.getByRole('button', { name: /식당1/ })).toBeInTheDocument())

    pickFromMap('1')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /식당1/ })).toHaveAttribute('aria-current', 'true'),
    )
  })

  it('지도를 불러오지 못해도 안내만 표시하고 목록은 계속 동작한다', async () => {
    setup({ loadMapView: vi.fn().mockRejectedValue(new Error('map failed')) })

    expect(await screen.findByText('식당1')).toBeInTheDocument()
    expect(await screen.findByText('지도를 불러오지 못했어요.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /식당1/ }))
    expect(screen.getByRole('button', { name: /식당1/ })).toHaveAttribute('aria-current', 'true')
  })

  it('지도 다시 시도를 누르면 지도를 다시 불러오고 성공하면 마커를 표시한다', async () => {
    const loadMapView = vi.fn()
    const { map } = setup((map) => {
      loadMapView.mockRejectedValueOnce(new Error('map failed')).mockResolvedValueOnce(map)
      return { loadMapView }
    })

    await userEvent.click(await screen.findByRole('button', { name: '지도 다시 시도' }))

    await waitFor(() =>
      expect(screen.queryByText('지도를 불러오지 못했어요.')).not.toBeInTheDocument(),
    )
    expect(loadMapView).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(map.setRestaurants).toHaveBeenCalled())
  })

  it('SDK를 불러오지 못하면 지도 안내와 목록 오류 안내를 함께 보여준다', async () => {
    setup({
      search: {
        searchNearby: vi.fn().mockRejectedValue(new PlaceSearchError()),
        searchByKeyword: vi.fn(),
      },
      loadMapView: vi.fn().mockRejectedValue(new Error('sdk failed')),
    })

    expect(await screen.findByText('지도를 불러오지 못했어요.')).toBeInTheDocument()
    expect(await screen.findByText('식당 정보를 불러오지 못했어요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '지도 다시 시도' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
  it('키워드로 검색하면 목록과 지도가 검색 결과로 바뀌고, 초기화하면 주변 목록으로 돌아간다', async () => {
    const searchByKeyword = vi
      .fn()
      .mockResolvedValue({ restaurants: [restaurant('s1')], loadNext: null })
    const { map, services } = setup({
      search: {
        searchNearby: vi
          .fn()
          .mockResolvedValue({ restaurants: [restaurant('1'), restaurant('2')], loadNext: null }),
        searchByKeyword,
      },
    })
    await screen.findByText('식당1')

    await userEvent.type(screen.getByLabelText('식당 검색'), '국밥{Enter}')

    expect(await screen.findByText('식당s1')).toBeInTheDocument()
    expect(screen.queryByText('식당1')).not.toBeInTheDocument()
    expect(searchByKeyword).toHaveBeenCalledWith('국밥', { lat: 37.5, lng: 127 })
    await waitFor(() => {
      const calls = vi.mocked(map.setRestaurants).mock.calls
      expect(calls[calls.length - 1][0].map((r) => r.id)).toEqual(['s1'])
    })

    await userEvent.click(screen.getByRole('button', { name: '초기화' }))

    expect(await screen.findByText('식당1')).toBeInTheDocument()
    expect(screen.queryByText('식당s1')).not.toBeInTheDocument()
    expect(services.search.searchNearby).toHaveBeenCalledTimes(2)
  })

  it('식당을 선택한 뒤 검색하고 초기화하면 선택이 해제되어 지도가 그 식당으로 이동하지 않는다', async () => {
    const { map } = setup({
      search: {
        searchNearby: vi
          .fn()
          .mockResolvedValue({ restaurants: [restaurant('1'), restaurant('2')], loadNext: null }),
        searchByKeyword: vi
          .fn()
          .mockResolvedValue({ restaurants: [restaurant('s1')], loadNext: null }),
      },
    })
    await userEvent.click(await screen.findByRole('button', { name: /식당2/ }))
    expect(map.select).toHaveBeenLastCalledWith('2')

    await userEvent.type(screen.getByLabelText('식당 검색'), '국밥{Enter}')
    await screen.findByText('식당s1')
    await userEvent.click(screen.getByRole('button', { name: '초기화' }))
    await screen.findByText('식당2')

    // 주변 목록에 식당2가 다시 있어도 선택은 비어 있어야 한다.
    expect(map.select).toHaveBeenLastCalledWith(null)
    expect(screen.queryByRole('region', { name: /상세 정보/ })).not.toBeInTheDocument()
  })

  it('검색 결과가 없으면 안내한다', async () => {
    setup({
      search: {
        searchNearby: vi.fn().mockResolvedValue({ restaurants: [restaurant('1')], loadNext: null }),
        searchByKeyword: vi.fn().mockResolvedValue({ restaurants: [], loadNext: null }),
      },
    })
    await screen.findByText('식당1')

    await userEvent.type(screen.getByLabelText('식당 검색'), '없는음식{Enter}')

    expect(await screen.findByText('검색 결과가 없어요')).toBeInTheDocument()
  })

  it('위치 권한이 거부돼도 키워드 검색 결과는 보여준다', async () => {
    const searchByKeyword = vi
      .fn()
      .mockResolvedValue({ restaurants: [restaurant('s1')], loadNext: null })
    setup({
      location: {
        getCurrentPosition: vi.fn().mockRejectedValue(new LocationError('denied')),
      },
      search: { searchNearby: vi.fn(), searchByKeyword },
    })
    expect(await screen.findByText(/위치 권한이 거부/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('식당 검색'), '국밥{Enter}')

    expect(await screen.findByText('식당s1')).toBeInTheDocument()
    expect(searchByKeyword).toHaveBeenCalledWith('국밥', null)
  })

  it('검색으로 목록이 바뀌면 사라진 식당의 선택은 해제된다', async () => {
    setup({
      search: {
        searchNearby: vi
          .fn()
          .mockResolvedValue({ restaurants: [restaurant('1'), restaurant('2')], loadNext: null }),
        searchByKeyword: vi
          .fn()
          .mockResolvedValue({ restaurants: [restaurant('s1')], loadNext: null }),
      },
    })
    await userEvent.click(await screen.findByRole('button', { name: /식당1/ }))

    await userEvent.type(screen.getByLabelText('식당 검색'), '국밥{Enter}')

    expect(await screen.findByRole('button', { name: /식당s1/ })).toHaveAttribute(
      'aria-current',
      'false',
    )
  })
  it('식당을 선택하면 상세 정보가 열리고, 닫으면 선택이 해제되며 목록은 유지된다', async () => {
    const { map } = setup()

    await userEvent.click(await screen.findByRole('button', { name: /식당2/ }))

    const detail = screen.getByRole('region', { name: '식당2 상세 정보' })
    expect(detail).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '닫기' }))

    expect(screen.queryByRole('region', { name: '식당2 상세 정보' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /식당2/ })).toHaveAttribute('aria-current', 'false')
    expect(screen.getByText('식당1')).toBeInTheDocument()
    await waitFor(() => expect(map.select).toHaveBeenLastCalledWith(null))
  })

  it('지도에서 마커를 선택해도 상세 정보가 열린다', async () => {
    const { pickFromMap } = setup()
    await screen.findByText('식당1')

    pickFromMap('1')

    expect(await screen.findByRole('region', { name: '식당1 상세 정보' })).toBeInTheDocument()
  })
})
