import * as Dialog from '@radix-ui/react-dialog'
import { History, RefreshCw, X } from 'lucide-react'

import type { SqlPracticeActivityItem } from '../../../entities/sql-practice/model/types'
import { SqlActivityFeed } from './sql-activity-feed'

type SqlMyActivityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  seedFile?: string
  activities: SqlPracticeActivityItem[]
  isLoading: boolean
  isRefreshing: boolean
  currentUserId: string
  onRefresh: () => void
}

export function SqlMyActivityDialog({
  open,
  onOpenChange,
  seedFile,
  activities,
  isLoading,
  isRefreshing,
  currentUserId,
  onRefresh,
}: SqlMyActivityDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-50 flex max-h-[82vh] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border-soft shadow-2xl">
          <div className="flex items-center gap-3 border-b border-surface-border px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
              <History className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-sm font-bold text-text-primary">
                내 풀이 히스토리
              </Dialog.Title>
              <Dialog.Description className="truncate text-[11px] text-text-muted">
                {seedFile ?? '현재 seed'} 기준 내 문제 제출 기록
              </Dialog.Description>
            </div>
            <button
              type="button"
              className="ui-icon-button size-8"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="히스토리 새로고침"
              title="히스토리 새로고침"
            >
              <RefreshCw className={isRefreshing ? 'size-4 animate-spin' : 'size-4'} />
            </button>
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
            <SqlActivityFeed
              activities={activities}
              isLoading={isLoading}
              currentUserId={currentUserId}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
