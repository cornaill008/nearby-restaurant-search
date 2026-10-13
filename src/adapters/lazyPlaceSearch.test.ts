import { describe, expect, it, vi } from 'vitest'
import { PlaceSearchError } from '../ports'
import { createLazyPlaceSearch } from './lazyPlaceSearch'
import type { KakaoPlacesSdk } from './kakaoTypes'

const center = { lat: 37.5, lng: 127 }

function sdkReturningZeroResults(): KakaoPlacesSdk {
  return {
    maps: {
      LatLng: class {
        getLat() {
          return 0
        }
        getLng() {
          return 0
        }
      },
      services: {
        Places: class {
          keywordSearch(_q: string, cb: (d: never[], s: string, p: { hasNextPage: boolean; nextPage(): void }) => void) {
            cb([], 'ZERO_RESULT', { hasNextPage: false, nextPage() {} })
          }
          categorySearch(_c: string, cb: (d: never[], s: string, p: { hasNextPage: boolean; nextPage(): void }) => void) {
            cb([], 'ZERO_RESULT', { hasNextPage: false, nextPage() {} })
          }
        },
        Status: { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT', ERROR: 'ERROR' },
        SortBy: { DISTANCE: 'distance', ACCURACY: 'accuracy' },
      },
    },
  }
}

describe('createLazyPlaceSearch', () => {
  it('SDK를 불러온 뒤 검색을 위임하고, SDK는 한 번만 불러온다', async () => {
    const loadSdk = vi.fn().mockResolvedValue(sdkReturningZeroResults())
    const search = createLazyPlaceSearch(loadSdk)

    await expect(search.searchNearby(center)).resolves.toEqual({ restaurants: [], loadNext: null })
    await expect(search.searchByKeyword('국밥', null)).resolves.toEqual({
      restaurants: [],
      loadNext: null,
    })
    expect(loadSdk).toHaveBeenCalledTimes(1)
  })

  it('SDK 로드에 실패하면 PlaceSearchError로 reject하고 다음에 다시 시도한다', async () => {
    const loadSdk = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(sdkReturningZeroResults())
    const search = createLazyPlaceSearch(loadSdk)

    await expect(search.searchNearby(center)).rejects.toBeInstanceOf(PlaceSearchError)
    await expect(search.searchNearby(center)).resolves.toEqual({ restaurants: [], loadNext: null })
    expect(loadSdk).toHaveBeenCalledTimes(2)
  })
})
