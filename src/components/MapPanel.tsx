import { useEffect, useRef, useState } from 'react'
import type { Restaurant } from '../domain/restaurant'
import type { Coordinates, MapView } from '../ports'

export interface MapPanelProps {
  loadMapView: (container: HTMLElement) => Promise<MapView>
  location: Coordinates | null
  restaurants: Restaurant[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function MapPanel({ loadMapView, location, restaurants, selectedId, onSelect }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<MapView | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 지도마다 전용 요소를 쓴다. 효과가 다시 실행될 때 이전 지도의 정리가
    // 새 지도가 쓰는 요소를 건드리지 않게 하기 위해서다.
    const host = document.createElement('div')
    host.className = 'map-host'
    container.appendChild(host)

    let cancelled = false
    let created: MapView | null = null
    setFailed(false)

    loadMapView(host).then(
      (mapView) => {
        if (cancelled) {
          mapView.destroy()
          return
        }
        created = mapView
        setView(mapView)
      },
      () => {
        if (!cancelled) setFailed(true)
      },
    )

    return () => {
      cancelled = true
      created?.destroy()
      host.remove()
      setView(null)
    }
  }, [loadMapView, attempt])

  useEffect(() => {
    view?.onSelect(onSelect)
  }, [view, onSelect])

  useEffect(() => {
    view?.setCurrentLocation(location)
  }, [view, location])

  useEffect(() => {
    view?.setRestaurants(restaurants)
    view?.select(selectedId)
    // 선택 변경은 아래 효과가 처리한다. 목록이 바뀔 때만 마커를 새로 그리고 선택을 다시 반영한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, restaurants])

  useEffect(() => {
    view?.select(selectedId)
  }, [view, selectedId])

  return (
    <div className="map-panel">
      <div ref={containerRef} className="map-container" />
      {failed && (
        <div role="alert" className="map-error">
          <p>지도를 불러오지 못했어요.</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            지도 다시 시도
          </button>
        </div>
      )}
    </div>
  )
}
