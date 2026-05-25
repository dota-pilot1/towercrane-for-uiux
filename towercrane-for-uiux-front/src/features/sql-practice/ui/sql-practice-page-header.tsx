import { useMemo, useState } from 'react'
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Lightbulb,
  NotebookPen,
  Table2,
  Trash2,
  X,
} from 'lucide-react'

import type {
  SqlExampleLevel,
  SqlPracticeExample,
} from '../../../entities/sql-practice/model/example-types'
import { cn } from '../../../shared/lib/utils'
import { Button } from '../../../shared/ui/button'
import {
  getSqlPracticeExampleSet,
  sqlExampleLevelLabels,
} from '../model/sql-practice-examples'

type QuizMode = 'idle' | 'level-picker' | 'active'

type SqlPracticePageHeaderProps = {
  seedFile?: string
  hasHistory: boolean
  onOpenNotes: () => void
  onClearHistory: () => void
}

const levelOrder: SqlExampleLevel[] = ['beginner', 'intermediate', 'advanced']

export function SqlPracticePageHeader({
  seedFile,
  hasHistory,
  onOpenNotes,
  onClearHistory,
}: SqlPracticePageHeaderProps) {
  const [mode, setMode] = useState<QuizMode>('idle')
  const [level, setLevel] = useState<SqlExampleLevel | null>(null)
  const [index, setIndex] = useState(0)
  const [answerOpen, setAnswerOpen] = useState(false)

  const exampleSet = useMemo(
    () => getSqlPracticeExampleSet(seedFile ?? '01_board_basic.sql'),
    [seedFile],
  )
  const examples = level ? exampleSet[level] : []
  const currentExample = examples[index]

  const startLevel = (nextLevel: SqlExampleLevel) => {
    const nextExamples = exampleSet[nextLevel]
    if (nextExamples.length === 0) return

    setLevel(nextLevel)
    setIndex(0)
    setAnswerOpen(false)
    setMode('active')
  }

  const move = (direction: -1 | 1) => {
    setIndex((current) => {
      const next = Math.min(Math.max(current + direction, 0), examples.length - 1)
      if (next !== current) setAnswerOpen(false)
      return next
    })
  }

  const closeQuiz = () => {
    setMode('idle')
    setLevel(null)
    setIndex(0)
    setAnswerOpen(false)
  }

  if (mode === 'active' && level && currentExample) {
    return (
      <div className="grid gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <QuizProblemPanel
          example={currentExample}
          total={examples.length}
          currentIndex={index}
        />

        <QuizAnswerPanel
          example={currentExample}
          level={level}
          currentIndex={index}
          total={examples.length}
          answerOpen={answerOpen}
          onToggleAnswer={() => setAnswerOpen((open) => !open)}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
          onClose={closeQuiz}
        />
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-glass px-6 py-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-primary-foreground shadow-sm">
          <Database className="size-5" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-lg font-bold tracking-tight text-text-primary">SQL 연습장(공식)</h1>
          <p className="text-xs ui-text-secondary">
            공식 데이터베이스 환경에서 다양한 예제 문제들을 연습합니다.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenNotes}
        >
          <NotebookPen className="mr-1 size-3.5" />
          SQL 노트
        </Button>

        {mode === 'level-picker' ? (
          <LevelPicker
            exampleSet={exampleSet}
            onSelectLevel={startLevel}
            onClose={closeQuiz}
          />
        ) : (
          <Button
            size="sm"
            onClick={() => setMode('level-picker')}
          >
            <BookOpenCheck className="mr-1 size-3.5" />
            문제 풀기
          </Button>
        )}

        {hasHistory && (
          <Button
            variant="secondary"
            tone="danger"
            size="sm"
            onClick={onClearHistory}
            aria-label="히스토리 비우기"
            title="히스토리 비우기"
            className="px-2"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

function LevelPicker({
  exampleSet,
  onSelectLevel,
  onClose,
}: {
  exampleSet: ReturnType<typeof getSqlPracticeExampleSet>
  onSelectLevel: (level: SqlExampleLevel) => void
  onClose: () => void
}) {
  const totalCount = levelOrder.reduce((sum, level) => sum + exampleSet[level].length, 0)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {levelOrder.map((level) => {
        const count = exampleSet[level].length
        return (
          <button
            key={level}
            type="button"
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-colors',
              count > 0
                ? 'border-background/20 bg-background/10 text-background hover:bg-background/20'
                : 'cursor-not-allowed border-background/10 bg-background/5 text-background/40',
            )}
            onClick={() => onSelectLevel(level)}
            disabled={count === 0}
          >
            {sqlExampleLevelLabels[level]}
            <span className="rounded-sm bg-background px-1.5 py-0.5 text-[10px] font-black text-text-primary">
              {count}
            </span>
          </button>
        )
      })}

      {totalCount === 0 && (
        <span className="text-xs font-semibold text-background/60">현재 seed 문제 준비 중</span>
      )}

      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-md border border-surface-border bg-surface-muted text-text-secondary transition-colors hover:bg-surface-border"
        onClick={onClose}
        aria-label="문제 선택 닫기"
        title="닫기"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

function QuizProblemPanel({
  example,
  currentIndex,
  total,
}: {
  example: SqlPracticeExample
  currentIndex: number
  total: number
}) {
  return (
    <div className="min-w-0 rounded-xl border border-surface-border-soft bg-surface-raised p-5 shadow-2xs">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-black text-brand-primary">
          문제
        </span>
        <span className="rounded-sm border border-surface-border bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
          {sqlExampleLevelLabels[example.level]}
        </span>
        <span className="text-xs font-bold tabular-nums text-text-secondary">
          Q.{String(currentIndex + 1).padStart(2, '0')} / {total}
        </span>
      </div>

      <h2 className="line-clamp-2 text-base font-extrabold leading-snug text-text-primary">
        {example.title}
      </h2>
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-text-secondary">
        {example.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {example.relatedTables.map((tableName) => (
          <span
            key={tableName}
            className="inline-flex items-center gap-1 rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-semibold text-text-secondary"
          >
            <Table2 className="size-3 text-brand-primary" />
            {tableName}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-border bg-brand-glass px-3.5 py-3">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-primary" />
        <p className="text-[11px] leading-relaxed text-text-secondary font-medium">{example.hint}</p>
      </div>
    </div>
  )
}

function QuizAnswerPanel({
  example,
  level,
  currentIndex,
  total,
  answerOpen,
  onToggleAnswer,
  onPrev,
  onNext,
  onClose,
}: {
  example: SqlPracticeExample
  level: SqlExampleLevel
  currentIndex: number
  total: number
  answerOpen: boolean
  onToggleAnswer: () => void
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  return (
    <div className="min-w-0 rounded-xl border border-surface-border-soft bg-surface-raised p-5 shadow-2xs">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold text-text-muted">정답</p>
          <p className="text-xs font-black text-text-primary">
            {sqlExampleLevelLabels[level]} {currentIndex + 1}번
          </p>
        </div>

        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-lg border border-surface-border bg-surface-muted text-text-secondary transition-colors hover:bg-brand-glass hover:text-brand-primary"
          onClick={onClose}
          aria-label="문제 풀이 닫기"
          title="닫기"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg border border-surface-border bg-surface-muted text-text-secondary transition-colors hover:bg-brand-glass hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onPrev}
          disabled={currentIndex === 0}
          aria-label="이전 문제"
          title="이전 문제"
        >
          <ChevronLeft className="size-4" />
        </button>

        <button
          type="button"
          onClick={onToggleAnswer}
          className={cn(
            'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-all duration-200',
            answerOpen
              ? 'border-brand-border bg-brand-glass text-brand-primary shadow-xs'
              : 'border-surface-border bg-surface-muted text-text-secondary hover:bg-brand-glass hover:text-brand-primary',
          )}
        >
          {answerOpen ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {answerOpen ? '정답 숨기기' : '정답 보기'}
        </button>

        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg border border-surface-border bg-surface-muted text-text-secondary transition-colors hover:bg-brand-glass hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onNext}
          disabled={currentIndex >= total - 1}
          aria-label="다음 문제"
          title="다음 문제"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] font-bold tabular-nums text-text-muted">
        {currentIndex + 1} / {total}
      </p>

      {answerOpen && (
        <div className="mt-3 space-y-2">
          <pre className="max-h-56 overflow-auto rounded-lg border border-surface-border bg-surface-muted p-3 font-mono text-[11px] leading-5 text-text-primary">
            {example.answerSql}
          </pre>
          <div className="rounded-lg border border-brand-border/40 bg-brand-glass/30 px-3 py-2">
            <p className="text-[11px] font-black text-brand-primary">해설</p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
              {example.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
