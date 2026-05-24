import * as Dialog from '@radix-ui/react-dialog'
import { useMemo, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Database,
  FileUp,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Send,
  Table2,
  Trash2,
  UsersRound,
  WandSparkles,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'
import type {
  SqlExecuteResponse,
  SqlTeamPracticeMemberRole,
  SqlTeamPracticeProblem,
  SqlUserPracticeGradeResponse,
  SqlUserPracticeProblemPayload,
  TableInfo,
} from '../../../entities/sql-practice/model/types'
import { formatSqlQuery } from '../../../features/sql-practice/lib/format-sql'
import {
  useAddSqlTeamPracticeMember,
  useCreateSqlTeamPracticeProblem,
  useDeleteSqlTeamPracticeProblem,
  useExecuteSqlTeamPractice,
  useGenerateSqlTeamPracticeAnswer,
  useGradeSqlTeamPracticeProblem,
  useRemoveSqlTeamPracticeMember,
  useReplaceSqlTeamPracticeSchemaVersion,
  useSqlTeamPracticeErd,
  useSqlTeamPracticeMembers,
  useSqlTeamPracticeMeta,
  useSqlTeamPracticeProblems,
  useSqlTeamPracticeTables,
  useSqlTeamPracticeWorkspace,
  useUpdateSqlTeamPracticeMember,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { SqlAutocompleteTextarea } from '../../../features/sql-practice/ui/sql-autocomplete-textarea'
import { SqlErdDialog } from '../../../features/sql-practice/ui/sql-erd-dialog'
import { SqlResultTable } from '../../../features/sql-practice/ui/sql-result-table'
import { SqlTableSchemaDialog } from '../../../features/sql-practice/ui/sql-table-schema-dialog'
import { useAssignableUsers } from '../../../shared/api/users'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { SqlPersonalSchemaReplaceDialog } from './sql-personal-schema-replace-dialog'

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
  answerSql: '',
  explanation: '',
  visibility: 'private',
  status: 'published',
}

type LevelFilter = 1 | 2 | 3 | 4 | 5 | 'all'
const EMPTY_TEAM_PROBLEMS: SqlTeamPracticeProblem[] = []
const EMPTY_TABLES: TableInfo[] = []

export function SqlTeamWorkspacePage() {
  const params = useParams({ strict: false }) as { workspaceId?: string }
  const workspaceId = params.workspaceId
  const navigate = useNavigate()
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all')
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [activeTableName, setActiveTableName] = useState<string | null>(null)
  const [erdOpen, setErdOpen] = useState(false)
  const [replaceSqlOpen, setReplaceSqlOpen] = useState(false)
  const [problemDialogOpen, setProblemDialogOpen] = useState(false)
  const [replaceSqlError, setReplaceSqlError] = useState<string | null>(null)
  const [form, setForm] = useState<SqlUserPracticeProblemPayload>(initialForm)
  const [targetTablesText, setTargetTablesText] = useState('')
  const [submittedSql, setSubmittedSql] = useState('')
  const [scratchSql, setScratchSql] = useState('')
  const [lastResult, setLastResult] = useState<SqlExecuteResponse | null>(null)
  const [scratchResult, setScratchResult] = useState<SqlExecuteResponse | null>(null)
  const [gradeResult, setGradeResult] = useState<SqlUserPracticeGradeResponse | null>(null)
  const [memberUserId, setMemberUserId] = useState('')
  const [memberRole, setMemberRole] = useState<SqlTeamPracticeMemberRole>('member')
  const answerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scratchTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const workspaceQuery = useSqlTeamPracticeWorkspace(workspaceId)
  const metaQuery = useSqlTeamPracticeMeta(workspaceId)
  const tablesQuery = useSqlTeamPracticeTables(workspaceId)
  const erdQuery = useSqlTeamPracticeErd(workspaceId)
  const membersQuery = useSqlTeamPracticeMembers(workspaceId)
  const assignableUsersQuery = useAssignableUsers()
  const problemsQuery = useSqlTeamPracticeProblems(workspaceId, {
    level: levelFilter === 'all' ? undefined : levelFilter,
  })
  const createProblemMutation = useCreateSqlTeamPracticeProblem(workspaceId)
  const generateAnswerMutation = useGenerateSqlTeamPracticeAnswer(workspaceId)
  const gradeProblemMutation = useGradeSqlTeamPracticeProblem(workspaceId)
  const executeTeamMutation = useExecuteSqlTeamPractice(workspaceId)
  const deleteProblemMutation = useDeleteSqlTeamPracticeProblem(workspaceId)
  const replaceSchemaMutation = useReplaceSqlTeamPracticeSchemaVersion(workspaceId)
  const addMemberMutation = useAddSqlTeamPracticeMember(workspaceId)
  const updateMemberMutation = useUpdateSqlTeamPracticeMember(workspaceId)
  const removeMemberMutation = useRemoveSqlTeamPracticeMember(workspaceId)

  const workspace = workspaceQuery.data
  const tables = tablesQuery.data ?? EMPTY_TABLES
  const problems = problemsQuery.data?.problems ?? EMPTY_TEAM_PROBLEMS
  const schemaVersion = problemsQuery.data?.schemaVersion
  const members = membersQuery.data ?? []
  const assignableUsers = assignableUsersQuery.data ?? []
  const canEdit = workspace?.myRole === 'owner' || workspace?.myRole === 'editor'
  const canManageMembers = workspace?.myRole === 'owner'
  const totalScore = problems.reduce(
    (sum, problem) => sum + (problem.submissionStatus?.isCorrect ? 1 : 0),
    0,
  )
  const scorePercent =
    problems.length > 0 ? Math.min(100, Math.round((totalScore / problems.length) * 100)) : 0

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
    erdQuery.refetch()
    membersQuery.refetch()
    problemsQuery.refetch()
  }

  const handleCreateProblem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload: SqlUserPracticeProblemPayload = {
      ...form,
      targetTables: parseTargetTables(targetTablesText),
      starterSql: form.starterSql?.trim() || undefined,
      explanation: form.explanation?.trim() || undefined,
      visibility: 'private',
    }
    const problem = await createProblemMutation.mutateAsync(payload)
    setSelectedProblemId(problem?.id ?? null)
    setActiveTableName(null)
    setSubmittedSql(problem?.starterSql || '')
    setLastResult(null)
    setGradeResult(null)
    setForm(initialForm)
    setTargetTablesText('')
    setProblemDialogOpen(false)
  }

  const handleGenerateAnswer = async () => {
    const response = await generateAnswerMutation.mutateAsync({
      title: form.title.trim() || undefined,
      description: form.description,
      level: form.level,
      targetTables: parseTargetTables(targetTablesText),
    })
    setForm((current) => ({
      ...current,
      answerSql: response.answerSql,
      explanation: current.explanation?.trim() ? current.explanation : (response.explanation ?? ''),
    }))
  }

  const handleGrade = async () => {
    if (!selectedProblem || !submittedSql.trim()) return
    const result = await gradeProblemMutation.mutateAsync({
      id: selectedProblem.id,
      payload: { submittedSql },
    })
    setLastResult(result.execution)
    setGradeResult(result)
  }

  const handleScratchExecute = async () => {
    if (!scratchSql.trim()) return
    const result = await executeTeamMutation.mutateAsync(scratchSql)
    setScratchResult(result)
  }

  const handleDeleteProblem = async (problem: SqlTeamPracticeProblem) => {
    if (!window.confirm('팀 문제를 삭제할까요?')) return
    await deleteProblemMutation.mutateAsync(problem.id)
    setSelectedProblemId(null)
    setActiveTableName(null)
    setSubmittedSql('')
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
      setSubmittedSql('')
      setScratchSql('')
      setLastResult(null)
      setScratchResult(null)
      setGradeResult(null)
      handleRefresh()
    } catch (error) {
      setReplaceSqlError(error instanceof Error ? error.message : 'SQL 파일 교체에 실패했습니다.')
    }
  }

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!memberUserId) return
    await addMemberMutation.mutateAsync({ userId: memberUserId, role: memberRole })
    setMemberUserId('')
    setMemberRole('member')
  }

  const handleSelectProblem = (problem: SqlTeamPracticeProblem) => {
    setSelectedProblemId(problem.id)
    setActiveTableName(null)
    setSubmittedSql(problem.starterSql || '')
    setLastResult(null)
    setGradeResult(null)
  }

  const handleStartTableQuery = (table: TableInfo) => {
    setSelectedProblemId(null)
    setActiveTableName(table.tableName)
    setScratchSql(`SELECT *\nFROM ${quoteSqlIdentifier(table.tableName)}\nLIMIT 50;`)
    setScratchResult(null)
    requestAnimationFrame(() => scratchTextareaRef.current?.focus())
  }

  if (!workspaceId) {
    return (
      <Card className="rounded-md p-6 text-sm font-semibold text-text-muted">
        팀 SQL 연습장 주소가 올바르지 않습니다.
      </Card>
    )
  }

  if (workspaceQuery.isLoading) {
    return (
      <Card className="flex min-h-[calc(100dvh-220px)] items-center justify-center rounded-md p-8 text-sm font-semibold text-text-muted">
        팀 SQL 연습장을 준비하는 중입니다.
      </Card>
    )
  }

  return (
    <section className="space-y-4 pb-16">
      <div className="flex flex-col gap-3 rounded-md border border-surface-border bg-surface-strong px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="sm-icon" onClick={() => navigate({ to: '/sql/team' })}>
            <ArrowLeft className="size-4" />
          </Button>
          <Database className="size-4 shrink-0 text-brand-primary" />
          <h1 className="truncate text-sm font-black text-text-primary">
            {workspace?.title ?? '팀 SQL 연습장'}
          </h1>
          <span className="shrink-0 text-xs font-semibold text-text-muted">
            {schemaVersion ? `v${schemaVersion.version} · ${schemaVersion.title}` : '팀 DB'}
          </span>
          <span className="rounded-sm border border-brand-border bg-brand-glass px-2 py-1 text-[11px] font-black text-brand-primary">
            {workspace?.myRole ?? 'member'}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={handleRefresh}
          disabled={
            workspaceQuery.isFetching ||
            metaQuery.isFetching ||
            tablesQuery.isFetching ||
            problemsQuery.isFetching
          }
        >
          <RefreshCw className="size-3.5" />
          새로고침
        </Button>
      </div>

      <div className="grid h-[calc(100dvh-230px)] min-h-0 gap-4 overflow-hidden xl:grid-cols-[300px_minmax(0,1fr)_340px]">
        <Card className="flex min-h-0 flex-col overflow-hidden rounded-md p-0">
          <div className="border-b border-surface-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-text-primary">팀 문제</h2>
                <p className="mt-1 text-xs font-semibold text-text-muted">{problems.length}문제</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canEdit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setProblemDialogOpen(true)}
                  >
                    <Plus className="size-3.5" />
                    등록
                  </Button>
                )}
                <Select
                  value={String(levelFilter)}
                  onChange={(event) =>
                    setLevelFilter(event.target.value === 'all' ? 'all' : (Number(event.target.value) as LevelFilter))
                  }
                  className="h-9 py-0 text-xs"
                  wrapperClassName="w-24"
                >
                  <option value="all">전체</option>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      Lv {level}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {problems.map((problem) => (
              <button
                key={problem.id}
                type="button"
                className={`w-full rounded-md border px-3 py-3 text-left transition ${
                  selectedProblem?.id === problem.id
                    ? 'border-brand-border bg-brand-glass'
                    : 'border-surface-border-soft bg-surface-muted hover:border-brand-border'
                }`}
                onClick={() => handleSelectProblem(problem)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-text-primary">{problem.title}</p>
                    <p className="mt-1 text-[11px] font-semibold text-text-muted">
                      Lv {problem.level} · {problem.authorName ?? 'Unknown'}
                    </p>
                  </div>
                  {problem.submissionStatus?.isCorrect ? (
                    <CheckCircle2 className="size-4 shrink-0 text-brand-primary" />
                  ) : problem.submissionStatus ? (
                    <XCircle className="size-4 shrink-0 text-destructive" />
                  ) : null}
                </div>
              </button>
            ))}
            {problems.length === 0 && (
              <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4 text-sm font-semibold text-text-muted">
                등록된 팀 문제가 없습니다.
              </div>
            )}
          </div>

          <div className="border-t border-surface-border bg-surface-muted p-3">
            <div className="flex items-end justify-between gap-2">
              <p className="text-[11px] font-black uppercase text-text-muted">총점</p>
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
          <div className="border-b border-surface-border px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black text-text-primary">
                  {selectedProblem?.title ?? '팀 DB 자유 SQL'}
                </h2>
                <p className="mt-1 text-xs font-semibold text-text-muted">
                  {selectedProblem
                    ? `Lv ${selectedProblem.level} · ${selectedProblem.targetTables.join(', ') || '전체 테이블'}`
                    : '문제를 고르지 않아도 오른쪽 테이블 기준으로 조회 SQL을 실행할 수 있습니다.'}
                </p>
              </div>
              {selectedProblem && canEdit && (
                <Button
                  variant="ghost"
                  size="sm-icon"
                  tone="danger"
                  onClick={() => handleDeleteProblem(selectedProblem)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {selectedProblem ? (
              <div className="flex min-h-full flex-col gap-4">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4 text-sm leading-7 text-text-secondary">
                  {selectedProblem.description}
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

                <SqlEditor
                  value={submittedSql}
                  onChange={setSubmittedSql}
                  onRun={handleGrade}
                  onFormat={() => formatSqlInto(submittedSql, setSubmittedSql)}
                  isRunning={gradeProblemMutation.isPending}
                  tables={tables}
                  textareaRef={answerTextareaRef}
                  title="답안 SQL"
                  runLabel="제출"
                  placeholder={'SELECT ...\nFROM ...\nWHERE ...\nORDER BY ...;'}
                />

                {lastResult ? (
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                    <h3 className="text-sm font-black text-text-primary">실행 결과</h3>
                    <SqlResultTable response={lastResult} />
                  </div>
                ) : (
                  <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-md border border-dashed border-surface-border-soft bg-surface-muted text-sm font-semibold text-text-muted">
                    답안 SQL을 제출하면 실행 결과가 여기에 표시됩니다.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-full flex-col gap-4">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted p-4">
                  <div className="flex items-center gap-2">
                    <Database className="size-4 text-brand-primary" />
                    <h3 className="text-sm font-black text-text-primary">자유 조회</h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    팀 DB를 문제 선택 없이 탐색합니다. 조회 쿼리만 실행되며 결과는 이 화면에만 표시됩니다.
                  </p>
                </div>

                <SqlEditor
                  value={scratchSql}
                  onChange={setScratchSql}
                  onRun={handleScratchExecute}
                  onFormat={() => formatSqlInto(scratchSql, setScratchSql)}
                  isRunning={executeTeamMutation.isPending}
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

        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <Card className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-md p-0">
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
                  <Button
                    variant="secondary"
                    size="sm-icon"
                    onClick={handleRefresh}
                    disabled={
                      workspaceQuery.isFetching ||
                      metaQuery.isFetching ||
                      tablesQuery.isFetching ||
                      problemsQuery.isFetching
                    }
                    aria-label="테이블 새로고침"
                    title="새로고침"
                  >
                    <RefreshCw
                      className={`size-3.5 ${
                        workspaceQuery.isFetching ||
                        metaQuery.isFetching ||
                        tablesQuery.isFetching ||
                        problemsQuery.isFetching
                          ? 'animate-spin'
                          : ''
                      }`}
                    />
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-b border-surface-border p-3">
              <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-xs font-black text-text-primary">
                    <Database className="size-3.5 shrink-0 text-brand-primary" />
                    <span className="truncate">
                      {schemaVersion?.title ?? workspace?.title ?? 'team-practice.sqlite'}
                    </span>
                  </div>
                  {canEdit && (
                    <button
                      className="ui-icon-button size-7 shrink-0"
                      type="button"
                      aria-label="팀 SQL 파일 교체"
                      title="SQL 교체"
                      onClick={() => {
                        setReplaceSqlError(null)
                        setReplaceSqlOpen(true)
                      }}
                    >
                      <Settings className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-xs text-text-secondary">
                  <p>schema: {schemaVersion ? `v${schemaVersion.version}` : '-'}</p>
                  <p>tables: {metaQuery.data?.tableCount ?? tables.length}</p>
                  <p>hash: {schemaVersion?.dbFileHash.slice(0, 10) ?? 'loading'}</p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="ui-icon-button mt-3 h-8 w-full gap-1.5 text-xs"
                    onClick={() => {
                      setReplaceSqlError(null)
                      setReplaceSqlOpen(true)
                    }}
                  >
                    <FileUp className="size-3.5" />
                    SQL 교체
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {tables.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
                  <Table2 className="mb-3 size-9 text-text-muted" />
                  <p className="text-sm font-semibold text-text-primary">테이블이 없습니다</p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    SQL 파일을 교체하거나 새로고침으로 팀 DB를 다시 확인하세요.
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

          <Card className="flex max-h-64 shrink-0 flex-col overflow-hidden rounded-md p-4">
            <div className="flex items-center gap-2">
              <UsersRound className="size-4 text-brand-primary" />
              <h2 className="text-sm font-black text-text-primary">멤버</h2>
            </div>
            {canManageMembers && (
              <form className="mt-3 grid gap-2" onSubmit={handleAddMember}>
                <Select value={memberUserId} onChange={(event) => setMemberUserId(event.target.value)}>
                  <option value="">사용자 선택</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} · {user.email}
                    </option>
                  ))}
                </Select>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Select value={memberRole} onChange={(event) => setMemberRole(event.target.value as SqlTeamPracticeMemberRole)}>
                    <option value="member">member</option>
                    <option value="editor">editor</option>
                    <option value="owner">owner</option>
                  </Select>
                  <Button type="submit" disabled={!memberUserId || addMemberMutation.isPending}>
                    추가
                  </Button>
                </div>
              </form>
            )}
            <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-md border border-surface-border-soft bg-surface-muted p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-text-primary">
                        {member.userName ?? member.userEmail ?? 'Unknown'}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-text-muted">
                        {member.userEmail}
                      </p>
                    </div>
                    {canManageMembers ? (
                      <Select
                        value={member.role}
                        onChange={(event) =>
                          updateMemberMutation.mutate({
                            memberId: member.id,
                            role: event.target.value as SqlTeamPracticeMemberRole,
                          })
                        }
                        className="h-8 py-0 text-xs"
                        wrapperClassName="w-28"
                      >
                        <option value="member">member</option>
                        <option value="editor">editor</option>
                        <option value="owner">owner</option>
                      </Select>
                    ) : (
                      <span className="text-xs font-black text-brand-primary">{member.role}</span>
                    )}
                  </div>
                  {canManageMembers && member.userId !== workspace?.createdBy && (
                    <Button
                      variant="ghost"
                      size="sm"
                      tone="danger"
                      className="mt-2"
                      onClick={() => removeMemberMutation.mutate(member.id)}
                    >
                      제거
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {selectedTable && (
        <SqlTableSchemaDialog
          table={selectedTable}
          tables={tables}
          loadRows={(tableName) => sqlPracticeApi.getTeamTableRows(workspaceId!, tableName)}
          onClose={() => setSelectedTable(null)}
        />
      )}
      <SqlErdDialog
        open={erdOpen}
        seedFileName={schemaVersion?.title ?? 'team'}
        mmd={erdQuery.data?.mmd ?? null}
        onClose={() => setErdOpen(false)}
      />
      <SqlPersonalSchemaReplaceDialog
        open={replaceSqlOpen}
        workspaceTitle={workspace?.title ?? '팀 SQL 연습장'}
        currentVersion={schemaVersion}
        isPending={replaceSchemaMutation.isPending}
        errorMessage={replaceSqlError}
        onSubmit={handleReplaceSchema}
        onClose={() => {
          setReplaceSqlOpen(false)
          setReplaceSqlError(null)
        }}
      />
      <SqlTeamPracticeGradeDialog
        result={gradeResult}
        problemTitle={selectedProblem?.title ?? ''}
        problemDescription={selectedProblem?.description ?? ''}
        onClose={() => setGradeResult(null)}
      />
      <SqlTeamProblemDialog
        open={problemDialogOpen}
        form={form}
        targetTablesText={targetTablesText}
        isSaving={createProblemMutation.isPending}
        isGeneratingAnswer={generateAnswerMutation.isPending}
        onFormChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onTargetTablesTextChange={setTargetTablesText}
        onGenerateAnswer={handleGenerateAnswer}
        onSubmit={handleCreateProblem}
        onClose={() => setProblemDialogOpen(false)}
      />
    </section>
  )
}

function SqlTeamProblemDialog({
  open,
  form,
  targetTablesText,
  isSaving,
  isGeneratingAnswer,
  onFormChange,
  onTargetTablesTextChange,
  onGenerateAnswer,
  onSubmit,
  onClose,
}: {
  open: boolean
  form: SqlUserPracticeProblemPayload
  targetTablesText: string
  isSaving: boolean
  isGeneratingAnswer: boolean
  onFormChange: (patch: Partial<SqlUserPracticeProblemPayload>) => void
  onTargetTablesTextChange: (value: string) => void
  onGenerateAnswer: () => void | Promise<void>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  onClose: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[220] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[221] flex max-h-[min(760px,calc(100vh-2rem))] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="flex items-center gap-2 text-sm font-black text-text-primary">
                <Plus className="size-4 shrink-0 text-brand-primary" />
                팀 문제 등록
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-5 text-text-muted">
                팀 워크스페이스 DB를 기준으로 공유 문제를 추가합니다.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <form className="min-h-0 flex-1 overflow-y-auto p-5" onSubmit={onSubmit}>
            <div className="grid gap-3">
              <Input
                value={form.title}
                onChange={(event) => onFormChange({ title: event.target.value })}
                placeholder="제목"
                maxLength={80}
                required
              />
              <Select
                value={String(form.level)}
                onChange={(event) => onFormChange({ level: Number(event.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    Level {level}
                  </option>
                ))}
              </Select>
              <Input
                value={targetTablesText}
                onChange={(event) => onTargetTablesTextChange(event.target.value)}
                placeholder="대상 테이블: orders, customers"
              />
              <textarea
                value={form.description}
                onChange={(event) => onFormChange({ description: event.target.value })}
                className="ui-input min-h-32 w-full resize-y rounded-md border p-3 text-sm leading-6 outline-none focus:border-brand-border focus:ring-2 focus:ring-brand-border"
                placeholder="문제 설명"
                required
              />
              <textarea
                value={form.answerSql}
                onChange={(event) => onFormChange({ answerSql: event.target.value })}
                className="ui-input min-h-40 w-full resize-y rounded-md border p-3 font-mono text-sm leading-6 outline-none focus:border-brand-border focus:ring-2 focus:ring-brand-border"
                placeholder="정답 SQL"
                spellCheck={false}
                required
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onGenerateAnswer}
                disabled={!form.description.trim() || isGeneratingAnswer}
                className="gap-1.5"
              >
                {isGeneratingAnswer ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <WandSparkles className="size-3.5" />
                )}
                정답 생성
              </Button>
              <Button type="submit" disabled={isSaving}>
                저장
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function SqlEditor({
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
          Tab 자동완성 · Ctrl+Enter 실행 · 키워드 클릭 삽입
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

function SqlTeamPracticeGradeDialog({
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
                    제출한 SQL을 팀 연습장 DB에서 실행한 결과입니다.
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
  requestAnimationFrame(() => {
    textarea.focus()
    const cursor = start + insertion.length
    textarea.setSelectionRange(cursor, cursor)
  })
}

function quoteSqlIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`
}

function parseTargetTables(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
