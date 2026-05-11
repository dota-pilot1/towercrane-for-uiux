import { useRef, useState, type KeyboardEvent } from 'react'
import { Loader2, Play } from 'lucide-react'

type SqlInputBarProps = {
  onExecute: (query: string) => void
  isLoading: boolean
}

export function SqlInputBar({ onExecute, isLoading }: SqlInputBarProps) {
  const [query, setQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleExecute = () => {
    const trimmed = query.trim()
    if (!trimmed || isLoading) return
    onExecute(trimmed)
    setQuery('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      handleExecute()
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      const start = event.currentTarget.selectionStart
      const end = event.currentTarget.selectionEnd
      const next = `${query.slice(0, start)}  ${query.slice(end)}`
      setQuery(next)
      window.setTimeout(() => {
        if (!textareaRef.current) return
        textareaRef.current.selectionStart = start + 2
        textareaRef.current.selectionEnd = start + 2
      }, 0)
    }
  }

  return (
    <div className="border-t border-surface-border bg-surface-raised p-4">
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={5}
          className="ui-input !h-32 min-h-32 max-h-64 flex-1 resize-y py-3 font-mono text-sm leading-6"
          placeholder={'SQL 쿼리를 입력하세요 (Ctrl+Enter 실행)\n예: SELECT * FROM users LIMIT 10;'}
        />
        <button
          type="button"
          className="ui-icon-button-brand size-12 shrink-0"
          onClick={handleExecute}
          disabled={!query.trim() || isLoading}
          aria-label="SQL 실행"
          title="SQL 실행"
        >
          {isLoading ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5" />}
        </button>
      </div>
      <p className="mt-2 text-xs text-text-muted">Ctrl+Enter로 실행 · Tab으로 들여쓰기</p>
    </div>
  )
}
