import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  Clipboard,
  Database,
  Eye,
  EyeOff,
  Lightbulb,
  Table2,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  SqlExampleLevel,
  SqlPracticeExample,
} from '../../../entities/sql-practice/model/example-types'
import type { SqlPracticeSeedSummary } from '../../../entities/sql-practice/model/types'
import {
  getSqlPracticeExampleSet,
  sqlExampleLevelLabels,
} from '../../../features/sql-practice/model/sql-practice-examples'
import {
  useActivateSqlPracticeSeed,
  useSqlPracticeErd,
  useSqlPracticeMeta,
  useSqlPracticeSeeds,
  useSqlPracticeTables,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { SqlErdView } from '../../../features/sql-practice/ui/sql-erd-view'
import { Button } from '../../../shared/ui/button'
import { CompactSelect } from '../../../shared/ui/compact-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../shared/ui/tabs'

type ExampleTab = 'erd' | SqlExampleLevel

const exampleTabs: { value: ExampleTab; label: string }[] = [
  { value: 'erd', label: 'ERD' },
  { value: 'beginner', label: '초보' },
  { value: 'intermediate', label: '중수' },
  { value: 'advanced', label: '고수' },
]

export function SqlPracticeExamplesPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ExampleTab>('erd')
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null)
  const [visibleAnswerIds, setVisibleAnswerIds] = useState<Set<string>>(() => new Set())

  const metaQuery = useSqlPracticeMeta()
  const seedsQuery = useSqlPracticeSeeds()
  const tablesQuery = useSqlPracticeTables()
  const erdQuery = useSqlPracticeErd(metaQuery.data?.seedFile)
  const activateSeedMutation = useActivateSqlPracticeSeed()

  const activeSeed =
    seedsQuery.data?.seeds.find((seed) => seed.isActive) ?? metaQuery.data?.activeSeed
  const seeds = seedsQuery.data?.seeds ?? (activeSeed ? [activeSeed] : [])
  const currentSeedFile = metaQuery.data?.seedFile ?? activeSeed?.fileName ?? ''
  const exampleSet = useMemo(
    () => getSqlPracticeExampleSet(currentSeedFile),
    [currentSeedFile],
  )
  const currentExamples = activeTab === 'erd' ? [] : exampleSet[activeTab]
  const selectedExample =
    currentExamples.find((example) => example.id === selectedExampleId) ?? currentExamples[0]

  useEffect(() => {
    if (activeTab === 'erd') {
      setSelectedExampleId(null)
      return
    }

    const firstExample = exampleSet[activeTab][0]
    if (!firstExample) {
      setSelectedExampleId(null)
      return
    }

    setSelectedExampleId((current) =>
      exampleSet[activeTab].some((example) => example.id === current)
        ? current
        : firstExample.id,
    )
  }, [activeTab, exampleSet])

  const handleSeedChange = async (value: string) => {
    const [source, fileName] = value.split('|')
    const seed = seedsQuery.data?.seeds.find(
      (item) => item.source === source && item.fileName === fileName,
    )
    if (!seed || seed.isActive) return
    await activateSeedMutation.mutateAsync({ source: seed.source, fileName: seed.fileName })
    setActiveTab('erd')
    setVisibleAnswerIds(new Set())
  }

  const toggleAnswer = (exampleId: string) => {
    setVisibleAnswerIds((current) => {
      const next = new Set(current)
      if (next.has(exampleId)) next.delete(exampleId)
      else next.add(exampleId)
      return next
    })
  }

  const handleCopyAnswer = async (answerSql: string) => {
    try {
      await navigator.clipboard.writeText(answerSql)
      toast.success('정답 SQL을 복사했습니다.')
    } catch {
      toast.error('정답 SQL 복사에 실패했습니다.')
    }
  }

  return (
    <section className="space-y-4">
      <div className="ui-panel overflow-hidden rounded-md p-0">
        <div className="flex flex-col gap-4 border-b border-surface-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="ui-icon-button-brand size-10 shrink-0">
              <BookOpenCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-text-primary">SQL 예제</h1>
              <p className="mt-1 text-xs text-text-secondary">
                현재 seed의 ERD와 난이도별 실습 문제를 함께 봅니다.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <CompactSelect
              wrapperClassName="min-w-[260px]"
              value={activeSeed ? `${activeSeed.source}|${activeSeed.fileName}` : ''}
              onChange={(event) => handleSeedChange(event.target.value)}
              disabled={seedsQuery.isLoading || activateSeedMutation.isPending}
              aria-label="SQL 연습 파일 선택"
            >
              {seeds.map((seed) => (
                <option key={`${seed.source}-${seed.fileName}`} value={`${seed.source}|${seed.fileName}`}>
                  {seed.title} · {seed.fileName}
                </option>
              ))}
            </CompactSelect>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate({ to: '/sql' })}
            >
              <ArrowLeft className="size-4" />
              SQL 연습장
            </Button>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryItem
                icon={Database}
                label="현재 seed"
                value={activeSeed?.title ?? (currentSeedFile || '불러오는 중')}
                meta={currentSeedFile || 'practice.sqlite'}
              />
              <SummaryItem
                icon={Table2}
                label="테이블"
                value={`${metaQuery.data?.tableCount ?? tablesQuery.data?.length ?? 0}개`}
                meta={(tablesQuery.data ?? []).map((table) => table.tableName).join(', ') || 'loading'}
              />
              <SummaryItem
                icon={BookOpenCheck}
                label="예제"
                value={`${exampleSet.beginner.length + exampleSet.intermediate.length + exampleSet.advanced.length}개`}
                meta="초보 · 중수 · 고수"
              />
            </div>
          </div>

          <div className="border-t border-surface-border p-5 lg:border-l lg:border-t-0">
            <p className="text-xs font-bold text-text-primary">설명</p>
            <p className="mt-2 text-xs leading-5 text-text-secondary">
              {activeSeed?.description ??
                '현재 SQL 연습 파일 정보를 불러오는 중입니다.'}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ExampleTab)}>
        <div className="ui-panel overflow-hidden rounded-md p-0">
          <div className="border-b border-surface-border px-4 py-3">
            <TabsList>
              {exampleTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="erd" className="p-4">
            <ErdPanel
              seedFileName={currentSeedFile}
              mmd={erdQuery.data?.mmd}
              isLoading={erdQuery.isLoading || metaQuery.isLoading}
            />
          </TabsContent>

          {(['beginner', 'intermediate', 'advanced'] as SqlExampleLevel[]).map((level) => (
            <TabsContent key={level} value={level}>
              <ExampleLevelPanel
                level={level}
                examples={exampleSet[level]}
                selectedExample={activeTab === level ? selectedExample : undefined}
                visibleAnswerIds={visibleAnswerIds}
                onSelectExample={setSelectedExampleId}
                onToggleAnswer={toggleAnswer}
                onCopyAnswer={handleCopyAnswer}
              />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </section>
  )
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: typeof Database
  label: string
  value: string
  meta: string
}) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
      <div className="flex items-center gap-2 text-xs font-bold text-text-secondary">
        <Icon className="size-3.5 text-brand-primary" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-black text-text-primary">{value}</p>
      <p className="mt-1 truncate text-[11px] text-text-muted">{meta}</p>
    </div>
  )
}

