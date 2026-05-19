import { CheckCircle, History, XCircle } from 'lucide-react'

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

type SqlMobileProblemCarouselProps = {
  exampleSet: SqlPracticeExampleSet
  selectedExample: SqlPracticeExample | null
  submissionStatusByExample: Record<string, SqlPracticeSubmissionStatus>
  totalScore: number
  maxScore: number
  onSelectExample: (example: SqlPracticeExample) => void
  onOpenHistory: () => void
}

export function SqlMobileProblemCarousel({
  exampleSet,
  selectedExample,
  submissionStatusByExample,
  totalScore,
  maxScore,
  onSelectExample,
  onOpenHistory,
}: SqlMobileProblemCarouselProps) {
  const { activeLevel, setActiveLevel } = useSqlPracticeSelectionStore()
  const visibleExamples = exampleSet[activeLevel] ?? exampleSet['beginner']
  const totalCount = LEVEL_ORDER.reduce((sum, level) => sum + exampleSet[level].length, 0)

  return (
    <section className="ui-panel-soft min-w-0 overflow-hidden rounded-md bg-surface-raised">
      <div className="flex items-center justify-between gap-2 border-b border-surface-border-soft px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-black text-text-primary">문제 선택</p>
          <p className="text-[11px] font-semibold text-text-muted">
            {totalScore} / {maxScore}점 · {totalCount}문제
          </p>
        </div>
        <button
          type="button"
          className="ui-icon-button h-8 shrink-0 gap-1.5 px-2.5 text-[11px] font-bold"
          onClick={onOpenHistory}
          title="풀이 히스토리"
        >
          <History className="size-3.5" />
          히스토리
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1 border-b border-surface-border-soft bg-surface-muted p-1">
        {LEVEL_ORDER.map((level) => {
          const isActive = activeLevel === level
          const count = exampleSet[level].length
          return (
            <button
              key={level}
              type="button"
              className={cn(
                'flex h-8 items-center justify-center gap-1 rounded-[5px] border text-[11px] font-black transition-colors',
                isActive
                  ? 'border-brand-border bg-brand-primary text-text-on-brand'
                  : 'border-transparent text-text-muted hover:bg-surface-raised hover:text-text-primary',
              )}
              disabled={count === 0}
              onClick={() => setActiveLevel(level)}
            >
              {sqlExampleLevelLabels[level]}
              <span className="text-[10px] opacity-80">{count}</span>
            </button>
          )
        })}
      </div>

      {visibleExamples.length === 0 ? (
        <div className="flex h-24 items-center justify-center px-3 text-xs font-semibold text-text-muted">
          이 레벨의 문제가 없습니다
        </div>
      ) : (
        <div className="flex snap-x gap-2 overflow-x-auto px-3 py-3">
          {visibleExamples.map((example, index) => {
            const isActive = selectedExample?.id === example.id
            const status = submissionStatusByExample[example.id]
            return (
              <button
                key={example.id}
                type="button"
                className={cn(
                  'grid h-24 w-[72vw] max-w-[280px] shrink-0 snap-start grid-rows-[auto_minmax(0,1fr)_auto] rounded-md border p-3 text-left transition-colors',
                  isActive
                    ? 'border-brand-border bg-brand-glass text-brand-primary'
                    : 'border-surface-border-soft bg-surface-raised text-text-primary',
                )}
                onClick={() => onSelectExample(example)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[10px] font-black tabular-nums text-text-muted">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <SubmissionStatusIcon status={status} />
                </div>
                <p className="mt-2 line-clamp-2 min-w-0 text-sm font-black leading-5">
                  {example.title}
                </p>
                <p className="mt-1 truncate text-[11px] font-semibold text-text-muted">
                  {example.relatedTables.join(', ')}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function SubmissionStatusIcon({ status }: { status?: SqlPracticeSubmissionStatus }) {
  if (!status) return <span className="size-4" />
  if (status.isCorrect) {
    return <CheckCircle className="size-4 shrink-0 text-brand-primary" aria-label="정답" />
  }
  return <XCircle className="size-4 shrink-0 text-destructive" aria-label="오답" />
}
