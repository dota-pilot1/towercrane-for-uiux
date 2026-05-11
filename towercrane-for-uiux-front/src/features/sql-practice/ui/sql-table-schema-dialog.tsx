import { KeyRound, Table2, X } from 'lucide-react'
import type { TableInfo } from '../../../entities/sql-practice/model/types'

type SqlTableSchemaDialogProps = {
  table: TableInfo
  onClose: () => void
}

export function SqlTableSchemaDialog({ table, onClose }: SqlTableSchemaDialogProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="ui-overlay absolute inset-0"
        onClick={onClose}
        aria-label="닫기"
      />
      <section className="glass-panel relative z-10 flex max-h-[82vh] w-full max-w-xl flex-col overflow-hidden rounded-md">
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

        <div className="overflow-y-auto p-4">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-surface-border-soft">
                <th className="w-8 pb-2 text-text-muted" />
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
      </section>
    </div>
  )
}
