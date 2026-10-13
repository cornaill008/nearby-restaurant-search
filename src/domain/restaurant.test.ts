import { describe, expect, it } from 'vitest'
import { formatDistance, toRestaurant, type KakaoPlace } from './restaurant'

const place: KakaoPlace = {
  id: '123',
  place_name: '할매국밥',
  category_name: '음식점 > 한식 > 국밥',
  phone: '02-123-4567',
  address_name: '서울 중구 태평로1가 31',
  road_address_name: '서울 중구 세종대로 110',
  x: '126.9784',
  y: '37.5666',
  place_url: 'http://place.map.kakao.com/123',
  distance: '850',
}

describe('toRestaurant', () => {
  it('정상 응답을 도메인 모델로 변환한다', () => {
    expect(toRestaurant(place)).toEqual({
      id: '123',
      name: '할매국밥',
      category: '국밥',
      address: '서울 중구 세종대로 110',
      phone: '02-123-4567',
      lat: 37.5666,
      lng: 126.9784,
      distance: 850,
      placeUrl: 'http://place.map.kakao.com/123',
    })
  })

  it('도로명 주소가 없으면 지번 주소를 쓴다', () => {
    const result = toRestaurant({ ...place, road_address_name: '' })
    expect(result.address).toBe('서울 중구 태평로1가 31')
  })

  it('전화번호가 없으면 null이다', () => {
    expect(toRestaurant({ ...place, phone: '' }).phone).toBeNull()
  })

  it('거리 정보가 없으면 distance는 null이다', () => {
    expect(toRestaurant({ ...place, distance: '' }).distance).toBeNull()
  })

  it('카테고리가 한 단계뿐이어도 변환한다', () => {
    expect(toRestaurant({ ...place, category_name: '음식점' }).category).toBe('음식점')
  })
})

describe('formatDistance', () => {
  it('1km 미만은 미터로 표시한다', () => {
    expect(formatDistance(850)).toBe('850m')
    expect(formatDistance(999)).toBe('999m')
  })

  it('1km 이상은 킬로미터로 표시한다', () => {
    expect(formatDistance(1000)).toBe('1.0km')
    expect(formatDistance(1234)).toBe('1.2km')
  })
})
