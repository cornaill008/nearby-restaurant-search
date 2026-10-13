import { formatDistance, type Restaurant } from '../domain/restaurant'
import type { LocationErrorReason } from '../ports'

export interface RestaurantListProps {
  restaurants: Restaurant[]
  loading: boolean
  loadingMore: boolean
  locationIssue: LocationErrorReason | null
  /** 진행 중인 검색어. 검색 중이 아니면 null */
  query?: string | null
  searchFailed: boolean
  moreFailed: boolean
  hasMore: boolean
  selectedId?: string | null
  onRetry: () => void
  onLoadMore: () => void
  onSelect?: (id: string) => void
}

export function RestaurantList({
  restaurants,
  loading,
  loadingMore,
  locationIssue,
  query = null,
  searchFailed,
  moreFailed,
  hasMore,
  selectedId = null,
  onRetry,
  onLoadMore,
  onSelect,
}: RestaurantListProps) {
  if (loading) {
    return (
      <p role="status" className="notice">
        {query === null ? '주변 식당을 찾는 중이에요…' : '검색하는 중이에요…'}
      </p>
    )
  }

  // 검색 중에는 위치 문제와 상관없이 검색 결과를 보여준다.
  if (query === null && locationIssue === 'denied') {
    return (
      <div role="alert" className="notice">
        <p>위치 권한이 거부되어 주변 식당을 찾을 수 없어요.</p>
        <p>키워드로 검색해서 식당을 찾을 수 있어요.</p>
        <button type="button" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    )
  }

  if (query === null && locationIssue === 'failed') {
    return (
      <div role="alert" className="notice">
        <p>현재 위치를 가져오지 못했어요.</p>
        <button type="button" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    )
  }

  if (searchFailed) {
    return (
      <div role="alert" className="notice">
        <p>식당 정보를 불러오지 못했어요.</p>
        <button type="button" onClick={onRetry}>
          다시 시도
        </button>
      </div>
    )
  }

  if (restaurants.length === 0) {
    return (
      <p className="notice">{query === null ? '주변에 식당이 없어요' : '검색 결과가 없어요'}</p>
    )
  }

  return (
    <div>
      <ul className="restaurant-list">
        {restaurants.map((restaurant) => (
          <li key={restaurant.id}>
            <button
              type="button"
              className={restaurant.id === selectedId ? 'item selected' : 'item'}
              aria-current={restaurant.id === selectedId}
              onClick={() => onSelect?.(restaurant.id)}
            >
              <span className="item-name">{restaurant.name}</span>
              <span className="item-meta">
                {restaurant.category}
                {restaurant.distance !== null && ` · ${formatDistance(restaurant.distance)}`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {moreFailed && (
        <p role="alert" className="notice">
          추가 식당을 불러오지 못했어요.
        </p>
      )}
      {hasMore && (
        <button type="button" className="more" disabled={loadingMore} onClick={onLoadMore}>
          {loadingMore ? '불러오는 중…' : moreFailed ? '다시 시도' : '더 보기'}
        </button>
      )}
    </div>
  )
}
