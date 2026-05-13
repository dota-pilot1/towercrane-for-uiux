import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, Trophy, X } from 'lucide-react'

import type { SqlPracticeRankingItem } from '../../../entities/sql-practice/model/types'
import { cn } from '../../../shared/lib/utils'

type SqlRankingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  seedFile?: string
  rankings: SqlPracticeRankingItem[]
  isLoading: boolean
  currentUserId: string
}

export function SqlRankingDialog({
  open,
  onOpenChange,
  seedFile,
  rankings,
  isLoading,
  currentUserId,
}: SqlRankingDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 flex max-h-[82vh] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-surface-border-soft shadow-2xl">
          <div className="flex items-center gap-3 border-b border-surface-border px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-xl border border-brand-border bg-brand-glass text-brand-primary">
              <Trophy className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-sm font-bold text-text-primary">
                SQL 랭킹
              </Dialog.Title>
              <Dialog.Description className="truncate text-[11px] text-text-muted">
                {seedFile ?? '현재 seed'} 기준 사용자별 최고 점수 합산
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="ui-icon-button size-8"
                aria-label="닫기"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-text-muted">
                <Loader2 className="size-4 animate-spin" />
                랭킹을 불러오는 중입니다
              </div>
            ) : rankings.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-text-primary">아직 제출 기록이 없습니다</p>
                <p className="mt-1 text-xs text-text-muted">문제를 제출하면 랭킹에 표시됩니다</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-surface-border">
                <div className="grid grid-cols-[64px_1fr_96px_96px_140px] border-b border-surface-border bg-surface-muted px-3 py-2 text-[11px] font-black uppercase tracking-widest text-text-muted">
                  <span>순위</span>
                  <span>사용자</span>
                  <span className="text-right">점수</span>
                  <span className="text-right">제출</span>
                  <span className="text-right">최근 제출</span>
                </div>
                {rankings.map((item) => (
                  <div
                    key={item.userId}
                    className={cn(
                      'grid grid-cols-[64px_1fr_96px_96px_140px] items-center border-b border-surface-border-soft px-3 py-2 text-xs last:border-b-0',
                      item.userId === currentUserId ? 'bg-brand-glass' : 'bg-surface-raised',
                    )}
                  >
                    <span className="font-black tabular-nums text-brand-primary">
                      {item.rank}
                    </span>
                    <span className="min-w-0 truncate font-semibold text-text-primary">
                      {item.userName}
                    </span>
                    <span className="text-right font-black tabular-nums text-text-primary">
                      {item.totalScore}
                    </span>
                    <span className="text-right tabular-nums text-text-secondary">
                      {item.correctCount}/{item.submittedCount}
                    </span>
                    <span className="text-right tabular-nums text-text-muted">
                      {formatDateTime(item.lastSubmittedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
