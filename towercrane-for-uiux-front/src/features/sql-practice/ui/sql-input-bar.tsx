import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { Bot, Loader2, Send, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { SqlGeminiDialog } from './sql-gemini-dialog'
import { SqlAutocompleteTextarea } from './sql-autocomplete-textarea'
import { formatSqlQuery } from '../lib/format-sql'
import type { TableInfo } from '../../../entities/sql-practice/model/types'

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WITH', 'AS', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'ON',
  'WHERE', 'AND', 'OR', 'LIKE', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL',
  'GROUP BY', 'HAVING', 'COUNT(*)', 'SUM()', 'AVG()', 'MAX()', 'MIN()',
  'COALESCE()', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'ORDER BY', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'DISTINCT', 'UNION', 'UNION ALL',
  'INSERT INTO', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'DROP TABLE',
] as const

type SqlInputBarProps = {
  onExecute: (query: string) => void
  onClear: () => void
  isLoading: boolean
  tables?: TableInfo[]
}

export type SqlInputBarHandle = {
  insert: (text: string) => void
}

export const SqlInputBar = forwardRef<SqlInputBarHandle, SqlInputBarProps>(
function SqlInputBar({ onExecute, onClear, isLoading, tables = [] }, ref) {
  const [query, setQuery] = useState('')
  const [geminiOpen, setGeminiOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    insert(text: string) {
      const textarea = textareaRef.current
      if (!textarea) {
        setQuery((prev) => prev + (prev ? ' ' : '') + text + ' ')
        return
      }
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      setQuery((prev) => {
        const before = prev.slice(0, start)
        const after = prev.slice(end)
        return before + text + ' ' + after
      })
      requestAnimationFrame(() => {
        textarea.focus()
        const pos = start + text.length + 1
        textarea.setSelectionRange(pos, pos)
      })
    },
  }))

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

  return (
    <>
      <div className="border-t border-surface-border bg-surface-raised p-4">
        <div className="flex flex-col gap-2">
          <SqlAutocompleteTextarea
            ref={textareaRef}
            value={query}
            onChange={setQuery}
            onSubmit={handleExecute}
            keywords={SQL_KEYWORDS}
            tableNames={tables.map((t) => t.tableName)}
            columnNames={tables.flatMap((t) => t.columns.map((c) => c.name))}
            rows={5}
            className="ui-input !h-32 min-h-32 max-h-64 w-full resize-y py-3 font-mono text-sm leading-6"
            placeholder={'SQL 쿼리를 입력하세요 (Ctrl+Enter 실행)\n예: SELECT * FROM users LIMIT 10;'}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-surface-border bg-surface-muted px-3 text-xs font-bold text-text-secondary transition-colors hover:border-brand-border hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleFormat}
              disabled={!query.trim() || isLoading}
              aria-label="SQL 정리"
              title="SQL 정리"
            >
              <WandSparkles className="size-3.5" />
              SQL 정리
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 text-xs font-bold text-brand-primary transition-colors hover:brightness-110"
              onClick={() => setGeminiOpen(true)}
              aria-label="Gemini AI 도우미"
              title="Gemini AI 도우미"
            >
              <Bot className="size-3.5" />
              AI 도우미
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 text-xs font-bold text-brand-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleExecute}
              disabled={!query.trim() || isLoading}
              aria-label="SQL 실행"
              title="SQL 실행"
            >
              {isLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              실행
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-text-muted">Ctrl+Enter로 실행 · Tab으로 자동완성/들여쓰기 · <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[11px] text-text-secondary">/clear</code> 입력 후 실행하면 결과 화면을 지울 수 있습니다</p>
      </div>

      <SqlGeminiDialog
        open={geminiOpen}
        initialContent={query}
        onOpenChange={setGeminiOpen}
        onApply={setQuery}
      />
    </>
  )
})
