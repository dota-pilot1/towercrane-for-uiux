import * as Dialog from '@radix-ui/react-dialog'
import { Trophy, X } from 'lucide-react'

import type { SqlPracticeRankingItem } from '../../../entities/sql-practice/model/types'
import { SqlRankingTable } from './sql-ranking-table'

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
            <SqlRankingTable
              rankings={rankings}
              isLoading={isLoading}
              currentUserId={currentUserId}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
