import type { Restaurant } from './domain/restaurant'

export interface Coordinates {
  lat: number
  lng: number
}

/** denied: 사용자가 위치 권한을 거부함 / failed: 시간 초과 등으로 위치를 얻지 못함 */
export type LocationErrorReason = 'denied' | 'failed'

export class LocationError extends Error {
  readonly reason: LocationErrorReason

  constructor(reason: LocationErrorReason, message?: string) {
    super(message ?? reason)
    this.name = 'LocationError'
    this.reason = reason
  }
}

/** 현재 위치 조회. 브라우저 GPS 대신 앱인토스 SDK 등으로 교체할 수 있다. */
export interface LocationProvider {
  /** 실패 시 LocationError로 reject */
  getCurrentPosition(): Promise<Coordinates>
}

export interface SearchPage {
  restaurants: Restaurant[]
  /** 다음 결과가 있으면 불러오는 함수, 없으면 null */
  loadNext: (() => Promise<SearchPage>) | null
}

export class PlaceSearchError extends Error {
  constructor(message?: string) {
    super(message ?? 'place search failed')
    this.name = 'PlaceSearchError'
  }
}

/** 식당 검색. 카카오 SDK 대신 중계 서버 등으로 교체할 수 있다. 실패 시 PlaceSearchError로 reject */
export interface PlaceSearchService {
  /** 현재 위치 반경 안의 식당을 거리순으로 검색 */
  searchNearby(center: Coordinates): Promise<SearchPage>
  /** 키워드 검색. center가 있으면 반경 안에서 거리순, 없으면 위치 제한 없이 검색 */
  searchByKeyword(query: string, center: Coordinates | null): Promise<SearchPage>
}

/** 지도 표시. 다른 지도 SDK로 교체할 수 있다. */
export interface MapView {
  setCurrentLocation(center: Coordinates | null): void
  /** 이전 마커를 모두 제거하고 새 마커를 표시한 뒤, 모든 마커가 보이도록 범위를 맞춘다 */
  setRestaurants(restaurants: Restaurant[]): void
  /** 해당 식당 마커를 강조하고 중심으로 이동. null이면 선택 해제 */
  select(id: string | null): void
  onSelect(handler: (id: string) => void): void
  destroy(): void
}
