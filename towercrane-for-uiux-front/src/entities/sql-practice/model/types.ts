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
  isPublic: boolean
  publicToken: string | null
  publicSharedAt: string | null
  orderIdx: number
  createdAt: string
  updatedAt: string
}

export type PublicSqlPracticeNote = Omit<SqlPracticeNote, 'userId'> & {
  authorName: string
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

export type SqlPracticeSubmissionLevel = 'beginner' | 'intermediate' | 'advanced'

export type SqlPracticeSubmission = {
  id: string
  userId: string
  seedFile: string
  seedHash: string | null
  exampleId: string
  exampleTitle: string
  exampleLevel: SqlPracticeSubmissionLevel
  exampleOrder: number
  submittedSql: string
  answerSql: string
  isCorrect: boolean
  score: number
  maxScore: number
  feedback: string
  geminiRaw: string | null
  createdAt: string
}

export type SqlPracticeSubmissionSummary = {
  seedFile: string
  totalScore: number
  maxScore: number
  correctCount: number
  submittedCount: number
}

export type SqlPracticeSubmissionStatus = {
  exampleId: string
  bestScore: number
  isCorrect: boolean
  lastSubmittedAt: string
  lastSubmissionId: string
}

export type SqlPracticeMySubmissionsResponse = {
  seedFile: string
  summary: SqlPracticeSubmissionSummary
  byExample: Record<string, SqlPracticeSubmissionStatus>
}

export type SqlPracticeGradePayload = {
  seedFile: string
  seedHash?: string
  exampleId: string
  exampleTitle: string
  exampleLevel: SqlPracticeSubmissionLevel
  exampleOrder: number
  description: string
  hint: string
  relatedTables: string[]
  submittedSql: string
  answerSql: string
}

export type SqlPracticeGradeResponse = {
  submission: SqlPracticeSubmission
  summary: SqlPracticeSubmissionSummary
}

export type SqlPracticeRankingItem = {
  rank: number
  userId: string
  userName: string
  totalScore: number
  correctCount: number
  submittedCount: number
  lastSubmittedAt: string
}

export type SqlPracticeRankingResponse = {
  seedFile: string
  rankings: SqlPracticeRankingItem[]
}

export type SqlPracticeActivityItem = {
  id: string
  userId: string
  userName: string
  seedFile: string
  exampleId: string
  exampleTitle: string
  exampleLevel: SqlPracticeSubmissionLevel
  exampleOrder: number
  isCorrect: boolean
  score: number
  maxScore: number
  createdAt: string
}

export type SqlPracticeActivityResponse = {
  seedFile: string
  activities: SqlPracticeActivityItem[]
}

export type SqlPracticeDeleteActivityResponse = {
  seedFile: string
  deletedCount: number
}

export type SqlUserPracticeSchema = {
  id: string
  title: string
  description: string
  version: number
  dbFileHash: string
  sourceType: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SqlUserPracticeProblemVisibility = 'public' | 'private'
export type SqlUserPracticeProblemStatus = 'draft' | 'published' | 'archived'

export type SqlUserPracticeProblem = {
  id: string
  schemaId: string
  title: string
  description: string
  level: number
  targetTables: string[]
  starterSql: string | null
  answerSql: string
  explanation: string | null
  createdBy: string
  authorName: string | null
  visibility: SqlUserPracticeProblemVisibility
  status: SqlUserPracticeProblemStatus
  createdAt: string
  updatedAt: string
}

export type SqlUserPracticeProblemListResponse = {
  schema: SqlUserPracticeSchema
  problems: SqlUserPracticeProblem[]
}

export type SqlUserPracticeProblemPayload = {
  title: string
  description: string
  level: number
  targetTables: string[]
  starterSql?: string
  answerSql: string
  explanation?: string
  visibility: SqlUserPracticeProblemVisibility
  status: Exclude<SqlUserPracticeProblemStatus, 'archived'>
}

export type SqlUserPracticeGenerateAnswerPayload = {
  title?: string
  description: string
  level: number
  targetTables: string[]
}

export type SqlUserPracticeGenerateAnswerResponse = {
  answerSql: string
  explanation: string | null
}

export type SqlUserPracticeGradePayload = {
  submittedSql: string
}

export type SqlUserPracticeGradeResponse = {
  problemId: string
  submittedSql: string
  answerSql: string
  isCorrect: boolean
  feedback: string
  execution: SqlExecuteResponse
  answerExecution: SqlExecuteResponse | null
}

export type SqlPersonalPracticeWorkspace = {
  id: string
  ownerId: string
  title: string
  description: string
  activeSchemaVersionId: string | null
  createdAt: string
  updatedAt: string
}

export type SqlPersonalPracticeSchemaVersion = {
  id: string
  workspaceId: string
  version: number
  title: string
  description: string
  erdMmd: string | null
  dbFileHash: string
  sourceType: 'seed' | 'uploaded_sql' | 'uploaded_sqlite'
  sourceFileName: string | null
  replacedFromSchemaVersionId: string | null
  createdAt: string
}

export type SqlPersonalPracticeProblem = {
  id: string
  workspaceId: string
  schemaVersionId: string
  title: string
  description: string
  level: number
  targetTables: string[]
  starterSql: string | null
  answerSql: string
  explanation: string | null
  status: SqlUserPracticeProblemStatus
  createdBy: string
  authorName: string | null
  shareToken: string | null
  shareEnabled: boolean
  createdAt: string
  updatedAt: string
}

export type SqlPersonalPracticeProblemListResponse = {
  workspace: SqlPersonalPracticeWorkspace
  schemaVersion: SqlPersonalPracticeSchemaVersion
  problems: SqlPersonalPracticeProblem[]
}

export type SqlPersonalPracticeShare = {
  id: string
  problemId: string
  workspaceId: string
  schemaVersionId: string
  token: string
  enabled: boolean
  createdAt: string
  disabledAt: string | null
}

export type SqlPersonalPracticePublicProblem = Omit<
  SqlPersonalPracticeProblem,
  'answerSql' | 'createdBy' | 'shareToken' | 'shareEnabled'
>

export type SqlPersonalPracticePublicProblemResponse = {
  workspace: Pick<SqlPersonalPracticeWorkspace, 'id' | 'title'>
  schemaVersion: Pick<
    SqlPersonalPracticeSchemaVersion,
    'id' | 'version' | 'title' | 'dbFileHash'
  >
  problem: SqlPersonalPracticePublicProblem
  tables: TableInfo[]
  erdMmd: string | null
}
