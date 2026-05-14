import {
  BookOpenCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'

import type { SqlPracticeSubmissionStatus } from '../../../entities/sql-practice/model/types'
import type {
  SqlExampleLevel,
  SqlPracticeExample,
  SqlPracticeExampleSet,
} from '../../../entities/sql-practice/model/example-types'
import { cn } from '../../../shared/lib/utils'
import { sqlExampleLevelLabels } from '../model/sql-practice-examples'

const LEVEL_ORDER: SqlExampleLevel[] = ['beginner', 'intermediate', 'advanced']

const LEVEL_ACTIVE_BUTTON_CLASS: Record<SqlExampleLevel, string> = {
  beginner: 'border-brand-border bg-brand-glass text-brand-primary',
  intermediate: 'border-accent/50 bg-accent text-accent-foreground',
  advanced: 'border-destructive/30 bg-danger-glass text-destructive',
}

type SqlQuizSidebarProps = {
  exampleSet: SqlPracticeExampleSet
  selectedExample: SqlPracticeExample | null
  onSelectExample: (example: SqlPracticeExample) => void
  onOpenNotes: () => void
  isOpen: boolean
  onToggle: () => void
  submissionStatusByExample: Record<string, SqlPracticeSubmissionStatus>
  totalScore: number
  maxScore: number
  onOpenRanking: () => void
}

export function SqlQuizSidebar({
  exampleSet,
  selectedExample,
  onSelectExample,
  onOpenNotes,
  isOpen,
  onToggle,
  submissionStatusByExample,
  totalScore,
  maxScore,
  onOpenRanking,
}: SqlQuizSidebarProps) {
  const [activeLevel, setActiveLevel] = useState<SqlExampleLevel>('beginner')

  const totalCount = LEVEL_ORDER.reduce((sum, level) => sum + exampleSet[level].length, 0)
  const visibleExamples = exampleSet[activeLevel]

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
    <aside className="ui-panel flex h-full min-h-0 w-64 shrink-0 flex-col overflow-hidden rounded-md p-0">
      <div className="border-b border-surface-border px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-8 min-w-0 items-center gap-1.5">
            <span className="flex size-6 shrink-0 items-center justify-center text-brand-primary">
              <BookOpenCheck className="size-4" />
            </span>
            <h2 className="shrink-0 text-sm font-bold leading-none text-text-primary">
              문제 목록
            </h2>
            {totalCount > 0 && (
              <span className="ml-1 inline-flex h-6 min-w-7 shrink-0 items-center justify-center rounded-md border border-brand-border bg-brand-glass px-2 text-[11px] font-black tabular-nums text-brand-primary">
                {totalCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="ui-icon-button size-8"
              onClick={onOpenNotes}
              title="SQL 노트 열기"
            >
              <NotebookPen className="size-3.5" />
            </button>
            <button
              type="button"
              className="ui-icon-button size-8"
              onClick={onToggle}
              title="문제 목록 닫기"
            >
              <ChevronLeft className="size-3.5" />
            </button>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="mt-3 flex gap-1.5">
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
                    'flex h-8 flex-1 items-center justify-center rounded-md border text-[11px] font-black transition-colors',
                    isActive
                      ? LEVEL_ACTIVE_BUTTON_CLASS[level]
                      : 'border-surface-border-soft bg-surface-muted text-text-muted hover:border-surface-border hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                >
                  {sqlExampleLevelLabels[level]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
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
          <div className="space-y-0.5 pt-1">
            {visibleExamples.map((example, idx) => {
              const isActive = selectedExample?.id === example.id
              return (
                <button
                  key={example.id}
                  type="button"
                  onClick={() => onSelectExample(example)}
                  className={cn(
                    'flex h-9 w-full items-center gap-2 rounded-md border px-3 text-left transition-colors',
                    isActive
                      ? 'border-brand-border bg-brand-glass text-brand-primary'
                      : 'border-transparent text-text-primary hover:border-surface-border-soft hover:bg-surface-muted',
                  )}
                >
                  <span className="inline-flex h-5 w-6 shrink-0 items-center justify-center text-[10px] font-black tabular-nums text-text-muted">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {example.title}
                  </span>
                  <SubmissionStatusIcon status={submissionStatusByExample[example.id]} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-surface-border bg-surface-muted p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-text-muted">
              총점
            </p>
            <p className="mt-0.5 text-sm font-black tabular-nums text-text-primary">
              {totalScore} / {maxScore}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-2.5 text-[11px] font-bold text-brand-primary transition-colors hover:brightness-110"
            onClick={onOpenRanking}
          >
            <Trophy className="size-3.5" />
            랭킹 보기
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
