export type SqlQueryType =
  | 'SELECT'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'CREATE'
  | 'DROP'
  | 'ALTER'
  | 'PRAGMA'
  | 'EXPLAIN'
  | 'OTHER';

export type SqlPracticeSeedSource = 'builtin' | 'uploaded';

export type SqlPracticeSeedLevel = 'beginner' | 'basic' | 'intermediate' | 'advanced';

export type SqlPracticeSeedMeta = {
  title: string;
  slug: string;
  level: SqlPracticeSeedLevel;
  description: string;
  topics: string[];
  tables: string[];
  recommendedQueries: string[];
};

export type SqlPracticeSeedSummary = SqlPracticeSeedMeta & {
  source: SqlPracticeSeedSource;
  fileName: string;
  hash: string;
  sizeBytes: number;
  updatedAt: string | null;
  isActive: boolean;
  isUpload: boolean;
};

export type SqlPracticeSeedListResponse = {
  active: {
    source: SqlPracticeSeedSource;
    fileName: string;
    slug: string;
  };
  seeds: SqlPracticeSeedSummary[];
};

export type SqlPracticeMeta = {
  seedFile: string;
  seedHash: string;
  dbFile: string;
  lastLoadedAt: string | null;
  tableCount: number;
  activeSeed: SqlPracticeSeedSummary;
};

export type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
};

export type TableInfo = {
  tableName: string;
  columns: ColumnInfo[];
  rowCount: number;
};

export type SqlExecuteResponse = {
  success: boolean;
  type: SqlQueryType;
  columns: string[] | null;
  rows: Record<string, unknown>[] | null;
  affectedRows: number;
  message: string;
  executionTimeMs: number;
  truncated?: boolean;
  schemaChanged?: boolean;
  seedReloaded?: boolean;
};

export type SqlResetResponse = {
  success: boolean;
  message: string;
  seedHash: string;
};

export type SqlActivateSeedResponse = SqlResetResponse & {
  activeSeed: SqlPracticeSeedSummary;
};
