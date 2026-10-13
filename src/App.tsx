import { useCallback, useMemo, useState } from 'react'
import './App.css'
import { createBrowserLocationProvider } from './adapters/browserLocation'
import { createKakaoMapView } from './adapters/kakaoMapView'
import { createLazyPlaceSearch } from './adapters/lazyPlaceSearch'
import { loadKakaoSdk } from './adapters/loadKakaoSdk'
import { DetailPanel } from './components/DetailPanel'
import { MapPanel } from './components/MapPanel'
import { RestaurantList } from './components/RestaurantList'
import { SearchBar } from './components/SearchBar'
import type { LocationProvider, MapView, PlaceSearchService } from './ports'
import { useRestaurants } from './state/useRestaurants'

export interface AppServices {
  location: LocationProvider
  search: PlaceSearchService
  loadMapView: (container: HTMLElement) => Promise<MapView>
}

function createDefaultServices(): AppServices {
  return {
    location: createBrowserLocationProvider(),
    search: createLazyPlaceSearch(() => loadKakaoSdk()),
    loadMapView: async (container) => createKakaoMapView(await loadKakaoSdk(), container),
  }
}

function App({ services }: { services?: AppServices }) {
  const { location, search, loadMapView } = useMemo(
    () => services ?? createDefaultServices(),
    [services],
  )
  const nearby = useRestaurants(location, search)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const select = useCallback((id: string) => setSelectedId(id), [])
  // 목록이 바뀌어 사라진 식당은 선택 상태에서 제외한다.
  const selected = nearby.restaurants.find((r) => r.id === selectedId) ?? null
  const activeSelectedId = selected?.id ?? null
  const closeDetail = useCallback(() => setSelectedId(null), [])
  // 검색하거나 초기화하면 이전 선택을 비워, 지도가 선택한 식당 대신 새 목록 전체와 내 위치를 보여주게 한다.
  const { search: runSearch, clearSearch } = nearby
  const handleSearch = useCallback(
    (query: string) => {
      setSelectedId(null)
      runSearch(query)
    },
    [runSearch],
  )
  const handleClear = useCallback(() => {
    setSelectedId(null)
    clearSearch()
  }, [clearSearch])

  return (
    <main className="app">
      <h1>주변 식당</h1>
      <SearchBar activeQuery={nearby.query} onSearch={handleSearch} onClear={handleClear} />
      <div className="layout">
        <MapPanel
          loadMapView={loadMapView}
          location={nearby.location}
          restaurants={nearby.restaurants}
          selectedId={activeSelectedId}
          onSelect={select}
        />
        <div className="side">
          {selected && <DetailPanel restaurant={selected} onClose={closeDetail} />}
          <RestaurantList
            restaurants={nearby.restaurants}
            loading={nearby.loading}
            loadingMore={nearby.loadingMore}
            locationIssue={nearby.locationIssue}
            query={nearby.query}
            searchFailed={nearby.searchFailed}
            moreFailed={nearby.moreFailed}
            hasMore={nearby.hasMore}
            selectedId={activeSelectedId}
            onRetry={nearby.retry}
            onLoadMore={nearby.loadMore}
            onSelect={select}
          />
        </div>
      </div>
    </main>
  )
}

export default App
