import { apiRequest } from '../../../shared/api/http'
import type {
  SqlActivateSeedResponse,
  SqlExecuteResponse,
  SqlPracticeMeta,
  SqlPracticeSeedListResponse,
  SqlPracticeSeedSource,
  SqlResetResponse,
  TableInfo,
} from '../model/types'

export const sqlPracticeApi = {
  getMeta: () => apiRequest<SqlPracticeMeta>('/sql/meta'),
  getSeeds: () => apiRequest<SqlPracticeSeedListResponse>('/sql/seeds'),
  getTables: () => apiRequest<TableInfo[]>('/sql/tables'),
  getTable: (tableName: string) =>
    apiRequest<TableInfo>(`/sql/tables/${encodeURIComponent(tableName)}`),
  activateSeed: (payload: { source: SqlPracticeSeedSource; fileName: string }) =>
    apiRequest<SqlActivateSeedResponse>('/sql/seeds/activate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
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
  getSeedErd: (fileName: string) =>
    apiRequest<{ mmd: string | null }>(`/sql/seeds/${encodeURIComponent(fileName)}/erd`),
}
