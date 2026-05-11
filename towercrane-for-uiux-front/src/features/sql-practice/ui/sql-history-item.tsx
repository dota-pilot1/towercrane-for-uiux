import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import type { SqlHistoryItem as SqlHistoryItemType } from '../../../entities/sql-practice/model/types'
import { SqlResultTable } from './sql-result-table'

type SqlHistoryItemProps = {
  item: SqlHistoryItemType
}

export function SqlHistoryItem({ item }: SqlHistoryItemProps) {
  const { query, response, timestamp } = item
  const time = timestamp.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <article className="space-y-2">
      <div className="flex justify-end">
        <div className="max-w-[88%]">
          <div className="mb-1 text-right text-[11px] text-text-muted">{time}</div>
          <pre className="whitespace-pre-wrap break-words rounded-md border border-brand-border bg-brand-glass px-4 py-3 font-mono text-sm leading-6 text-text-primary">
            {query}
          </pre>
        </div>
      </div>

      <div
        className={
          response.success
            ? 'ui-panel space-y-3 p-4'
            : 'rounded-md border border-destructive bg-danger-glass p-4'
        }
      >
        <div className="flex items-center gap-2">
          {response.success ? (
            <CheckCircle2 className="size-4 text-brand-primary" />
          ) : (
            <XCircle className="size-4 text-destructive" />
          )}
          <span
            className={
              response.success
                ? 'text-sm font-semibold text-text-primary'
                : 'text-sm font-semibold text-destructive'
            }
          >
            {response.message}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-text-muted">
            <Clock3 className="size-3" />
            {response.executionTimeMs}ms
          </span>
        </div>

        {response.seedReloaded && (
          <div className="rounded-md border border-brand-border bg-brand-glass px-3 py-2 text-xs text-brand-primary">
            seed.sql 변경이 감지되어 연습 DB를 새로 만들었습니다.
          </div>
        )}

        {response.success && response.columns && response.rows ? (
          <SqlResultTable response={response} />
        ) : null}

        {response.success && !response.columns ? (
          <div className="text-sm text-text-secondary">
            <span className="mr-2 rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-1 font-mono text-xs text-text-primary">
              {response.type}
            </span>
            영향 받은 행: {response.affectedRows}
          </div>
        ) : null}
      </div>
    </article>
  )
}
