export interface Restaurant {
  id: string
  name: string
  /** 카테고리의 마지막 단계 (예: "음식점 > 한식 > 국밥" -> "국밥") */
  category: string
  /** 도로명 주소, 없으면 지번 주소 */
  address: string
  phone: string | null
  lat: number
  lng: number
  /** 현재 위치로부터의 거리(m). 위치 없이 검색했으면 null */
  distance: number | null
  placeUrl: string
}

/** 카카오 장소 검색 응답의 한 항목 (사용하는 필드만) */
export interface KakaoPlace {
  id: string
  place_name: string
  category_name: string
  phone: string
  address_name: string
  road_address_name: string
  /** 경도 */
  x: string
  /** 위도 */
  y: string
  place_url: string
  /** 중심 좌표로부터의 거리(m). 중심 좌표 없이 검색하면 빈 문자열 */
  distance: string
}

export function toRestaurant(place: KakaoPlace): Restaurant {
  const categories = place.category_name.split('>').map((part) => part.trim())
  const distance = place.distance === '' ? null : Number(place.distance)

  return {
    id: place.id,
    name: place.place_name,
    category: categories[categories.length - 1] ?? '',
    address: place.road_address_name || place.address_name,
    phone: place.phone || null,
    lat: Number(place.y),
    lng: Number(place.x),
    distance: distance === null || Number.isNaN(distance) ? null : distance,
    placeUrl: place.place_url,
  }
}

/** 850 -> "850m", 1200 -> "1.2km" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}
