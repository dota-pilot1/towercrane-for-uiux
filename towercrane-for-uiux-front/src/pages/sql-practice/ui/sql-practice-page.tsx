import * as Dialog from '@radix-ui/react-dialog'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  BookOpenText,
  CheckCircle,
  Code2,
  Copy,
  Database,
  Eye,
  EyeOff,
  Info,
  Lightbulb,
  Loader2,
  Send,
  Table2,
  X,
  XCircle,
} from 'lucide-react'

import { Card } from '../../../shared/ui/card'
import type {
  SqlExecuteResponse,
  SqlHistoryItem,
  TableInfo,
} from '../../../entities/sql-practice/model/types'
import type {
  SqlExampleLevel,
  SqlPracticeExample,
  SqlPracticeExampleSet,
} from '../../../entities/sql-practice/model/example-types'
import {
  useExecuteSqlPracticeQuery,
  useGradeSqlPracticeSubmission,
  useReloadSqlPracticeSeed,
  useSqlPracticeActivity,
  useSqlPracticeMyActivity,
  useResetSqlPracticeDb,
  useSqlPracticeMySubmissions,
  useSqlPracticeMeta,
  useSqlPracticeRanking,
  useSqlPracticeSupplementExplanation,
  useSqlPracticeTables,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { getSqlPracticeExampleSet, sqlExampleLevelLabels } from '../../../features/sql-practice/model/sql-practice-examples'
import { SqlHistoryItem as SqlHistoryItemView } from '../../../features/sql-practice/ui/sql-history-item'
import { SqlInputBar } from '../../../features/sql-practice/ui/sql-input-bar'
import { SqlMyActivityDialog } from '../../../features/sql-practice/ui/sql-my-activity-dialog'
import { SqlPracticeFooterDrawer } from '../../../features/sql-practice/ui/sql-practice-footer-drawer'
import { SqlPracticePageHeader } from '../../../features/sql-practice/ui/sql-practice-page-header'
import { SqlQuizSidebar } from '../../../features/sql-practice/ui/sql-quiz-sidebar'
import { SqlResultTable } from '../../../features/sql-practice/ui/sql-result-table'
import { SqlSchemaSidebar } from '../../../features/sql-practice/ui/sql-schema-sidebar'
import { SqlTableSchemaDialog } from '../../../features/sql-practice/ui/sql-table-schema-dialog'
import { useSessionStore } from '../../../shared/store/session-store'

const EMPTY_TABLES: TableInfo[] = []

const LEVEL_BADGE_CLASS: Record<SqlExampleLevel, string> = {
  beginner: 'border-brand-border bg-brand-glass text-brand-primary',
  intermediate: 'border-surface-border bg-surface-muted text-text-secondary',
  advanced: 'border-surface-border bg-surface-strong text-text-primary',
}

type SqlGradeStatus = 'correct' | 'incorrect' | null

type SqlSubmissionResultState = {
  submittedSql: string
  executeResponse: SqlExecuteResponse | null
  executeError: string
  gradeStatus: SqlGradeStatus
  gradeBody: string
  gradeError: string
}

export function SqlPracticePage() {
  const [history, setHistory] = useState<SqlHistoryItem[]>([])
  const [selectedTableOverride, setSelectedTableOverride] = useState<string | null>(null)
  const [quizSidebarOpen, setQuizSidebarOpen] = useState(true)
  const [myActivityDialogOpen, setMyActivityDialogOpen] = useState(false)
  const [footerOpen, setFooterOpen] = useState(false)
  const [selectedExample, setSelectedExample] = useState<SqlPracticeExample | null>(null)
  const [answerOpen, setAnswerOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const userId = useSessionStore((state) => state.userId)

  const metaQuery = useSqlPracticeMeta()
  const tablesQuery = useSqlPracticeTables()
  const executeMutation = useExecuteSqlPracticeQuery()
  const resetMutation = useResetSqlPracticeDb()
  const reloadSeedMutation = useReloadSqlPracticeSeed()
  const submissionsQuery = useSqlPracticeMySubmissions(metaQuery.data?.seedFile)
  const rankingQuery = useSqlPracticeRanking(metaQuery.data?.seedFile, true)
  const activityQuery = useSqlPracticeActivity(metaQuery.data?.seedFile, true)
  const myActivityQuery = useSqlPracticeMyActivity(
    metaQuery.data?.seedFile,
    myActivityDialogOpen,
  )

  const tables = tablesQuery.data ?? EMPTY_TABLES
  const selectedTable = useMemo(() => {
    if (tables.length === 0) return null
    if (
      selectedTableOverride &&
      tables.some((table) => table.tableName === selectedTableOverride)
    ) {
      return selectedTableOverride
    }
    return tables[0].tableName
  }, [selectedTableOverride, tables])

  const exampleSet = useMemo(
    () => getSqlPracticeExampleSet(metaQuery.data?.seedFile ?? '01_board_basic.sql'),
    [metaQuery.data?.seedFile],
  )
  const totalProblemCount = useMemo(() => getExampleSetTotalCount(exampleSet), [exampleSet])

  const handleSelectExample = (example: SqlPracticeExample) => {
    setSelectedExample(example)
    setAnswerOpen(false)
  }

  const handleCloseExample = () => {
    setSelectedExample(null)
    setAnswerOpen(false)
  }

  const handleSeedChange = () => {
    setHistory([])
    setSelectedTableOverride(null)
    setSelectedExample(null)
    setAnswerOpen(false)
  }

  const handleExecute = async (query: string) => {
    const response = await executeMutation.mutateAsync(query)
    setHistory((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        query,
        response,
        timestamp: new Date(),
      },
    ])
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  const handleRefresh = () => {
    metaQuery.refetch()
    tablesQuery.refetch()
  }

  const handleReset = async () => {
    const seedFile = metaQuery.data?.seedFile ?? '현재 seed'
    if (
      !window.confirm(
        `SQL 연습 DB를 ${seedFile} 기준으로 초기화할까요? 현재 직접 만든 테이블과 데이터는 삭제됩니다.`,
      )
    ) {
      return
    }
    await resetMutation.mutateAsync()
    handleSeedChange()
  }

  const handleReloadSeed = async () => {
    const seedFile = metaQuery.data?.seedFile ?? '현재 seed'
    if (!window.confirm(`${seedFile}을 다시 적용할까요? 현재 연습 DB는 새로 만들어집니다.`)) {
      return
    }
    await reloadSeedMutation.mutateAsync()
    handleSeedChange()
  }

  return (
    <section className={footerOpen ? 'space-y-4 pb-[400px]' : 'space-y-4 pb-16'}>
      <SqlPracticePageHeader
        key={metaQuery.data?.seedFile ?? 'loading'}
        seedFile={metaQuery.data?.seedFile}
        hasHistory={history.length > 0}
        onClearHistory={() => setHistory([])}
      />

      <div className="flex h-[calc(100dvh-220px)] min-h-0 gap-4 overflow-hidden">
        {/* 왼쪽 문제 목록 사이드바 */}
        <SqlQuizSidebar
          exampleSet={exampleSet}
          selectedExample={selectedExample}
          onSelectExample={handleSelectExample}
          onOpenNotes={() => window.open('/sql/notes', '_blank', 'noopener,noreferrer')}
          isOpen={quizSidebarOpen}
          onToggle={() => setQuizSidebarOpen((v) => !v)}
          submissionStatusByExample={submissionsQuery.data?.byExample ?? {}}
          totalScore={submissionsQuery.data?.summary.totalScore ?? 0}
          maxScore={totalProblemCount}
          onOpenHistory={() => setMyActivityDialogOpen(true)}
        />

        {/* 메인 SQL 영역 */}
        <Card className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md p-0">
          <div className="flex-1 overflow-y-auto p-4">
            {/* 선택된 문제 패널 */}
            {selectedExample && (
              <ProblemPanel
                key={selectedExample.id}
                example={selectedExample}
                answerOpen={answerOpen}
                onToggleAnswer={() => setAnswerOpen((v) => !v)}
                onClose={handleCloseExample}
                seedFile={metaQuery.data?.seedFile ?? selectedExample.seedFile}
                seedHash={metaQuery.data?.seedHash}
                tables={tables}
                className="mb-4"
              />
            )}

            {/* 히스토리 또는 빈 상태 */}
            {history.length === 0 && !selectedExample ? (
              <EmptyState
                isLoading={metaQuery.isLoading || tablesQuery.isLoading}
                tableCount={tables.length}
                seedFile={metaQuery.data?.seedFile}
                recommendedQuery={metaQuery.data?.activeSeed.recommendedQueries[0]}
              />
            ) : history.length > 0 ? (
              <div className="space-y-6">
                {history.map((item) => (
                  <SqlHistoryItemView key={item.id} item={item} />
                ))}
                <div ref={bottomRef} />
              </div>
            ) : null}
          </div>

          {!selectedExample && (
            <SqlInputBar
              onExecute={handleExecute}
              onClear={() => setHistory([])}
              isLoading={executeMutation.isPending}
            />
          )}
        </Card>

        {/* 오른쪽 테이블 정보 사이드바 */}
        <SqlSchemaSidebar
          meta={metaQuery.data}
          tables={tables}
          selectedTable={selectedTable}
          isLoading={metaQuery.isFetching || tablesQuery.isFetching}
          isResetting={resetMutation.isPending}
          isReloading={reloadSeedMutation.isPending}
          onSelectTable={setSelectedTableOverride}
          onRefresh={handleRefresh}
          onReset={handleReset}
          onReloadSeed={handleReloadSeed}
          onSeedActivated={handleSeedChange}
        />
      </div>

      <SqlMyActivityDialog
        open={myActivityDialogOpen}
        onOpenChange={setMyActivityDialogOpen}
        seedFile={metaQuery.data?.seedFile}
        activities={myActivityQuery.data?.activities ?? []}
        isLoading={myActivityQuery.isLoading}
        isRefreshing={myActivityQuery.isFetching}
        currentUserId={userId}
        onRefresh={() => myActivityQuery.refetch()}
      />

      <SqlPracticeFooterDrawer
        open={footerOpen}
        onOpenChange={setFooterOpen}
        seedFile={metaQuery.data?.seedFile}
        rankings={rankingQuery.data?.rankings ?? []}
        activities={activityQuery.data?.activities ?? []}
        rankingLoading={rankingQuery.isFetching}
        activityLoading={activityQuery.isFetching}
        currentUserId={userId}
        myScore={submissionsQuery.data?.summary.totalScore ?? 0}
        maxScore={totalProblemCount}
      />
    </section>
  )
}

function getExampleSetTotalCount(exampleSet: SqlPracticeExampleSet) {
  return exampleSet.beginner.length + exampleSet.intermediate.length + exampleSet.advanced.length
}

function ProblemPanel({
  example,
  answerOpen,
  onToggleAnswer,
  onClose,
  seedFile,
  seedHash,
  tables,
  className,
}: {
  example: SqlPracticeExample
  answerOpen: boolean
  onToggleAnswer: () => void
  onClose: () => void
  seedFile: string
  seedHash?: string
  tables: TableInfo[]
  className?: string
}) {
  const [submittedSql, setSubmittedSql] = useState('')
  const [gradeStatus, setGradeStatus] = useState<SqlGradeStatus>(null)
  const [gradeBody, setGradeBody] = useState('')
  const [gradeError, setGradeError] = useState('')
  const [schemaDialog, setSchemaDialog] = useState<TableInfo | null>(null)
  const [supplementOpen, setSupplementOpen] = useState(false)
  const [supplementBody, setSupplementBody] = useState('')
  const [supplementError, setSupplementError] = useState('')
  const gradeMutation = useGradeSqlPracticeSubmission()
  const executeAnswerMutation = useExecuteSqlPracticeQuery()
  const supplementMutation = useSqlPracticeSupplementExplanation()
  const [submissionResult, setSubmissionResult] = useState<SqlSubmissionResultState | null>(null)
  const isGrading = gradeMutation.isPending || executeAnswerMutation.isPending
  const isSupplementLoading = supplementMutation.isPending
  const targetTables = useMemo(
    () =>
      example.relatedTables.map((tableName) => ({
        tableName,
        info: tables.find((table) => table.tableName === tableName),
      })),
    [example.relatedTables, tables],
  )

  const handleSubmitAnswer = async () => {
    const trimmed = submittedSql.trim()
    if (!trimmed || isGrading) return

    setGradeStatus(null)
    setGradeBody('')
    setGradeError('')
    setSupplementBody('')
    setSupplementError('')

    const gradePayload = {
      seedFile,
      seedHash,
      exampleId: example.id,
      exampleTitle: example.title,
      exampleLevel: example.level,
      exampleOrder: example.order,
      description: example.description,
      hint: example.hint,
      relatedTables: example.relatedTables,
      submittedSql: trimmed,
      answerSql: example.answerSql,
    }

    const [executeResult, gradeResult] = await Promise.allSettled([
      executeAnswerMutation.mutateAsync(trimmed),
      gradeMutation.mutateAsync(gradePayload),
    ])

    const nextExecuteResponse =
      executeResult.status === 'fulfilled' ? executeResult.value : null
    const nextExecuteError =
      executeResult.status === 'rejected'
        ? errorMessage(executeResult.reason, 'SQL 실행 중 오류가 발생했습니다.')
        : ''
    const nextGradeStatus =
      gradeResult.status === 'fulfilled'
        ? gradeResult.value.submission.isCorrect
          ? 'correct'
          : 'incorrect'
        : null
    const nextGradeBody =
      gradeResult.status === 'fulfilled' ? gradeResult.value.submission.feedback : ''
    const nextGradeError =
      gradeResult.status === 'rejected'
        ? errorMessage(gradeResult.reason, '채점 중 오류가 발생했습니다.')
        : ''

    setGradeStatus(nextGradeStatus)
    setGradeBody(nextGradeBody)
    setGradeError(nextGradeError)
    setSubmissionResult({
      submittedSql: trimmed,
      executeResponse: nextExecuteResponse,
      executeError: nextExecuteError,
      gradeStatus: nextGradeStatus,
      gradeBody: nextGradeBody,
      gradeError: nextGradeError,
    })

    if (nextExecuteError) {
      setGradeError(nextGradeError || nextExecuteError)
    }
  }

  const handleOpenSupplement = async () => {
    setSupplementOpen(true)
    setSupplementError('')
    if (supplementBody.trim() || isSupplementLoading) return

    try {
      const response = await supplementMutation.mutateAsync(
        buildSqlSupplementPrompt({
          example,
          submittedSql: submittedSql.trim(),
          answerSql: example.answerSql,
          gradeFeedback: gradeBody,
        }),
      )
      setSupplementBody(response.answer.trim() || '보충 설명을 생성하지 못했습니다.')
    } catch (error) {
      setSupplementError(
        error instanceof Error ? error.message : '보충 설명을 생성하는 중 오류가 발생했습니다.',
      )
    }
  }

  const handleAnswerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      handleSubmitAnswer()
    }
  }

  return (
    <>
      <div
        className={`overflow-hidden rounded-md border border-surface-border bg-surface-raised shadow-sm ${className ?? ''}`}
      >
      <div className="flex items-center justify-between gap-3 border-b border-surface-border bg-surface-muted px-5 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-surface-border bg-surface-raised text-xs font-black tabular-nums text-text-primary">
            {String(example.order).padStart(2, '0')}
          </span>
          <span
            className={`rounded-md border px-2 py-1 text-[11px] font-black ${LEVEL_BADGE_CLASS[example.level]}`}
          >
            {sqlExampleLevelLabels[example.level]}
          </span>
          <span className="min-w-0 truncate text-xs font-semibold text-text-muted">
            {seedFile}
          </span>
        </div>
        <button
          type="button"
          className="ui-icon-button size-7 shrink-0"
          onClick={onClose}
          title="문제 닫기"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="rounded-md border border-surface-border-soft bg-surface-muted px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase text-text-muted">문제</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-text-primary">
                {example.title}
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-text-secondary">
                {example.description}
              </p>
            </div>
            {gradeStatus === 'correct' && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 py-1.5 text-xs font-bold text-brand-primary">
                <CheckCircle className="size-3.5" />
                정답
              </span>
            )}
            {gradeStatus === 'incorrect' && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/40 bg-danger-glass px-3 py-1.5 text-xs font-bold text-destructive">
                <XCircle className="size-3.5" />
                오답
              </span>
            )}
          </div>
        </div>

        <div className="rounded-md border border-surface-border-soft bg-surface-raised">
          <div className="flex items-center justify-between gap-3 border-b border-surface-border-soft px-4 py-3">
            <div className="flex items-center gap-2">
              <Table2 className="size-4 text-brand-primary" />
              <p className="text-sm font-black text-text-primary">대상 테이블</p>
            </div>
            <span className="rounded-md border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-muted">
              {targetTables.length}개
            </span>
          </div>

          <div className={`grid gap-2 p-3 ${targetTables.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {targetTables.map(({ tableName, info }) => (
              <div
                key={tableName}
                className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Database className="size-3.5 shrink-0 text-brand-primary" />
                    <span className="truncate text-sm font-black text-text-primary">
                      {tableName}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {info && (
                      <span className="text-[11px] font-bold tabular-nums text-text-muted">
                        {info.rowCount}행
                      </span>
                    )}
                    {info && (
                      <button
                        type="button"
                        className="ui-icon-button size-7"
                        onClick={() => setSchemaDialog(info)}
                        aria-label={`${tableName} 스키마 보기`}
                        title="스키마 보기"
                      >
                        <Info className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {info ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {info.columns.slice(0, 6).map((column) => (
                      <span
                        key={column.name}
                        className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm border border-surface-border-soft bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary"
                      >
                        <span className="truncate">{column.name}</span>
                        {column.primaryKey && (
                          <span className="text-[9px] font-black text-brand-primary">PK</span>
                        )}
                      </span>
                    ))}
                    {info.columns.length > 6 && (
                      <span className="rounded-sm border border-surface-border-soft bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                        +{info.columns.length - 6}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-text-muted">테이블 정보를 불러오는 중입니다.</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-brand-border bg-brand-glass px-3 py-2.5">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-brand-primary" />
          <p className="text-xs leading-5 text-text-secondary">{example.hint}</p>
        </div>

        <div className="rounded-md border border-surface-border bg-surface-muted p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-text-primary">답안 SQL</p>
              <p className="mt-1 text-xs text-text-muted">Ctrl+Enter로 바로 제출할 수 있습니다.</p>
            </div>
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!submittedSql.trim() || isGrading}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 text-xs font-bold text-brand-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGrading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              제출
            </button>
          </div>

          <textarea
            value={submittedSql}
            onChange={(event) => setSubmittedSql(event.target.value)}
            onKeyDown={handleAnswerKeyDown}
            className="ui-input min-h-40 w-full resize-y font-mono text-sm leading-6"
            placeholder={
              'SELECT ...\nFROM ...\nWHERE ...\nORDER BY ...;'
            }
            spellCheck={false}
          />

          {(isGrading || gradeError || gradeBody) && (
            <div className="mt-3 rounded-md border border-surface-border bg-surface-raised px-3 py-2">
              {isGrading && (
                <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                  <Loader2 className="size-3.5 animate-spin" />
                  Gemini가 정답과 비교하는 중입니다.
                </div>
              )}
              {!isGrading && gradeError && (
                <p className="text-xs font-semibold text-destructive">{gradeError}</p>
              )}
              {!isGrading && !gradeError && gradeBody && (
                <div className="flex items-start gap-3">
                  <pre className="min-w-0 flex-1 whitespace-pre-wrap font-sans text-xs leading-5 text-text-secondary">
                    {gradeBody}
                  </pre>
                  <button
                    type="button"
                    onClick={handleOpenSupplement}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 text-[11px] font-bold text-brand-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSupplementLoading}
                  >
                    {isSupplementLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <BookOpenText className="size-3.5" />
                    )}
                    보충 설명
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onToggleAnswer}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-colors ${
              answerOpen
                ? 'border-brand-border bg-brand-glass text-brand-primary'
                : 'border-surface-border bg-surface-muted text-text-secondary hover:border-brand-border hover:text-brand-primary'
            }`}
          >
            {answerOpen ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {answerOpen ? '정답 숨기기' : '정답 보기'}
          </button>
        </div>

        {answerOpen && (
          <div className="space-y-2">
            <pre className="max-h-56 overflow-auto rounded-md border border-surface-border bg-surface-muted px-4 py-3 font-mono text-xs leading-5 text-text-secondary">
              {example.answerSql}
            </pre>
            <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
              <p className="text-[11px] font-black text-text-muted">해설</p>
              <p className="mt-1 text-[11px] leading-5 text-text-secondary">{example.explanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>

      {schemaDialog && (
        <SqlTableSchemaDialog
          table={schemaDialog}
          tables={tables}
          onClose={() => setSchemaDialog(null)}
        />
      )}

      <SqlSupplementExplanationDialog
        open={supplementOpen}
        onOpenChange={setSupplementOpen}
        title={`${example.title}의 정답 SQL`}
        body={supplementBody}
        error={supplementError}
        isLoading={isSupplementLoading}
      />

      <SqlSubmissionResultDialog
        open={submissionResult !== null}
        onOpenChange={(open) => {
          if (!open) setSubmissionResult(null)
        }}
        result={submissionResult}
        title={example.title}
        description={example.description}
        onOpenSupplement={handleOpenSupplement}
        isSupplementLoading={isSupplementLoading}
      />
    </>
  )
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function SqlSubmissionResultDialog({
  open,
  onOpenChange,
  result,
  title,
  description,
  onOpenSupplement,
  isSupplementLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: SqlSubmissionResultState | null
  title: string
  description: string
  onOpenSupplement: () => void
  isSupplementLoading: boolean
}) {
  if (!result) return null

  const isCorrect = result.gradeStatus === 'correct'
  const isIncorrect = result.gradeStatus === 'incorrect'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[211] flex max-h-[min(760px,calc(100vh-2rem))] w-[min(1120px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-sm font-black text-text-primary">
                제출 결과
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs leading-5 text-text-muted">
                <span className="font-bold text-text-secondary">{title}</span>
                <span className="mx-1 text-text-muted">·</span>
                <span className="break-words">{description}</span>
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
            <section className="min-h-0 overflow-y-auto border-b border-surface-border p-4 md:border-b-0 md:border-r">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-text-primary">쿼리 결과</p>
                  <p className="mt-1 text-xs text-text-muted">제출한 SQL을 practice DB에서 실행한 결과입니다.</p>
                </div>
                {result.executeResponse && (
                  <span className="rounded-md border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] font-bold text-text-muted">
                    {result.executeResponse.executionTimeMs}ms
                  </span>
                )}
              </div>

              <pre className="mb-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 font-mono text-xs leading-5 text-text-secondary">
                {result.submittedSql}
              </pre>

              {result.executeError ? (
                <div className="rounded-md border border-destructive/40 bg-danger-glass px-3 py-2 text-sm font-semibold text-destructive">
                  {result.executeError}
                </div>
              ) : result.executeResponse ? (
                <SqlResultTable response={result.executeResponse} />
              ) : (
                <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-sm text-text-muted">
                  실행 결과가 없습니다.
                </div>
              )}
            </section>

            <aside className="min-h-0 overflow-y-auto bg-surface-muted p-4">
              <div
                className={`mb-3 flex items-center gap-2 rounded-md border px-3 py-3 ${
                  isCorrect
                    ? 'border-brand-border bg-brand-glass text-brand-primary'
                    : isIncorrect
                      ? 'border-destructive/40 bg-danger-glass text-destructive'
                      : 'border-surface-border bg-surface-raised text-text-secondary'
                }`}
              >
                {isCorrect ? (
                  <CheckCircle className="size-4 shrink-0" />
                ) : isIncorrect ? (
                  <XCircle className="size-4 shrink-0" />
                ) : (
                  <Info className="size-4 shrink-0" />
                )}
                <p className="text-sm font-black">
                  {isCorrect ? '정답입니다' : isIncorrect ? '오답입니다' : '판정 실패'}
                </p>
              </div>

              <div className="rounded-md border border-surface-border bg-surface-raised p-3">
                <p className="mb-2 text-xs font-black text-text-primary">채점 피드백</p>
                {result.gradeError ? (
                  <p className="text-sm font-semibold text-destructive">{result.gradeError}</p>
                ) : result.gradeBody ? (
                  <pre className="max-h-[360px] whitespace-pre-wrap break-words font-sans text-sm leading-6 text-text-secondary">
                    {result.gradeBody}
                  </pre>
                ) : (
                  <p className="text-sm text-text-muted">채점 결과가 없습니다.</p>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={onOpenSupplement}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 text-xs font-bold text-brand-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSupplementLoading || !result.gradeBody}
                >
                  {isSupplementLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <BookOpenText className="size-3.5" />
                  )}
                  보충 설명
                </button>
              </div>
            </aside>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function buildSqlSupplementPrompt({
  example,
  submittedSql,
  answerSql,
  gradeFeedback,
}: {
  example: SqlPracticeExample
  submittedSql: string
  answerSql: string
  gradeFeedback: string
}) {
  return `다음 SQL 연습 문제에 대해 학습자용 보충 설명을 작성해주세요.

반드시 Markdown 형식으로만 응답해주세요. HTML은 쓰지 마세요.
노트에 그대로 복사해서 붙여넣을 수 있게 작성해주세요.
아래 제목 구조를 그대로 사용하고, 각 제목은 Markdown 2단계 헤딩(##)으로 작성해주세요.
SQL은 반드시 fenced code block(\`\`\`sql)으로 감싸주세요.
한국어로 간결하지만 충분히 설명해주세요.

## Sql 문제 정답

## Sql 주요 문법 설명

## 주의할점

## 또 다른 예제

[문제 제목]
${example.title}

[문제 설명]
${example.description}

[힌트]
${example.hint}

[관련 테이블]
${example.relatedTables.join(', ') || '없음'}

[정답 SQL]
${answerSql}

[사용자 제출 SQL]
${submittedSql}

[채점 피드백]
${gradeFeedback}`
}

function SqlSupplementExplanationDialog({
  open,
  onOpenChange,
  title,
  body,
  error,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  error: string
  isLoading: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!body.trim()) return
    await navigator.clipboard.writeText(body)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[220] ui-overlay" />
        <Dialog.Content className="glass-panel fixed left-1/2 top-1/2 z-[221] flex max-h-[min(760px,calc(100vh-2rem))] w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border border-surface-border shadow-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-surface-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <div className="ui-icon-button-brand size-8 shrink-0">
                <BookOpenText className="size-4" />
              </div>
              <Dialog.Title className="truncate text-base font-black text-text-primary">
                {title}
              </Dialog.Title>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="ui-icon-button h-8 gap-1.5 px-3 text-xs font-bold"
                onClick={handleCopy}
                disabled={!body.trim() || isLoading}
                title="Markdown 복사"
              >
                <Copy className="size-3.5" />
                {copied ? '복사됨' : '복사'}
              </button>
              <Dialog.Close asChild>
                <button type="button" className="ui-icon-button size-8 shrink-0" aria-label="닫기">
                  <X className="size-4" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-surface-muted/50 p-5">
            <div className="rounded-md border border-surface-border-soft bg-surface-raised px-6 py-5">
              {isLoading ? (
                <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-semibold text-text-muted">
                  <Loader2 className="size-4 animate-spin" />
                  보충 설명을 생성하는 중입니다.
                </div>
              ) : error ? (
                <p className="text-sm font-semibold text-destructive">{error}</p>
              ) : (
                <MarkdownPreview markdown={body || '보충 설명이 아직 없습니다.'} />
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/(```[\s\S]*?```)/g).filter((block) => block.length > 0)

  return (
    <div className="space-y-3 text-sm leading-7 text-text-secondary">
      {blocks.map((block, blockIndex) => {
        const codeMatch = block.match(/^```(\w+)?\n?([\s\S]*?)```$/)
        if (codeMatch) {
          return (
            <pre
              key={`code-${blockIndex}`}
              className="overflow-auto rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 font-mono text-xs leading-6 text-text-primary"
            >
              <code>{codeMatch[2].trim()}</code>
            </pre>
          )
        }

        return block
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, lineIndex) => {
            const key = `text-${blockIndex}-${lineIndex}`
            if (line.startsWith('## ')) {
              return (
                <h3 key={key} className="pt-1 text-base font-black text-text-primary">
                  {line.replace(/^##\s+/, '')}
                </h3>
              )
            }
            if (line.startsWith('# ')) {
              return (
                <h2 key={key} className="text-lg font-black text-text-primary">
                  {line.replace(/^#\s+/, '')}
                </h2>
              )
            }
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return (
                <p key={key} className="pl-4 text-text-secondary">
                  <span className="mr-2 text-brand-primary">-</span>
                  <InlineMarkdown text={line.replace(/^[-*]\s+/, '')} />
                </p>
              )
            }
            return (
              <p key={key} className="text-text-secondary">
                <InlineMarkdown text={line} />
              </p>
            )
          })
      })}
    </div>
  )
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean)

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={`${part}-${index}`}
              className="rounded-sm border border-surface-border-soft bg-surface-muted px-1.5 py-0.5 font-mono text-[0.9em] text-text-primary"
            >
              {part.slice(1, -1)}
            </code>
          )
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={`${part}-${index}`} className="font-black text-text-primary">
              {part.slice(2, -2)}
            </strong>
          )
        }
        return part
      })}
    </>
  )
}

