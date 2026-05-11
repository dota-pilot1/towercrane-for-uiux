import { useEffect, useRef, useState } from 'react'
import { Code2, Database, Trash2 } from 'lucide-react'

import { Card } from '../../../shared/ui/card'
import type { SqlHistoryItem } from '../../../entities/sql-practice/model/types'
import {
  useExecuteSqlPracticeQuery,
  useReloadSqlPracticeSeed,
  useResetSqlPracticeDb,
  useSqlPracticeMeta,
  useSqlPracticeTables,
} from '../../../features/sql-practice/model/use-sql-practice-queries'
import { SqlHistoryItem as SqlHistoryItemView } from '../../../features/sql-practice/ui/sql-history-item'
import { SqlInputBar } from '../../../features/sql-practice/ui/sql-input-bar'
import { SqlSchemaSidebar } from '../../../features/sql-practice/ui/sql-schema-sidebar'

export function SqlPracticePage() {
  const [history, setHistory] = useState<SqlHistoryItem[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const metaQuery = useSqlPracticeMeta()
  const tablesQuery = useSqlPracticeTables()
  const executeMutation = useExecuteSqlPracticeQuery()
  const resetMutation = useResetSqlPracticeDb()
  const reloadSeedMutation = useReloadSqlPracticeSeed()

  const tables = tablesQuery.data ?? []

  useEffect(() => {
    if (tables.length === 0) {
      setSelectedTable(null)
      return
    }

    if (!selectedTable || !tables.some((table) => table.tableName === selectedTable)) {
      setSelectedTable(tables[0].tableName)
    }
  }, [selectedTable, tables])

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
    if (!window.confirm('SQL 연습 DB를 seed.sql 기준으로 초기화할까요? 현재 직접 만든 테이블과 데이터는 삭제됩니다.')) {
      return
    }
    await resetMutation.mutateAsync()
    setHistory([])
    setSelectedTable(null)
  }

  const handleReloadSeed = async () => {
    if (!window.confirm('seed.sql을 다시 적용할까요? 현재 연습 DB는 새로 만들어집니다.')) {
      return
    }
    await reloadSeedMutation.mutateAsync()
    setHistory([])
    setSelectedTable(null)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="flex min-h-[calc(100vh-140px)] flex-col overflow-hidden rounded-md p-0">
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="ui-icon-button-brand size-9">
              <Database className="size-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">SQL 연습장</h1>
              <p className="text-xs text-text-secondary">
                별도 SQLite 연습 DB에 SQL을 실행합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
              SQLite
            </span>
            {history.length > 0 && (
              <button
                type="button"
                className="ui-icon-button size-8"
                onClick={() => setHistory([])}
                aria-label="히스토리 비우기"
                title="히스토리 비우기"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {history.length === 0 ? (
            <EmptyState
              isLoading={metaQuery.isLoading || tablesQuery.isLoading}
              tableCount={tables.length}
              seedFile={metaQuery.data?.seedFile}
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
        onSelectTable={setSelectedTable}
        onRefresh={handleRefresh}
        onReset={handleReset}
        onReloadSeed={handleReloadSeed}
      />
    </div>
  )
}

function EmptyState({
  isLoading,
  tableCount,
  seedFile,
}: {
  isLoading: boolean
  tableCount: number
  seedFile?: string
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
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-md border border-surface-border-soft bg-surface-muted text-text-muted">
        <Code2 className="size-7" />
      </div>
      <h2 className="text-base font-bold text-text-primary">SQL을 실행해보세요</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
        {seedFile ?? 'seed.sql'} 기준으로 {tableCount}개 테이블이 준비되어 있습니다.
        아래 입력창에서 SQL을 작성하면 결과가 여기에 쌓입니다.
      </p>
      <pre className="mt-5 rounded-md border border-surface-border-soft bg-surface-muted px-4 py-3 text-left font-mono text-xs text-text-secondary">
        SELECT * FROM users LIMIT 10;
      </pre>
    </div>
  )
}
