import * as Dialog from '@radix-ui/react-dialog'
import { BookOpenText, CheckCircle, Info, Loader2, X, XCircle } from 'lucide-react'

import type { SqlExecuteResponse } from '../../../entities/sql-practice/model/types'
import { SqlResultTable } from './sql-result-table'

export type SqlGradeStatus = 'correct' | 'incorrect' | null

export type SqlSubmissionResultState = {
  submittedSql: string
  answerSql: string
  executeResponse: SqlExecuteResponse | null
  executeError: string
  gradeStatus: SqlGradeStatus
  gradeBody: string
  gradeError: string
}

export function SqlSubmissionResultDialog({
  open,
  onOpenChange,
  result,
  title,
  description,
  onOpenSupplement,
  onOpenMistakeAnalysis,
  isSupplementLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: SqlSubmissionResultState | null
  title: string
  description: string
  onOpenSupplement: () => void
  onOpenMistakeAnalysis: () => void
  isSupplementLoading: boolean
}) {
  if (!result) return null

  const isCorrect = result.gradeStatus === 'correct'
  const isIncorrect = result.gradeStatus === 'incorrect'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[211] flex max-h-[min(760px,calc(100vh-2rem))] w-[min(1120px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-sm font-black text-text-primary">
                제출 결과
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-5 text-text-muted">
                <span className="font-bold text-text-secondary">{title}</span>
                <span className="mx-1 text-text-muted">·</span>
                <span className="break-words">{description}</span>
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
            <section className="min-h-0 overflow-y-auto border-b border-surface-border p-4 md:border-b-0 md:border-r">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-text-primary">쿼리 결과</p>
                  <p className="mt-1 text-xs text-text-muted">제출한 SQL을 practice DB에서 실행한 결과입니다.</p>
                </div>
                {result.executeResponse && (
                  <span className="rounded-md border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-bold text-text-muted">
                    {result.executeResponse.executionTimeMs}ms
                  </span>
                )}
              </div>

              <pre className="mb-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 font-mono text-xs leading-5 text-text-secondary">
                {result.submittedSql}
              </pre>

              {result.executeError ? (
                <div className="rounded-md border border-destructive/40 bg-danger-glass px-3 py-2 text-sm font-semibold text-destructive">
                  {result.executeError}
                </div>
              ) : result.executeResponse ? (
                <SqlResultTable response={result.executeResponse} />
              ) : (
                <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-sm text-text-muted">
                  실행 결과가 없습니다.
                </div>
              )}
            </section>

            <aside className="min-h-0 overflow-y-auto bg-surface-muted p-4">
              <div
                className={`mb-3 flex items-center gap-2 rounded-md border px-3 py-3 ${
                  isCorrect
                    ? 'border-brand-border bg-brand-glass text-brand-primary'
                    : isIncorrect
                      ? 'border-destructive/40 bg-danger-glass text-destructive'
                      : 'border-surface-border bg-surface-raised text-text-secondary'
                }`}
              >
                {isCorrect ? (
                  <CheckCircle className="size-4 shrink-0" />
                ) : isIncorrect ? (
                  <XCircle className="size-4 shrink-0" />
                ) : (
                  <Info className="size-4 shrink-0" />
                )}
                <p className="text-sm font-black">
                  {isCorrect ? '정답입니다' : isIncorrect ? '오답입니다' : '판정 실패'}
                </p>
              </div>

              <div className="rounded-md border border-surface-border bg-surface-raised p-3">
                <p className="mb-2 text-xs font-black text-text-primary">채점 피드백</p>
                {result.gradeError ? (
                  <p className="text-sm font-semibold text-destructive">{result.gradeError}</p>
                ) : result.gradeBody ? (
                  <pre className="max-h-[360px] overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-text-secondary">
                    {result.gradeBody}
                  </pre>
                ) : (
                  <p className="text-sm text-text-muted">채점 결과가 없습니다.</p>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={isIncorrect ? onOpenMistakeAnalysis : onOpenSupplement}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isIncorrect
                      ? 'border-destructive/40 bg-danger-glass text-destructive'
                      : 'border-brand-border bg-brand-glass text-brand-primary'
                  }`}
                  disabled={isSupplementLoading || !result.gradeBody}
                >
                  {isSupplementLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : isIncorrect ? (
                    <XCircle className="size-3.5" />
                  ) : (
                    <BookOpenText className="size-3.5" />
                  )}
                  {isIncorrect ? '오답 분석' : '보충 설명'}
                </button>
              </div>
            </aside>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
