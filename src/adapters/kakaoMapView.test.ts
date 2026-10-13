import { describe, expect, it } from 'vitest'
import type { Restaurant } from '../domain/restaurant'
import { createKakaoMapView } from './kakaoMapView'
import type { KakaoCustomOverlay, KakaoMap, KakaoMapSdk } from './kakaoTypes'

function restaurant(id: string, lat = 37.5, lng = 127): Restaurant {
  return {
    id,
    name: `식당${id}`,
    category: '한식',
    address: '',
    phone: null,
    lat,
    lng,
    distance: null,
    placeUrl: '',
  }
}

function fakeSdk() {
  const log = {
    overlays: [] as Array<{ content: HTMLElement; attached: boolean }>,
    boundsPoints: [] as Array<[number, number]>,
    setBoundsCalls: 0,
    panTo: [] as Array<[number, number]>,
  }

  class LatLng {
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
  }

  const sdk: KakaoMapSdk = {
    maps: {
      LatLng,
      LatLngBounds: class {
        extend(point: LatLng) {
          log.boundsPoints.push([point.getLat(), point.getLng()])
        }
      },
      Map: class implements KakaoMap {
        setBounds() {
          log.setBoundsCalls += 1
        }
        setCenter() {}
        panTo(point: LatLng) {
          log.panTo.push([point.getLat(), point.getLng()])
        }
        relayout() {}
      },
      CustomOverlay: class implements KakaoCustomOverlay {
        entry: { content: HTMLElement; attached: boolean }
        constructor(options: { content: HTMLElement }) {
          this.entry = { content: options.content, attached: false }
          log.overlays.push(this.entry)
        }
        setMap(map: KakaoMap | null) {
          this.entry.attached = map !== null
        }
      },
    },
  }
  return { sdk, log }
}

const attached = (log: ReturnType<typeof fakeSdk>['log']) =>
  log.overlays.filter((o) => o.attached)

describe('createKakaoMapView', () => {
  it('식당 마커와 현재 위치 마커를 표시하고 모든 점이 보이도록 범위를 맞춘다', () => {
    const { sdk, log } = fakeSdk()
    const view = createKakaoMapView(sdk, document.createElement('div'))

    view.setCurrentLocation({ lat: 37.4, lng: 126.9 })
    view.setRestaurants([restaurant('1', 37.5, 127), restaurant('2', 37.6, 127.1)])

    expect(attached(log)).toHaveLength(3)
    expect(log.setBoundsCalls).toBe(1)
    expect(log.boundsPoints).toEqual([
      [37.5, 127],
      [37.6, 127.1],
      [37.4, 126.9],
    ])
  })

  it('목록이 바뀌면 이전 마커를 제거하고 새 마커를 표시한다', () => {
    const { sdk, log } = fakeSdk()
    const view = createKakaoMapView(sdk, document.createElement('div'))

    view.setRestaurants([restaurant('1'), restaurant('2')])
    view.setRestaurants([restaurant('3')])

    const live = attached(log)
    expect(live).toHaveLength(1)
    expect(live[0].content.getAttribute('aria-label')).toBe('식당3')
  })

  it('현재 위치가 바뀌면 이전 현재 위치 마커를 제거한다', () => {
    const { sdk, log } = fakeSdk()
    const view = createKakaoMapView(sdk, document.createElement('div'))

    view.setCurrentLocation({ lat: 1, lng: 1 })
    view.setCurrentLocation({ lat: 2, lng: 2 })
    expect(attached(log)).toHaveLength(1)

    view.setCurrentLocation(null)
    expect(attached(log)).toHaveLength(0)
  })

  it('마커를 누르면 onSelect 핸들러를 호출한다', () => {
    const { sdk, log } = fakeSdk()
    const view = createKakaoMapView(sdk, document.createElement('div'))
    const picked: string[] = []
    view.onSelect((id) => picked.push(id))

    view.setRestaurants([restaurant('1'), restaurant('2')])
    log.overlays[1].content.click()

    expect(picked).toEqual(['2'])
  })

  it('select는 해당 마커만 강조하고 지도를 그 위치로 이동한다', () => {
    const { sdk, log } = fakeSdk()
    const view = createKakaoMapView(sdk, document.createElement('div'))
    view.setRestaurants([restaurant('1', 37.5, 127), restaurant('2', 37.6, 127.1)])

    view.select('2')

    expect(log.overlays[0].content.classList.contains('selected')).toBe(false)
    expect(log.overlays[1].content.classList.contains('selected')).toBe(true)
    expect(log.panTo).toEqual([[37.6, 127.1]])

    view.select(null)
    expect(log.overlays[1].content.classList.contains('selected')).toBe(false)
  })

  it('destroy는 모든 마커를 제거한다', () => {
    const { sdk, log } = fakeSdk()
    const view = createKakaoMapView(sdk, document.createElement('div'))
    view.setCurrentLocation({ lat: 1, lng: 1 })
    view.setRestaurants([restaurant('1')])

    view.destroy()

    expect(attached(log)).toHaveLength(0)
  })
})
