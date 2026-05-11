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

export type SqlPracticeMeta = {
  seedFile: string;
  seedHash: string;
  dbFile: string;
  lastLoadedAt: string | null;
  tableCount: number;
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
