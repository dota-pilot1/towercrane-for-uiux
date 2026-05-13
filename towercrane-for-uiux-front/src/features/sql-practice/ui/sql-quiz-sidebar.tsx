import { BookOpenCheck, ChevronLeft, ChevronRight } from 'lucide-react'

import type {
  SqlExampleLevel,
  SqlPracticeExample,
  SqlPracticeExampleSet,
} from '../../../entities/sql-practice/model/example-types'
import { cn } from '../../../shared/lib/utils'
import { sqlExampleLevelLabels } from '../model/sql-practice-examples'

const LEVEL_ORDER: SqlExampleLevel[] = ['beginner', 'intermediate', 'advanced']

const LEVEL_BADGE_CLASS: Record<SqlExampleLevel, string> = {
  beginner: 'border-brand-border bg-brand-glass text-brand-primary',
  intermediate: 'border-surface-border bg-surface-muted text-text-secondary',
  advanced: 'border-surface-border bg-surface-strong text-text-primary',
}

type SqlQuizSidebarProps = {
  exampleSet: SqlPracticeExampleSet
  selectedExample: SqlPracticeExample | null
  onSelectExample: (example: SqlPracticeExample) => void
  isOpen: boolean
  onToggle: () => void
}

export function SqlQuizSidebar({
  exampleSet,
  selectedExample,
  onSelectExample,
  isOpen,
  onToggle,
}: SqlQuizSidebarProps) {
  const totalCount = LEVEL_ORDER.reduce((sum, level) => sum + exampleSet[level].length, 0)

  if (!isOpen) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center gap-3 rounded-md border border-surface-border bg-surface-raised py-3">
        <button
          type="button"
          className="ui-icon-button size-7"
          onClick={onToggle}
          title="문제 목록 열기"
        >
          <ChevronRight className="size-4" />
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
    <aside className="ui-panel flex w-64 shrink-0 flex-col overflow-hidden rounded-md p-0">
      <div className="flex items-center justify-between border-b border-surface-border px-3 py-3">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="size-4 text-brand-primary" />
          <h2 className="text-sm font-bold text-text-primary">문제 목록</h2>
          {totalCount > 0 && (
            <span className="rounded-sm border border-brand-border bg-brand-glass px-1.5 py-0.5 text-[10px] font-black text-brand-primary">
              {totalCount}
            </span>
          )}
        </div>
        <button
          type="button"
          className="ui-icon-button size-7"
          onClick={onToggle}
          title="문제 목록 닫기"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {totalCount === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center p-4 text-center">
            <p className="text-sm font-semibold text-text-primary">문제 준비 중</p>
            <p className="mt-1 text-xs text-text-muted">현재 seed에 문제가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {LEVEL_ORDER.map((level) => {
              const examples = exampleSet[level]
              if (examples.length === 0) return null
              return (
                <div key={level}>
                  <div className="mb-1.5 flex items-center gap-2 px-1">
                    <span
                      className={cn(
                        'rounded-sm border px-2 py-0.5 text-[10px] font-black',
                        LEVEL_BADGE_CLASS[level],
                      )}
                    >
                      {sqlExampleLevelLabels[level]}
                    </span>
                    <span className="text-[11px] text-text-muted">{examples.length}문제</span>
                  </div>
                  <div className="space-y-0.5">
                    {examples.map((example, idx) => {
                      const isActive = selectedExample?.id === example.id
                      return (
                        <button
                          key={example.id}
                          type="button"
                          onClick={() => onSelectExample(example)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors',
                            isActive
                              ? 'border-brand-border bg-brand-glass text-brand-primary'
                              : 'border-transparent text-text-primary hover:border-surface-border-soft hover:bg-surface-muted',
                          )}
                        >
                          <span className="shrink-0 text-[10px] font-black tabular-nums text-text-muted">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                            {example.title}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
