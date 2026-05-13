import { apiRequest } from '../../../shared/api/http'
import type {
  CreateSqlPracticeNotePayload,
  SqlActivateSeedResponse,
  SqlExecuteResponse,
  SqlPracticeNote,
  SqlPracticeNoteFilter,
  SqlPracticeMeta,
  SqlPracticeSeedListResponse,
  SqlPracticeSeedSource,
  SqlResetResponse,
  TableInfo,
  UpdateSqlPracticeNotePayload,
} from '../model/types'

function toSearchParams(filter?: SqlPracticeNoteFilter) {
  const params = new URLSearchParams()

  if (filter?.seedFile) params.set('seedFile', filter.seedFile)
  if (filter?.exampleId) params.set('exampleId', filter.exampleId)
  if (filter?.tableName) params.set('tableName', filter.tableName)

  const query = params.toString()
  return query ? `?${query}` : ''
}

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
  geminiAsk: (content: string, mode: 'sql' | 'general' | 'grading') =>
    apiRequest<{ answer: string }>('/sql/gemini', {
      method: 'POST',
      body: JSON.stringify({ content, mode }),
    }),
  getNotes: (filter?: SqlPracticeNoteFilter) =>
    apiRequest<SqlPracticeNote[]>(`/sql/notes/mine${toSearchParams(filter)}`),
  createNote: (payload: CreateSqlPracticeNotePayload) =>
    apiRequest<SqlPracticeNote>('/sql/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateNote: (id: string, payload: UpdateSqlPracticeNotePayload) =>
    apiRequest<SqlPracticeNote>(`/sql/notes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteNote: (id: string) =>
    apiRequest<void>(`/sql/notes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
}
