import type { KakaoPlace } from '../domain/restaurant'

/** 이 앱이 사용하는 카카오맵 JS SDK 부분만 선언한 최소 타입 */
export interface KakaoLatLng {
  getLat(): number
  getLng(): number
}

export interface KakaoPagination {
  hasNextPage: boolean
  nextPage(): void
}

export type KakaoPlacesCallback = (
  data: KakaoPlace[],
  status: string,
  pagination: KakaoPagination,
) => void

export interface KakaoSearchOptions {
  location?: KakaoLatLng
  radius?: number
  sort?: string
  category_group_code?: string
}

export interface KakaoPlaces {
  keywordSearch(keyword: string, callback: KakaoPlacesCallback, options?: KakaoSearchOptions): void
  categorySearch(code: string, callback: KakaoPlacesCallback, options?: KakaoSearchOptions): void
}

export interface KakaoMap {
  setBounds(bounds: KakaoLatLngBounds): void
  setCenter(center: KakaoLatLng): void
  panTo(center: KakaoLatLng): void
  relayout(): void
}

export interface KakaoLatLngBounds {
  extend(point: KakaoLatLng): void
}

export interface KakaoCustomOverlay {
  setMap(map: KakaoMap | null): void
}

/** 장소 검색에 필요한 SDK 부분 */
export interface KakaoPlacesSdk {
  maps: {
    LatLng: new (lat: number, lng: number) => KakaoLatLng
    services: {
      Places: new () => KakaoPlaces
      Status: { OK: string; ZERO_RESULT: string; ERROR: string }
      SortBy: { DISTANCE: string; ACCURACY: string }
    }
  }
}

/** 지도 표시에 필요한 SDK 부분 */
export interface KakaoMapSdk {
  maps: {
    LatLng: new (lat: number, lng: number) => KakaoLatLng
    LatLngBounds: new () => KakaoLatLngBounds
    Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap
    CustomOverlay: new (options: {
      position: KakaoLatLng
      content: HTMLElement
      yAnchor?: number
      zIndex?: number
    }) => KakaoCustomOverlay
  }
}

export type KakaoSdk = KakaoPlacesSdk & KakaoMapSdk