function ErdPanel({
  seedFileName,
  mmd,
  isLoading,
}: {
  seedFileName: string
  mmd?: string | null
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-sm font-semibold text-text-secondary">
        ERD를 불러오는 중입니다
      </div>
    )
  }

  if (!mmd) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-6 text-center text-sm font-semibold text-text-secondary">
        {seedFileName || '현재 seed'}에 연결된 ERD가 없습니다.
      </div>
    )
  }

  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-raised p-4">
      <SqlErdView mmd={mmd} />
    </div>
  )
}

function ExampleLevelPanel({
  level,
  examples,
  selectedExample,
  visibleAnswerIds,
  onSelectExample,
  onToggleAnswer,
  onCopyAnswer,
}: {
  level: SqlExampleLevel
  examples: SqlPracticeExample[]
  selectedExample?: SqlPracticeExample
  visibleAnswerIds: Set<string>
  onSelectExample: (exampleId: string) => void
  onToggleAnswer: (exampleId: string) => void
  onCopyAnswer: (answerSql: string) => void
}) {
  if (examples.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-6">
        <div className="max-w-md rounded-md border border-dashed border-surface-border-soft bg-surface-muted px-6 py-8 text-center">
          <BookOpenCheck className="mx-auto mb-3 size-8 text-text-muted" />
          <p className="text-sm font-bold text-text-primary">
            {sqlExampleLevelLabels[level]} 예제 준비 중
          </p>
          <p className="mt-2 text-xs leading-5 text-text-secondary">
            이 seed의 문제 데이터는 아직 추가되지 않았습니다. 예제 구조와 ERD 탭은 그대로 사용할 수 있습니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid min-h-[520px] lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="border-b border-surface-border lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-surface-border bg-surface-muted px-4 py-2.5">
          <p className="text-xs font-bold text-text-primary">
            {sqlExampleLevelLabels[level]} 문제
          </p>
          <span className="rounded-full border border-surface-border-soft bg-background px-2.5 py-0.5 text-[11px] font-black text-text-secondary">
            {examples.length}
          </span>
        </div>
        <div className="space-y-0.5 p-2">
          {examples.map((example) => {
            const isSelected = selectedExample?.id === example.id
            return (
              <button
                key={example.id}
                type="button"
                className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-brand-border bg-brand-glass'
                    : 'border-transparent hover:border-surface-border-soft hover:bg-surface-muted'
                }`}
                onClick={() => onSelectExample(example.id)}
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm text-[10px] font-black tabular-nums ${
                    isSelected
                      ? 'bg-brand-primary text-[var(--color-background)]'
                      : 'border border-surface-border-soft bg-surface-muted text-text-muted'
                  }`}
                >
                  {String(example.order).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <span
                    className={`block truncate text-sm font-bold ${isSelected ? 'text-brand-primary' : 'text-text-primary'}`}
                  >
                    {example.title}
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-text-muted">
                    {example.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-w-0 p-5">
        {selectedExample && (
          <ExampleDetail
            example={selectedExample}
            isAnswerVisible={visibleAnswerIds.has(selectedExample.id)}
            onToggleAnswer={() => onToggleAnswer(selectedExample.id)}
            onCopyAnswer={() => onCopyAnswer(selectedExample.answerSql)}
          />
        )}
      </div>
    </div>
  )
}

function ExampleDetail({
  example,
  isAnswerVisible,
  onToggleAnswer,
  onCopyAnswer,
}: {
  example: SqlPracticeExample
  isAnswerVisible: boolean
  onToggleAnswer: () => void
  onCopyAnswer: () => void
}) {
  return (
    <article className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-black text-brand-primary">
            {sqlExampleLevelLabels[example.level]}
          </span>
          <span className="text-xs font-bold text-text-muted">
            {String(example.order).padStart(2, '0')}
          </span>
        </div>
        <h2 className="mt-2.5 text-xl font-black text-text-primary">{example.title}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{example.description}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {example.relatedTables.map((tableName) => (
          <span
            key={tableName}
            className="inline-flex items-center gap-1 rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-bold text-text-secondary"
          >
            <Table2 className="size-3" />
            {tableName}
          </span>
        ))}
      </div>

      <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
          <Lightbulb className="size-3.5 text-brand-primary" />
          힌트
        </div>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{example.hint}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" className="gap-1.5" onClick={onToggleAnswer}>
          {isAnswerVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {isAnswerVisible ? '정답 숨기기' : '정답 보기'}
        </Button>
        {isAnswerVisible && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onCopyAnswer}>
            <Clipboard className="size-4" />
            SQL 복사
          </Button>
        )}
      </div>

      {isAnswerVisible && (
        <div className="space-y-4">
          <pre className="max-w-full overflow-x-auto rounded-md border border-surface-border-soft bg-surface-muted p-4 font-mono text-xs leading-5 text-text-primary">
            {example.answerSql}
          </pre>
          <div className="relative overflow-hidden rounded-md border border-surface-border-soft bg-surface-raised px-5 py-4">
            <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-brand-primary" />
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-sm border border-brand-border bg-brand-glass px-2 py-0.5 text-[11px] font-black text-brand-primary">
              <CheckCircle2 className="size-3.5" />
              해설
            </div>
            <p className="text-sm leading-6 text-text-primary">{example.explanation}</p>
          </div>
        </div>
      )}
    </article>
  )
}
