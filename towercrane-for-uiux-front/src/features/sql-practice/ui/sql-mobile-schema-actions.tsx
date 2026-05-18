import { GitFork, Info, Table2 } from 'lucide-react'
import { useState } from 'react'

import type { SqlPracticeMeta, TableInfo } from '../../../entities/sql-practice/model/types'
import { useSqlPracticeErd } from '../model/use-sql-practice-queries'
import { SqlErdDialog } from './sql-erd-dialog'
import { SqlTableSchemaDialog } from './sql-table-schema-dialog'

type SqlMobileSchemaActionsProps = {
  meta?: SqlPracticeMeta
  tables: TableInfo[]
}

export function SqlMobileSchemaActions({ meta, tables }: SqlMobileSchemaActionsProps) {
  const [erdOpen, setErdOpen] = useState(false)
  const [schemaDialog, setSchemaDialog] = useState<TableInfo | null>(null)
  const erdQuery = useSqlPracticeErd(meta?.seedFile)

  return (
    <>
      <section className="ui-panel-soft min-w-0 rounded-md bg-surface-raised p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Table2 className="size-4 shrink-0 text-brand-primary" />
            <p className="truncate text-sm font-black text-text-primary">
              테이블 {meta?.tableCount ?? tables.length}개
            </p>
          </div>
          {erdQuery.data?.mmd && (
            <button
              type="button"
              className="ui-icon-button-brand h-8 shrink-0 gap-1.5 px-3 text-[11px] font-bold"
              onClick={() => setErdOpen(true)}
              title="ERD 보기"
            >
              <GitFork className="size-3.5" />
              ERD
            </button>
          )}
        </div>

        {tables.length === 0 ? (
          <p className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-xs text-text-muted">
            표시할 테이블이 없습니다.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tables.map((table) => (
              <button
                key={table.tableName}
                type="button"
                className="inline-flex h-8 max-w-[180px] shrink-0 items-center gap-1.5 rounded-md border border-surface-border-soft bg-surface-muted px-2.5 text-xs font-bold text-text-primary"
                onClick={() => setSchemaDialog(table)}
                title={`${table.tableName} 스키마 보기`}
              >
                <span className="truncate">{table.tableName}</span>
                <Info className="size-3.5 shrink-0 text-text-muted" />
              </button>
            ))}
          </div>
        )}
      </section>

      {schemaDialog && (
        <SqlTableSchemaDialog
          table={schemaDialog}
          tables={tables}
          onClose={() => setSchemaDialog(null)}
        />
      )}

      {erdQuery.data?.mmd && (
        <SqlErdDialog
          open={erdOpen}
          seedFileName={meta?.seedFile ?? ''}
          mmd={erdQuery.data.mmd}
          onClose={() => setErdOpen(false)}
        />
      )}
    </>
  )
}
