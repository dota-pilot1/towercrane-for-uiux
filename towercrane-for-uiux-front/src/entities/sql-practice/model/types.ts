export type SqlPracticeSeedSource = 'builtin' | 'uploaded'

export type SqlPracticeSeedLevel = 'beginner' | 'basic' | 'intermediate' | 'advanced'

export type SqlPracticeSeedSummary = {
  source: SqlPracticeSeedSource
  fileName: string
  slug: string
  title: string
  level: SqlPracticeSeedLevel
  description: string
  topics: string[]
  tables: string[]
  recommendedQueries: string[]
  hash: string
  sizeBytes: number
  updatedAt: string | null
  isActive: boolean
  isUpload: boolean
}

export type SqlPracticeSeedListResponse = {
  active: {
    source: SqlPracticeSeedSource
    fileName: string
    slug: string
  }
  seeds: SqlPracticeSeedSummary[]
}

export type SqlPracticeMeta = {
  seedFile: string
  seedHash: string
  dbFile: string
  lastLoadedAt: string | null
  tableCount: number
  activeSeed: SqlPracticeSeedSummary
}

export type ColumnInfo = {
  cid: number
  name: string
  type: string
  notNull: boolean
  defaultValue: string | null
  primaryKey: boolean
}

export type TableInfo = {
  tableName: string
  columns: ColumnInfo[]
  rowCount: number
}

export type SqlExecuteResponse = {
  success: boolean
  type: string
  columns: string[] | null
  rows: Record<string, unknown>[] | null
  affectedRows: number
  message: string
  executionTimeMs: number
  truncated?: boolean
  schemaChanged?: boolean
  seedReloaded?: boolean
}

export type SqlHistoryItem = {
  id: string
  query: string
  response: SqlExecuteResponse
  timestamp: Date
}

export type SqlResetResponse = {
  success: boolean
  message: string
  seedHash: string
}

export type SqlActivateSeedResponse = SqlResetResponse & {
  activeSeed: SqlPracticeSeedSummary
}

export type SqlPracticeNote = {
  id: string
  userId: string
  seedFile: string | null
  exampleId: string | null
  exampleTitle: string | null
  tableName: string | null
  title: string | null
  content: string
  pinned: boolean
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type SqlPracticeNoteFilter = {
  seedFile?: string
  exampleId?: string
  tableName?: string
}

export type CreateSqlPracticeNotePayload = {
  seedFile?: string
  exampleId?: string
  exampleTitle?: string
  tableName?: string
  title?: string
  content: string
  pinned?: boolean
}

export type UpdateSqlPracticeNotePayload = Partial<CreateSqlPracticeNotePayload>
