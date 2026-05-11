import type { SqlExecuteResponse } from '../../../entities/sql-practice/model/types'

type SqlResultTableProps = {
  response: SqlExecuteResponse
}

export function SqlResultTable({ response }: SqlResultTableProps) {
  const columns = response.columns ?? []
  const rows = response.rows ?? []

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-surface-border-soft bg-surface-muted px-3 py-2 text-sm text-text-muted">
        결과 없음 (0행)
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {response.truncated && (
        <div className="rounded-md border border-brand-border bg-brand-glass px-3 py-2 text-xs font-medium text-brand-primary">
          서버 보호를 위해 일부 행만 표시합니다.
        </div>
      )}
      <div className="max-w-full overflow-x-auto rounded-md border border-surface-border-soft">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-surface-muted">
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-surface-border-soft px-3 py-2 font-bold text-text-primary"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--surface-border-soft)]">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-surface-muted">
                {columns.map((column) => {
                  const value = row[column]
                  return (
                    <td
                      key={column}
                      className="max-w-[220px] truncate px-3 py-2 text-text-secondary"
                      title={value === null || value === undefined ? 'NULL' : String(value)}
                    >
                      {value === null || value === undefined ? (
                        <span className="font-mono text-text-muted">NULL</span>
                      ) : (
                        String(value)
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
