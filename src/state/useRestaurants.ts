import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import type { Restaurant } from '../domain/restaurant'
import {
  LocationError,
  type Coordinates,
  type LocationErrorReason,
  type LocationProvider,
  type PlaceSearchService,
  type SearchPage,
} from '../ports'

export interface RestaurantsState {
  location: Coordinates | null
  /** 위치를 얻지 못한 이유. 위치가 있으면 null */
  locationIssue: LocationErrorReason | null
  /** 진행 중인 검색어. 주변 식당 목록을 보여주는 중이면 null */
  query: string | null
  restaurants: Restaurant[]
  /** 위치 또는 첫 목록을 불러오는 중 */
  loading: boolean
  loadingMore: boolean
  /** 식당 데이터를 불러오지 못했는지 */
  searchFailed: boolean
  /** 더 보기 요청이 실패했는지 (이미 불러온 목록은 유지) */
  moreFailed: boolean
  hasMore: boolean
}

type Action =
  | { type: 'started' }
  | { type: 'located'; location: Coordinates }
  | { type: 'locationFailed'; reason: LocationErrorReason }
  | { type: 'listStarted'; query: string | null }
  | { type: 'loaded'; restaurants: Restaurant[]; hasMore: boolean }
  | { type: 'searchFailed' }
  | { type: 'moreStarted' }
  | { type: 'moreLoaded'; restaurants: Restaurant[]; hasMore: boolean }
  | { type: 'moreFailed' }
  | { type: 'searchCleared' }

export const initialRestaurantsState: RestaurantsState = {
  location: null,
  locationIssue: null,
  query: null,
  restaurants: [],
  loading: true,
  loadingMore: false,
  searchFailed: false,
  moreFailed: false,
  hasMore: false,
}

export function restaurantsReducer(state: RestaurantsState, action: Action): RestaurantsState {
  switch (action.type) {
    case 'started':
      return { ...initialRestaurantsState }
    case 'located':
      return { ...state, location: action.location, locationIssue: null }
    case 'locationFailed':
      return { ...state, loading: false, locationIssue: action.reason }
    case 'listStarted':
      return {
        ...state,
        query: action.query,
        restaurants: [],
        loading: true,
        loadingMore: false,
        searchFailed: false,
        moreFailed: false,
        hasMore: false,
      }
    case 'loaded':
      return {
        ...state,
        loading: false,
        restaurants: action.restaurants,
        hasMore: action.hasMore,
      }
    case 'searchFailed':
      return { ...state, loading: false, searchFailed: true }
    case 'moreStarted':
      return { ...state, loadingMore: true, moreFailed: false }
    case 'moreLoaded':
      return {
        ...state,
        loadingMore: false,
        restaurants: [...state.restaurants, ...action.restaurants],
        hasMore: action.hasMore,
      }
    case 'moreFailed':
      return { ...state, loadingMore: false, moreFailed: true }
    case 'searchCleared':
      return {
        ...state,
        query: null,
        restaurants: [],
        loading: false,
        loadingMore: false,
        searchFailed: false,
        moreFailed: false,
        hasMore: false,
      }
  }
}

export function useRestaurants(location: LocationProvider, places: PlaceSearchService) {
  const [state, dispatch] = useReducer(restaurantsReducer, initialRestaurantsState)
  const loadNextRef = useRef<SearchPage['loadNext']>(null)
  // 비동기 함수 안에서 최신 상태(위치, 검색어)를 읽기 위한 참조
  const latest = useRef(state)
  useLayoutEffect(() => {
    latest.current = state
  })
  // 다시 시도하거나 개발 모드에서 효과가 두 번 실행될 때, 오래된 요청의 응답을 무시한다.
  const requestId = useRef(0)

  const showPage = useCallback(
    async (id: string | number, request: () => Promise<SearchPage>) => {
      try {
        const page = await request()
        if (id !== requestId.current) return
        loadNextRef.current = page.loadNext
        dispatch({ type: 'loaded', restaurants: page.restaurants, hasMore: page.loadNext !== null })
      } catch {
        if (id !== requestId.current) return
        dispatch({ type: 'searchFailed' })
      }
    },
    [],
  )

  const load = useCallback(async () => {
    const id = ++requestId.current
    dispatch({ type: 'started' })
    loadNextRef.current = null

    let coords: Coordinates
    try {
      coords = await location.getCurrentPosition()
    } catch (error) {
      if (id !== requestId.current) return
      const reason = error instanceof LocationError ? error.reason : 'failed'
      dispatch({ type: 'locationFailed', reason })
      return
    }
    if (id !== requestId.current) return
    dispatch({ type: 'located', location: coords })

    await showPage(id, () => places.searchNearby(coords))
  }, [location, places, showPage])

  const search = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim()
      if (!query) return

      const id = ++requestId.current
      loadNextRef.current = null
      dispatch({ type: 'listStarted', query })
      await showPage(id, () => places.searchByKeyword(query, latest.current.location))
    },
    [places, showPage],
  )

  const clearSearch = useCallback(async () => {
    const { query, location: coords, locationIssue } = latest.current
    if (query === null) return

    // 위치를 아직 모르는 채로 검색했다면 처음부터 다시 위치를 얻는다.
    if (!coords && !locationIssue) {
      await load()
      return
    }

    const id = ++requestId.current
    loadNextRef.current = null
    if (!coords) {
      dispatch({ type: 'searchCleared' })
      return
    }
    dispatch({ type: 'listStarted', query: null })
    await showPage(id, () => places.searchNearby(coords))
  }, [load, places, showPage])

  const retry = useCallback(async () => {
    const { query } = latest.current
    if (query !== null) await search(query)
    else await load()
  }, [load, search])

  const loadMore = useCallback(async () => {
    const loadNext = loadNextRef.current
    if (!loadNext) return
    const id = requestId.current

    dispatch({ type: 'moreStarted' })
    try {
      const page = await loadNext()
      if (id !== requestId.current) return
      loadNextRef.current = page.loadNext
      dispatch({
        type: 'moreLoaded',
        restaurants: page.restaurants,
        hasMore: page.loadNext !== null,
      })
    } catch {
      if (id !== requestId.current) return
      dispatch({ type: 'moreFailed' })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { ...state, retry, loadMore, search, clearSearch }
}
