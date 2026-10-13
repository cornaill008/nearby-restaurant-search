import { PlaceSearchError, type PlaceSearchService } from '../ports'
import { createKakaoPlaceSearch } from './kakaoPlaceSearch'
import type { KakaoPlacesSdk } from './kakaoTypes'

/**
 * SDK가 준비된 뒤에 카카오 검색 서비스를 만들어 위임한다.
 * SDK를 불러오지 못하면 PlaceSearchError로 reject하므로, 화면은 일반 검색 오류와 같게 처리할 수 있다.
 */
export function createLazyPlaceSearch(loadSdk: () => Promise<KakaoPlacesSdk>): PlaceSearchService {
  let service: PlaceSearchService | null = null

  async function ready(): Promise<PlaceSearchService> {
    if (service) return service
    try {
      service = createKakaoPlaceSearch(await loadSdk())
    } catch (error) {
      throw new PlaceSearchError(error instanceof Error ? error.message : undefined)
    }
    return service
  }

  return {
    async searchNearby(center) {
      return (await ready()).searchNearby(center)
    },
    async searchByKeyword(query, center) {
      return (await ready()).searchByKeyword(query, center)
    },
  }
}
