import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Restaurant } from '../domain/restaurant'
import { RestaurantList, type RestaurantListProps } from './RestaurantList'

function restaurant(id: string, distance: number | null = 850): Restaurant {
  return {
    id,
    name: `식당${id}`,
    category: '국밥',
    address: '주소',
    phone: null,
    lat: 0,
    lng: 0,
    distance,
    placeUrl: '',
  }
}

function renderList(overrides: Partial<RestaurantListProps> = {}) {
  const props: RestaurantListProps = {
    restaurants: [],
    loading: false,
    loadingMore: false,
    locationIssue: null,
    searchFailed: false,
    moreFailed: false,
    hasMore: false,
    onRetry: vi.fn(),
    onLoadMore: vi.fn(),
    onSelect: vi.fn(),
    ...overrides,
  }
  render(<RestaurantList {...props} />)
  return props
}

describe('RestaurantList', () => {
  it('불러오는 중에는 로딩 표시를 보여준다', () => {
    renderList({ loading: true })
    expect(screen.getByRole('status')).toHaveTextContent('찾는 중')
  })

  it('식당의 이름, 카테고리, 거리를 보여준다', () => {
    renderList({ restaurants: [restaurant('1', 850), restaurant('2', 1200)] })
    expect(screen.getByText('식당1')).toBeInTheDocument()
    expect(screen.getByText('국밥 · 850m')).toBeInTheDocument()
    expect(screen.getByText('국밥 · 1.2km')).toBeInTheDocument()
  })

  it('거리가 없으면 거리를 표시하지 않는다', () => {
    renderList({ restaurants: [restaurant('1', null)] })
    expect(screen.getByText('국밥')).toBeInTheDocument()
  })

  it('권한 거부 시 안내와 검색 대안을 보여준다', () => {
    renderList({ locationIssue: 'denied' })
    expect(screen.getByRole('alert')).toHaveTextContent('위치 권한이 거부')
    expect(screen.getByRole('alert')).toHaveTextContent('키워드로 검색')
  })

  it('위치 조회 실패 시 안내하고 다시 시도할 수 있다', async () => {
    const { onRetry } = renderList({ locationIssue: 'failed' })
    expect(screen.getByRole('alert')).toHaveTextContent('위치를 가져오지 못했어요')
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('서비스 오류 시 안내하고 다시 시도할 수 있다', async () => {
    const { onRetry } = renderList({ searchFailed: true })
    expect(screen.getByRole('alert')).toHaveTextContent('불러오지 못했어요')
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('주변 식당이 없으면 안내를 보여준다', () => {
    renderList({ restaurants: [] })
    expect(screen.getByText('주변에 식당이 없어요')).toBeInTheDocument()
  })

  it('다음 결과가 있을 때만 더 보기 버튼을 보여주고 누르면 호출한다', async () => {
    const { onLoadMore } = renderList({ restaurants: [restaurant('1')], hasMore: true })
    await userEvent.click(screen.getByRole('button', { name: '더 보기' }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('마지막 결과면 더 보기 버튼이 없다', () => {
    renderList({ restaurants: [restaurant('1')], hasMore: false })
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument()
  })

  it('더 보기에 실패하면 목록을 유지한 채 다시 시도를 안내한다', () => {
    renderList({ restaurants: [restaurant('1')], hasMore: true, moreFailed: true })
    expect(screen.getByText('식당1')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('추가 식당을')
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('식당을 누르면 onSelect를 호출한다', async () => {
    const { onSelect } = renderList({ restaurants: [restaurant('1')] })
    await userEvent.click(screen.getByRole('button', { name: /식당1/ }))
    expect(onSelect).toHaveBeenCalledWith('1')
  })
})
