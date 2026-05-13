import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { DatabaseService } from '../database/database.service';
import { sqlPracticeNotesTable } from '../database/schema';
import {
  activateSeedSchema,
  executeSqlSchema,
  geminiAskSchema,
  seedFileNameSchema,
  type CreateSqlPracticeNoteInput,
  type ListSqlPracticeNotesQuery,
  type UpdateSqlPracticeNoteInput,
} from './sql-practice.schemas';
import { sanitizeSql } from './sql-safety';
import type {
  ColumnInfo,
  SqlActivateSeedResponse,
  SqlExecuteResponse,
  SqlPracticeMeta,
  SqlPracticeSeedLevel,
  SqlPracticeSeedListResponse,
  SqlPracticeSeedMeta,
  SqlPracticeSeedSource,
  SqlQueryType,
  SqlResetResponse,
  TableInfo,
} from './sql-practice.types';

const DEFAULT_BUILTIN_SEED_FILE = '01_board_basic.sql';
const LEGACY_SEED_FILE = 'seed.sql';
const SEED_LEVELS: SqlPracticeSeedLevel[] = ['beginner', 'basic', 'intermediate', 'advanced'];

type SeedState = {
  seedHash: string;
  loadedAt: string;
  source?: SqlPracticeSeedSource;
  fileName?: string;
};

type ActiveSeedState = {
  source: SqlPracticeSeedSource;
  fileName: string;
};

type ResolvedSeed = ActiveSeedState & {
  filePath: string;
};

type Freshness = {
  seedHash: string;
  seedReloaded: boolean;
  loadedAt: string | null;
};

@Injectable()
export class SqlPracticeService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  getMeta(): SqlPracticeMeta {
    const freshness = this.ensureDatabaseFresh();
    const activeSeed = this.getActiveSeedSummary(freshness.seedHash);
    const db = this.openDatabase();

