import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchBar, type SearchBarProps } from './SearchBar'

function renderBar(overrides: Partial<SearchBarProps> = {}) {
  const props: SearchBarProps = {
    activeQuery: null,
    onSearch: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  }
  render(<SearchBar {...props} />)
  return props
}

describe('SearchBar', () => {
  it('검색어를 입력하고 검색하면 앞뒤 공백을 지운 검색어로 onSearch를 호출한다', async () => {
    const { onSearch } = renderBar()
    await userEvent.type(screen.getByLabelText('식당 검색'), '  국밥 ')
    await userEvent.click(screen.getByRole('button', { name: '검색' }))
    expect(onSearch).toHaveBeenCalledWith('국밥')
  })

  it('Enter로도 검색한다', async () => {
    const { onSearch } = renderBar()
    await userEvent.type(screen.getByLabelText('식당 검색'), '파스타{Enter}')
    expect(onSearch).toHaveBeenCalledWith('파스타')
  })

  it('빈 입력이나 공백만 입력하면 검색하지 않고 입력을 안내한다', async () => {
    const { onSearch } = renderBar()
    await userEvent.click(screen.getByRole('button', { name: '검색' }))
    expect(screen.getByRole('alert')).toHaveTextContent('검색어를 입력해 주세요')

    await userEvent.type(screen.getByLabelText('식당 검색'), '   ')
    await userEvent.click(screen.getByRole('button', { name: '검색' }))
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('입력을 시작하면 안내를 지운다', async () => {
    renderBar()
    await userEvent.click(screen.getByRole('button', { name: '검색' }))
    await userEvent.type(screen.getByLabelText('식당 검색'), '국')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('검색 중 초기화 버튼을 누르면 입력을 비우고 onClear를 호출한다', async () => {
    const { onClear } = renderBar({ activeQuery: '국밥' })
    await userEvent.type(screen.getByLabelText('식당 검색'), '국밥')
    await userEvent.click(screen.getByRole('button', { name: '초기화' }))
    expect(screen.getByLabelText('식당 검색')).toHaveValue('')
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('검색 중에 입력을 모두 지우면 onClear를 호출한다', async () => {
    const { onClear } = renderBar({ activeQuery: '국' })
    const input = screen.getByLabelText('식당 검색')
    await userEvent.type(input, '국')
    await userEvent.clear(input)
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('검색 중이 아니면 입력을 지워도 onClear를 호출하지 않는다', async () => {
    const { onClear } = renderBar({ activeQuery: null })
    const input = screen.getByLabelText('식당 검색')
    await userEvent.type(input, '국')
    await userEvent.clear(input)
    expect(onClear).not.toHaveBeenCalled()
  })
})
