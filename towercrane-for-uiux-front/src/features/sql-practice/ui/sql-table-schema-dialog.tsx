import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, KeyRound, Loader2, Table2, X } from 'lucide-react'
import type { SqlExecuteResponse, TableInfo } from '../../../entities/sql-practice/model/types'
import { sqlPracticeApi } from '../../../entities/sql-practice/api/sql-practice-api'

type SqlTableSchemaDialogProps = {
  table: TableInfo
  tables: TableInfo[]
  loadRows?: (tableName: string) => Promise<SqlExecuteResponse>
  onClose: () => void
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="italic text-text-muted">NULL</span>
  }
  return <span>{String(value)}</span>
}

export function SqlTableSchemaDialog({
  table,
  tables,
  loadRows,
  onClose,
}: SqlTableSchemaDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(
    () => tables.findIndex((t) => t.tableName === table.tableName)
  )
  const [rowState, setRowState] = useState<{
    tableName: string
    rows: Record<string, unknown>[] | null
    dataColumns: string[]
    isLoading: boolean
  }>({
    tableName: '',
    rows: null,
    dataColumns: [],
    isLoading: true,
  })

  const currentTable = tables[currentIndex] ?? table
  const isCurrentRows = rowState.tableName === currentTable.tableName
  const rows = isCurrentRows ? rowState.rows : null
  const dataColumns = isCurrentRows ? rowState.dataColumns : []
  const isLoading = !isCurrentRows || rowState.isLoading

  useEffect(() => {
    let ignore = false
    const fetchRows =
      loadRows ?? ((tableName: string) => sqlPracticeApi.execute(`SELECT * FROM "${tableName.replace(/"/g, '""')}" LIMIT 50`))

    fetchRows(currentTable.tableName)
      .then((res) => {
        if (ignore) return
        setRowState({
          tableName: currentTable.tableName,
          dataColumns: res.columns ?? [],
          rows: res.rows ?? [],
          isLoading: false,
        })
      })
      .catch(() => {
        if (ignore) return
        setRowState({
          tableName: currentTable.tableName,
          dataColumns: [],
          rows: [],
          isLoading: false,
        })
      })

    return () => {
      ignore = true
    }
  }, [currentTable.tableName, loadRows])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4">
      <button
        type="button"
        className="ui-overlay absolute inset-0"
        onClick={onClose}
        aria-label="닫기"
      />
      <section className="glass-panel relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-md sm:max-h-[86vh] sm:max-w-[92vw] xl:max-w-6xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-surface-border px-2 py-2.5 sm:px-3">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="ui-icon-button size-8 shrink-0"
              onClick={() => setCurrentIndex((i) => i - 1)}
              disabled={currentIndex === 0}
              aria-label="이전 테이블"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 px-1">
              <Table2 className="size-4 shrink-0 text-brand-primary" />
              <h2 className="truncate font-mono text-sm font-bold text-text-primary">
                {currentTable.tableName}
              </h2>
              <span className="hidden h-8 shrink-0 items-center rounded-sm border border-surface-border-soft bg-surface-muted px-2 text-[11px] text-text-secondary min-[420px]:flex">
                {currentTable.rowCount}행 · {currentTable.columns.length}열
              </span>
            </div>
            <button
              type="button"
              className="ui-icon-button size-8 shrink-0"
              onClick={() => setCurrentIndex((i) => i + 1)}
              disabled={currentIndex === tables.length - 1}
              aria-label="다음 테이블"
            >
              <ChevronRight className="size-3.5" />
            </button>
            <span className="ml-1 w-10 shrink-0 text-[11px] text-text-muted">
              {currentIndex + 1} / {tables.length}
            </span>
          </div>
          <button
            type="button"
            className="ui-icon-button size-8 shrink-0"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col divide-y divide-surface-border overflow-y-auto md:flex-row md:divide-x md:divide-y-0 md:overflow-hidden">
          {/* 왼쪽: 스키마 */}
          <div className="w-full shrink-0 p-3 md:w-[38%] md:overflow-y-auto">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-muted">스키마</p>
            <div className="overflow-x-auto rounded-md border border-surface-border">
              <table className="min-w-[520px] w-full border-collapse text-left text-xs md:min-w-0">
                <thead>
                  <tr className="border-b border-surface-border-soft bg-surface-muted">
                    <th className="w-10 px-3 py-2.5 text-text-muted" />
                    <th className="py-3 pr-3 font-semibold text-text-secondary">컬럼명</th>
                    <th className="py-3 pr-3 font-semibold text-text-secondary">타입</th>
                    <th className="py-3 pr-4 font-semibold text-text-secondary">옵션</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTable.columns.map((column, i) => (
                    <tr
                      key={column.name}
                      className={`border-b border-surface-border-soft hover:bg-surface-muted ${i % 2 === 0 ? '' : 'bg-surface-muted/40'}`}
                    >
                      <td className="px-3 py-2.5">
                        {column.primaryKey ? (
                          <KeyRound className="size-3.5 text-brand-primary" />
                        ) : (
                          <span className="block size-2.5 rounded-full border border-surface-border" />
                        )}
                      </td>
                      <td className="py-3 pr-3 font-mono font-semibold text-text-primary">
                        {column.name}
                      </td>
                      <td className="py-3 pr-3 font-mono text-[11px] text-text-secondary">
                        {column.type || 'ANY'}
                      </td>
                      <td className="py-3 pr-4">
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
          </div>

          {/* 오른쪽: 데이터 */}
          <div className="flex min-h-[280px] min-w-0 flex-1 flex-col p-3 md:overflow-hidden">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-text-muted">
              데이터{rows !== null ? ` (${rows.length}행)` : ''}
            </p>

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-text-muted" />
              </div>
            ) : rows && rows.length > 0 ? (
              <div className="overflow-auto rounded-md border border-surface-border">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-surface-border-soft bg-surface-muted">
                      {dataColumns.map((col) => (
                        <th key={col} className="whitespace-nowrap px-3 py-2.5 font-semibold text-text-secondary">
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
                        {dataColumns.map((col) => (
                          <td key={col} className="whitespace-nowrap px-3 py-2.5 font-mono text-text-primary">
                            <CellValue value={row[col]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center py-12 text-sm text-text-muted">
                데이터 없음
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
