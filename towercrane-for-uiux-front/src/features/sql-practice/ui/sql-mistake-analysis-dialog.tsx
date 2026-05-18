import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X, XCircle } from 'lucide-react'

import type { SqlMistakeAnalysisState } from '../lib/sql-practice-analysis'

export function SqlMistakeAnalysisDialog({
  open,
  onOpenChange,
  title,
  submittedSql,
  answerSql,
  analysis,
  error,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submittedSql: string
  answerSql: string
  analysis: SqlMistakeAnalysisState | null
  error: string
  isLoading: boolean
}) {
  const submittedLines = submittedSql.trim() ? submittedSql.trim().split('\n') : ['']
  const wrongLines = new Set(analysis?.wrongLines ?? [])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[220] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[221] flex max-h-[min(820px,calc(100vh-2rem))] w-[min(980px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border shadow-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-destructive/40 bg-danger-glass text-destructive">
                <XCircle className="size-4" />
              </div>
              <Dialog.Title className="truncate text-base font-black text-text-primary">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted/50 p-5">
            {isLoading ? (
              <div className="flex min-h-60 items-center justify-center gap-2 rounded-md border border-surface-border-soft bg-surface-raised text-sm font-semibold text-text-muted">
                <Loader2 className="size-4 animate-spin" />
                오답 분석을 생성하는 중입니다.
              </div>
            ) : error ? (
              <div className="rounded-md border border-destructive/40 bg-danger-glass px-4 py-3 text-sm font-semibold text-destructive">
                {error}
              </div>
            ) : (
              <div className="space-y-4">
                <section className="rounded-md border border-surface-border bg-surface-raised p-4">
                  <h3 className="mb-2 text-sm font-black text-text-primary">정답 SQL</h3>
                  <pre className="max-h-48 overflow-auto rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 font-mono text-xs leading-5 text-text-secondary">
                    {answerSql}
                  </pre>
                </section>

                <section className="rounded-md border border-surface-border bg-surface-raised p-4">
                  <h3 className="mb-2 text-sm font-black text-text-primary">내 제출 SQL</h3>
                  <div className="overflow-auto rounded-md border border-surface-border-soft bg-surface-muted py-2 font-mono text-xs leading-5">
                    {submittedLines.map((line, index) => {
                      const lineNumber = index + 1
                      const isWrong = wrongLines.has(lineNumber)
                      return (
                        <div
                          key={`${lineNumber}-${line}`}
                          className={`grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-3 py-0.5 ${
                            isWrong
                              ? 'border-y border-destructive/40 bg-danger-glass text-destructive'
                              : 'text-text-secondary'
                          }`}
                        >
                          <span className="select-none text-right text-text-muted">{lineNumber}</span>
                          <code className="whitespace-pre-wrap break-words">{line || ' '}</code>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-md border border-surface-border bg-surface-raised p-4">
                  <h3 className="mb-2 text-sm font-black text-text-primary">틀린 이유 분석:</h3>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                    {analysis?.analysis || '오답 분석 결과가 없습니다.'}
                  </p>
                </section>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
