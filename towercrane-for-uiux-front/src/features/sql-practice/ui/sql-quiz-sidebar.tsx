import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  History,
  XCircle,
} from 'lucide-react'

import type { SqlPracticeSubmissionStatus } from '../../../entities/sql-practice/model/types'
import type {
  SqlExampleLevel,
  SqlPracticeExample,
  SqlPracticeExampleSet,
} from '../../../entities/sql-practice/model/example-types'
import { cn } from '../../../shared/lib/utils'
import { useSqlPracticeSelectionStore } from '../model/sql-practice-selection-store'
import { sqlExampleLevelLabels } from '../model/sql-practice-examples'

const LEVEL_ORDER: SqlExampleLevel[] = ['beginner', 'intermediate', 'advanced']

const LEVEL_ACTIVE_BUTTON_CLASS: Record<SqlExampleLevel, string> = {
  beginner: 'border-brand-border bg-brand-primary text-text-on-brand shadow-sm',
  intermediate: 'border-brand-border bg-brand-primary text-text-on-brand shadow-sm',
  advanced: 'border-brand-border bg-brand-primary text-text-on-brand shadow-sm',
}

const SIDEBAR_HEADER_ACTION_CLASS =
  'flex size-8 items-center justify-center rounded-md border border-transparent text-text-muted transition-colors hover:border-surface-border-soft hover:bg-surface-muted hover:text-text-primary'

type SqlQuizSidebarProps = {
  exampleSet: SqlPracticeExampleSet
  selectedExample: SqlPracticeExample | null
  onSelectExample: (example: SqlPracticeExample) => void
  isOpen: boolean
  onToggle: () => void
  submissionStatusByExample: Record<string, SqlPracticeSubmissionStatus>
  totalScore: number
  maxScore: number
  onOpenHistory: () => void
}

export function SqlQuizSidebar({
  exampleSet,
  selectedExample,
  onSelectExample,
  isOpen,
  onToggle,
  submissionStatusByExample,
  totalScore,
  maxScore,
  onOpenHistory,
}: SqlQuizSidebarProps) {
  const { activeLevel, setActiveLevel } = useSqlPracticeSelectionStore()

  const totalCount = LEVEL_ORDER.reduce((sum, level) => sum + exampleSet[level].length, 0)
  const visibleExamples = exampleSet[activeLevel]
  const scorePercent = maxScore > 0 ? Math.min(100, Math.round((totalScore / maxScore) * 100)) : 0

  if (!isOpen) {
    return (
      <div className="flex h-full min-h-0 w-10 shrink-0 flex-col items-center gap-3 rounded-md border border-surface-border bg-surface-raised py-3">
        <button
          type="button"
          className="ui-icon-button size-8"
          onClick={onToggle}
          title="문제 목록 열기"
        >
          <ChevronRight className="size-3.5" />
        </button>
        <div className="flex flex-1 items-center justify-center">
          <span
            className="text-[11px] font-bold text-text-muted"
            style={{ writingMode: 'vertical-rl' }}
          >
            문제 목록
          </span>
        </div>
        {selectedExample && (
          <div className="mb-1 size-2 rounded-full bg-brand-primary" title="문제 선택됨" />
        )}
      </div>
    )
  }

  return (
    <aside className="ui-panel flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden rounded-md p-0">
      <div className="border-b border-surface-border bg-surface-raised px-4 py-3.5">
        <div className="flex h-8 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="min-w-0 truncate text-[15px] font-black leading-none text-text-primary">
              문제 목록
            </h2>
            {totalCount > 0 && (
              <span className="shrink-0 translate-y-px text-[12px] font-bold leading-none tabular-nums text-text-muted">
                {totalCount}문제
              </span>
            )}
          </div>
          <button
            type="button"
            className={SIDEBAR_HEADER_ACTION_CLASS}
            onClick={onToggle}
            title="문제 목록 닫기"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>

        {totalCount > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-md border border-surface-border-soft bg-surface-muted p-1">
            {LEVEL_ORDER.map((level) => {
              const isActive = activeLevel === level
              const count = exampleSet[level].length
              return (
                <button
                  key={level}
                  type="button"
                  disabled={count === 0}
                  onClick={() => setActiveLevel(level)}
                  className={cn(
                    'flex h-8 items-center justify-center rounded-[5px] border text-[11px] font-black transition-colors',
                    isActive
                      ? LEVEL_ACTIVE_BUTTON_CLASS[level]
                      : 'border-transparent text-text-muted hover:bg-surface-raised hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                >
                  {sqlExampleLevelLabels[level]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-surface-strong p-2.5">
        {totalCount === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center p-4 text-center">
            <p className="text-sm font-semibold text-text-primary">문제 준비 중</p>
            <p className="mt-1 text-xs text-text-muted">현재 seed에 문제가 없습니다</p>
          </div>
        ) : visibleExamples.length === 0 ? (
          <div className="flex min-h-[120px] flex-col items-center justify-center p-4 text-center">
            <p className="text-xs text-text-muted">이 레벨의 문제가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-1.5 pt-1">
            {visibleExamples.map((example, idx) => {
              const isActive = selectedExample?.id === example.id
              return (
                <button
                  key={example.id}
                  type="button"
                  onClick={() => onSelectExample(example)}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'grid h-[46px] w-full grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-2 rounded-md border px-2.5 text-left transition-colors',
                    isActive
                      ? 'border-brand-border bg-brand-glass text-brand-primary'
                      : 'border-surface-border-soft bg-surface-raised text-text-primary hover:bg-surface-muted',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-6 w-8 shrink-0 items-center justify-center rounded-md border text-[10px] font-black leading-none tabular-nums',
                      isActive
                        ? 'border-brand-border bg-surface-raised text-brand-primary'
                        : 'border-surface-border-soft bg-surface-muted text-text-muted',
                    )}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 truncate text-[13px] font-semibold leading-none">
                    {example.title}
                  </span>
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    <SubmissionStatusIcon status={submissionStatusByExample[example.id]} />
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-surface-border bg-surface-muted p-3">
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-text-muted">
              총점
            </p>
            <p className="text-sm font-black tabular-nums text-text-primary">
              {totalScore} / {maxScore}
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full bg-brand-primary transition-all"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-2.5 text-[11px] font-bold text-brand-primary transition-colors hover:brightness-110"
            onClick={onOpenHistory}
          >
            <History className="size-3.5" />
            풀이 히스토리
          </button>
        </div>
      </div>
    </aside>
  )
}


function SubmissionStatusIcon({ status }: { status?: SqlPracticeSubmissionStatus }) {
  if (!status) return null

  if (status.isCorrect) {
    return (
      <CheckCircle
        className="size-3.5 shrink-0 text-brand-primary"
        aria-label="정답"
      />
    )
  }

  return (
    <XCircle
      className="size-3.5 shrink-0 text-destructive"
      aria-label="오답"
    />
  )
}
