import { useMemo, useState } from 'react'
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Lightbulb,
  Table2,
  Trash2,
  X,
} from 'lucide-react'

import type {
  SqlExampleLevel,
  SqlPracticeExample,
} from '../../../entities/sql-practice/model/example-types'
import { cn } from '../../../shared/lib/utils'
import {
  getSqlPracticeExampleSet,
  sqlExampleLevelLabels,
} from '../model/sql-practice-examples'

type QuizMode = 'idle' | 'level-picker' | 'active'

type SqlPracticePageHeaderProps = {
  seedFile?: string
  hasHistory: boolean
  onClearHistory: () => void
}

const levelOrder: SqlExampleLevel[] = ['beginner', 'intermediate', 'advanced']

export function SqlPracticePageHeader({
  seedFile,
  hasHistory,
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
      <div className="grid gap-4 rounded-md bg-text-primary px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
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
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-text-primary px-4 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Database className="size-3.5 shrink-0 text-background/70" />
        <h1 className="text-sm font-black text-background">SQL 연습장</h1>
      </div>

      <div className="flex items-center gap-1.5">
        {mode === 'level-picker' ? (
          <LevelPicker
            exampleSet={exampleSet}
            onSelectLevel={startLevel}
            onClose={closeQuiz}
          />
        ) : (
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-background/20 bg-background/10 px-2.5 text-xs font-bold text-background transition-colors hover:bg-background/20"
            onClick={() => setMode('level-picker')}
          >
            <BookOpenCheck className="size-3" />
            문제 풀기
          </button>
        )}

        {hasHistory && (
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-md border border-background/20 bg-background/10 text-background/80 transition-colors hover:bg-background/20"
            onClick={onClearHistory}
            aria-label="히스토리 비우기"
            title="히스토리 비우기"
          >
            <Trash2 className="size-3" />
          </button>
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
        className="flex size-8 items-center justify-center rounded-md border border-background/20 bg-background/10 text-background/80 transition-colors hover:bg-background/20"
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
    <div className="min-w-0 rounded-md border border-background/15 bg-background/10 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-sm border border-background/20 bg-background px-2 py-0.5 text-[11px] font-black text-text-primary">
          문제
        </span>
        <span className="rounded-sm border border-background/20 bg-background/10 px-2 py-0.5 text-[11px] font-bold text-background/80">
          {sqlExampleLevelLabels[example.level]}
        </span>
        <span className="text-xs font-bold tabular-nums text-background/60">
          Q.{String(currentIndex + 1).padStart(2, '0')} / {total}
        </span>
      </div>

      <h1 className="line-clamp-2 text-lg font-black leading-snug text-background">
        {example.title}
      </h1>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-background/75">
        {example.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {example.relatedTables.map((tableName) => (
          <span
            key={tableName}
            className="inline-flex items-center gap-1 rounded-sm border border-background/15 bg-background/10 px-2 py-1 text-[11px] font-bold text-background/75"
          >
            <Table2 className="size-3" />
            {tableName}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-md border border-background/15 bg-background/10 px-3 py-2">
        <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-background/80" />
        <p className="line-clamp-2 text-[11px] leading-5 text-background/65">{example.hint}</p>
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
    <div className="min-w-0 rounded-md border border-background/15 bg-background/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black text-background/60">정답</p>
          <p className="text-xs font-bold text-background">
            {sqlExampleLevelLabels[level]} {currentIndex + 1}번
          </p>
        </div>

        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md border border-background/20 bg-background/10 text-background/80 transition-colors hover:bg-background/20"
          onClick={onClose}
          aria-label="문제 풀이 닫기"
          title="닫기"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-[32px_1fr_32px] items-center gap-2">
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md border border-background/20 bg-background/10 text-background transition-colors hover:bg-background/20 disabled:cursor-not-allowed disabled:opacity-40"
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
            'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-colors',
            answerOpen
              ? 'border-background bg-background text-text-primary'
              : 'border-background/20 bg-background/10 text-background hover:bg-background/20',
          )}
        >
          {answerOpen ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {answerOpen ? '정답 숨기기' : '정답 보기'}
        </button>

        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-md border border-background/20 bg-background/10 text-background transition-colors hover:bg-background/20 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onNext}
          disabled={currentIndex >= total - 1}
          aria-label="다음 문제"
          title="다음 문제"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <p className="mt-2 text-center text-[11px] font-bold tabular-nums text-background/55">
        {currentIndex + 1} / {total}
      </p>

      {answerOpen && (
        <div className="mt-3 space-y-2">
          <pre className="max-h-56 overflow-auto rounded-md border border-background/20 bg-background p-3 font-mono text-[11px] leading-5 text-text-primary">
            {example.answerSql}
          </pre>
          <div className="rounded-md border border-background/15 bg-background/10 px-3 py-2">
            <p className="text-[11px] font-black text-background/70">해설</p>
            <p className="mt-1 text-[11px] leading-5 text-background/70">
              {example.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
