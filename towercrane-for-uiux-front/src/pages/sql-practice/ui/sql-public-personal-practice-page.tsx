import * as Dialog from '@radix-ui/react-dialog'
import { useParams } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { CheckCircle, Database, Loader2, Send, Table2, X, XCircle } from 'lucide-react'

import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'
import type { SqlExecuteResponse, SqlUserPracticeGradeResponse, TableInfo } from '../../../entities/sql-practice/model/types'
import {
  useGradePublicSqlPersonalPracticeProblem,
  usePublicSqlPersonalPracticeProblem,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { SqlErdDialog } from '../../../features/sql-practice/ui/sql-erd-dialog'
import { SqlResultTable } from '../../../features/sql-practice/ui/sql-result-table'
import { SqlTableSchemaDialog } from '../../../features/sql-practice/ui/sql-table-schema-dialog'
import { Button } from '../../../shared/ui/button'
import { Card } from '../../../shared/ui/card'
import { Textarea } from '../../../shared/ui/textarea'

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

export function SqlPublicPersonalPracticePage() {
  const params = useParams({ strict: false }) as { token?: string }
  const token = params.token ?? ''
  const problemQuery = usePublicSqlPersonalPracticeProblem(token)
  const gradeMutation = useGradePublicSqlPersonalPracticeProblem()
  const data = problemQuery.data ?? null
  const [query, setQuery] = useState('')
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null)
  const [erdOpen, setErdOpen] = useState(false)
  const [lastResult, setLastResult] = useState<SqlExecuteResponse | null>(null)
  const [gradeResult, setGradeResult] = useState<SqlUserPracticeGradeResponse | null>(null)
  const queryTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const selectedTargetTables = useMemo(() => {
    if (!data) return []
    const targets = new Set(data.problem.targetTables)
    return data.tables.filter((table) => targets.has(table.tableName))
  }, [data])
  const totalScore = gradeResult?.isCorrect ? 1 : 0
  const scorePercent = data && gradeResult?.isCorrect ? 100 : 0

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

  const handleExecute = async () => {
    const trimmed = query.trim()
    if (!trimmed || !token) return
    const response = await gradeMutation.mutateAsync({
      token,
      payload: { submittedSql: trimmed },
    })
    setLastResult(response.execution)
    setGradeResult(response)
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <Card className="flex items-center justify-between rounded-md border border-surface-border bg-surface-strong px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Database className="size-4 shrink-0 text-brand-primary" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black text-text-primary">
                {data?.workspace.title ?? '공개 SQL 문제'}
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">
                {data
                  ? `schema v${data.schemaVersion.version} · ${data.schemaVersion.title}`
                  : '공유 링크로 공개된 SQL 문제입니다.'}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid h-[calc(100dvh-150px)] min-h-0 gap-4 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)_320px]">
          <Card className="flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-border-soft p-0">
            <div className="border-b border-surface-border-soft px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-black text-text-primary">문제 목록</h2>
                  <p className="mt-1 text-xs font-semibold text-text-muted">
                    {data ? '1문제' : problemQuery.isLoading ? '불러오는 중' : '0문제'}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-6 gap-1">
                {([1, 2, 3, 4, 5, 'all'] as const).map((level) => {
                  const isActive = data
                    ? level === data.problem.level || (level === 'all' && false)
                    : level === 1
                  return (
                    <button
                      key={level}
                      type="button"
                      className={`h-8 rounded-sm border text-xs font-black ${
                        isActive
                          ? 'border-brand-border bg-brand-primary text-text-on-brand'
                          : 'border-surface-border-soft bg-surface-muted text-text-secondary'
                      }`}
                    >
                      {level === 'all' ? 'All' : level}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {problemQuery.isLoading ? (
                <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-4 text-sm font-semibold text-text-muted">
                  문제를 불러오는 중입니다.
                </div>
              ) : data ? (
                <div className="w-full rounded-md border border-brand-border bg-brand-glass px-3 py-2 text-left">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-surface-border-soft text-xs font-black text-text-secondary">
                      L{data.problem.level}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-text-primary">
                      {data.problem.title}
                    </span>
                    {gradeResult?.isCorrect ? (
                      <CheckCircle className="size-3.5 shrink-0 text-brand-primary" />
                    ) : gradeResult ? (
                      <XCircle className="size-3.5 shrink-0 text-destructive" />
                    ) : null}
                  </div>
                  <p className="mt-1 truncate pl-9 text-xs font-medium text-text-muted">
                    {data.problem.authorName ?? 'Unknown'} ·{' '}
                    {data.problem.targetTables.join(', ') || '테이블 미지정'}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-4 text-sm font-semibold text-text-muted">
                  표시할 공유 문제가 없습니다.
                </div>
              )}
            </div>

            <div className="border-t border-surface-border bg-surface-muted p-3">
              <div className="flex items-end justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-text-muted">
                  총점
                </p>
                <p className="text-sm font-black tabular-nums text-text-primary">
                  {totalScore} / {data ? 1 : 0}
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

          <Card className="flex min-h-0 flex-col overflow-hidden rounded-md border border-surface-border-soft p-0">
            {problemQuery.isLoading ? (
              <div className="flex min-h-[420px] items-center justify-center text-sm font-semibold text-text-muted">
                문제를 불러오는 중입니다.
              </div>
            ) : data ? (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="flex min-h-full flex-col gap-4">
                <div className="rounded-md border border-surface-border-soft bg-surface-muted">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 px-4 py-3">
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-sm border border-surface-border-soft bg-surface-raised px-2 text-xs font-black text-text-primary">
                        L{data.problem.level}
                      </span>
                      <h2 className="truncate text-lg font-black text-text-primary">
                        {data.problem.title}
                      </h2>
                    </div>
                  </div>
                  <p className="border-t border-surface-border-soft px-4 py-3 text-sm leading-6 text-text-secondary">
                    {data.problem.description}
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

                {data.problem.targetTables.length > 0 && selectedTargetTables.length === 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {data.problem.targetTables.map((table) => (
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
                    className="mt-3 min-h-[190px] resize-none font-mono text-sm leading-6"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleExecute}
                      disabled={!query.trim() || gradeMutation.isPending}
                      className="gap-1.5"
                    >
                      {gradeMutation.isPending ? (
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
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                <Database className="mb-3 size-10 text-text-muted" />
                <p className="text-sm font-bold text-text-primary">공개 문제를 찾을 수 없습니다</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  링크가 잘못되었거나, 공유가 해제된 SQL 문제입니다.
                </p>
              </div>
            )}
          </Card>

          <Card className="flex min-h-0 flex-col overflow-hidden rounded-md p-0">
            <div className="border-b border-surface-border px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-text-primary">테이블</h2>
                  <p className="mt-1 text-xs font-semibold text-text-muted">
                    practice.sqlite
                  </p>
                </div>
                {data?.erdMmd && (
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
                <p>schema: {data ? `v${data.schemaVersion.version}` : '-'}</p>
                <p>tables: {data?.tables.length ?? 0}</p>
                <p>hash: {data?.schemaVersion.dbFileHash.slice(0, 10) ?? 'loading'}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {(data?.tables ?? []).map((table) => (
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
      </div>

      {selectedTable && data && (
        <SqlTableSchemaDialog
          table={selectedTable}
          tables={data.tables}
          loadRows={(tableName) => sqlPracticeApi.getPublicPersonalTableRows(token, tableName)}
          onClose={() => setSelectedTable(null)}
        />
      )}

      {data?.erdMmd && (
        <SqlErdDialog
          open={erdOpen}
          seedFileName={data.schemaVersion.title}
          mmd={data.erdMmd}
          onClose={() => setErdOpen(false)}
        />
      )}

      <SqlPublicPersonalPracticeGradeDialog
        result={gradeResult}
        problemTitle={data?.problem.title ?? ''}
        problemDescription={data?.problem.description ?? ''}
        onClose={() => setGradeResult(null)}
      />
    </div>
  )
}

function SqlPublicPersonalPracticeGradeDialog({
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
                    제출한 SQL을 공유 SQL 연습장 DB에서 실행한 결과입니다.
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
