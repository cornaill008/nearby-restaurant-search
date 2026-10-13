import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Restaurant } from '../domain/restaurant'
import { DetailPanel } from './DetailPanel'

const full: Restaurant = {
  id: '1',
  name: '할매국밥',
  category: '국밥',
  address: '서울 중구 세종대로 110',
  phone: '02-123-4567',
  lat: 0,
  lng: 0,
  distance: 850,
  placeUrl: 'http://place.map.kakao.com/1',
}

describe('DetailPanel', () => {
  it('이름, 카테고리, 주소, 전화번호, 거리를 보여준다', () => {
    render(<DetailPanel restaurant={full} onClose={vi.fn()} />)

    expect(screen.getByRole('heading', { name: '할매국밥' })).toBeInTheDocument()
    expect(screen.getByText('국밥')).toBeInTheDocument()
    expect(screen.getByText('서울 중구 세종대로 110')).toBeInTheDocument()
    expect(screen.getByText('02-123-4567')).toBeInTheDocument()
    expect(screen.getByText('850m')).toBeInTheDocument()
  })

  it('카카오맵 링크는 새 창으로 열리고 전화 걸기는 tel 링크이다', () => {
    render(<DetailPanel restaurant={full} onClose={vi.fn()} />)

    const kakao = screen.getByRole('link', { name: '카카오맵에서 보기' })
    expect(kakao).toHaveAttribute('href', 'http://place.map.kakao.com/1')
    expect(kakao).toHaveAttribute('target', '_blank')
    expect(kakao).toHaveAttribute('rel', expect.stringContaining('noopener'))

    expect(screen.getByRole('link', { name: '전화 걸기' })).toHaveAttribute('href', 'tel:021234567')
  })

  it('전화번호와 거리가 없으면 해당 항목과 전화 링크를 숨긴다', () => {
    render(<DetailPanel restaurant={{ ...full, phone: null, distance: null }} onClose={vi.fn()} />)

    expect(screen.queryByText('전화번호')).not.toBeInTheDocument()
    expect(screen.queryByText('거리')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '전화 걸기' })).not.toBeInTheDocument()
  })

  it('주소가 비어 있으면 정보 없음으로 표시한다', () => {
    render(<DetailPanel restaurant={{ ...full, address: '' }} onClose={vi.fn()} />)

    expect(screen.getByText('정보 없음')).toBeInTheDocument()
  })

  it('카카오맵 주소가 없으면 링크를 숨긴다', () => {
    render(<DetailPanel restaurant={{ ...full, placeUrl: '' }} onClose={vi.fn()} />)

    expect(screen.queryByRole('link', { name: '카카오맵에서 보기' })).not.toBeInTheDocument()
  })

  it('닫기를 누르면 onClose를 호출한다', async () => {
    const onClose = vi.fn()
    render(<DetailPanel restaurant={full} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: '닫기' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
