import { useEffect, useState } from 'react'
import { KeyRound, Loader2, Table2, X } from 'lucide-react'
import type { TableInfo } from '../../../entities/sql-practice/model/types'
import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'

type SqlTableSchemaDialogProps = {
  table: TableInfo
  onClose: () => void
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="italic text-text-muted">NULL</span>
  }
  return <span>{String(value)}</span>
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
        {/* 헤더 */}
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
          <div className="w-[40%] shrink-0 overflow-y-auto">
            <div className="sticky top-0 border-b border-surface-border-soft bg-surface-muted px-4 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">스키마</span>
            </div>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-surface-border-soft">
                  <th className="w-7 px-4 py-2.5 text-text-muted" />
                  <th className="py-2.5 pr-3 font-semibold text-text-secondary">컬럼명</th>
                  <th className="py-2.5 pr-3 font-semibold text-text-secondary">타입</th>
                  <th className="py-2.5 pr-4 font-semibold text-text-secondary">옵션</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((column, i) => (
                  <tr
                    key={column.name}
                    className={`border-b border-surface-border-soft hover:bg-surface-muted ${i % 2 === 0 ? '' : 'bg-surface-muted/40'}`}
                  >
                    <td className="px-4 py-2.5">
                      {column.primaryKey ? (
                        <KeyRound className="size-3.5 text-brand-primary" />
                      ) : (
                        <span className="block size-2.5 rounded-full border border-surface-border" />
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono font-semibold text-text-primary">
                      {column.name}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-text-secondary">
                      {column.type || 'ANY'}
                    </td>
                    <td className="py-2.5 pr-4">
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
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="sticky top-0 border-b border-surface-border-soft bg-surface-muted px-4 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                데이터{rows !== null ? ` (${rows.length}행)` : ''}
              </span>
            </div>

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-text-muted" />
              </div>
            ) : rows && rows.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border-soft bg-surface-muted">
                      <th className="w-8 py-2.5 pl-4 pr-3 text-right font-semibold text-text-muted">#</th>
                      {dataColumns.map((col) => (
                        <th key={col} className="whitespace-nowrap py-2.5 pr-4 font-semibold text-text-secondary">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-surface-border-soft hover:bg-brand-glass/30 ${i % 2 === 0 ? '' : 'bg-surface-muted/40'}`}
                      >
                        <td className="py-2 pl-4 pr-3 text-right font-mono text-[11px] text-text-muted">
                          {i + 1}
                        </td>
                        {dataColumns.map((col) => (
                          <td key={col} className="whitespace-nowrap py-2 pr-4 font-mono text-text-primary">
                            <CellValue value={row[col]} />
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
