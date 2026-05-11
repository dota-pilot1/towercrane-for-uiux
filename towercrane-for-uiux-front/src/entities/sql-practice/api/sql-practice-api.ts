import { apiRequest } from '../../../shared/api/http'
import type {
  SqlExecuteResponse,
  SqlPracticeMeta,
  SqlResetResponse,
  TableInfo,
} from '../model/types'

export const sqlPracticeApi = {
  getMeta: () => apiRequest<SqlPracticeMeta>('/sql/meta'),
  getTables: () => apiRequest<TableInfo[]>('/sql/tables'),
  getTable: (tableName: string) =>
    apiRequest<TableInfo>(`/sql/tables/${encodeURIComponent(tableName)}`),
  execute: (query: string) =>
    apiRequest<SqlExecuteResponse>('/sql/execute', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
  reset: () =>
    apiRequest<SqlResetResponse>('/sql/reset', {
      method: 'POST',
    }),
  reloadSeed: () =>
    apiRequest<SqlResetResponse>('/sql/reload-seed', {
      method: 'POST',
    }),
}
