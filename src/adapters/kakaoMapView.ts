import type { Restaurant } from '../domain/restaurant'
import type { Coordinates, MapView } from '../ports'
import type { KakaoCustomOverlay, KakaoMapSdk } from './kakaoTypes'

const DEFAULT_CENTER: Coordinates = { lat: 37.5665, lng: 126.978 } // 서울시청
const DEFAULT_LEVEL = 4

interface RestaurantMarker {
  restaurant: Restaurant
  element: HTMLElement
  overlay: KakaoCustomOverlay
}

export function createKakaoMapView(kakao: KakaoMapSdk, container: HTMLElement): MapView {
  const { maps } = kakao
  const latLng = (point: Coordinates) => new maps.LatLng(point.lat, point.lng)

  const map = new maps.Map(container, { center: latLng(DEFAULT_CENTER), level: DEFAULT_LEVEL })

  let current: Coordinates | null = null
  let currentOverlay: KakaoCustomOverlay | null = null
  let markers: RestaurantMarker[] = []
  let selectHandler: ((id: string) => void) | null = null

  function fitToMarkers() {
    const points: Coordinates[] = markers.map((m) => m.restaurant)
    if (current) points.push(current)
    if (points.length === 0) return

    const bounds = new maps.LatLngBounds()
    for (const point of points) bounds.extend(latLng(point))
    map.setBounds(bounds)
  }

  return {
    setCurrentLocation(center) {
      currentOverlay?.setMap(null)
      currentOverlay = null
      current = center
      if (!center) return

      const dot = document.createElement('div')
      dot.className = 'map-current'
      dot.title = '현재 위치'
      currentOverlay = new maps.CustomOverlay({ position: latLng(center), content: dot, zIndex: 1 })
      currentOverlay.setMap(map)
    },

    setRestaurants(restaurants) {
      for (const marker of markers) marker.overlay.setMap(null)

      markers = restaurants.map((restaurant) => {
        const element = document.createElement('button')
        element.type = 'button'
        element.className = 'map-marker'
        element.title = restaurant.name
        element.setAttribute('aria-label', restaurant.name)
        element.addEventListener('click', () => selectHandler?.(restaurant.id))

        const overlay = new maps.CustomOverlay({
          position: latLng(restaurant),
          content: element,
          yAnchor: 1,
          zIndex: 2,
        })
        overlay.setMap(map)
        return { restaurant, element, overlay }
      })

      fitToMarkers()
    },

    select(id) {
      for (const marker of markers) {
        marker.element.classList.toggle('selected', marker.restaurant.id === id)
      }
      const selected = markers.find((m) => m.restaurant.id === id)
      if (selected) map.panTo(latLng(selected.restaurant))
    },

    onSelect(handler) {
      selectHandler = handler
    },

    destroy() {
      for (const marker of markers) marker.overlay.setMap(null)
      currentOverlay?.setMap(null)
      markers = []
      currentOverlay = null
      selectHandler = null
      container.replaceChildren()
    },
  }
}
