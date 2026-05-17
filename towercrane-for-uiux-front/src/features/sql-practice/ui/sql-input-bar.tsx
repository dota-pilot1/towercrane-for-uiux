import { useRef, useState, type KeyboardEvent } from 'react'
import { Bot, Loader2, Send, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { SqlGeminiDialog } from './sql-gemini-dialog'
import { formatSqlQuery } from '../lib/format-sql'

type SqlInputBarProps = {
  onExecute: (query: string) => void
  onClear: () => void
  isLoading: boolean
}

export function SqlInputBar({ onExecute, onClear, isLoading }: SqlInputBarProps) {
  const [query, setQuery] = useState('')
  const [geminiOpen, setGeminiOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleExecute = () => {
    const trimmed = query.trim()
    if (!trimmed || isLoading) return
    if (trimmed === '/clear') {
      onClear()
      setQuery('')
      return
    }
    onExecute(trimmed)
    setQuery('')
  }

  const handleFormat = () => {
    const trimmed = query.trim()
    if (!trimmed) return

    try {
      const formatted = formatSqlQuery(trimmed)
      setQuery(formatted)
      requestAnimationFrame(() => {
        textareaRef.current?.focus()
      })
    } catch {
      toast.error('SQL을 정리할 수 없습니다. 문법을 확인해 주세요.')
    }
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
    <>
      <div className="border-t border-surface-border bg-surface-raised p-4">
        <div className="flex items-start gap-3">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            className="ui-input !h-32 min-h-32 max-h-64 flex-1 resize-y py-3 font-mono text-sm leading-6"
            placeholder={'SQL 쿼리를 입력하세요 (Ctrl+Enter 실행)\n예: SELECT * FROM users LIMIT 10;'}
          />
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              className="ui-icon-button size-12"
              onClick={handleFormat}
              disabled={!query.trim() || isLoading}
              aria-label="SQL 정리"
              title="SQL 정리"
            >
              <WandSparkles className="size-5" />
            </button>
            <button
              type="button"
              className="ui-icon-button-brand size-12"
              onClick={handleExecute}
              disabled={!query.trim() || isLoading}
              aria-label="SQL 실행"
              title="SQL 실행"
            >
              {isLoading ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            </button>
            <button
              type="button"
              className="flex size-12 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => setGeminiOpen(true)}
              aria-label="Gemini AI 도우미"
              title="Gemini AI 도우미"
            >
              <Bot className="size-5" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-text-muted">Ctrl+Enter로 실행 · Tab으로 들여쓰기 · <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[11px] text-text-secondary">/clear</code> 입력 후 실행하면 결과 화면을 지울 수 있습니다</p>
      </div>

      <SqlGeminiDialog
        open={geminiOpen}
        initialContent={query}
        onOpenChange={setGeminiOpen}
        onApply={setQuery}
      />
    </>
  )
}
