import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle,
  Code2,
  Database,
  Eye,
  EyeOff,
  Lightbulb,
  Loader2,
  Send,
  Table2,
  X,
  XCircle,
} from 'lucide-react'

import { Card } from '../../../shared/ui/card'
import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'
import type { SqlHistoryItem, TableInfo } from '../../../entities/sql-practice/model/types'
import type {
  SqlExampleLevel,
  SqlPracticeExample,
} from '../../../entities/sql-practice/model/example-types'
import {
  useExecuteSqlPracticeQuery,
  useReloadSqlPracticeSeed,
  useResetSqlPracticeDb,
  useSqlPracticeMeta,
  useSqlPracticeTables,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { getSqlPracticeExampleSet, sqlExampleLevelLabels } from '../../../features/sql-practice/model/sql-practice-examples'
import { SqlHistoryItem as SqlHistoryItemView } from '../../../features/sql-practice/ui/sql-history-item'
import { SqlInputBar } from '../../../features/sql-practice/ui/sql-input-bar'
import { SqlNotesDialog } from '../../../features/sql-practice/ui/sql-notes-dialog'
import { SqlPracticePageHeader } from '../../../features/sql-practice/ui/sql-practice-page-header'
import { SqlQuizSidebar } from '../../../features/sql-practice/ui/sql-quiz-sidebar'
import { SqlSchemaSidebar } from '../../../features/sql-practice/ui/sql-schema-sidebar'
import { useSessionStore } from '../../../shared/store/session-store'

const EMPTY_TABLES: TableInfo[] = []

const LEVEL_BADGE_CLASS: Record<SqlExampleLevel, string> = {
  beginner: 'border-brand-border bg-brand-glass text-brand-primary',
  intermediate: 'border-surface-border bg-surface-muted text-text-secondary',
  advanced: 'border-surface-border bg-surface-strong text-text-primary',
}

type SqlGradeStatus = 'correct' | 'incorrect' | null

function parseSqlGradeResponse(raw: string): { status: SqlGradeStatus; body: string } {
  const firstLine = raw.split('\n')[0]?.trim()

  if (firstLine === '[SQL_CORRECT]') {
    return { status: 'correct', body: raw.slice(firstLine.length).replace(/^\n/, '') }
  }

  if (firstLine === '[SQL_INCORRECT]') {
    return { status: 'incorrect', body: raw.slice(firstLine.length).replace(/^\n/, '') }
  }

  return { status: null, body: raw }
}

function buildSqlGradePrompt(example: SqlPracticeExample, submittedSql: string) {
  return `SQL 연습 문제의 사용자 제출 답안을 채점해주세요.

[문제]
제목: ${example.title}
설명: ${example.description}
힌트: ${example.hint}
관련 테이블: ${example.relatedTables.join(', ')}

[실제 정답 SQL]
${example.answerSql}

[사용자 제출 SQL]
${submittedSql}

[채점 요청]
사용자 제출 SQL이 문제 요구사항과 실제 정답 SQL의 결과를 같은 의미로 만족하는지 판별해주세요.`
}

export function SqlPracticePage() {
  const [history, setHistory] = useState<SqlHistoryItem[]>([])
  const [selectedTableOverride, setSelectedTableOverride] = useState<string | null>(null)
  const [quizSidebarOpen, setQuizSidebarOpen] = useState(true)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [selectedExample, setSelectedExample] = useState<SqlPracticeExample | null>(null)
  const [answerOpen, setAnswerOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const userName = useSessionStore((state) => state.userName)

  const metaQuery = useSqlPracticeMeta()
  const tablesQuery = useSqlPracticeTables()
  const executeMutation = useExecuteSqlPracticeQuery()
  const resetMutation = useResetSqlPracticeDb()
  const reloadSeedMutation = useReloadSqlPracticeSeed()

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
    <section className="space-y-4">
      <SqlPracticePageHeader
        key={metaQuery.data?.seedFile ?? 'loading'}
        seedFile={metaQuery.data?.seedFile}
        hasHistory={history.length > 0}
        onClearHistory={() => setHistory([])}
      />

      <div className="flex gap-4">
        {/* 왼쪽 문제 목록 사이드바 */}
        <SqlQuizSidebar
          exampleSet={exampleSet}
          selectedExample={selectedExample}
          onSelectExample={handleSelectExample}
          onOpenNotes={() => setNotesDialogOpen(true)}
          isOpen={quizSidebarOpen}
          onToggle={() => setQuizSidebarOpen((v) => !v)}
        />

        {/* 메인 SQL 영역 */}
        <Card className="flex min-h-[calc(100vh-220px)] min-w-0 flex-1 flex-col overflow-hidden rounded-md p-0">
          <div className="flex-1 overflow-y-auto p-4">
            {/* 선택된 문제 패널 */}
            {selectedExample && (
              <ProblemPanel
                example={selectedExample}
                answerOpen={answerOpen}
                onToggleAnswer={() => setAnswerOpen((v) => !v)}
                onClose={handleCloseExample}
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

          <SqlInputBar
            onExecute={handleExecute}
            onClear={() => setHistory([])}
            isLoading={executeMutation.isPending}
          />
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

      <SqlNotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        userName={userName}
        seedFile={metaQuery.data?.seedFile}
        selectedExample={selectedExample}
        selectedTable={selectedTable}
      />
    </section>
  )
}

function ProblemPanel({
  example,
  answerOpen,
  onToggleAnswer,
  onClose,
  className,
}: {
  example: SqlPracticeExample
  answerOpen: boolean
  onToggleAnswer: () => void
  onClose: () => void
  className?: string
}) {
  const [submittedSql, setSubmittedSql] = useState('')
  const [gradeStatus, setGradeStatus] = useState<SqlGradeStatus>(null)
  const [gradeBody, setGradeBody] = useState('')
  const [gradeError, setGradeError] = useState('')
  const [isGrading, setIsGrading] = useState(false)

  useEffect(() => {
    setSubmittedSql('')
    setGradeStatus(null)
    setGradeBody('')
    setGradeError('')
    setIsGrading(false)
  }, [example.id])

  const handleSubmitAnswer = async () => {
    const trimmed = submittedSql.trim()
    if (!trimmed || isGrading) return

    setIsGrading(true)
    setGradeStatus(null)
    setGradeBody('')
    setGradeError('')

    try {
      const response = await sqlPracticeApi.geminiAsk(
        buildSqlGradePrompt(example, trimmed),
        'grading',
      )
      const parsed = parseSqlGradeResponse(response.answer ?? '')
      setGradeStatus(parsed.status)
      setGradeBody(parsed.body)
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : '채점 중 오류가 발생했습니다.')
    } finally {
      setIsGrading(false)
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-sm ${className ?? ''}`}
    >
      {/* 문제 헤더 */}
      <div className="flex items-start justify-between gap-3 border-b border-surface-border bg-surface-muted px-5 py-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="rounded-sm border border-surface-border bg-surface-raised px-2 py-0.5 text-[11px] font-black text-text-primary">
            문제
          </span>
          <span
            className={`rounded-sm border px-2 py-0.5 text-[11px] font-black ${LEVEL_BADGE_CLASS[example.level]}`}
          >
            {sqlExampleLevelLabels[example.level]}
          </span>
          <span className="text-xs font-bold tabular-nums text-text-muted">
            Q.{String(example.order).padStart(2, '0')}
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

      {/* 문제 본문 */}
      <div className="px-5 py-4">
        <h2 className="text-base font-black leading-snug text-text-primary">{example.title}</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{example.description}</p>

        {/* 관련 테이블 */}
        <div className="mt-3 flex flex-wrap gap-1.5">
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

        {/* 힌트 */}
        <div className="mt-3 flex items-start gap-2 rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-brand-primary" />
          <p className="text-[11px] leading-5 text-text-muted">{example.hint}</p>
        </div>

        {/* 정답 제출 */}
        <div className="mt-4 rounded-md border border-surface-border-soft bg-surface-muted p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-text-primary">정답 입력</p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                작성한 SQL을 제출하면 Gemini가 실제 정답과 비교합니다.
              </p>
            </div>
            {gradeStatus === 'correct' && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-brand-border bg-brand-glass px-2 py-1 text-[11px] font-bold text-brand-primary">
                <CheckCircle className="size-3.5" />
                정답
              </span>
            )}
            {gradeStatus === 'incorrect' && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-destructive/40 bg-danger-glass px-2 py-1 text-[11px] font-bold text-destructive">
                <XCircle className="size-3.5" />
                오답
              </span>
            )}
          </div>

          <textarea
            value={submittedSql}
            onChange={(event) => setSubmittedSql(event.target.value)}
            className="ui-input min-h-28 w-full resize-y font-mono text-xs leading-5"
            placeholder={
              '예: SELECT id, name, email, city, role, created_at\nFROM users\nORDER BY created_at ASC;'
            }
            spellCheck={false}
          />

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!submittedSql.trim() || isGrading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-brand-border bg-brand-glass px-3 text-xs font-bold text-brand-primary transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGrading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              제출
            </button>
          </div>

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
                <pre className="whitespace-pre-wrap font-sans text-xs leading-5 text-text-secondary">
                  {gradeBody}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* 정답 보기 버튼 */}
        <div className="mt-4 flex justify-end">
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

        {/* 정답 영역 */}
        {answerOpen && (
          <div className="mt-3 space-y-2">
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