function EmptyState({
  isLoading,
  tableCount,
  seedFile,
  recommendedQuery,
}: {
  isLoading: boolean
  tableCount: number
  seedFile?: string
  recommendedQuery?: string
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 size-10 animate-spin rounded-full border-2 border-surface-border border-t-brand-border" />
        <p className="text-sm font-semibold text-text-primary">연습 DB를 준비하는 중입니다</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[420px] items-center justify-center p-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-surface-border bg-surface-raised shadow-sm">
        <div className="flex items-center gap-3 border-b border-surface-border bg-surface-muted px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-xl border border-brand-border bg-brand-glass text-brand-primary">
            <Code2 className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">SQL을 실행해보세요</p>
            <p className="text-[11px] text-text-muted">쿼리를 작성하면 결과가 여기에 표시됩니다</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-surface-border px-5 py-3">
          <Database className="size-3.5 shrink-0 text-brand-primary" />
          <span className="min-w-0 truncate text-xs font-semibold text-text-secondary">
            {seedFile ?? '01_board_basic.sql'}
          </span>
          <span className="ml-auto shrink-0 rounded-md border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-muted">
            테이블 {tableCount}개
          </span>
        </div>

        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
            예시 쿼리
          </p>
          <pre className="overflow-x-auto rounded-lg border border-surface-border-soft bg-surface-muted px-4 py-3 font-mono text-xs leading-5 text-text-secondary">
            {recommendedQuery ?? 'SELECT * FROM users LIMIT 10;'}
          </pre>
          <p className="mt-3 text-center text-[11px] text-text-muted">Ctrl+Enter 로 실행</p>
        </div>
      </div>
    </div>
  )
}
