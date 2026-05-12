import { useEffect, useState } from 'react'
import { KeyRound, Loader2, Table2, X } from 'lucide-react'
import type { TableInfo } from '../../../entities/sql-practice/model/types'
import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'

type SqlTableSchemaDialogProps = {
  table: TableInfo
  onClose: () => void
}

export function SqlTableSchemaDialog({ table, onClose }: SqlTableSchemaDialogProps) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null)
  const [dataColumns, setDataColumns] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    sqlPracticeApi
      .execute(`SELECT * FROM "${table.tableName}" LIMIT 50`)
      .then((res) => {
        setDataColumns(res.columns ?? [])
        setRows(res.rows ?? [])
      })
      .catch(() => setRows([]))
      .finally(() => setIsLoading(false))
  }, [table.tableName])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="ui-overlay absolute inset-0"
        onClick={onClose}
        aria-label="닫기"
      />
      <section className="glass-panel relative z-10 flex h-[82vh] w-full max-w-5xl flex-col overflow-hidden rounded-md">
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Table2 className="size-4 text-brand-primary" />
            <h2 className="font-mono text-sm font-bold text-text-primary">{table.tableName}</h2>
            <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-2 py-1 text-[11px] text-text-secondary">
              {table.rowCount}행 · {table.columns.length}열
            </span>
          </div>
          <button type="button" className="ui-icon-button size-8" onClick={onClose} aria-label="닫기">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 divide-x divide-surface-border overflow-hidden">
          {/* 왼쪽: 스키마 */}
          <div className="w-[42%] shrink-0 overflow-y-auto p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-muted">스키마</p>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-surface-border-soft">
                  <th className="w-6 pb-2 text-text-muted" />
                  <th className="pb-2 font-bold text-text-secondary">컬럼명</th>
                  <th className="pb-2 font-bold text-text-secondary">타입</th>
                  <th className="pb-2 font-bold text-text-secondary">옵션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--surface-border-soft)]">
                {table.columns.map((column) => (
                  <tr key={column.name} className="hover:bg-surface-muted">
                    <td className="py-2 pr-2">
                      {column.primaryKey ? (
                        <KeyRound className="size-3.5 text-brand-primary" />
                      ) : (
                        <span className="block size-3 rounded-full border border-surface-border-soft" />
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono font-semibold text-text-primary">
                      {column.name}
                    </td>
                    <td className="py-2 pr-3 font-mono text-text-secondary">
                      {column.type || 'ANY'}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {column.primaryKey && (
                          <span className="rounded-sm border border-brand-border bg-brand-glass px-1.5 py-0.5 text-[10px] font-bold text-brand-primary">
                            PK
                          </span>
                        )}
                        {column.notNull && !column.primaryKey && (
                          <span className="rounded-sm border border-destructive bg-danger-glass px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                            NOT NULL
                          </span>
                        )}
                        {column.defaultValue && (
                          <span className="rounded-sm border border-surface-border-soft bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                            {column.defaultValue}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 오른쪽: 데이터 */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-text-muted">
              데이터{rows !== null ? ` (${rows.length}행)` : ''}
            </p>
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-text-muted" />
              </div>
            ) : rows && rows.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border-soft">
                      {dataColumns.map((col) => (
                        <th key={col} className="whitespace-nowrap pb-2 pr-4 font-bold text-text-secondary">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--surface-border-soft)]">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-surface-muted">
                        {dataColumns.map((col) => (
                          <td key={col} className="whitespace-nowrap py-1.5 pr-4 font-mono text-text-primary">
                            {row[col] === null || row[col] === undefined ? (
                              <span className="italic text-text-muted">NULL</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
                데이터 없음
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
