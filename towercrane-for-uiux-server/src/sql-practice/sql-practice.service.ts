import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { executeSqlSchema } from './sql-practice.schemas';
import { sanitizeSql } from './sql-safety';
import type {
  ColumnInfo,
  SqlExecuteResponse,
  SqlPracticeMeta,
  SqlQueryType,
  SqlResetResponse,
  TableInfo,
} from './sql-practice.types';

type SeedState = {
  seedHash: string;
  loadedAt: string;
};

type Freshness = {
  seedHash: string;
  seedReloaded: boolean;
  loadedAt: string | null;
};

@Injectable()
export class SqlPracticeService {
  constructor(private readonly configService: ConfigService) {}

  getMeta(): SqlPracticeMeta {
    const freshness = this.ensureDatabaseFresh();
    const db = this.openDatabase();

    try {
      return {
        seedFile: basename(this.getSeedFile()),
        seedHash: freshness.seedHash,
        dbFile: basename(this.getDatabaseFile()),
        lastLoadedAt: freshness.loadedAt,
        tableCount: this.listTableNames(db).length,
      };
    } finally {
      db.close();
    }
  }

  getTables(): TableInfo[] {
    this.ensureDatabaseFresh();
    const db = this.openDatabase();

    try {
      return this.listTableNames(db).map((tableName) => ({
        tableName,
        columns: this.getColumns(db, tableName),
        rowCount: this.getRowCount(db, tableName),
      }));
    } finally {
      db.close();
    }
  }

  getTable(tableName: string): TableInfo {
    this.ensureDatabaseFresh();
    const db = this.openDatabase();

    try {
      this.ensureTableExists(db, tableName);
      return {
        tableName,
        columns: this.getColumns(db, tableName),
        rowCount: this.getRowCount(db, tableName),
      };
    } finally {
      db.close();
    }
  }

  execute(payload: unknown): SqlExecuteResponse {
    const start = Date.now();
    const parsed = executeSqlSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid SQL request.');
    }
    const input = parsed.data;
    const maxQueryLength = this.getMaxQueryLength();
    const { query, type } = sanitizeSql(input.query, maxQueryLength);
    const freshness = this.ensureDatabaseFresh();
    const db = this.openDatabase();

