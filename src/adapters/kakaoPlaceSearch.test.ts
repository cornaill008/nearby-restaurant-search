import { describe, expect, it } from 'vitest'
import type { KakaoPlace } from '../domain/restaurant'
import { PlaceSearchError } from '../ports'
import { createKakaoPlaceSearch } from './kakaoPlaceSearch'
import type {
  KakaoPagination,
  KakaoPlacesCallback,
  KakaoPlacesSdk,
  KakaoSearchOptions,
} from './kakaoTypes'

const STATUS = { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT', ERROR: 'ERROR' }

function place(id: string, distance = '100'): KakaoPlace {
  return {
    id,
    place_name: `식당${id}`,
    category_name: '음식점 > 한식',
    phone: '',
    address_name: '주소',
    road_address_name: '',
    x: '126.97',
    y: '37.56',
    place_url: `http://place.map.kakao.com/${id}`,
    distance,
  }
}

interface Call {
  method: 'keywordSearch' | 'categorySearch'
  query: string
  options: KakaoSearchOptions | undefined
}

/** 호출을 기록하고, 주어진 페이지들을 순서대로 응답하는 가짜 SDK */
function fakeSdk(pages: Array<{ status: string; data: KakaoPlace[] }>) {
  const calls: Call[] = []

  class FakePlaces {
    private respond(callback: KakaoPlacesCallback) {
      let index = 0
      const send = () => {
        const page = pages[index]
        const pagination: KakaoPagination = {
          hasNextPage: index < pages.length - 1,
          nextPage: () => {
            index += 1
            send()
          },
        }
        callback(page.data, page.status, pagination)
      }
      send()
    }
    keywordSearch(query: string, callback: KakaoPlacesCallback, options?: KakaoSearchOptions) {
      calls.push({ method: 'keywordSearch', query, options })
      this.respond(callback)
    }
    categorySearch(code: string, callback: KakaoPlacesCallback, options?: KakaoSearchOptions) {
      calls.push({ method: 'categorySearch', query: code, options })
      this.respond(callback)
    }
  }

  const sdk: KakaoPlacesSdk = {
    maps: {
      LatLng: class {
        lat: number
        lng: number
        constructor(lat: number, lng: number) {
          this.lat = lat
          this.lng = lng
        }
        getLat() {
          return this.lat
        }
        getLng() {
          return this.lng
        }
      },
      services: {
        Places: FakePlaces,
        Status: STATUS,
        SortBy: { DISTANCE: 'distance', ACCURACY: 'accuracy' },
      },
    },
  }
  return { sdk, calls }
}

const center = { lat: 37.5666, lng: 126.9784 }

describe('searchNearby', () => {
  it('반경 1km, 거리순, 음식점 카테고리로 검색한다', async () => {
    const { sdk, calls } = fakeSdk([{ status: STATUS.OK, data: [place('1')] }])

    const page = await createKakaoPlaceSearch(sdk).searchNearby(center)

    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('categorySearch')
    expect(calls[0].query).toBe('FD6')
    expect(calls[0].options).toMatchObject({
      radius: 1000,
      sort: 'distance',
      category_group_code: 'FD6',
    })
    expect(calls[0].options?.location?.getLat()).toBe(center.lat)
    expect(calls[0].options?.location?.getLng()).toBe(center.lng)
    expect(page.restaurants.map((r) => r.id)).toEqual(['1'])
    expect(page.restaurants[0].distance).toBe(100)
  })

  it('결과가 없으면 빈 목록을 반환한다', async () => {
    const { sdk } = fakeSdk([{ status: STATUS.ZERO_RESULT, data: [] }])

    const page = await createKakaoPlaceSearch(sdk).searchNearby(center)

    expect(page).toEqual({ restaurants: [], loadNext: null })
  })

  it('서비스 오류면 PlaceSearchError로 reject한다', async () => {
    const { sdk } = fakeSdk([{ status: STATUS.ERROR, data: [] }])

    await expect(createKakaoPlaceSearch(sdk).searchNearby(center)).rejects.toBeInstanceOf(
      PlaceSearchError,
    )
  })

  it('다음 페이지가 있으면 loadNext로 이어서 불러온다', async () => {
    const { sdk } = fakeSdk([
      { status: STATUS.OK, data: [place('1')] },
      { status: STATUS.OK, data: [place('2')] },
    ])

    const first = await createKakaoPlaceSearch(sdk).searchNearby(center)
    expect(first.loadNext).not.toBeNull()

    const second = await first.loadNext!()
    expect(second.restaurants.map((r) => r.id)).toEqual(['2'])
    expect(second.loadNext).toBeNull()
  })
})

describe('searchByKeyword', () => {
  it('위치가 있으면 반경 안에서 거리순으로 검색한다', async () => {
    const { sdk, calls } = fakeSdk([{ status: STATUS.OK, data: [place('1')] }])

    await createKakaoPlaceSearch(sdk).searchByKeyword('국밥', center)

    expect(calls[0].method).toBe('keywordSearch')
    expect(calls[0].query).toBe('국밥')
    expect(calls[0].options).toMatchObject({
      radius: 1000,
      sort: 'distance',
      category_group_code: 'FD6',
    })
    expect(calls[0].options?.location).toBeDefined()
  })

  it('위치가 없으면 위치 제한 없이 음식점만 검색하고 거리는 null이다', async () => {
    const { sdk, calls } = fakeSdk([{ status: STATUS.OK, data: [place('1', '')] }])

    const page = await createKakaoPlaceSearch(sdk).searchByKeyword('국밥', null)

    expect(calls[0].options).toEqual({ category_group_code: 'FD6' })
    expect(page.restaurants[0].distance).toBeNull()
  })

  it('결과가 없으면 빈 목록을 반환한다', async () => {
    const { sdk } = fakeSdk([{ status: STATUS.ZERO_RESULT, data: [] }])

    const page = await createKakaoPlaceSearch(sdk).searchByKeyword('없는음식', center)

    expect(page.restaurants).toEqual([])
  })
})
