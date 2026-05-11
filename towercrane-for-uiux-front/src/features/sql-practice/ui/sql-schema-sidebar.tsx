import { Database, Info, RefreshCw, RotateCcw, Settings, Table2, UploadCloud, GitFork } from 'lucide-react'
import { useState } from 'react'
import type {
  SqlPracticeMeta,
  SqlPracticeSeedSummary,
  TableInfo,
} from '../../../entities/sql-practice/model/types'
import {
  useActivateSqlPracticeSeed,
  useSqlPracticeSeeds,
  useSqlPracticeErd,
} from '../model/use-sql-practice-queries'
import { SqlSeedManagerDialog } from './sql-seed-manager-dialog'
import { SqlTableSchemaDialog } from './sql-table-schema-dialog'
import { SqlErdView } from './sql-erd-view'

type SidebarTab = 'tables' | 'erd'

type SqlSchemaSidebarProps = {
  meta?: SqlPracticeMeta
  tables: TableInfo[]
  selectedTable: string | null
  isLoading: boolean
  isResetting: boolean
  isReloading: boolean
  onSelectTable: (tableName: string) => void
  onRefresh: () => void
  onReset: () => void
  onReloadSeed: () => void
  onSeedActivated: () => void
}

export function SqlSchemaSidebar({
  meta,
  tables,
  selectedTable,
  isLoading,
  isResetting,
  isReloading,
  onSelectTable,
  onRefresh,
  onReset,
  onReloadSeed,
  onSeedActivated,
}: SqlSchemaSidebarProps) {
  const [schemaDialog, setSchemaDialog] = useState<TableInfo | null>(null)
  const [seedDialogOpen, setSeedDialogOpen] = useState(false)
  const [tab, setTab] = useState<SidebarTab>('tables')
  const seedsQuery = useSqlPracticeSeeds()
  const erdQuery = useSqlPracticeErd(meta?.seedFile)
  const activateSeedMutation = useActivateSqlPracticeSeed({
    onSuccess: () => {
      onSeedActivated()
      setSeedDialogOpen(false)
    },
  })

  const activeSeed =
    seedsQuery.data?.seeds.find((seed) => seed.isActive) ?? meta?.activeSeed

  const handleActivateSeed = (seed: SqlPracticeSeedSummary) => {
    return activateSeedMutation.mutateAsync({
      source: seed.source,
      fileName: seed.fileName,
    })
  }

  return (
    <>
      <aside className="ui-panel flex min-h-[360px] flex-col overflow-hidden rounded-md p-0">
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab('tables')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                tab === 'tables'
                  ? 'bg-text-primary text-background'
                  : 'text-text-secondary hover:bg-surface-muted'
              }`}
            >
              <Table2 className="size-3.5" />
              테이블
            </button>
            <button
              type="button"
              onClick={() => setTab('erd')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                tab === 'erd'
                  ? 'bg-text-primary text-background'
                  : 'text-text-secondary hover:bg-surface-muted'
              }`}
            >
              <GitFork className="size-3.5" />
              ERD
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className="ui-icon-button size-8"
              type="button"
              aria-label="SQL 연습 파일 관리"
              title="SQL 연습 파일 관리"
              onClick={() => setSeedDialogOpen(true)}
            >
              <Settings className="size-3.5" />
            </button>
            <button
              className="ui-icon-button size-8"
              type="button"
              aria-label="새로고침"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="border-b border-surface-border p-3">
          <div className="rounded-md border border-surface-border-soft bg-surface-muted p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
              <Database className="size-3.5 text-brand-primary" />
              {meta?.dbFile ?? 'practice.sqlite'}
            </div>
            <div className="mt-2 space-y-1 text-[11px] text-text-secondary">
              <p>seed: {meta?.seedFile ?? '01_board_basic.sql'}</p>
              <p>tables: {meta?.tableCount ?? tables.length}</p>
              <p>hash: {meta?.seedHash ? meta.seedHash.slice(0, 10) : 'loading'}</p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="ui-icon-button h-8 gap-1.5 text-xs"
              onClick={onReset}
              disabled={isResetting || isReloading}
              title="DB 초기화"
            >
              <RotateCcw className={`size-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              Reset
            </button>
            <button
              type="button"
              className="ui-icon-button h-8 gap-1.5 text-xs"
              onClick={onReloadSeed}
              disabled={isResetting || isReloading}
              title="현재 seed 다시 적용"
            >
              <UploadCloud className={`size-3.5 ${isReloading ? 'animate-spin' : ''}`} />
              Seed
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {tab === 'tables' && (
            <>
              {tables.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
                  <Table2 className="mb-3 size-9 text-text-muted" />
                  <p className="text-sm font-semibold text-text-primary">테이블이 없습니다</p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    CREATE TABLE을 실행하거나 Reset으로 현재 seed를 다시 적용하세요.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {tables.map((table) => {
                    const isSelected = selectedTable === table.tableName
                    return (
                      <button
                        key={table.tableName}
                        type="button"
                        onClick={() => onSelectTable(table.tableName)}
                        className={`group flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? 'border-brand-border bg-brand-glass text-brand-primary'
                            : 'border-transparent text-text-primary hover:border-surface-border-soft hover:bg-surface-muted'
                        }`}
                      >
                        <Table2 className="size-3.5 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{table.tableName}</span>
                          <span className="block text-[11px] text-text-muted">
                            {table.rowCount}행 · {table.columns.length}열
                          </span>
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="rounded-sm p-1 text-text-muted opacity-0 transition-opacity hover:bg-surface-raised hover:text-text-primary group-hover:opacity-100"
                          title="스키마 보기"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSchemaDialog(table)
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return
                            event.preventDefault()
                            event.stopPropagation()
                            setSchemaDialog(table)
                          }}
                        >
                          <Info className="size-3.5" />
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'erd' && (
            <div className="p-1">
              {erdQuery.isLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <div className="size-5 animate-spin rounded-full border-2 border-surface-border border-t-brand-border" />
                </div>
              ) : erdQuery.data?.mmd ? (
                <SqlErdView mmd={erdQuery.data.mmd} />
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
                  <GitFork className="mb-3 size-9 text-text-muted" />
                  <p className="text-sm font-semibold text-text-primary">ERD가 없습니다</p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    현재 시드 파일에 대응하는 ERD 파일이 없습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {schemaDialog && (
        <SqlTableSchemaDialog table={schemaDialog} onClose={() => setSchemaDialog(null)} />
      )}

      <SqlSeedManagerDialog
        open={seedDialogOpen}
        activeSeed={activeSeed}
        seeds={seedsQuery.data?.seeds ?? []}
        isLoading={seedsQuery.isLoading || seedsQuery.isFetching}
        isActivating={activateSeedMutation.isPending}
        onClose={() => setSeedDialogOpen(false)}
        onActivate={handleActivateSeed}
      />
    </>
  )
}