    try {
      return {
        seedFile: activeSeed.fileName,
        seedHash: freshness.seedHash,
        dbFile: basename(this.getDatabaseFile()),
        lastLoadedAt: freshness.loadedAt,
        tableCount: this.listTableNames(db).length,
        activeSeed,
      };
    } finally {
      db.close();
    }
  }

  listSeeds(): SqlPracticeSeedListResponse {
    const activeSeed = this.resolveActiveSeedFile();
    const seeds = [
      ...this.scanSeedDirectory('builtin', activeSeed),
      ...this.scanSeedDirectory('uploaded', activeSeed),
    ];

    if (!seeds.some((seed) => seed.isActive)) {
      seeds.unshift(this.buildSeedSummary(activeSeed, activeSeed));
    }

    const activeSummary =
      seeds.find((seed) => seed.isActive) ?? this.buildSeedSummary(activeSeed, activeSeed);

    return {
      active: {
        source: activeSummary.source,
        fileName: activeSummary.fileName,
        slug: activeSummary.slug,
      },
      seeds,
    };
  }

  activateSeed(payload: unknown): SqlActivateSeedResponse {
    const parsed = activateSeedSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid SQL seed request.');
    }

    const seed = this.resolveSeedFile(parsed.data.source, parsed.data.fileName);
    const seedSql = readFileSync(seed.filePath, 'utf8');
    this.validateSeedSql(seedSql, seed.fileName);

    const seedHash = this.hashSql(seedSql);
    this.writeActiveSeedState({
      source: seed.source,
      fileName: seed.fileName,
    });
    const loadedHash = this.rebuildDatabase(seedHash, seed);

    return {
      success: true,
      message: `SQL 연습 DB를 ${seed.fileName} 기준으로 다시 만들었습니다.`,
      seedHash: loadedHash,
      activeSeed: this.buildSeedSummary(seed, seed, loadedHash),
    };
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
    const activeSeed = this.resolveActiveSeedFile();
    const seedHash = this.rebuildDatabase(undefined, activeSeed);
    return {
      success: true,
      message: `SQL 연습 DB를 ${activeSeed.fileName} 기준으로 다시 만들었습니다.`,
      seedHash,
    };
  }

  reloadSeed(): SqlResetResponse {
    return this.reset();
  }

  getSeedErd(fileName: string): { mmd: string | null } {
    const parsed = seedFileNameSchema.safeParse(fileName.replace(/\.mmd$/, '.sql'));
    if (!parsed.success) return { mmd: null };

    const baseName = parsed.data.replace(/\.sql$/, '');
    const mmdFile = join(this.getBuiltinSeedDir(), `${baseName}.mmd`);

    if (!existsSync(mmdFile)) return { mmd: null };
    return { mmd: readFileSync(mmdFile, 'utf8') };
  }

  getMyNotes(userId: string, filter: ListSqlPracticeNotesQuery) {
    const conditions = [eq(sqlPracticeNotesTable.userId, userId)];

    if (filter.seedFile) {
      conditions.push(eq(sqlPracticeNotesTable.seedFile, filter.seedFile));
    }

    if (filter.exampleId) {
      conditions.push(eq(sqlPracticeNotesTable.exampleId, filter.exampleId));
    }

    if (filter.tableName) {
      conditions.push(eq(sqlPracticeNotesTable.tableName, filter.tableName));
    }

    return this.databaseService.db
      .select()
      .from(sqlPracticeNotesTable)
      .where(and(...conditions))
      .orderBy(desc(sqlPracticeNotesTable.pinned), desc(sqlPracticeNotesTable.updatedAt))
      .all();
  }

  getNoteById(id: string) {
    return this.databaseService.db
      .select()
      .from(sqlPracticeNotesTable)
      .where(eq(sqlPracticeNotesTable.id, id))
      .get();
  }

  createNote(input: CreateSqlPracticeNoteInput, userId: string) {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.databaseService.db
      .insert(sqlPracticeNotesTable)
      .values({
        id,
        userId,
        seedFile: input.seedFile,
        exampleId: input.exampleId,
        exampleTitle: input.exampleTitle,
        tableName: input.tableName,
        title: input.title,
        content: input.content,
        pinned: input.pinned,
        orderIdx: 0,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getNoteById(id);
  }

  updateNote(id: string, input: UpdateSqlPracticeNoteInput, userId: string) {
    const note = this.getNoteById(id);
    if (!note) throw new NotFoundException('SQL note not found.');
    if (note.userId !== userId) throw new ForbiddenException('Not authorized.');

    this.databaseService.db
      .update(sqlPracticeNotesTable)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sqlPracticeNotesTable.id, id))
      .run();

    return this.getNoteById(id);
  }

  deleteNote(id: string, userId: string) {
    const note = this.getNoteById(id);
    if (!note) throw new NotFoundException('SQL note not found.');
    if (note.userId !== userId) throw new ForbiddenException('Not authorized.');

    this.databaseService.db
      .delete(sqlPracticeNotesTable)
      .where(eq(sqlPracticeNotesTable.id, id))
      .run();
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
    const activeSeed = this.resolveActiveSeedFile();
    const seedHash = this.getSeedHash(activeSeed);
    const dbFile = this.getDatabaseFile();
    const seedState = this.readSeedState();

    if (
      !existsSync(dbFile) ||
      seedState?.seedHash !== seedHash ||
      seedState?.source !== activeSeed.source ||
      seedState?.fileName !== activeSeed.fileName
    ) {
      const loadedHash = this.rebuildDatabase(seedHash, activeSeed);
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

  private rebuildDatabase(currentHash?: string, activeSeed = this.resolveActiveSeedFile()) {
    const dbFile = this.getDatabaseFile();
    mkdirSync(dirname(dbFile), { recursive: true });

    for (const file of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
      if (existsSync(file)) {
        rmSync(file, { force: true });
      }
    }

    const db = this.openDatabase();

    try {
      const seedSql = readFileSync(activeSeed.filePath, 'utf8');
      const seedHash = currentHash ?? this.hashSql(seedSql);
      if (!seedSql.trim()) {
        throw new InternalServerErrorException(`${activeSeed.fileName} is empty.`);
      }
      db.exec(seedSql);
      this.writeSeedState({
        seedHash,
        loadedAt: new Date().toISOString(),
        source: activeSeed.source,
        fileName: activeSeed.fileName,
      });
      return seedHash;
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

  private getActiveSeedSummary(seedHash?: string) {
    const activeSeed = this.resolveActiveSeedFile();
    return this.buildSeedSummary(activeSeed, activeSeed, seedHash);
  }

  private scanSeedDirectory(source: SqlPracticeSeedSource, activeSeed: ResolvedSeed) {
    const seedDir = source === 'builtin' ? this.getBuiltinSeedDir() : this.getUploadedSeedDir();
    if (!existsSync(seedDir)) return [];

    const fileNames = readdirSync(seedDir)
      .filter((fileName) => seedFileNameSchema.safeParse(fileName).success)
      .filter((fileName) => statSync(join(seedDir, fileName)).isFile())
      .sort((a, b) => a.localeCompare(b));

    const hasNumberedBuiltinSeeds =
      source === 'builtin' && fileNames.some((fileName) => /^\d{2}_/.test(fileName));

    return fileNames
      .filter((fileName) => !(hasNumberedBuiltinSeeds && fileName === LEGACY_SEED_FILE))
      .map((fileName) =>
        this.buildSeedSummary(
          {
            source,
            fileName,
            filePath: join(seedDir, fileName),
          },
          activeSeed,
        ),
      );
  }

  private buildSeedSummary(seed: ResolvedSeed, activeSeed: ResolvedSeed, hashOverride?: string) {
    const sql = readFileSync(seed.filePath, 'utf8');
    const stats = statSync(seed.filePath);
    const meta = this.parseSeedMeta(sql, seed.fileName);

    return {
      ...meta,
      source: seed.source,
      fileName: seed.fileName,
      hash: hashOverride ?? this.hashSql(sql),
      sizeBytes: stats.size,
      updatedAt: Number.isFinite(stats.mtimeMs) ? stats.mtime.toISOString() : null,
      isActive: resolve(seed.filePath) === resolve(activeSeed.filePath),
      isUpload: seed.source === 'uploaded',
    };
  }

  private parseSeedMeta(sql: string, fileName: string): SqlPracticeSeedMeta {
    const rawMeta: Record<string, string> = {};
    const metaPattern = /^\s*--\s*@([a-zA-Z][a-zA-Z0-9]*)\s+(.+?)\s*$/gm;
    let match: RegExpExecArray | null;

    while ((match = metaPattern.exec(sql)) !== null) {
      rawMeta[match[1]] = match[2];
    }

    const fallbackTitle = this.toFallbackTitle(fileName);
    const title = rawMeta.title?.trim() || fallbackTitle;
    const tables = this.parseMetaList(rawMeta.tables) ?? this.extractTableNames(sql);

    return {
      title,
      slug: rawMeta.slug?.trim() || this.toFallbackSlug(fileName),
      level: this.parseSeedLevel(rawMeta.level),
      description: rawMeta.description?.trim() || `${title} SQL 연습 파일입니다.`,
      topics: this.parseMetaList(rawMeta.topics) ?? [],
      tables,
      recommendedQueries: this.parseRecommendedQueries(rawMeta.recommendedQueries),
    };
  }

  private parseMetaList(value?: string) {
    const items =
      value
        ?.split(/[,|]/)
        .map((item) => item.trim())
        .filter(Boolean) ?? [];
    return items.length > 0 ? items : null;
  }

  private parseRecommendedQueries(value?: string) {
    return (
      value
        ?.split('|')
        .map((item) => item.trim())
        .filter(Boolean) ?? []
    );
  }

  private parseSeedLevel(value?: string): SqlPracticeSeedLevel {
    const level = value?.trim() as SqlPracticeSeedLevel | undefined;
    return level && SEED_LEVELS.includes(level) ? level : 'beginner';
  }

  private extractTableNames(sql: string) {
    const tableNames = new Set<string>();
    const tablePattern =
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([a-zA-Z_][a-zA-Z0-9_]*)["'`]?/gi;
    let match: RegExpExecArray | null;

    while ((match = tablePattern.exec(sql)) !== null) {
      tableNames.add(match[1]);
    }

    return [...tableNames].sort((a, b) => a.localeCompare(b));
  }

  private toFallbackTitle(fileName: string) {
    return fileName
      .replace(/\.sql$/i, '')
      .replace(/^\d+[_-]?/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private toFallbackSlug(fileName: string) {
    const slug = fileName
      .replace(/\.sql$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || fileName.replace(/\.sql$/i, '');
  }

  private validateSeedSql(sql: string, fileName: string) {
    if (!sql.trim()) {
      throw new BadRequestException(`${fileName} is empty.`);
    }

    const db = new Database(':memory:');
    try {
      db.pragma('foreign_keys = ON');
      db.exec(sql);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : `Failed to validate ${fileName}.`,
      );
    } finally {
      db.close();
    }
  }

  private resolveActiveSeedFile(): ResolvedSeed {
    const activeState = this.readActiveSeedState();
    if (activeState) {
      try {
        return this.resolveSeedFile(activeState.source, activeState.fileName);
      } catch {
        // Fall through to the compatibility/default seed if the active state points at a removed file.
      }
    }

    const configuredSeedFile = this.getConfiguredSeedFile();
    if (configuredSeedFile) {
      return {
        source: 'builtin',
        fileName: basename(configuredSeedFile),
        filePath: configuredSeedFile,
      };
    }

    const builtinFileNames = this.getBuiltinSeedFileNames();
    const fileName =
      builtinFileNames.find((candidate) => candidate === DEFAULT_BUILTIN_SEED_FILE) ??
      builtinFileNames.find((candidate) => candidate === LEGACY_SEED_FILE) ??
      builtinFileNames[0] ??
      DEFAULT_BUILTIN_SEED_FILE;

    return this.resolveSeedFile('builtin', fileName);
  }

  private resolveSeedFile(source: SqlPracticeSeedSource, fileName: string): ResolvedSeed {
    const parsed = seedFileNameSchema.safeParse(fileName);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid SQL seed file.');
    }

    const seedDir = source === 'builtin' ? this.getBuiltinSeedDir() : this.getUploadedSeedDir();
    const seedFile = join(seedDir, parsed.data);

    if (!existsSync(seedFile) || !statSync(seedFile).isFile()) {
      throw new NotFoundException('SQL seed file not found.');
    }

    return {
      source,
      fileName: parsed.data,
      filePath: seedFile,
    };
  }

  private getBuiltinSeedFileNames() {
    const seedDir = this.getBuiltinSeedDir();
    if (!existsSync(seedDir)) return [];

    return readdirSync(seedDir)
      .filter((fileName) => seedFileNameSchema.safeParse(fileName).success)
      .filter((fileName) => statSync(join(seedDir, fileName)).isFile())
      .sort((a, b) => a.localeCompare(b));
  }

  private getBuiltinSeedDir() {
    const candidates = [
      join(__dirname, 'seeds'),
      join(process.cwd(), 'src/sql-practice/seeds'),
      join(process.cwd(), 'dist/sql-practice/seeds'),
      join(process.cwd(), 'dist/src/sql-practice/seeds'),
    ];

    return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
  }

  private getUploadedSeedDir() {
    const configured =
      this.configService.get<string>('SQL_PRACTICE_UPLOAD_SEED_DIR') ??
      './data/sql-practice/seeds';
    return isAbsolute(configured) ? configured : join(process.cwd(), configured);
  }

  private getConfiguredSeedFile() {
    const configured = this.configService.get<string>('SQL_PRACTICE_SEED_FILE')?.trim();
    if (!configured) return null;
    return isAbsolute(configured) ? configured : join(process.cwd(), configured);
  }

  private getDatabaseFile() {
    const configured =
      this.configService.get<string>('SQL_PRACTICE_DB_FILE') ??
      './data/sql-practice/runtime/practice.sqlite';
    return isAbsolute(configured) ? configured : join(process.cwd(), configured);
  }

  private getSeedHash(activeSeed = this.resolveActiveSeedFile()) {
    if (!existsSync(activeSeed.filePath)) {
      throw new InternalServerErrorException(
        `SQL practice seed file not found: ${activeSeed.filePath}`,
      );
    }
    return this.hashSql(readFileSync(activeSeed.filePath, 'utf8'));
  }

  private hashSql(sql: string) {
    return createHash('sha256').update(sql).digest('hex');
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

  private getActiveSeedStateFile() {
    const configured =
      this.configService.get<string>('SQL_PRACTICE_ACTIVE_SEED_FILE') ??
      './data/sql-practice/active-seed.json';
    return isAbsolute(configured) ? configured : join(process.cwd(), configured);
  }

  private readActiveSeedState(): ActiveSeedState | null {
    const stateFile = this.getActiveSeedStateFile();
    if (!existsSync(stateFile)) return null;

    try {
      const parsed = activateSeedSchema.safeParse(JSON.parse(readFileSync(stateFile, 'utf8')));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private writeActiveSeedState(state: ActiveSeedState) {
    const stateFile = this.getActiveSeedStateFile();
    mkdirSync(dirname(stateFile), { recursive: true });
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }

  private getMaxRows() {
    const value = Number(this.configService.get<string>('SQL_PRACTICE_MAX_ROWS') ?? 500);
    return Number.isFinite(value) && value > 0 ? Math.min(value, 5000) : 500;
  }

  private getMaxQueryLength() {
    const value = Number(this.configService.get<string>('SQL_PRACTICE_MAX_QUERY_LENGTH') ?? 10000);
    return Number.isFinite(value) && value > 0 ? Math.min(value, 50000) : 10000;
  }

  async geminiAsk(body: unknown): Promise<{ answer: string }> {
    const { content, mode } = geminiAskSchema.parse(body);
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Gemini API key is not configured.');
    }

    const systemPrompt =
      mode === 'sql'
        ? `You are an SQL expert. When given an SQL query:
1. The VERY FIRST line of your response must be exactly one of: [SQL_VALID] or [SQL_INVALID] — nothing else on that line.
2. Then on the next line, provide: validation result, explanation of what the query does, any errors or improvements, and a corrected version if needed.
Respond in Korean.`
        : "You are a helpful assistant. Answer the user's question clearly and concisely. Respond in Korean.";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: content }] }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new InternalServerErrorException(`Gemini API error: ${err}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return { answer };
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
