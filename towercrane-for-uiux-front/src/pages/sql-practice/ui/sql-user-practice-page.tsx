import * as Dialog from '@radix-ui/react-dialog'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
  type TextareaHTMLAttributes,
} from 'react'
import {
  CheckCircle,
  Clipboard,
  Database,
  FileUp,
  FileText,
  Info,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  Send,
  Sparkles,
  Table2,
  Trash2,
  WandSparkles,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import type {
  SqlExecuteResponse,
  SqlPracticeSubmissionStatus,
  SqlUserPracticeGradeResponse,
  SqlUserPracticeProblemPayload,
  TableInfo,
} from '../../../entities/sql-practice/model/types'
import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'
import { formatSqlQuery } from '../../../features/sql-practice/lib/format-sql'
import {
  useCreateSqlUserPracticeProblem,
  useCreateSqlPersonalPracticeProblem,
  useDeleteSqlPersonalPracticeProblem,
  useExecuteSqlPersonalPracticeQuery,
  useGenerateSqlUserPracticeAnswer,
  useGenerateSqlPersonalPracticeAnswer,
  useGradeSqlPersonalPracticeProblem,
  useGradeSqlUserPracticeProblem,
  useReplaceSqlPersonalPracticeSchemaVersion,
  useShareSqlPersonalPracticeProblem,
  useSqlPersonalDefaultWorkspace,
  useSqlPersonalPracticeErd,
  useSqlPersonalPracticeMeta,
  useSqlPersonalPracticeProblems,
  useSqlPersonalPracticeTables,
  useResetSqlUserPracticeDb,
  useSqlUserPracticeErd,
  useSqlUserPracticeMeta,
  useSqlUserPracticeProblems,
  useSqlUserPracticeSubmissions,
  useSqlUserPracticeTables,
  useUnshareSqlPersonalPracticeProblem,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { SqlAutocompleteTextarea } from '../../../features/sql-practice/ui/sql-autocomplete-textarea'
import { SqlErdDialog } from '../../../features/sql-practice/ui/sql-erd-dialog'
import { SqlResultTable } from '../../../features/sql-practice/ui/sql-result-table'
import { SqlTableSchemaDialog } from '../../../features/sql-practice/ui/sql-table-schema-dialog'
import { SqlPersonalSchemaReplaceDialog } from './sql-personal-schema-replace-dialog'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { useSessionStore } from '../../../shared/store/session-store'

type SqlUserPracticePageProps = {
  mode: 'user' | 'personal'
}

type LevelFilter = 'all' | number

const EMPTY_TABLES: TableInfo[] = []
const SQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WITH',
  'AS',
  'JOIN',
  'LEFT JOIN',
  'INNER JOIN',
  'ON',
  'WHERE',
  'AND',
  'OR',
  'LIKE',
  'IN',
  'NOT IN',
  'IS NULL',
  'IS NOT NULL',
  'GROUP BY',
  'HAVING',
  'COUNT(*)',
  'SUM()',
  'AVG()',
  'MAX()',
  'MIN()',
  'COALESCE()',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'ORDER BY',
  'ASC',
  'DESC',
  'LIMIT',
  'OFFSET',
  'DISTINCT',
  'UNION',
  'UNION ALL',
] as const

const initialForm: SqlUserPracticeProblemPayload = {
  title: '',
  description: '',
  level: 1,
  targetTables: [],
  starterSql: '',
  answerSql: 'SELECT ...\nFROM ...;',
  explanation: '',
  visibility: 'public',
  status: 'published',
}

export function SqlUserPracticePage({ mode }: SqlUserPracticePageProps) {
  if (mode === 'personal') return <SqlPersonalPracticeWorkspace />

  return <SqlUserPracticeWorkspace />
}

function SqlUserPracticeWorkspace() {
  const userId = useSessionStore((state) => state.userId)
  const [levelFilter, setLevelFilter] = useState<LevelFilter>(1)
  const [mineOnly, setMineOnly] = useState(false)
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [erdOpen, setErdOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<SqlUserPracticeProblemPayload>(initialForm)
  const [targetTablesText, setTargetTablesText] = useState('')
  const [query, setQuery] = useState('')
  const [lastResult, setLastResult] = useState<SqlExecuteResponse | null>(null)
  const [gradeResult, setGradeResult] = useState<SqlUserPracticeGradeResponse | null>(null)
  const queryTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const metaQuery = useSqlUserPracticeMeta()
  const tablesQuery = useSqlUserPracticeTables()
  const erdQuery = useSqlUserPracticeErd()
  const problemsQuery = useSqlUserPracticeProblems({
    level: levelFilter === 'all' ? undefined : levelFilter,
    mine: mineOnly,
  })
  const submissionsQuery = useSqlUserPracticeSubmissions()
  const resetMutation = useResetSqlUserPracticeDb()
  const createProblemMutation = useCreateSqlUserPracticeProblem()
  const generateAnswerMutation = useGenerateSqlUserPracticeAnswer()
  const gradeProblemMutation = useGradeSqlUserPracticeProblem()

  const tables = tablesQuery.data ?? EMPTY_TABLES
  const problems = useMemo(
    () => problemsQuery.data?.problems ?? [],
    [problemsQuery.data?.problems],
  )
  const submissionStatusByProblem = submissionsQuery.data?.byExample ?? {}
  const totalScore = problems.reduce(
    (sum, problem) => sum + (submissionStatusByProblem[problem.id]?.isCorrect ? 1 : 0),
    0,
  )
  const scorePercent =
    problems.length > 0 ? Math.min(100, Math.round((totalScore / problems.length) * 100)) : 0
  const schema = problemsQuery.data?.schema
  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.id === selectedProblemId) ?? problems[0] ?? null,
    [problems, selectedProblemId],
  )
  const selectedTargetTables = useMemo(() => {
    if (!selectedProblem) return []
    const targets = new Set(selectedProblem.targetTables)
    return tables.filter((table) => targets.has(table.tableName))
  }, [selectedProblem, tables])

  const handleRefresh = () => {
    metaQuery.refetch()
    tablesQuery.refetch()
    problemsQuery.refetch()
  }

  const handleReset = async () => {
    if (!window.confirm('유저 연습장 DB를 기본 커머스 데이터로 다시 만들까요?')) return
    await resetMutation.mutateAsync()
    setLastResult(null)
    handleRefresh()
  }

  const handleExecute = async () => {
    const trimmed = query.trim()
    if (!trimmed || !selectedProblem) return
    const response = await gradeProblemMutation.mutateAsync({
      id: selectedProblem.id,
      payload: { submittedSql: trimmed },
    })
    setLastResult(response.execution)
    setGradeResult(response)
  }

  const handleCreateProblem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const targetTables = targetTablesText
      .split(',')
      .map((table) => table.trim())
      .filter(Boolean)

    await createProblemMutation.mutateAsync({
      ...form,
      targetTables,
      starterSql: form.starterSql?.trim() || undefined,
      explanation: form.explanation?.trim() || undefined,
    })

    setForm(initialForm)
    setTargetTablesText('')
    setFormOpen(false)
  }

  const handleGenerateAnswer = async () => {
    const targetTables = targetTablesText
      .split(',')
      .map((table) => table.trim())
      .filter(Boolean)
    const response = await generateAnswerMutation.mutateAsync({
      title: form.title.trim() || undefined,
      description: form.description,
      level: form.level,
      targetTables,
    })

    setForm((current) => ({
      ...current,
      answerSql: response.answerSql,
      explanation: current.explanation?.trim() ? current.explanation : (response.explanation ?? ''),
    }))
  }

  const handleSelectUserProblem = (problem: (typeof problems)[number]) => {
    setSelectedProblemId(problem.id)
    setQuery(problem.starterSql || '')
    setLastResult(null)
    setGradeResult(null)
  }

  return (
    <section className="space-y-4 pb-16">
      <div className="flex items-center justify-between rounded-md border border-surface-border bg-surface-strong px-4 py-3">
        <div className="flex items-center gap-2">
          <Database className="size-4 text-brand-primary" />
          <h1 className="text-sm font-black">SQL 연습장(유저)</h1>
          <span className="text-xs font-semibold text-text-muted">
            {schema ? `v${schema.version} · 커머스 운영 DB` : '커머스 운영 DB'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="ui-icon-button h-8 gap-1.5 px-3 text-xs"
            onClick={handleRefresh}
            disabled={metaQuery.isFetching || tablesQuery.isFetching || problemsQuery.isFetching}
          >
            <RefreshCw
              className={`size-3.5 ${
                metaQuery.isFetching || tablesQuery.isFetching || problemsQuery.isFetching
                  ? 'animate-spin'
                  : ''
              }`}
            />
            새로고침
          </button>
          <button
            type="button"
            className="ui-icon-button h-8 gap-1.5 px-3 text-xs"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            <RotateCcw className={`size-3.5 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
            DB 리셋
          </button>
        </div>
      </div>

      <div className="grid h-[calc(100dvh-220px)] min-h-0 gap-4 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <Card className="flex min-h-0 flex-col overflow-hidden rounded-md p-0">
          <div className="border-b border-surface-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-text-primary">문제 목록</h2>
                <p className="mt-1 text-xs font-semibold text-text-muted">{problems.length}문제</p>
              </div>
              <Button size="sm-icon" tone="brand" onClick={() => setFormOpen((value) => !value)}>
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-1">
              {([1, 2, 3, 4, 5, 'all'] as LevelFilter[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`h-8 rounded-sm border text-xs font-black ${
                    levelFilter === level
                      ? 'border-brand-border bg-brand-primary text-text-on-brand'
                      : 'border-surface-border-soft bg-surface-muted text-text-secondary'
                  }`}
                  onClick={() => setLevelFilter(level)}
                >
                  {level === 'all' ? 'All' : level}
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <input
                type="checkbox"
                className="size-4 accent-[var(--brand-primary)]"
                checked={mineOnly}
                onChange={(event) => setMineOnly(event.target.checked)}
              />
              내가 만든 문제만
            </label>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {problemsQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center text-text-muted">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : problems.length === 0 ? (
              <div className="rounded-md border border-dashed border-surface-border-soft p-4 text-sm text-text-muted">
                등록된 문제가 없습니다.
              </div>
            ) : (
              <div className="space-y-1.5">
                {problems.map((problem) => (
                  <button
                    key={problem.id}
                    type="button"
                    className={`w-full rounded-md border px-3 py-2 text-left transition ${
                      selectedProblem?.id === problem.id
                        ? 'border-brand-border bg-brand-glass'
                        : 'border-surface-border-soft bg-surface-raised hover:bg-surface-muted'
                    }`}
                    onClick={() => handleSelectUserProblem(problem)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-surface-border-soft text-xs font-black text-text-secondary">
                        L{problem.level}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-black text-text-primary">
                        {problem.title}
                      </span>
                      <SubmissionStatusIcon status={submissionStatusByProblem[problem.id]} />
                    </div>
                    <p className="mt-1 truncate pl-9 text-xs font-medium text-text-muted">
                      {problem.authorName ?? 'Unknown'} ·{' '}
                      {problem.targetTables.join(', ') || '테이블 미지정'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-surface-border bg-surface-muted p-3">
            <div className="flex items-end justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-text-muted">
                총점
              </p>
              <p className="text-sm font-black tabular-nums text-text-primary">
                {totalScore} / {problems.length}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-brand-primary transition-all"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden rounded-md p-0">
          <div className="flex-1 overflow-y-auto p-5">
            {formOpen && (
              <ProblemForm
                form={form}
                targetTablesText={targetTablesText}
                tables={tables}
                isSaving={createProblemMutation.isPending}
                isGeneratingAnswer={generateAnswerMutation.isPending}
                onFormChange={setForm}
                onTargetTablesTextChange={setTargetTablesText}
                onGenerateAnswer={handleGenerateAnswer}
                onSubmit={handleCreateProblem}
              />
            )}

            {selectedProblem ? (
              <div className="flex min-h-full flex-col gap-4">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 px-4 py-3">
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised px-2 text-xs font-black text-text-primary">
                        L{selectedProblem.level}
                      </span>
                      <h2 className="truncate text-lg font-black text-text-primary">
                        {selectedProblem.title}
                      </h2>
                    </div>
                    {selectedProblem.createdBy === userId && (
                      <span className="mr-4 mt-3 rounded-sm border border-brand-border bg-brand-glass px-2 py-1 text-xs font-black text-brand-primary">
                        내 문제
                      </span>
                    )}
                  </div>
                  <p className="border-t border-surface-border-soft px-4 py-3 text-sm leading-6 text-text-secondary">
                    {selectedProblem.description}
                  </p>
                </div>

                {selectedTargetTables.length > 0 && (
                  <div className="rounded-md border border-surface-border-soft bg-surface-raised">
                    <div className="flex items-center justify-between border-b border-surface-border-soft px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Table2 className="size-4 text-brand-primary" />
                        <h3 className="text-sm font-black text-text-primary">대상 테이블</h3>
                      </div>
                      <span className="rounded-sm border border-surface-border-soft px-2 py-1 text-xs font-black text-text-secondary">
                        {selectedTargetTables.length}개
                      </span>
                    </div>
                    <div className="space-y-2 p-3">
                      {selectedTargetTables.map((table) => (
                        <button
                          key={table.tableName}
                          type="button"
                          className="w-full rounded-md border border-surface-border-soft bg-surface-muted p-3 text-left hover:bg-surface-raised"
                          onClick={() => setSelectedTable(table)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <Database className="size-4 shrink-0 text-brand-primary" />
                              <span className="truncate text-sm font-black text-text-primary">
                                {table.tableName}
                              </span>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-text-muted">
                              {table.rowCount}행
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {table.columns.slice(0, 8).map((column) => (
                              <span
                                key={column.name}
                                className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-1 text-xs font-semibold text-text-secondary"
                              >
                                {column.name}
                                {column.primaryKey ? ' PK' : ''}
                              </span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedProblem.targetTables.length > 0 && selectedTargetTables.length === 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedProblem.targetTables.map((table) => (
                      <span
                        key={table}
                        className="rounded-sm border border-surface-border-soft bg-surface-raised px-2 py-1 text-xs font-bold text-text-secondary"
                      >
                        {table}
                      </span>
                    ))}
                  </div>
                )}

                <SqlPracticeEditor
                  value={query}
                  onChange={setQuery}
                  onRun={handleExecute}
                  onFormat={() => formatSqlInto(query, setQuery)}
                  isRunning={gradeProblemMutation.isPending}
                  tables={tables}
                  textareaRef={queryTextareaRef}
                  title="답안 SQL"
                  runLabel="실행"
                  placeholder={'SELECT ...\nFROM ...\nWHERE ...\nORDER BY ...;'}
                />

                {lastResult ? (
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    <h3 className="text-sm font-black text-text-primary">실행 결과</h3>
                    <SqlResultTable response={lastResult} />
                  </div>
                ) : (
                  <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-md border border-dashed border-surface-border-soft bg-surface-muted text-sm font-semibold text-text-muted">
                    풀이 SQL을 실행하면 결과가 여기에 표시됩니다.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-surface-border-soft bg-surface-muted text-sm font-semibold text-text-muted">
                문제를 선택하거나 새 문제를 등록하세요.
              </div>
            )}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden rounded-md p-0">
          <div className="border-b border-surface-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-text-primary">테이블</h2>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {metaQuery.data?.dbFile ?? 'user-practice.sqlite'}
                </p>
              </div>
              {erdQuery.data?.mmd && (
                <button
                  type="button"
                  className="ui-icon-button-brand h-8 px-3 text-xs font-black"
                  onClick={() => setErdOpen(true)}
                >
                  ERD
                </button>
              )}
            </div>
            <div className="mt-3 rounded-md border border-surface-border-soft bg-surface-muted p-3 text-xs text-text-secondary">
              <p>schema: {schema ? `v${schema.version}` : '-'}</p>
              <p>tables: {metaQuery.data?.tableCount ?? tables.length}</p>
              <p>hash: {metaQuery.data?.seedHash?.slice(0, 10) ?? 'loading'}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {tables.map((table) => (
              <button
                key={table.tableName}
                type="button"
                className="mb-1.5 flex w-full items-center gap-2 rounded-md border border-surface-border-soft bg-surface-raised px-3 py-2 text-left hover:bg-surface-muted"
                onClick={() => setSelectedTable(table)}
              >
                <Table2 className="size-3.5 text-brand-primary" />
                <span className="min-w-0 flex-1 truncate text-sm font-black text-text-primary">
                  {table.tableName}
                </span>
                <span className="text-xs font-semibold text-text-muted">{table.rowCount}행</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {selectedTable && (
        <SqlTableSchemaDialog
          table={selectedTable}
          tables={tables}
          loadRows={(tableName) =>
            sqlPracticeApi.executeUser(`SELECT * FROM "${tableName.replace(/"/g, '""')}" LIMIT 50`)
          }
          onClose={() => setSelectedTable(null)}
        />
      )}

      {erdQuery.data?.mmd && (
        <SqlErdDialog
          open={erdOpen}
          seedFileName={metaQuery.data?.seedFile ?? 'user_commerce.sql'}
          mmd={erdQuery.data.mmd}
          onClose={() => setErdOpen(false)}
        />
      )}

      <SqlUserPracticeGradeDialog
        result={gradeResult}
        problemTitle={selectedProblem?.title ?? ''}
        problemDescription={selectedProblem?.description ?? ''}
        onClose={() => setGradeResult(null)}
      />
    </section>
  )
}

