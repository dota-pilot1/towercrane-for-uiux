import { Activity, ChevronDown, ChevronUp, Trophy } from 'lucide-react'
import type { ReactNode } from 'react'

import type {
  SqlPracticeActivityItem,
  SqlPracticeRankingItem,
} from '../../../entities/sql-practice/model/types'
import { cn } from '../../../shared/lib/utils'
import { SqlActivityFeed } from './sql-activity-feed'
import { SqlRankingTable } from './sql-ranking-table'

type SqlPracticeFooterDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  seedFile?: string
  rankings: SqlPracticeRankingItem[]
  activities: SqlPracticeActivityItem[]
  rankingLoading: boolean
  activityLoading: boolean
  currentUserId: string
  myScore: number
  maxScore: number
}

export function SqlPracticeFooterDrawer({
  open,
  onOpenChange,
  seedFile,
  rankings,
  activities,
  rankingLoading,
  activityLoading,
  currentUserId,
  myScore,
  maxScore,
}: SqlPracticeFooterDrawerProps) {
  const myRank = rankings.find((item) => item.userId === currentUserId)
  const latestActivity = activities[0]

  return (
    <aside
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 border-t border-surface-border bg-surface-raised shadow-2xl transition-[height] duration-200 ease-out',
        open ? 'h-[min(400px,55dvh)]' : 'h-14',
      )}
    >
      <div className="mx-auto flex h-full max-w-[1920px] flex-col px-4">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-surface-border">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <Trophy className="size-4" />
          </span>
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-1 md:grid-cols-2 md:gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-xs font-black text-text-primary">SQL 랭킹</span>
              <span className="truncate text-xs text-text-secondary">
                {seedFile ?? '현재 seed'} · 내 점수 {myScore}/{maxScore}
                {myRank ? ` · ${myRank.rank}위` : ''}
              </span>
            </div>
            <div className="hidden min-w-0 items-center gap-2 md:flex">
              <Activity className="size-3.5 shrink-0 text-brand-primary" />
              <span className="truncate text-xs text-text-secondary">
                {latestActivity
                  ? `${latestActivity.userName} · ${latestActivity.exampleTitle} · ${
                      latestActivity.isCorrect ? '정답' : '오답'
                    }`
                  : '최근 풀이 로그가 없습니다'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="ui-icon-button size-8 shrink-0"
            onClick={() => onOpenChange(!open)}
            aria-expanded={open}
            aria-label={open ? 'SQL 랭킹과 제출 로그 닫기' : 'SQL 랭킹과 제출 로그 열기'}
          >
            {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
        </div>

        <div
          className={cn(
            'grid min-h-0 flex-1 gap-3 overflow-hidden py-3 transition-opacity duration-150 md:grid-cols-2',
            open ? 'opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-border bg-surface-raised">
            <PanelHeader
              icon={<Trophy className="size-4" />}
              title="랭킹"
              description="현재 seed 기준"
            />
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <SqlRankingTable
                rankings={rankings}
                isLoading={rankingLoading}
                currentUserId={currentUserId}
                compact
              />
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-border bg-surface-raised">
            <PanelHeader
              icon={<Activity className="size-4" />}
              title="실시간 풀이 로그"
              description="5초마다 갱신"
            />
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <SqlActivityFeed
                activities={activities}
                isLoading={activityLoading}
                currentUserId={currentUserId}
              />
            </div>
          </section>
        </div>
      </div>
    </aside>
  )
}

function PanelHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-surface-border bg-surface-muted px-3">
      <span className="text-brand-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-black text-text-primary">{title}</p>
        <p className="truncate text-[11px] text-text-muted">{description}</p>
      </div>
    </div>
  )
}
