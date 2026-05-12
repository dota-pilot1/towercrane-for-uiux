import { useEffect, useMemo, useRef, useState } from 'react'
import { Code2, Database } from 'lucide-react'

import { Card } from '../../../shared/ui/card'
import type { SqlHistoryItem, TableInfo } from '../../../entities/sql-practice/model/types'
import {
  useExecuteSqlPracticeQuery,
  useReloadSqlPracticeSeed,
  useResetSqlPracticeDb,
  useSqlPracticeMeta,
  useSqlPracticeTables,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { SqlHistoryItem as SqlHistoryItemView } from '../../../features/sql-practice/ui/sql-history-item'
import { SqlInputBar } from '../../../features/sql-practice/ui/sql-input-bar'
import { SqlPracticePageHeader } from '../../../features/sql-practice/ui/sql-practice-page-header'
import { SqlSchemaSidebar } from '../../../features/sql-practice/ui/sql-schema-sidebar'

const EMPTY_TABLES: TableInfo[] = []

export function SqlPracticePage() {
  const [history, setHistory] = useState<SqlHistoryItem[]>([])
  const [selectedTableOverride, setSelectedTableOverride] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [history])

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
    setHistory([])
    setSelectedTableOverride(null)
  }

  const handleReloadSeed = async () => {
    const seedFile = metaQuery.data?.seedFile ?? '현재 seed'
    if (!window.confirm(`${seedFile}을 다시 적용할까요? 현재 연습 DB는 새로 만들어집니다.`)) {
      return
    }
    await reloadSeedMutation.mutateAsync()
    setHistory([])
    setSelectedTableOverride(null)
  }

  const handleSeedActivated = () => {
    setHistory([])
    setSelectedTableOverride(null)
  }

  return (
    <section className="space-y-4">
      <SqlPracticePageHeader
        key={metaQuery.data?.seedFile ?? 'loading'}
        seedFile={metaQuery.data?.seedFile}
        hasHistory={history.length > 0}
        onClearHistory={() => setHistory([])}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="flex min-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-md p-0">
        <div className="flex-1 overflow-y-auto p-4">
          {history.length === 0 ? (
            <EmptyState
              isLoading={metaQuery.isLoading || tablesQuery.isLoading}
              tableCount={tables.length}
              seedFile={metaQuery.data?.seedFile}
              recommendedQuery={metaQuery.data?.activeSeed.recommendedQueries[0]}
            />
          ) : (
            <div className="space-y-6">
              {history.map((item) => (
                <SqlHistoryItemView key={item.id} item={item} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <SqlInputBar onExecute={handleExecute} isLoading={executeMutation.isPending} />
      </Card>

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
        onSeedActivated={handleSeedActivated}
      />
    </div>
    </section>
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
        {/* 카드 헤더 */}
        <div className="flex items-center gap-3 border-b border-surface-border bg-surface-muted px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-xl border border-brand-border bg-brand-glass text-brand-primary">
            <Code2 className="size-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">SQL을 실행해보세요</p>
            <p className="text-[11px] text-text-muted">쿼리를 작성하면 결과가 여기에 표시됩니다</p>
          </div>
        </div>

        {/* 현재 DB 정보 */}
        <div className="flex items-center gap-2 border-b border-surface-border px-5 py-3">
          <Database className="size-3.5 shrink-0 text-brand-primary" />
          <span className="min-w-0 truncate text-xs font-semibold text-text-secondary">
            {seedFile ?? '01_board_basic.sql'}
          </span>
          <span className="ml-auto shrink-0 rounded-md border border-surface-border-soft bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-muted">
            테이블 {tableCount}개
          </span>
        </div>

        {/* 예시 쿼리 */}
        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
            예시 쿼리
          </p>
          <pre className="overflow-x-auto rounded-lg border border-surface-border-soft bg-surface-muted px-4 py-3 font-mono text-xs leading-5 text-text-secondary">
            {recommendedQuery ?? 'SELECT * FROM users LIMIT 10;'}
          </pre>
          <p className="mt-3 text-center text-[11px] text-text-muted">
            Ctrl+Enter 로 실행
          </p>
        </div>
      </div>
    </div>
  )
}