function SqlUserPracticeGradeDialog({
  result,
  problemTitle,
  problemDescription,
  onClose,
}: {
  result: SqlUserPracticeGradeResponse | null
  problemTitle: string
  problemDescription: string
  onClose: () => void
}) {
  if (!result) return null

  return (
    <Dialog.Root open={Boolean(result)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[211] flex max-h-[min(720px,calc(100vh-2rem))] w-[min(1040px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-sm font-black text-text-primary">
                제출 결과
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-5 text-text-muted">
                <span className="font-bold text-text-secondary">{problemTitle}</span>
                {problemDescription && (
                  <>
                    <span className="mx-1 text-text-muted">·</span>
                    <span className="break-words">{problemDescription}</span>
                  </>
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <section className="min-h-0 overflow-y-auto border-b border-surface-border p-4 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-text-primary">쿼리 결과</p>
                  <p className="mt-1 text-xs text-text-muted">
                    제출한 SQL을 유저 연습장 DB에서 실행한 결과입니다.
                  </p>
                </div>
                <span className="rounded-md border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-bold text-text-muted">
                  {result.execution.executionTimeMs}ms
                </span>
              </div>

              <pre className="mb-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 font-mono text-xs leading-5 text-text-secondary">
                {result.submittedSql}
              </pre>

              {result.execution.success ? (
                <SqlResultTable response={result.execution} />
              ) : (
                <div className="rounded-md border border-destructive/40 bg-danger-glass px-3 py-2 text-sm font-semibold text-destructive">
                  {result.execution.message}
                </div>
              )}
            </section>

            <aside className="min-h-0 overflow-y-auto bg-surface-muted p-4">
              <div
                className={`mb-3 flex items-center gap-2 rounded-md border px-3 py-3 ${
                  result.isCorrect
                    ? 'border-brand-border bg-brand-glass text-brand-primary'
                    : 'border-destructive/40 bg-danger-glass text-destructive'
                }`}
              >
                {result.isCorrect ? (
                  <CheckCircle className="size-4 shrink-0" />
                ) : (
                  <XCircle className="size-4 shrink-0" />
                )}
                <p className="text-sm font-black">
                  {result.isCorrect ? '정답입니다' : '오답입니다'}
                </p>
              </div>

              <div className="rounded-md border border-surface-border bg-surface-raised p-3">
                <p className="mb-2 text-xs font-black text-text-primary">채점 피드백</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {result.feedback}
                </p>
              </div>
            </aside>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SubmissionStatusIcon({ status }: { status?: SqlPracticeSubmissionStatus }) {
  if (!status) return null

  if (status.isCorrect) {
    return <CheckCircle className="size-3.5 shrink-0 text-brand-primary" aria-label="정답" />
  }

  return <XCircle className="size-3.5 shrink-0 text-destructive" aria-label="오답" />
}

type ProblemFormProps = {
  form: SqlUserPracticeProblemPayload
  targetTablesText: string
  tables: TableInfo[]
  isSaving: boolean
  isGeneratingAnswer: boolean
  onFormChange: (form: SqlUserPracticeProblemPayload) => void
  onTargetTablesTextChange: (value: string) => void
  onGenerateAnswer: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

function ProblemForm({
  form,
  targetTablesText,
  tables,
  isSaving,
  isGeneratingAnswer,
  onFormChange,
  onTargetTablesTextChange,
  onGenerateAnswer,
  onSubmit,
}: ProblemFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-5 rounded-md border border-surface-border-soft bg-surface-muted p-4"
    >
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-brand-primary" />
        <h2 className="text-sm font-black text-text-primary">문제 출제</h2>
      </div>

      <div className="mt-4 space-y-3">
        <FormRow label="기본 정보" hint="목록에 표시될 제목과 난이도입니다.">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
            <Input
              value={form.title}
              onChange={(event) => onFormChange({ ...form, title: event.target.value })}
              placeholder="예: 주문 상태별 건수"
              required
            />
            <Select
              value={form.level}
              onChange={(event) => onFormChange({ ...form, level: Number(event.target.value) })}
              className="h-12 font-bold"
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  Level {level}
                </option>
              ))}
            </Select>
          </div>
        </FormRow>

        <FormRow label="문제 설명" hint="사용자가 풀어야 할 조건을 명확하게 적습니다.">
          <AutoGrowTextarea
            value={form.description}
            onChange={(event) => onFormChange({ ...form, description: event.target.value })}
            placeholder="예: orders 테이블에서 주문 상태별 주문 수를 구하세요."
            rows={3}
            required
          />
        </FormRow>

        <FormRow
          label="관련 테이블"
          hint="쉼표로 구분합니다. 비워두면 테이블 미지정으로 저장됩니다."
        >
          <Input
            value={targetTablesText}
            onChange={(event) => onTargetTablesTextChange(event.target.value)}
            placeholder={`예: ${tables
              .slice(0, 3)
              .map((table) => table.tableName)
              .join(', ')}`}
          />
        </FormRow>

        <FormRow
          label="정답 SQL"
          hint="저장 전에 서버에서 실행 가능 여부를 확인합니다."
          action={
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs"
              onClick={onGenerateAnswer}
              disabled={isGeneratingAnswer || !form.description.trim()}
            >
              {isGeneratingAnswer ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              AI 정답 생성
            </Button>
          }
        >
          <AutoGrowTextarea
            value={form.answerSql}
            onChange={(event) => onFormChange({ ...form, answerSql: event.target.value })}
            placeholder={'SELECT status, COUNT(*) AS order_count\nFROM orders\nGROUP BY status;'}
            rows={4}
            className="font-mono text-sm"
            required
          />
        </FormRow>

        <FormRow label="해설" hint="정답 공개 시 함께 보여줄 설명입니다.">
          <AutoGrowTextarea
            value={form.explanation}
            onChange={(event) => onFormChange({ ...form, explanation: event.target.value })}
            placeholder="예: status로 그룹화한 뒤 COUNT(*)로 주문 수를 계산합니다."
            rows={2}
          />
        </FormRow>

        <FormRow label="선택 옵션" hint="필요할 때만 열어서 입력합니다.">
          <details className="rounded-md border border-surface-border-soft bg-surface-raised">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-black text-text-primary">
              풀이 템플릿 입력
              <span className="ml-2 text-xs font-semibold text-text-muted">
                풀이 입력창에 미리 채울 SQL
              </span>
            </summary>
            <div className="border-t border-surface-border-soft p-3">
              <AutoGrowTextarea
                value={form.starterSql}
                onChange={(event) => onFormChange({ ...form, starterSql: event.target.value })}
                placeholder={
                  '비워두면 풀이 입력창은 빈 상태로 시작합니다.\n예: SELECT ...\nFROM ...;'
                }
                rows={3}
                className="font-mono text-sm"
              />
            </div>
          </details>
        </FormRow>
      </div>
      <div className="mt-3 flex justify-end">
        <Button type="submit" disabled={isSaving} className="gap-1.5">
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          등록
        </Button>
      </div>
    </form>
  )
}

function AutoGrowTextarea({
  value,
  onChange,
  className,
  rows = 2,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  const resize = () => {
    const textarea = ref.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  useEffect(() => {
    resize()
  }, [value])

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(event) => {
        onChange?.(event)
        window.requestAnimationFrame(resize)
      }}
      rows={rows}
      className={`resize-none overflow-hidden ${className ?? ''}`}
      {...props}
    />
  )
}

type FormRowProps = {
  label: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}

function FormRow({ label, hint, action, children }: FormRowProps) {
  return (
    <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)]">
      <div className="pt-2">
        <label className="text-sm font-black text-text-primary">{label}</label>
        {hint && <p className="mt-1 text-xs leading-5 text-text-muted">{hint}</p>}
      </div>
      <div className="min-w-0">
        {action && <div className="mb-2 flex justify-end">{action}</div>}
        {children}
      </div>
    </div>
  )
}

function SqlPersonalPracticeWorkspace() {
  const userId = useSessionStore((state) => state.userId)
  const workspaceQuery = useSqlPersonalDefaultWorkspace()
  const workspaceId = workspaceQuery.data?.id
  const [levelFilter, setLevelFilter] = useState<LevelFilter>(1)
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [activeTableName, setActiveTableName] = useState<string | null>(null)
  const [erdOpen, setErdOpen] = useState(false)
  const [replaceSqlOpen, setReplaceSqlOpen] = useState(false)
  const [replaceSqlError, setReplaceSqlError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<SqlUserPracticeProblemPayload>({
    ...initialForm,
    visibility: 'private',
  })
  const [targetTablesText, setTargetTablesText] = useState('')
  const [query, setQuery] = useState('')
  const [scratchQuery, setScratchQuery] = useState('')
  const [lastResult, setLastResult] = useState<SqlExecuteResponse | null>(null)
  const [scratchResult, setScratchResult] = useState<SqlExecuteResponse | null>(null)
  const [gradeResult, setGradeResult] = useState<SqlUserPracticeGradeResponse | null>(null)
  const queryTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scratchTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const metaQuery = useSqlPersonalPracticeMeta(workspaceId)
  const tablesQuery = useSqlPersonalPracticeTables(workspaceId)
  const erdQuery = useSqlPersonalPracticeErd(workspaceId)
  const problemsQuery = useSqlPersonalPracticeProblems(workspaceId, {
    level: levelFilter === 'all' ? undefined : levelFilter,
  })
  const createProblemMutation = useCreateSqlPersonalPracticeProblem(workspaceId)
  const generateAnswerMutation = useGenerateSqlPersonalPracticeAnswer(workspaceId)
  const gradeProblemMutation = useGradeSqlPersonalPracticeProblem(workspaceId)
  const executePersonalMutation = useExecuteSqlPersonalPracticeQuery(workspaceId)
  const shareProblemMutation = useShareSqlPersonalPracticeProblem(workspaceId)
  const unshareProblemMutation = useUnshareSqlPersonalPracticeProblem(workspaceId)
  const deleteProblemMutation = useDeleteSqlPersonalPracticeProblem(workspaceId)
  const replaceSchemaMutation = useReplaceSqlPersonalPracticeSchemaVersion(workspaceId)

  const tables = tablesQuery.data ?? EMPTY_TABLES
  const problems = useMemo(
    () => problemsQuery.data?.problems ?? [],
    [problemsQuery.data?.problems],
  )
  const schemaVersion = problemsQuery.data?.schemaVersion
  const selectedProblem = useMemo(
    () => (selectedProblemId ? problems.find((problem) => problem.id === selectedProblemId) ?? null : null),
    [problems, selectedProblemId],
  )
  const selectedTargetTables = useMemo(() => {
    if (!selectedProblem) return []
    const targets = new Set(selectedProblem.targetTables)
    return tables.filter((table) => targets.has(table.tableName))
  }, [selectedProblem, tables])

  const handleRefresh = () => {
    workspaceQuery.refetch()
    metaQuery.refetch()
    tablesQuery.refetch()
    problemsQuery.refetch()
  }

  const handleExecute = async () => {
    const trimmed = query.trim()
    if (!trimmed || !selectedProblem) return
    const response = await gradeProblemMutation.mutateAsync({
      id: selectedProblem.id,
      payload: { submittedSql: trimmed },
    })
    setLastResult(response.execution)
    setGradeResult(response)
  }

  const handleScratchExecute = async () => {
    const trimmed = scratchQuery.trim()
    if (!trimmed) return
    const response = await executePersonalMutation.mutateAsync(trimmed)
    setScratchResult(response)
  }

  const handleCreateProblem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const targetTables = targetTablesText
      .split(',')
      .map((table) => table.trim())
      .filter(Boolean)

    await createProblemMutation.mutateAsync({
      ...form,
      targetTables,
      starterSql: form.starterSql?.trim() || undefined,
      explanation: form.explanation?.trim() || undefined,
      visibility: 'private',
    })

    setForm({ ...initialForm, visibility: 'private' })
    setTargetTablesText('')
    setFormOpen(false)
  }

  const handleGenerateAnswer = async () => {
    const targetTables = targetTablesText
      .split(',')
      .map((table) => table.trim())
      .filter(Boolean)
    const response = await generateAnswerMutation.mutateAsync({
      title: form.title.trim() || undefined,
      description: form.description,
      level: form.level,
      targetTables,
    })

    setForm((current) => ({
      ...current,
      answerSql: response.answerSql,
      explanation: current.explanation?.trim() ? current.explanation : (response.explanation ?? ''),
    }))
  }

  const handleSelectPersonalProblem = (problem: (typeof problems)[number]) => {
    setSelectedProblemId(problem.id)
    setActiveTableName(null)
    setQuery(problem.starterSql || '')
    setScratchResult(null)
    setLastResult(null)
    setGradeResult(null)
  }

  const handleStartTableQuery = (table: TableInfo) => {
    setSelectedProblemId(null)
    setActiveTableName(table.tableName)
    setScratchQuery(`SELECT *\nFROM ${quoteSqlIdentifier(table.tableName)}\nLIMIT 50;`)
    setScratchResult(null)
    window.requestAnimationFrame(() => scratchTextareaRef.current?.focus())
  }

  const getShareUrl = (token: string) => `${window.location.origin}/share/sql/personal/${token}`

  const handleCopyShareLink = async () => {
    if (!selectedProblem) return
    const share = selectedProblem.shareToken
      ? { token: selectedProblem.shareToken }
      : await shareProblemMutation.mutateAsync(selectedProblem.id)
    await navigator.clipboard.writeText(getShareUrl(share.token))
  }

  const handleUnshare = async () => {
    if (!selectedProblem) return
    if (!window.confirm('공유 링크를 해제할까요? 기존 링크로는 더 이상 접근할 수 없습니다.')) return
    await unshareProblemMutation.mutateAsync(selectedProblem.id)
  }

  const handleDelete = async () => {
    if (!selectedProblem) return
    if (!window.confirm('개인 문제를 삭제할까요?')) return
    await deleteProblemMutation.mutateAsync(selectedProblem.id)
    setSelectedProblemId(null)
    setActiveTableName(null)
    setQuery('')
    setLastResult(null)
    setGradeResult(null)
  }

  const handleReplaceSchema = async (input: {
    file: File
    title?: string
    description?: string
  }) => {
    setReplaceSqlError(null)
    try {
      await replaceSchemaMutation.mutateAsync(input)
      setReplaceSqlOpen(false)
      setSelectedProblemId(null)
      setSelectedTable(null)
      setActiveTableName(null)
      setQuery('')
      setScratchQuery('')
      setLastResult(null)
      setScratchResult(null)
      setGradeResult(null)
      handleRefresh()
    } catch (error) {
      setReplaceSqlError(error instanceof Error ? error.message : 'SQL 파일 교체에 실패했습니다.')
    }
  }

  if (workspaceQuery.isLoading) {
    return (
      <Card className="flex min-h-[calc(100dvh-220px)] items-center justify-center rounded-md p-8 text-sm font-semibold text-text-muted">
        개인 SQL 연습장을 준비하는 중입니다.
      </Card>
    )
  }

  return (
    <section className="space-y-4 pb-16">
      <div className="flex items-center justify-between rounded-md border border-surface-border bg-surface-strong px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Database className="size-4 shrink-0 text-brand-primary" />
          <h1 className="truncate text-sm font-black">
            {workspaceQuery.data?.title ?? '개인 SQL 연습장'}
          </h1>
          <span className="shrink-0 text-xs font-semibold text-text-muted">
            {schemaVersion ? `v${schemaVersion.version} · ${schemaVersion.title}` : '개인 DB'}
          </span>
        </div>
        <button
          type="button"
          className="ui-icon-button h-8 gap-1.5 px-3 text-xs"
          onClick={handleRefresh}
          disabled={workspaceQuery.isFetching || metaQuery.isFetching || problemsQuery.isFetching}
        >
          <RefreshCw
            className={`size-3.5 ${
              workspaceQuery.isFetching || metaQuery.isFetching || problemsQuery.isFetching
                ? 'animate-spin'
                : ''
            }`}
          />
          새로고침
        </button>
      </div>

      <div className="grid h-[calc(100dvh-220px)] min-h-0 gap-4 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <Card className="flex min-h-0 flex-col overflow-hidden rounded-md p-0">
          <div className="border-b border-surface-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-text-primary">내 문제 목록</h2>
                <p className="mt-1 text-xs font-semibold text-text-muted">{problems.length}문제</p>
              </div>
              <Button size="sm-icon" tone="brand" onClick={() => setFormOpen((value) => !value)}>
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-1">
              {([1, 2, 3, 4, 5, 'all'] as LevelFilter[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`h-8 rounded-sm border text-xs font-black ${
                    levelFilter === level
                      ? 'border-brand-border bg-brand-primary text-text-on-brand'
                      : 'border-surface-border-soft bg-surface-muted text-text-secondary'
                  }`}
                  onClick={() => setLevelFilter(level)}
                >
                  {level === 'all' ? 'All' : level}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {problemsQuery.isLoading ? (
              <div className="flex h-40 items-center justify-center text-text-muted">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : problems.length === 0 ? (
              <div className="rounded-md border border-dashed border-surface-border-soft p-4 text-sm text-text-muted">
                등록된 개인 문제가 없습니다.
              </div>
            ) : (
              <div className="space-y-1.5">
                {problems.map((problem) => (
                  <button
                    key={problem.id}
                    type="button"
                    className={`w-full rounded-md border px-3 py-2 text-left transition ${
                      selectedProblem?.id === problem.id
                        ? 'border-brand-border bg-brand-glass'
                        : 'border-surface-border-soft bg-surface-raised hover:bg-surface-muted'
                    }`}
                    onClick={() => handleSelectPersonalProblem(problem)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-surface-border-soft text-xs font-black text-text-secondary">
                        L{problem.level}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-black text-text-primary">
                        {problem.title}
                      </span>
                      {problem.submissionStatus?.isCorrect ? (
                        <CheckCircle className="size-3.5 shrink-0 text-brand-primary" />
                      ) : problem.submissionStatus ? (
                        <XCircle className="size-3.5 shrink-0 text-destructive" />
                      ) : problem.shareToken ? (
                        <Link2 className="size-3.5 shrink-0 text-brand-primary" />
                      ) : null}
                    </div>
                    <p className="mt-1 truncate pl-9 text-xs font-medium text-text-muted">
                      {problem.submissionStatus
                        ? problem.submissionStatus.isCorrect
                          ? '정답'
                          : '오답'
                        : '미제출'}{' '}
                      · {problem.shareToken ? '공유됨' : '비공유'} ·{' '}
                      {problem.targetTables.join(', ') || '테이블 미지정'}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden rounded-md p-0">
          <div className="flex-1 overflow-y-auto p-5">
            {formOpen && (
              <ProblemForm
                form={form}
                targetTablesText={targetTablesText}
                tables={tables}
                isSaving={createProblemMutation.isPending}
                isGeneratingAnswer={generateAnswerMutation.isPending}
                onFormChange={setForm}
                onTargetTablesTextChange={setTargetTablesText}
                onGenerateAnswer={handleGenerateAnswer}
                onSubmit={handleCreateProblem}
              />
            )}

            {selectedProblem ? (
              <div className="flex min-h-full flex-col gap-4">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 px-4 py-3">
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised px-2 text-xs font-black text-text-primary">
                        L{selectedProblem.level}
                      </span>
                      <h2 className="truncate text-lg font-black text-text-primary">
                        {selectedProblem.title}
                      </h2>
                    </div>
                    {selectedProblem.createdBy === userId && (
                      <div className="mr-4 mt-3 flex shrink-0 items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5 text-xs"
                          onClick={handleCopyShareLink}
                          disabled={shareProblemMutation.isPending}
                        >
                          <Clipboard className="size-3.5" />
                          링크 복사
                        </Button>
                        {selectedProblem.shareToken && (
                          <Button
                            size="sm-icon"
                            tone="danger"
                            onClick={handleUnshare}
                            disabled={unshareProblemMutation.isPending}
                            aria-label="공유 해제"
                          >
                            <X className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm-icon"
                          tone="danger"
                          onClick={handleDelete}
                          disabled={deleteProblemMutation.isPending}
                          aria-label="삭제"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="border-t border-surface-border-soft px-4 py-3 text-sm leading-6 text-text-secondary">
                    {selectedProblem.description}
                  </p>
                  {selectedProblem.shareToken && (
                    <p className="border-t border-surface-border-soft px-4 py-2 text-xs font-semibold text-text-muted">
                      {getShareUrl(selectedProblem.shareToken)}
                    </p>
                  )}
                </div>

                {selectedTargetTables.length > 0 && (
                  <div className="rounded-md border border-surface-border-soft bg-surface-raised">
                    <div className="flex items-center justify-between border-b border-surface-border-soft px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Table2 className="size-4 text-brand-primary" />
                        <h3 className="text-sm font-black text-text-primary">대상 테이블</h3>
                      </div>
                      <span className="rounded-sm border border-surface-border-soft px-2 py-1 text-xs font-black text-text-secondary">
                        {selectedTargetTables.length}개
                      </span>
                    </div>
                    <div className="space-y-2 p-3">
                      {selectedTargetTables.map((table) => (
                        <button
                          key={table.tableName}
                          type="button"
                          className="w-full rounded-md border border-surface-border-soft bg-surface-muted p-3 text-left hover:bg-surface-raised"
                          onClick={() => setSelectedTable(table)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <Database className="size-4 shrink-0 text-brand-primary" />
                              <span className="truncate text-sm font-black text-text-primary">
                                {table.tableName}
                              </span>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-text-muted">
                              {table.rowCount}행
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <SqlPracticeEditor
                  value={query}
                  onChange={setQuery}
                  onRun={handleExecute}
                  onFormat={() => formatSqlInto(query, setQuery)}
                  isRunning={gradeProblemMutation.isPending}
                  tables={tables}
                  textareaRef={queryTextareaRef}
                  title="답안 SQL"
                  runLabel="실행"
                  placeholder={'SELECT ...\nFROM ...\nWHERE ...\nORDER BY ...;'}
                />

                {lastResult ? (
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    <h3 className="text-sm font-black text-text-primary">실행 결과</h3>
                    <SqlResultTable response={lastResult} />
                  </div>
                ) : (
                  <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-md border border-dashed border-surface-border-soft bg-surface-muted text-sm font-semibold text-text-muted">
                    풀이 SQL을 실행하면 결과가 여기에 표시됩니다.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-full flex-col gap-4">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                  <div className="flex items-center gap-2">
                    <Database className="size-4 text-brand-primary" />
                    <h3 className="text-sm font-black text-text-primary">개인 DB 자유 SQL</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    문제를 선택하지 않아도 개인 DB를 바로 조회할 수 있습니다. 조회 쿼리만 실행됩니다.
                  </p>
                </div>

                <SqlPracticeEditor
                  value={scratchQuery}
                  onChange={setScratchQuery}
                  onRun={handleScratchExecute}
                  onFormat={() => formatSqlInto(scratchQuery, setScratchQuery)}
                  isRunning={executePersonalMutation.isPending}
                  tables={tables}
                  textareaRef={scratchTextareaRef}
                  title="SQL"
                  runLabel="실행"
                  placeholder={`SELECT *\nFROM ${tables[0]?.tableName ?? 'table_name'}\nLIMIT 50;`}
                />

                {scratchResult ? (
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black text-text-primary">실행 결과</h3>
                      <Button variant="secondary" size="sm" onClick={() => setScratchResult(null)}>
                        결과 지우기
                      </Button>
                    </div>
                    <SqlResultTable response={scratchResult} />
                  </div>
                ) : (
                  <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-md border border-dashed border-surface-border-soft bg-surface-muted text-sm font-semibold text-text-muted">
                    오른쪽 테이블에서 쿼리를 시작하거나 SQL을 직접 입력하세요.
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden rounded-md p-0">
          <div className="border-b border-surface-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="truncate text-sm font-black text-text-primary">테이블</h2>
              <div className="flex items-center gap-1.5">
                {erdQuery.data?.mmd && (
                  <button
                    type="button"
                    className="ui-icon-button-brand h-8 px-3 text-xs font-black"
                    onClick={() => setErdOpen(true)}
                  >
                    ERD
                  </button>
                )}
                <button
                  className="ui-icon-button size-8"
                  type="button"
                  aria-label="테이블 새로고침"
                  title="새로고침"
                  onClick={handleRefresh}
                  disabled={workspaceQuery.isFetching || metaQuery.isFetching || tablesQuery.isFetching}
                >
                  <RefreshCw
                    className={`size-3.5 ${
                      workspaceQuery.isFetching || metaQuery.isFetching || tablesQuery.isFetching
                        ? 'animate-spin'
                        : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="border-b border-surface-border p-3">
            <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-xs font-black text-text-primary">
                  <Database className="size-3.5 shrink-0 text-brand-primary" />
                  <span className="truncate">
                    {metaQuery.data?.dbFile ?? 'practice.sqlite'}
                  </span>
                </div>
                <button
                  className="ui-icon-button size-7 shrink-0"
                  type="button"
                  aria-label="개인 SQL 파일 교체"
                  title="SQL 교체"
                  onClick={() => {
                    setReplaceSqlError(null)
                    setReplaceSqlOpen(true)
                  }}
                  disabled={!workspaceId}
                >
                  <Settings className="size-3.5" />
                </button>
              </div>
              <div className="mt-2 space-y-1 text-xs text-text-secondary">
                <p>seed: {schemaVersion?.title ?? metaQuery.data?.seedFile ?? 'personal-practice.sql'}</p>
                <p>tables: {metaQuery.data?.tableCount ?? tables.length}</p>
                <p>hash: {schemaVersion?.dbFileHash.slice(0, 10) ?? 'loading'}</p>
              </div>
              <button
                type="button"
                className="ui-icon-button mt-3 h-8 w-full gap-1.5 text-xs"
                onClick={() => {
                  setReplaceSqlError(null)
                  setReplaceSqlOpen(true)
                }}
                disabled={!workspaceId}
              >
                <FileUp className="size-3.5" />
                SQL 교체
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {tables.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
                <Table2 className="mb-3 size-9 text-text-muted" />
                <p className="text-sm font-semibold text-text-primary">테이블이 없습니다</p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  SQL 파일을 교체하거나 새로고침으로 개인 DB를 다시 확인하세요.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {tables.map((table) => {
                  const isActive = activeTableName === table.tableName
                  return (
                    <div
                      key={table.tableName}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
                        isActive
                          ? 'border-brand-border bg-brand-glass text-brand-primary'
                          : 'border-transparent text-text-primary hover:border-surface-border-soft hover:bg-surface-muted'
                      }`}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => handleStartTableQuery(table)}
                        title="쿼리 시작"
                      >
                        <Table2 className="size-3.5 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black">
                            {table.tableName}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="rounded-sm border border-surface-border-soft p-1.5 text-text-secondary transition-colors hover:border-brand-border hover:text-brand-primary"
                        title="스키마 보기"
                        aria-label={`${table.tableName} 스키마 보기`}
                        onClick={() => setSelectedTable(table)}
                      >
                        <Info className="size-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {selectedTable && (
        <SqlTableSchemaDialog
          table={selectedTable}
          tables={tables}
          loadRows={(tableName) =>
            workspaceId
              ? sqlPracticeApi.getPersonalTableRows(workspaceId, tableName)
              : sqlPracticeApi.executeUser(
                  `SELECT * FROM "${tableName.replace(/"/g, '""')}" LIMIT 50`,
                )
          }
          onClose={() => setSelectedTable(null)}
        />
      )}

      {erdQuery.data?.mmd && (
        <SqlErdDialog
          open={erdOpen}
          seedFileName={schemaVersion?.title ?? 'personal-practice.sql'}
          mmd={erdQuery.data.mmd}
          onClose={() => setErdOpen(false)}
        />
      )}

      <SqlPersonalSchemaReplaceDialog
        open={replaceSqlOpen}
        workspaceTitle={workspaceQuery.data?.title ?? '개인 SQL 연습장'}
        currentVersion={schemaVersion}
        isPending={replaceSchemaMutation.isPending}
        errorMessage={replaceSqlError}
        onSubmit={handleReplaceSchema}
        onClose={() => {
          setReplaceSqlOpen(false)
          setReplaceSqlError(null)
        }}
      />

      <SqlUserPracticeGradeDialog
        result={gradeResult}
        problemTitle={selectedProblem?.title ?? ''}
        problemDescription={selectedProblem?.description ?? ''}
        onClose={() => setGradeResult(null)}
      />
    </section>
  )
}

function SqlPracticeEditor({
  value,
  onChange,
  onRun,
  onFormat,
  isRunning,
  tables,
  textareaRef,
  title,
  runLabel,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  onRun: () => void | Promise<void>
  onFormat: () => void
  isRunning: boolean
  tables: TableInfo[]
  textareaRef: RefObject<HTMLTextAreaElement | null>
  title: string
  runLabel: string
  placeholder: string
}) {
  return (
    <div className="rounded-md border border-surface-border-soft bg-surface-raised p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-sm font-black text-text-primary">{title}</h3>
        <p className="text-xs font-semibold text-text-muted">
          2글자+Tab 자동완성 · Ctrl+Enter 실행 · 키워드 클릭 삽입
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SQL_KEYWORDS.map((keyword) => (
          <button
            key={keyword}
            type="button"
            className="rounded-sm border border-surface-border-soft bg-surface-muted px-2.5 py-1 text-xs font-black text-text-secondary hover:border-brand-border hover:text-brand-primary"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insertSqlText(textareaRef.current, value, onChange, keyword)}
          >
            {keyword}
          </button>
        ))}
      </div>
      <SqlAutocompleteTextarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onSubmit={onRun}
        keywords={SQL_KEYWORDS}
        tableNames={tables.map((table) => table.tableName)}
        columnNames={tables.flatMap((table) => table.columns.map((column) => column.name))}
        rows={7}
        className="ui-input mt-3 min-h-[180px] w-full resize-y rounded-md border p-4 font-mono text-sm leading-6 outline-none focus:border-brand-border focus:ring-2 focus:ring-brand-border"
        placeholder={placeholder}
        spellCheck={false}
      />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={onFormat}
          disabled={!value.trim() || isRunning}
        >
          <WandSparkles className="size-3.5" />
          SQL 정리
        </Button>
        <Button size="sm" className="gap-1.5" onClick={onRun} disabled={!value.trim() || isRunning}>
          {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {runLabel}
        </Button>
      </div>
    </div>
  )
}

function formatSqlInto(value: string, onChange: (value: string) => void) {
  const trimmed = value.trim()
  if (!trimmed) return

  try {
    onChange(formatSqlQuery(trimmed))
  } catch {
    toast.error('SQL을 정리할 수 없습니다. 문법을 확인해 주세요.')
  }
}

function insertSqlText(
  textarea: HTMLTextAreaElement | null,
  value: string,
  onChange: (value: string) => void,
  text: string,
) {
  if (!textarea) {
    onChange(`${value}${value.endsWith(' ') || !value ? '' : ' '}${text} `)
    return
  }

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const prefix = value.slice(0, start)
  const suffix = value.slice(end)
  const needsLeadingSpace = prefix.length > 0 && !/\s$/.test(prefix)
  const insertion = `${needsLeadingSpace ? ' ' : ''}${text} `
  const nextValue = `${prefix}${insertion}${suffix}`

  onChange(nextValue)
  window.requestAnimationFrame(() => {
    textarea.focus()
    const cursor = start + insertion.length
    textarea.setSelectionRange(cursor, cursor)
  })
}

function quoteSqlIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}
