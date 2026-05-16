import * as Dialog from '@radix-ui/react-dialog'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import {
  CheckCircle,
  Database,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Table2,
  X,
  XCircle,
} from 'lucide-react'

import type {
  SqlExecuteResponse,
  SqlPracticeSubmissionStatus,
  SqlUserPracticeGradeResponse,
  SqlUserPracticeProblemPayload,
  TableInfo,
} from '../../../entities/sql-practice/model/types'
import {
  useCreateSqlUserPracticeProblem,
  useGenerateSqlUserPracticeAnswer,
  useGradeSqlUserPracticeProblem,
  useResetSqlUserPracticeDb,
  useSqlUserPracticeErd,
  useSqlUserPracticeMeta,
  useSqlUserPracticeProblems,
  useSqlUserPracticeSubmissions,
  useSqlUserPracticeTables,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { SqlErdDialog } from '../../../features/sql-practice/ui/sql-erd-dialog'
import { SqlResultTable } from '../../../features/sql-practice/ui/sql-result-table'
import { SqlTableSchemaDialog } from '../../../features/sql-practice/ui/sql-table-schema-dialog'
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
  'JOIN',
  'ON',
  'WHERE',
  'AND',
  'OR',
  'LIKE',
  'GROUP BY',
  'HAVING',
  'COUNT(*)',
  'SUM()',
  'ORDER BY',
  'ASC',
  'DESC',
  'LIMIT',
]

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
  if (mode === 'personal') return <SqlPersonalPracticePlaceholder />

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
  const problems = problemsQuery.data?.problems ?? []
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

  useEffect(() => {
    if (!selectedProblem) return
    setSelectedProblemId(selectedProblem.id)
    setQuery(selectedProblem.starterSql || '')
    setLastResult(null)
    setGradeResult(null)
  }, [selectedProblem?.id])

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
      explanation: current.explanation?.trim()
        ? current.explanation
        : response.explanation ?? '',
    }))
  }

  const insertQueryKeyword = (keyword: string) => {
    const textarea = queryTextareaRef.current
    if (!textarea) {
      setQuery((current) => `${current}${current.endsWith(' ') || !current ? '' : ' '}${keyword} `)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const prefix = query.slice(0, start)
    const suffix = query.slice(end)
    const needsLeadingSpace = prefix.length > 0 && !/\s$/.test(prefix)
    const insertion = `${needsLeadingSpace ? ' ' : ''}${keyword} `
    const nextQuery = `${prefix}${insertion}${suffix}`

    setQuery(nextQuery)
    window.requestAnimationFrame(() => {
      textarea.focus()
      const cursor = start + insertion.length
      textarea.setSelectionRange(cursor, cursor)
    })
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
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {problems.length}문제
                </p>
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
                    onClick={() => setSelectedProblemId(problem.id)}
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
                      {problem.authorName ?? 'Unknown'} · {problem.targetTables.join(', ') || '테이블 미지정'}
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

                <div className="rounded-md border border-surface-border-soft bg-surface-raised p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-text-primary">답안 SQL</h3>
                    <p className="text-xs font-semibold text-text-muted">
                      키워드 클릭: 커서 위치에 입력 · Ctrl+Enter: 실행
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {SQL_KEYWORDS.map((keyword) => (
                      <button
                        key={keyword}
                        type="button"
                        className="rounded-sm border border-surface-border-soft bg-surface-muted px-2.5 py-1 text-xs font-black text-text-secondary hover:border-brand-border hover:text-brand-primary"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertQueryKeyword(keyword)}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    ref={queryTextareaRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                        event.preventDefault()
                        handleExecute()
                      }
                    }}
                    placeholder={'SELECT ...\nFROM ...\nWHERE ...\nORDER BY ...;'}
                    rows={7}
                    className="mt-3 min-h-[170px] resize-none font-mono text-sm leading-6"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleExecute}
                      disabled={!query.trim() || gradeProblemMutation.isPending}
                      className="gap-1.5"
                    >
                      {gradeProblemMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )}
                      실행
                    </Button>
                  </div>
                </div>

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
        <h2 className="text-sm font-black text-text-primary">문제 등록</h2>
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

        <FormRow label="관련 테이블" hint="쉼표로 구분합니다. 비워두면 테이블 미지정으로 저장됩니다.">
          <Input
            value={targetTablesText}
            onChange={(event) => onTargetTablesTextChange(event.target.value)}
            placeholder={`예: ${tables.slice(0, 3).map((table) => table.tableName).join(', ')}`}
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
                placeholder={'비워두면 풀이 입력창은 빈 상태로 시작합니다.\n예: SELECT ...\nFROM ...;'}
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

function SqlPersonalPracticePlaceholder() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-170px)] w-full max-w-[1720px] flex-col gap-4">
      <Card className="flex min-h-[calc(100dvh-220px)] items-center justify-center rounded-md border border-surface-border-soft bg-surface-raised p-8">
        <div className="max-w-xl text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-md border border-brand-border bg-brand-glass text-brand-primary">
            <ShieldCheck className="size-5" />
          </div>
          <h1 className="mt-4 text-lg font-black text-text-primary">SQL 연습장(개인)</h1>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            개인용 파일과 개인 문제 관리는 유저 연습장 안정화 이후 별도 구현합니다.
          </p>
        </div>
      </Card>
    </div>
  )
}
