import { useState, type ChangeEvent, type FormEvent } from 'react'

export interface SearchBarProps {
  /** 진행 중인 검색어. 검색 중이 아니면 null */
  activeQuery: string | null
  onSearch: (query: string) => void
  onClear: () => void
}

export function SearchBar({ activeQuery, onSearch, onClear }: SearchBarProps) {
  const [input, setInput] = useState('')
  const [showHint, setShowHint] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const query = input.trim()
    if (!query) {
      setShowHint(true)
      return
    }
    setShowHint(false)
    onSearch(query)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value
    setInput(value)
    setShowHint(false)
    // 검색 중에 입력을 모두 지우면 검색을 해제한다.
    if (value === '' && activeQuery !== null) onClear()
  }

  function handleClear() {
    setInput('')
    setShowHint(false)
    if (activeQuery !== null) onClear()
  }

  return (
    <form className="search-bar" role="search" onSubmit={handleSubmit}>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        placeholder="식당이나 음식 검색 (예: 국밥)"
        aria-label="식당 검색"
      />
      <button type="submit">검색</button>
      {(input !== '' || activeQuery !== null) && (
        <button type="button" onClick={handleClear}>
          초기화
        </button>
      )}
      {showHint && (
        <p role="alert" className="search-hint">
          검색어를 입력해 주세요.
        </p>
      )}
    </form>
  )
}
