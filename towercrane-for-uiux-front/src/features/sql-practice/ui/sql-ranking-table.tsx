import { Loader2 } from 'lucide-react'

import type { SqlPracticeRankingItem } from '../../../entities/sql-practice/model/types'
import { cn } from '../../../shared/lib/utils'

type SqlRankingTableProps = {
  rankings: SqlPracticeRankingItem[]
  isLoading: boolean
  currentUserId: string
  compact?: boolean
}

export function SqlRankingTable({
  rankings,
  isLoading,
  currentUserId,
  compact = false,
}: SqlRankingTableProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-text-muted">
        <Loader2 className="size-4 animate-spin" />
        랭킹을 불러오는 중입니다
      </div>
    )
  }

  if (rankings.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center text-center">
        <p className="text-sm font-bold text-text-primary">아직 제출 기록이 없습니다</p>
        <p className="mt-1 text-xs text-text-muted">문제를 제출하면 랭킹에 표시됩니다</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-surface-border">
      <div
        className={cn(
          'grid border-b border-surface-border bg-surface-muted px-3 py-2 text-[11px] font-black uppercase text-text-muted',
          compact
            ? 'grid-cols-[48px_minmax(0,1fr)_64px_72px]'
            : 'grid-cols-[64px_minmax(0,1fr)_96px_96px_140px]',
        )}
      >
        <span>순위</span>
        <span>사용자</span>
        <span className="text-right">점수</span>
        <span className="text-right">제출</span>
        {!compact && <span className="text-right">최근 제출</span>}
      </div>
      {rankings.map((item) => (
        <div
          key={item.userId}
          className={cn(
            'grid items-center border-b border-surface-border-soft px-3 py-2 text-xs last:border-b-0',
            compact
              ? 'grid-cols-[48px_minmax(0,1fr)_64px_72px]'
              : 'grid-cols-[64px_minmax(0,1fr)_96px_96px_140px]',
            item.userId === currentUserId ? 'bg-brand-glass' : 'bg-surface-raised',
          )}
        >
          <span className="font-black tabular-nums text-brand-primary">{item.rank}</span>
          <span className="min-w-0 truncate font-semibold text-text-primary">
            {item.userName}
          </span>
          <span className="text-right font-black tabular-nums text-text-primary">
            {item.totalScore}
          </span>
          <span className="text-right tabular-nums text-text-secondary">
            {item.correctCount}/{item.submittedCount}
          </span>
          {!compact && (
            <span className="text-right tabular-nums text-text-muted">
              {formatDateTime(item.lastSubmittedAt)}
            </span>
          )}
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
