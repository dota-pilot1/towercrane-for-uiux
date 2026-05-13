import * as Dialog from '@radix-ui/react-dialog'
import { Bot, CheckCircle, CornerDownLeft, Loader2, MessageSquare, X, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'

type SqlGeminiDialogProps = {
  open: boolean
  initialContent: string
  onOpenChange: (open: boolean) => void
  onApply?: (sql: string) => void
}

type SqlValidity = 'valid' | 'invalid' | null

function parseSqlResponse(raw: string): { validity: SqlValidity; body: string } {
  const firstLine = raw.split('\n')[0].trim()
  if (firstLine === '[SQL_VALID]') {
    return { validity: 'valid', body: raw.slice(firstLine.length).replace(/^\n/, '') }
  }
  if (firstLine === '[SQL_INVALID]') {
    return { validity: 'invalid', body: raw.slice(firstLine.length).replace(/^\n/, '') }
  }
  return { validity: null, body: raw }
}

export function SqlGeminiDialog({ open, initialContent, onOpenChange, onApply }: SqlGeminiDialogProps) {
  const [content, setContent] = useState(initialContent)
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastMode, setLastMode] = useState<'sql' | 'general' | null>(null)
  const [validity, setValidity] = useState<SqlValidity>(null)

  useEffect(() => {
    if (open) {
      setContent(initialContent)
      setAnswer('')
      setError('')
      setValidity(null)
      setLastMode(null)
    }
  }, [open, initialContent])

  const handleAsk = async (mode: 'sql' | 'general') => {
    if (!content.trim() || isLoading) return
    setIsLoading(true)
    setAnswer('')
    setError('')
    setValidity(null)
    setLastMode(mode)
    try {
      const res = await sqlPracticeApi.geminiAsk(content, mode)
      const raw = res?.answer ?? ''
      if (mode === 'sql') {
        const { validity, body } = parseSqlResponse(raw)
        setValidity(validity)
        setAnswer(body)
      } else {
        setAnswer(raw)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 w-[min(900px,calc(100vw-2rem))] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-surface-border-soft shadow-2xl flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-3 border-b border-surface-border px-5 py-4 shrink-0">
            <div className="flex size-9 items-center justify-center rounded-xl border border-brand-border bg-brand-glass text-brand-primary">
              <Bot className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-sm font-bold text-text-primary">
                Gemini AI 도우미
              </Dialog.Title>
              <Dialog.Description className="text-[11px] text-text-muted">
                SQL 검증·설명 또는 자유 질문을 할 수 있습니다
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* 본문 */}
          <div className="flex flex-1 min-h-0 divide-x divide-surface-border">
            {/* 왼쪽: 입력 */}
            <div className="flex flex-col w-1/2 p-4 gap-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                입력 내용
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="ui-input flex-1 resize-none font-mono text-sm leading-6 min-h-[200px]"
                placeholder="SQL 쿼리 또는 질문을 입력하세요"
                spellCheck={false}
              />
              {/* 버튼 2개 */}
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  disabled={!content.trim() || isLoading}
                  onClick={() => handleAsk('sql')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-brand-border bg-brand-glass px-3 py-2 text-xs font-semibold text-brand-primary transition-colors hover:bg-brand-glass/80 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="size-3.5" />
                  )}
                  SQL 검증 및 설명
                </button>
                <button
                  type="button"
                  disabled={!content.trim() || isLoading}
                  onClick={() => handleAsk('general')}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-muted px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="size-3.5" />
                  )}
                  질문하기
                </button>
              </div>
            </div>

            {/* 오른쪽: 응답 */}
            <div className="flex flex-col w-1/2 p-4 gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted flex-1">
                  Gemini 응답
                </p>
                {lastMode === 'sql' && validity === 'valid' && (
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-md border border-brand-border px-2 py-0.5 text-[11px] font-semibold text-brand-primary">
                      <CheckCircle className="size-3.5" />
                      SQL 유효
                    </span>
                    {onApply && (
                      <button
                        type="button"
                        onClick={() => { onApply(content); onOpenChange(false) }}
                        className="flex items-center gap-1 rounded-md border border-surface-border bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
                        title="이 SQL을 입력창에 적용"
                      >
                        <CornerDownLeft className="size-3" />
                        입력
                      </button>
                    )}
                  </div>
                )}
                {lastMode === 'sql' && validity === 'invalid' && (
                  <span className="flex items-center gap-1 rounded-md border border-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive">
                    <XCircle className="size-3.5" />
                    SQL 오류
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto rounded-lg border border-surface-border-soft bg-surface-muted p-4 min-h-[200px]">
                {isLoading && (
                  <div className="flex h-full items-center justify-center gap-2 text-text-muted">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm">응답을 기다리는 중...</span>
                  </div>
                )}
                {!isLoading && error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                {!isLoading && !error && !answer && (
                  <p className="text-sm text-text-muted">
                    왼쪽에서 내용을 입력하고 버튼을 클릭하세요.
                  </p>
                )}
                {!isLoading && answer && (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-text-primary">
                    {answer}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
