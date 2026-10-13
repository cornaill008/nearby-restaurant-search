import { toRestaurant } from '../domain/restaurant'
import {
  PlaceSearchError,
  type Coordinates,
  type PlaceSearchService,
  type SearchPage,
} from '../ports'
import type { KakaoPlacesCallback, KakaoPlacesSdk, KakaoSearchOptions } from './kakaoTypes'

export const SEARCH_RADIUS_METERS = 1000
const RESTAURANT_CATEGORY = 'FD6'

export function createKakaoPlaceSearch(kakao: KakaoPlacesSdk): PlaceSearchService {
  const { Places, Status, SortBy } = kakao.maps.services
  const places = new Places()

  function nearbyOptions(center: Coordinates | null): KakaoSearchOptions {
    if (!center) return { category_group_code: RESTAURANT_CATEGORY }
    return {
      location: new kakao.maps.LatLng(center.lat, center.lng),
      radius: SEARCH_RADIUS_METERS,
      sort: SortBy.DISTANCE,
      category_group_code: RESTAURANT_CATEGORY,
    }
  }

  // 카카오의 nextPage()는 처음 등록한 콜백을 다시 호출하므로,
  // 콜백은 하나만 두고 지금 기다리는 요청(pending)만 바꿔 끼운다.
  function paginated(start: (callback: KakaoPlacesCallback) => void): Promise<SearchPage> {
    let pending: { resolve: (page: SearchPage) => void; reject: (error: Error) => void }

    const callback: KakaoPlacesCallback = (data, status, pagination) => {
      const { resolve, reject } = pending

      if (status === Status.ZERO_RESULT) {
        resolve({ restaurants: [], loadNext: null })
        return
      }
      if (status !== Status.OK) {
        reject(new PlaceSearchError(`kakao search status: ${status}`))
        return
      }

      resolve({
        restaurants: data.map(toRestaurant),
        loadNext: pagination.hasNextPage
          ? () =>
              new Promise<SearchPage>((nextResolve, nextReject) => {
                pending = { resolve: nextResolve, reject: nextReject }
                pagination.nextPage()
              })
          : null,
      })
    }

    return new Promise<SearchPage>((resolve, reject) => {
      pending = { resolve, reject }
      try {
        start(callback)
      } catch (error) {
        reject(new PlaceSearchError(error instanceof Error ? error.message : undefined))
      }
    })
  }

  return {
    searchNearby(center) {
      return paginated((callback) =>
        places.categorySearch(RESTAURANT_CATEGORY, callback, nearbyOptions(center)),
      )
    },
    searchByKeyword(query, center) {
      return paginated((callback) => places.keywordSearch(query, callback, nearbyOptions(center)))
    },
  }
}