    try {
      if (this.isReaderType(type)) {
        return this.executeReader(db, query, type, start, freshness.seedReloaded);
      }

      return this.executeWriter(db, query, type, start, freshness.seedReloaded);
    } catch (error) {
      return {
        success: false,
        type,
        columns: null,
        rows: null,
        affectedRows: 0,
        message: error instanceof Error ? error.message : 'SQL execution failed.',
        executionTimeMs: Date.now() - start,
        schemaChanged: false,
        seedReloaded: freshness.seedReloaded,
      };
    } finally {
      db.close();
    }
  }

  reset(): SqlResetResponse {
    const seedHash = this.rebuildDatabase();
    return {
      success: true,
      message: 'SQL 연습 DB를 seed.sql 기준으로 다시 만들었습니다.',
      seedHash,
    };
  }

  reloadSeed(): SqlResetResponse {
    return this.reset();
  }

  private executeReader(
    db: Database.Database,
    query: string,
    type: SqlQueryType,
    start: number,
    seedReloaded: boolean,
  ): SqlExecuteResponse {
    const maxRows = this.getMaxRows();
    const statement = db.prepare(query);
    const columns = statement.columns().map((column) => column.name);
    const rows: Record<string, unknown>[] = [];
    let truncated = false;

    for (const row of statement.iterate() as Iterable<Record<string, unknown>>) {
      if (rows.length >= maxRows) {
        truncated = true;
        break;
      }
      rows.push(toJsonSafeRecord(row));
    }

    return {
      success: true,
      type,
      columns,
      rows,
      affectedRows: 0,
      message: `${rows.length}개 행이 조회되었습니다.${truncated ? ` 최대 ${maxRows}행까지만 표시합니다.` : ''}`,
      executionTimeMs: Date.now() - start,
      truncated,
      schemaChanged: false,
      seedReloaded,
    };
  }

  private executeWriter(
    db: Database.Database,
    query: string,
    type: SqlQueryType,
    start: number,
    seedReloaded: boolean,
  ): SqlExecuteResponse {
    const info = db.prepare(query).run();
    const schemaChanged = ['CREATE', 'DROP', 'ALTER'].includes(type);

    return {
      success: true,
      type,
      columns: null,
      rows: null,
      affectedRows: info.changes,
      message: this.getWriterMessage(type, info.changes),
      executionTimeMs: Date.now() - start,
      schemaChanged,
      seedReloaded,
    };
  }

  private ensureDatabaseFresh(): Freshness {
    const seedHash = this.getSeedHash();
    const dbFile = this.getDatabaseFile();
    const seedState = this.readSeedState();

    if (!existsSync(dbFile) || seedState?.seedHash !== seedHash) {
      const loadedHash = this.rebuildDatabase(seedHash);
      const nextState = this.readSeedState();
      return {
        seedHash: loadedHash,
        seedReloaded: true,
        loadedAt: nextState?.loadedAt ?? null,
      };
    }

    return {
      seedHash,
      seedReloaded: false,
      loadedAt: seedState.loadedAt,
    };
  }

  private rebuildDatabase(currentHash = this.getSeedHash()) {
    const dbFile = this.getDatabaseFile();
    mkdirSync(dirname(dbFile), { recursive: true });

    for (const file of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
      if (existsSync(file)) {
        rmSync(file, { force: true });
      }
    }

    const db = this.openDatabase();

    try {
      const seedSql = readFileSync(this.getSeedFile(), 'utf8');
      if (!seedSql.trim()) {
        throw new InternalServerErrorException('seed.sql is empty.');
      }
      db.exec(seedSql);
      this.writeSeedState({
        seedHash: currentHash,
        loadedAt: new Date().toISOString(),
      });
      return currentHash;
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Failed to initialize SQL practice database.',
      );
    } finally {
      db.close();
    }
  }

  private openDatabase() {
    const db = new Database(this.getDatabaseFile());
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    return db;
  }

  private listTableNames(db: Database.Database) {
    return db
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name NOT LIKE 'sqlite_%'
            AND name NOT LIKE '__sql_practice_%'
          ORDER BY name
        `,
      )
      .all()
      .map((row) => (row as { name: string }).name);
  }

  private getColumns(db: Database.Database, tableName: string): ColumnInfo[] {
    return db
      .prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`)
      .all()
      .map((row) => {
        const column = row as {
          cid: number;
          name: string;
          type: string;
          notnull: number;
          dflt_value: string | null;
          pk: number;
        };
        return {
          cid: column.cid,
          name: column.name,
          type: column.type,
          notNull: column.notnull === 1,
          defaultValue: column.dflt_value,
          primaryKey: column.pk === 1,
        };
      });
  }

  private getRowCount(db: Database.Database, tableName: string) {
    const row = db
      .prepare(`SELECT COUNT(*) as count FROM ${quoteIdentifier(tableName)}`)
      .get() as { count: number };
    return row.count;
  }

  private ensureTableExists(db: Database.Database, tableName: string) {
    const row = db
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name = ?
            AND name NOT LIKE 'sqlite_%'
            AND name NOT LIKE '__sql_practice_%'
          LIMIT 1
        `,
      )
      .get(tableName);

    if (!row) {
      throw new NotFoundException('Table not found.');
    }
  }

  private getSeedFile() {
    const configured = this.configService.get<string>('SQL_PRACTICE_SEED_FILE')?.trim();
    if (configured) {
      return isAbsolute(configured) ? configured : join(process.cwd(), configured);
    }

    const candidates = [
      join(__dirname, 'seeds', 'seed.sql'),
      join(process.cwd(), 'src/sql-practice/seeds/seed.sql'),
      join(process.cwd(), 'dist/sql-practice/seeds/seed.sql'),
      join(process.cwd(), 'dist/src/sql-practice/seeds/seed.sql'),
    ];

    return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
  }

  private getDatabaseFile() {
    const configured =
      this.configService.get<string>('SQL_PRACTICE_DB_FILE') ??
      './data/sql-practice/runtime/practice.sqlite';
    return isAbsolute(configured) ? configured : join(process.cwd(), configured);
  }

  private getSeedHash() {
    const seedFile = this.getSeedFile();
    if (!existsSync(seedFile)) {
      throw new InternalServerErrorException(`SQL practice seed file not found: ${seedFile}`);
    }
    return createHash('sha256').update(readFileSync(seedFile)).digest('hex');
  }

  private getSeedStateFile() {
    return `${this.getDatabaseFile()}.seedhash`;
  }

  private readSeedState(): SeedState | null {
    const stateFile = this.getSeedStateFile();
    if (!existsSync(stateFile)) return null;

    try {
      return JSON.parse(readFileSync(stateFile, 'utf8')) as SeedState;
    } catch {
      return null;
    }
  }

  private writeSeedState(state: SeedState) {
    writeFileSync(this.getSeedStateFile(), JSON.stringify(state, null, 2));
  }

  private getMaxRows() {
    const value = Number(this.configService.get<string>('SQL_PRACTICE_MAX_ROWS') ?? 500);
    return Number.isFinite(value) && value > 0 ? Math.min(value, 5000) : 500;
  }

  private getMaxQueryLength() {
    const value = Number(this.configService.get<string>('SQL_PRACTICE_MAX_QUERY_LENGTH') ?? 10000);
    return Number.isFinite(value) && value > 0 ? Math.min(value, 50000) : 10000;
  }

  private isReaderType(type: SqlQueryType) {
    return type === 'SELECT' || type === 'PRAGMA' || type === 'EXPLAIN';
  }

  private getWriterMessage(type: SqlQueryType, affectedRows: number) {
    switch (type) {
      case 'INSERT':
        return `${affectedRows}개 행이 삽입되었습니다.`;
      case 'UPDATE':
        return `${affectedRows}개 행이 수정되었습니다.`;
      case 'DELETE':
        return `${affectedRows}개 행이 삭제되었습니다.`;
      case 'CREATE':
        return '테이블이 생성되었습니다.';
      case 'DROP':
        return '테이블이 삭제되었습니다.';
      case 'ALTER':
        return '테이블이 변경되었습니다.';
      default:
        return '쿼리가 실행되었습니다.';
    }
  }
}

function quoteIdentifier(identifier: string) {
  if (!identifier.trim()) {
    throw new BadRequestException('Invalid table name.');
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}

function toJsonSafeRecord(row: Record<string, unknown>) {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'bigint') {
      next[key] = value.toString();
    } else if (Buffer.isBuffer(value)) {
      next[key] = value.toString('base64');
    } else {
      next[key] = value;
    }
  }

  return next;
}
