import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react'

import type { SqlPracticeActivityItem } from '../../../entities/sql-practice/model/types'
import { cn } from '../../../shared/lib/utils'

type SqlActivityFeedProps = {
  activities: SqlPracticeActivityItem[]
  isLoading: boolean
  currentUserId: string
}

export function SqlActivityFeed({
  activities,
  isLoading,
  currentUserId,
}: SqlActivityFeedProps) {
  if (isLoading && activities.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-text-muted">
        <Loader2 className="size-4 animate-spin" />
        풀이 로그를 불러오는 중입니다
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center text-center">
        <p className="text-sm font-bold text-text-primary">아직 풀이 로그가 없습니다</p>
        <p className="mt-1 text-xs text-text-muted">문제를 제출하면 여기에 표시됩니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activities.map((item) => (
        <div
          key={item.id}
          className={cn(
            'rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2.5',
            item.userId === currentUserId && 'bg-brand-glass',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="min-w-0 text-xs font-semibold leading-5 text-text-primary">
                <span className="font-black">{item.userName}</span>
                <span className="text-text-secondary">님이 </span>
                <span className="font-black">#{String(item.exampleOrder).padStart(2, '0')}</span>
                <span className="text-text-secondary"> </span>
                <span className="break-words">{item.exampleTitle}</span>
                <span className="text-text-secondary"> 문제를 풀었습니다.</span>
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <Clock className="size-3" />
                <span className="tabular-nums">{formatDateTime(item.createdAt)}</span>
              </p>
            </div>
            <span
              className={cn(
                'inline-flex size-7 shrink-0 items-center justify-center rounded-md border text-[11px] font-black',
                item.isCorrect
                  ? 'border-brand-border bg-brand-glass text-brand-primary'
                  : 'border-destructive/40 bg-danger-glass text-destructive',
              )}
              title={item.isCorrect ? '정답' : '오답'}
            >
              {item.isCorrect ? (
                <CheckCircle className="size-3" />
              ) : (
                <XCircle className="size-3" />
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
