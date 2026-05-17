import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, inArray } from 'drizzle-orm';
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
import {
  sqlPracticeNotesTable,
  sqlPracticeSubmissionLogsTable,
  sqlPracticeSubmissionsTable,
  sqlPersonalPracticeProblemsTable,
  sqlPersonalPracticeSchemaVersionsTable,
  sqlPersonalPracticeSharesTable,
  sqlPersonalPracticeSubmissionsTable,
  sqlPersonalPracticeWorkspacesTable,
  sqlUserPracticeProblemsTable,
  sqlUserPracticeSchemasTable,
  usersTable,
} from '../database/schema';
import {
  activateSeedSchema,
  executeSqlSchema,
  geminiAskSchema,
  gradeSqlUserPracticeProblemSchema,
  gradeSqlPracticeSubmissionSchema,
  seedFileNameSchema,
  sqlPersonalPracticeProblemListQuerySchema,
  sqlPracticeSubmissionActivityQuerySchema,
  sqlPracticeSubmissionSeedQuerySchema,
  type CreateSqlPracticeNoteInput,
  type CreateSqlUserPracticeProblemInput,
  type GenerateSqlUserPracticeAnswerInput,
  type GradeSqlUserPracticeProblemInput,
  type GradeSqlPracticeSubmissionInput,
  type ListSqlPracticeNotesQuery,
  type ReplacePersonalSchemaVersionInput,
  type SqlPersonalPracticeProblemListQuery,
  type SqlUserPracticeProblemListQuery,
  type UpdateSqlPracticeNoteInput,
  type UpdateSqlUserPracticeProblemInput,
} from './sql-practice.schemas';
import { sanitizeSql } from './sql-safety';
import type {
  ColumnInfo,
  SqlActivateSeedResponse,
  SqlExecuteResponse,
  SqlPracticeActivityResponse,
  SqlPracticeGradeSubmissionResponse,
  SqlPracticeMySubmissionsResponse,
  SqlPracticeMeta,
  SqlPracticeRankingResponse,
  SqlPracticeSeedLevel,
  SqlPracticeSeedListResponse,
  SqlPracticeSeedMeta,
  SqlPracticeSeedSource,
  SqlPracticeSubmission,
  SqlPracticeSubmissionLevel,
  SqlPracticeSubmissionStatus,
  SqlPersonalPracticeProblem,
  SqlPersonalPracticeProblemListResponse,
  SqlPersonalPracticePublicProblemResponse,
  SqlPersonalPracticeSchemaReplaceResponse,
  SqlPersonalPracticeSchemaVersion,
  SqlPersonalPracticeShare,
  SqlPersonalPracticeSubmissionStatus,
  SqlPersonalPracticeWorkspace,
  SqlUserPracticeGenerateAnswerResponse,
  SqlUserPracticeGradeResponse,
  SqlUserPracticeProblem,
  SqlUserPracticeProblemListResponse,
  SqlUserPracticeSchema,
  SqlQueryType,
  SqlResetResponse,
  TableInfo,
} from './sql-practice.types';

const DEFAULT_BUILTIN_SEED_FILE = '01_board_basic.sql';
const USER_PRACTICE_SEED_FILE = 'user_commerce.sql';
const USER_PRACTICE_RUNTIME_SCOPE = '__user_practice__';
const PERSONAL_PRACTICE_RUNTIME_SCOPE = '__personal_practice__';
const PUBLIC_PERSONAL_PRACTICE_RUNTIME_SCOPE = '__public_personal_practice__';
const PERSONAL_SCHEMA_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;
const LEGACY_SEED_FILE = 'seed.sql';
const SEED_LEVELS: SqlPracticeSeedLevel[] = [
  'beginner',
  'basic',
  'intermediate',
  'advanced',
];

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

type UploadedSqlFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type SqlGradeValidity = 'correct' | 'incorrect';

@Injectable()
export class SqlPracticeService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  getMeta(userId: string): SqlPracticeMeta {
    const freshness = this.ensureDatabaseFresh(userId);
    const activeSeed = this.getActiveSeedSummary(userId, freshness.seedHash);
    const db = this.openDatabase(userId);

    try {
      return {
        seedFile: activeSeed.fileName,
        seedHash: freshness.seedHash,
        dbFile: basename(this.getDatabaseFile(userId)),
        lastLoadedAt: freshness.loadedAt,
        tableCount: this.listTableNames(db).length,
        activeSeed,
      };
    } finally {
      db.close();
    }
  }

  listSeeds(userId: string): SqlPracticeSeedListResponse {
    const activeSeed = this.resolveActiveSeedFile(userId);
    const seeds = [
      ...this.scanSeedDirectory('builtin', activeSeed),
      ...this.scanSeedDirectory('uploaded', activeSeed),
    ];

    if (!seeds.some((seed) => seed.isActive)) {
      seeds.unshift(this.buildSeedSummary(activeSeed, activeSeed));
    }

    const activeSummary =
      seeds.find((seed) => seed.isActive) ??
      this.buildSeedSummary(activeSeed, activeSeed);

    return {
      active: {
        source: activeSummary.source,
        fileName: activeSummary.fileName,
        slug: activeSummary.slug,
      },
      seeds,
    };
  }

  activateSeed(payload: unknown, userId: string): SqlActivateSeedResponse {
    const parsed = activateSeedSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Invalid SQL seed request.',
      );
    }

    const seed = this.resolveSeedFile(parsed.data.source, parsed.data.fileName);
    const seedSql = readFileSync(seed.filePath, 'utf8');
    this.validateSeedSql(seedSql, seed.fileName);

    const seedHash = this.hashSql(seedSql);
    this.writeActiveSeedState(userId, {
      source: seed.source,
      fileName: seed.fileName,
    });
    const loadedHash = this.rebuildDatabase(userId, seedHash, seed);

    return {
      success: true,
      message: `SQL 연습 DB를 ${seed.fileName} 기준으로 다시 만들었습니다.`,
      seedHash: loadedHash,
      activeSeed: this.buildSeedSummary(seed, seed, loadedHash),
    };
  }

  getTables(userId: string): TableInfo[] {
    this.ensureDatabaseFresh(userId);
    const db = this.openDatabase(userId);

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

  getTable(tableName: string, userId: string): TableInfo {
    this.ensureDatabaseFresh(userId);
    const db = this.openDatabase(userId);

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

  execute(payload: unknown, userId: string): SqlExecuteResponse {
    const start = Date.now();
    const parsed = executeSqlSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Invalid SQL request.',
      );
    }
    const input = parsed.data;
    const maxQueryLength = this.getMaxQueryLength();
    const { query, type } = sanitizeSql(input.query, maxQueryLength);
    const freshness = this.ensureDatabaseFresh(userId);
    const db = this.openDatabase(userId);

    try {
      if (this.isReaderType(type)) {
        return this.executeReader(
          db,
          query,
          type,
          start,
          freshness.seedReloaded,
        );
      }

      return this.executeWriter(db, query, type, start, freshness.seedReloaded);
    } catch (error) {
      return {
        success: false,
        type,
        columns: null,
        rows: null,
        affectedRows: 0,
        message:
          error instanceof Error ? error.message : 'SQL execution failed.',
        executionTimeMs: Date.now() - start,
        schemaChanged: false,
        seedReloaded: freshness.seedReloaded,
      };
    } finally {
      db.close();
    }
  }

  reset(userId: string): SqlResetResponse {
    const activeSeed = this.resolveActiveSeedFile(userId);
    const seedHash = this.rebuildDatabase(userId, undefined, activeSeed);
    return {
      success: true,
      message: `SQL 연습 DB를 ${activeSeed.fileName} 기준으로 다시 만들었습니다.`,
      seedHash,
    };
  }

  reloadSeed(userId: string): SqlResetResponse {
    return this.reset(userId);
  }

  getSeedErd(fileName: string): { mmd: string | null } {
    const parsed = seedFileNameSchema.safeParse(
      fileName.replace(/\.mmd$/, '.sql'),
    );
    if (!parsed.success) return { mmd: null };

    const baseName = parsed.data.replace(/\.sql$/, '');
    const mmdFile = join(this.getBuiltinSeedDir(), `${baseName}.mmd`);

    if (!existsSync(mmdFile)) return { mmd: null };
    return { mmd: readFileSync(mmdFile, 'utf8') };
  }

  getUserPracticeMeta(userId: string): SqlPracticeMeta {
    const schema = this.ensureUserPracticeSchema();
    const activeSeed = this.getUserPracticeSeed();
    const runtimeUserId = this.getUserPracticeRuntimeUserId(userId);
    const freshness = this.ensureDatabaseFresh(runtimeUserId, activeSeed);
    const db = this.openDatabase(runtimeUserId);

    try {
      return {
        seedFile: activeSeed.fileName,
        seedHash: freshness.seedHash,
        dbFile: basename(this.getDatabaseFile(runtimeUserId)),
        lastLoadedAt: freshness.loadedAt,
        tableCount: this.listTableNames(db).length,
        activeSeed: this.buildSeedSummary(
          activeSeed,
          activeSeed,
          schema.dbFileHash,
        ),
      };
    } finally {
      db.close();
    }
  }

  getUserPracticeTables(userId: string): TableInfo[] {
    const activeSeed = this.getUserPracticeSeed();
    const runtimeUserId = this.getUserPracticeRuntimeUserId(userId);
    this.ensureDatabaseFresh(runtimeUserId, activeSeed);
    const db = this.openDatabase(runtimeUserId);

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

  getUserPracticeTable(tableName: string, userId: string): TableInfo {
    const activeSeed = this.getUserPracticeSeed();
    const runtimeUserId = this.getUserPracticeRuntimeUserId(userId);
    this.ensureDatabaseFresh(runtimeUserId, activeSeed);
    const db = this.openDatabase(runtimeUserId);

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

  executeUserPractice(payload: unknown, userId: string): SqlExecuteResponse {
    const start = Date.now();
    const parsed = executeSqlSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Invalid SQL request.',
      );
    }

    const { query, type } = sanitizeSql(
      parsed.data.query,
      this.getMaxQueryLength(),
    );
    const activeSeed = this.getUserPracticeSeed();
    const runtimeUserId = this.getUserPracticeRuntimeUserId(userId);
    const freshness = this.ensureDatabaseFresh(runtimeUserId, activeSeed);
    const db = this.openDatabase(runtimeUserId);

    try {
      if (this.isReaderType(type)) {
        return this.executeReader(
          db,
          query,
          type,
          start,
          freshness.seedReloaded,
        );
      }

      return this.executeWriter(db, query, type, start, freshness.seedReloaded);
    } catch (error) {
      return {
        success: false,
        type,
        columns: null,
        rows: null,
        affectedRows: 0,
        message:
          error instanceof Error ? error.message : 'SQL execution failed.',
        executionTimeMs: Date.now() - start,
        schemaChanged: false,
        seedReloaded: freshness.seedReloaded,
      };
    } finally {
      db.close();
    }
  }

  resetUserPractice(userId: string): SqlResetResponse {
    const activeSeed = this.getUserPracticeSeed();
    const runtimeUserId = this.getUserPracticeRuntimeUserId(userId);
    const seedHash = this.rebuildDatabase(runtimeUserId, undefined, activeSeed);
    return {
      success: true,
      message: `SQL 연습 DB를 ${activeSeed.fileName} 기준으로 다시 만들었습니다.`,
      seedHash,
    };
  }

  getUserPracticeErd(): { mmd: string | null } {
    const mmdFile = join(this.getUserPracticeSeedDir(), 'user_commerce.mmd');
    if (!existsSync(mmdFile)) return { mmd: null };
    return { mmd: readFileSync(mmdFile, 'utf8') };
  }

  listPersonalPracticeWorkspaces(
    userId: string,
  ): SqlPersonalPracticeWorkspace[] {
    this.ensureDefaultPersonalWorkspace(userId);
    return this.databaseService.db
      .select()
      .from(sqlPersonalPracticeWorkspacesTable)
      .where(eq(sqlPersonalPracticeWorkspacesTable.ownerId, userId))
      .orderBy(desc(sqlPersonalPracticeWorkspacesTable.updatedAt))
      .all()
      .map((row) => this.toPersonalWorkspace(row));
  }

  getDefaultPersonalPracticeWorkspace(
    userId: string,
  ): SqlPersonalPracticeWorkspace {
    return this.ensureDefaultPersonalWorkspace(userId);
  }

  getPersonalPracticeWorkspaceMeta(
    workspaceId: string,
    userId: string,
  ): SqlPracticeMeta {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const schemaVersion = this.getActivePersonalSchemaVersion(workspace.id);
    const seed = this.buildPersonalPracticeSeed(schemaVersion);
    const runtimeUserId = this.getPersonalPracticeRuntimeUserId(
      workspace.id,
      schemaVersion.id,
      userId,
    );
    const freshness = this.ensureDatabaseFresh(runtimeUserId, seed);
    const db = this.openDatabase(runtimeUserId);

    try {
      return {
        seedFile: seed.fileName,
        seedHash: freshness.seedHash,
        dbFile: basename(this.getDatabaseFile(runtimeUserId)),
        lastLoadedAt: freshness.loadedAt,
        tableCount: this.listTableNames(db).length,
        activeSeed: this.buildSeedSummary(seed, seed, schemaVersion.dbFileHash),
      };
    } finally {
      db.close();
    }
  }

  getPersonalPracticeTables(workspaceId: string, userId: string): TableInfo[] {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const schemaVersion = this.getActivePersonalSchemaVersion(workspace.id);
    return this.getPersonalPracticeTablesForSchema(
      workspace.id,
      schemaVersion,
      userId,
    );
  }

  getPersonalPracticeTableRows(
    workspaceId: string,
    tableName: string,
    userId: string,
  ): SqlExecuteResponse {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const schemaVersion = this.getActivePersonalSchemaVersion(workspace.id);
    return this.executePersonalPracticeTablePreview(
      tableName,
      schemaVersion,
      userId,
    );
  }

  replacePersonalPracticeSchemaVersion(
    workspaceId: string,
    file: UploadedSqlFile | undefined,
    input: ReplacePersonalSchemaVersionInput,
    userId: string,
  ): SqlPersonalPracticeSchemaReplaceResponse {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const activeSchemaVersion = this.getActivePersonalSchemaVersion(
      workspace.id,
    );
    const schemaSql = this.validateUploadedPersonalSqlFile(file);
    this.validatePersonalSchemaSql(schemaSql);

    const nextVersion = this.getNextPersonalSchemaVersion(workspace.id);
    const now = new Date().toISOString();
    const schemaVersionId = randomUUID();
    const dbFileHash = this.hashSql(schemaSql);
    const tempRuntimeUserId = `${PERSONAL_PRACTICE_RUNTIME_SCOPE}:validate:${schemaVersionId}`;

    const previewSchemaVersion: SqlPersonalPracticeSchemaVersion & {
      schemaSql: string;
    } = {
      id: schemaVersionId,
      workspaceId: workspace.id,
      version: nextVersion,
      title: input.title?.trim() || file!.originalname.replace(/\.sql$/i, ''),
      description: input.description?.trim() || '',
      erdMmd: null,
      dbFileHash,
      sourceType: 'uploaded_sql',
      sourceFileName: file!.originalname,
      replacedFromSchemaVersionId: activeSchemaVersion.id,
      createdAt: now,
      schemaSql,
    };

    let tables: TableInfo[];
    let validationPassed = false;

    try {
      tables = this.getPersonalPracticeTablesForSchema(
        workspace.id,
        previewSchemaVersion,
        tempRuntimeUserId,
      );
      if (tables.length === 0) {
        throw new BadRequestException('SQL 파일에서 생성된 테이블이 없습니다.');
      }
      validationPassed = true;
    } finally {
      this.removeRuntimeDatabase(tempRuntimeUserId);
      if (!validationPassed) {
        this.removePersonalPracticeSeedFile(schemaVersionId);
      }
    }

    try {
      this.databaseService.db.transaction((tx) => {
        tx.insert(sqlPersonalPracticeSchemaVersionsTable)
          .values({
            id: schemaVersionId,
            workspaceId: workspace.id,
            version: nextVersion,
            title: previewSchemaVersion.title,
            description: previewSchemaVersion.description,
            schemaSql,
            erdMmd: null,
            dbFileHash,
            sourceType: 'uploaded_sql',
            sourceFileName: file!.originalname,
            replacedFromSchemaVersionId: activeSchemaVersion.id,
            createdBy: userId,
            createdAt: now,
          })
          .run();

        tx.update(sqlPersonalPracticeWorkspacesTable)
          .set({ activeSchemaVersionId: schemaVersionId, updatedAt: now })
          .where(eq(sqlPersonalPracticeWorkspacesTable.id, workspace.id))
          .run();
      });
    } catch (error) {
      this.removePersonalPracticeSeedFile(schemaVersionId);
      throw error;
    }

    const schemaVersion = this.getPersonalSchemaVersion(schemaVersionId);
    const activeTables = this.getPersonalPracticeTablesForSchema(
      workspace.id,
      schemaVersion,
      userId,
    );

    return {
      workspace: this.assertPersonalWorkspaceOwner(workspace.id, userId),
      schemaVersion,
      tableCount: activeTables.length,
      tables: activeTables,
    };
  }

  getPersonalPracticeErd(
    workspaceId: string,
    userId: string,
  ): { mmd: string | null } {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const schemaVersion = this.getActivePersonalSchemaVersion(workspace.id);
    return { mmd: schemaVersion.erdMmd ?? null };
  }

  listPersonalPracticeProblems(
    workspaceId: string,
    query: SqlPersonalPracticeProblemListQuery,
    userId: string,
  ): SqlPersonalPracticeProblemListResponse {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const schemaVersion = this.getActivePersonalSchemaVersion(workspace.id);
    const conditions = [
      eq(sqlPersonalPracticeProblemsTable.workspaceId, workspace.id),
    ];

    if (query.level) {
      conditions.push(eq(sqlPersonalPracticeProblemsTable.level, query.level));
    }

    const rows = this.databaseService.db
      .select({
        id: sqlPersonalPracticeProblemsTable.id,
        workspaceId: sqlPersonalPracticeProblemsTable.workspaceId,
        schemaVersionId: sqlPersonalPracticeProblemsTable.schemaVersionId,
        title: sqlPersonalPracticeProblemsTable.title,
        description: sqlPersonalPracticeProblemsTable.description,
        level: sqlPersonalPracticeProblemsTable.level,
        targetTables: sqlPersonalPracticeProblemsTable.targetTables,
        starterSql: sqlPersonalPracticeProblemsTable.starterSql,
        answerSql: sqlPersonalPracticeProblemsTable.answerSql,
        explanation: sqlPersonalPracticeProblemsTable.explanation,
        status: sqlPersonalPracticeProblemsTable.status,
        createdBy: sqlPersonalPracticeProblemsTable.createdBy,
        authorName: usersTable.name,
        shareToken: sqlPersonalPracticeSharesTable.token,
        shareEnabled: sqlPersonalPracticeSharesTable.enabled,
        createdAt: sqlPersonalPracticeProblemsTable.createdAt,
        updatedAt: sqlPersonalPracticeProblemsTable.updatedAt,
      })
      .from(sqlPersonalPracticeProblemsTable)
      .innerJoin(
        usersTable,
        eq(usersTable.id, sqlPersonalPracticeProblemsTable.createdBy),
      )
      .leftJoin(
        sqlPersonalPracticeSharesTable,
        and(
          eq(
            sqlPersonalPracticeSharesTable.problemId,
            sqlPersonalPracticeProblemsTable.id,
          ),
          eq(sqlPersonalPracticeSharesTable.enabled, true),
        ),
      )
      .where(and(...conditions))
      .orderBy(
        sqlPersonalPracticeProblemsTable.level,
        desc(sqlPersonalPracticeProblemsTable.updatedAt),
      )
      .all();

    const submissionStatusByProblem =
      this.getPersonalSubmissionStatusByProblemIds(
        userId,
        rows.map((row) => row.id),
      );

    return {
      workspace,
      schemaVersion,
      problems: rows.map((row) =>
        this.toPersonalProblem(row, submissionStatusByProblem[row.id] ?? null),
      ),
    };
  }

  getPersonalPracticeProblem(
    workspaceId: string,
    id: string,
    userId: string,
  ): SqlPersonalPracticeProblem | null {
    this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const problem = this.getPersonalPracticeProblemRow(workspaceId, id);
    if (!problem) return null;
    return this.toPersonalProblem(
      problem,
      this.getPersonalSubmissionStatus(userId, problem.id),
    );
  }

  createPersonalPracticeProblem(
    workspaceId: string,
    input: CreateSqlUserPracticeProblemInput,
    userId: string,
  ): SqlPersonalPracticeProblem | null {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const schemaVersion = this.getActivePersonalSchemaVersion(workspace.id);
    this.validatePersonalProblemTables(
      input.targetTables,
      workspace.id,
      schemaVersion,
      userId,
    );
    this.validatePersonalAnswerSql(
      input.answerSql,
      workspace.id,
      schemaVersion,
      userId,
    );

    const id = randomUUID();
    const now = new Date().toISOString();
    this.databaseService.db
      .insert(sqlPersonalPracticeProblemsTable)
      .values({
        id,
        workspaceId: workspace.id,
        schemaVersionId: schemaVersion.id,
        title: input.title,
        description: input.description,
        level: input.level,
        targetTables: input.targetTables,
        starterSql: input.starterSql,
        answerSql: input.answerSql,
        explanation: input.explanation,
        status: input.status,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getPersonalPracticeProblem(workspace.id, id, userId);
  }

  updatePersonalPracticeProblem(
    workspaceId: string,
    id: string,
    input: UpdateSqlUserPracticeProblemInput,
    userId: string,
  ): SqlPersonalPracticeProblem | null {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const problem = this.getPersonalPracticeProblemRow(workspace.id, id);
    if (!problem)
      throw new NotFoundException('SQL personal problem not found.');
    if (problem.createdBy !== userId)
      throw new ForbiddenException('Not authorized.');
    const schemaVersion = this.getPersonalSchemaVersion(
      problem.schemaVersionId,
    );

    if (input.targetTables) {
      this.validatePersonalProblemTables(
        input.targetTables,
        workspace.id,
        schemaVersion,
        userId,
      );
    }
    if (input.answerSql) {
      this.validatePersonalAnswerSql(
        input.answerSql,
        workspace.id,
        schemaVersion,
        userId,
      );
    }

    this.databaseService.db
      .update(sqlPersonalPracticeProblemsTable)
      .set({
        title: input.title,
        description: input.description,
        level: input.level,
        targetTables: input.targetTables,
        starterSql: input.starterSql,
        answerSql: input.answerSql,
        explanation: input.explanation,
        status: input.status,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sqlPersonalPracticeProblemsTable.id, id))
      .run();

    return this.getPersonalPracticeProblem(workspace.id, id, userId);
  }

  deletePersonalPracticeProblem(
    workspaceId: string,
    id: string,
    userId: string,
  ) {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const problem = this.getPersonalPracticeProblemRow(workspace.id, id);
    if (!problem)
      throw new NotFoundException('SQL personal problem not found.');
    if (problem.createdBy !== userId)
      throw new ForbiddenException('Not authorized.');

    this.databaseService.db
      .delete(sqlPersonalPracticeProblemsTable)
      .where(eq(sqlPersonalPracticeProblemsTable.id, id))
      .run();
  }

  async generatePersonalPracticeAnswer(
    workspaceId: string,
    input: GenerateSqlUserPracticeAnswerInput,
    userId: string,
  ): Promise<SqlUserPracticeGenerateAnswerResponse> {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const schemaVersion = this.getActivePersonalSchemaVersion(workspace.id);
    this.validatePersonalProblemTables(
      input.targetTables,
      workspace.id,
      schemaVersion,
      userId,
    );
    const prompt = this.buildPersonalPracticeAnswerPrompt(
      workspace.id,
      schemaVersion,
      input,
      userId,
    );
    const raw = await this.callGroq(prompt, 'general');
    const parsed = this.parseGeneratedAnswer(raw);

    if (!parsed.answerSql) {
      throw new InternalServerErrorException('정답 SQL을 생성하지 못했습니다.');
    }

    this.validatePersonalAnswerSql(
      parsed.answerSql,
      workspace.id,
      schemaVersion,
      userId,
    );
    return parsed;
  }

  sharePersonalPracticeProblem(
    workspaceId: string,
    id: string,
    userId: string,
  ): SqlPersonalPracticeShare {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const problem = this.getPersonalPracticeProblemRow(workspace.id, id);
    if (!problem)
      throw new NotFoundException('SQL personal problem not found.');
    if (problem.createdBy !== userId)
      throw new ForbiddenException('Not authorized.');

    const existing = this.databaseService.db
      .select()
      .from(sqlPersonalPracticeSharesTable)
      .where(
        and(
          eq(sqlPersonalPracticeSharesTable.problemId, id),
          eq(sqlPersonalPracticeSharesTable.enabled, true),
        ),
      )
      .get();
    if (existing) return this.toPersonalShare(existing);

    const shareId = randomUUID();
    const now = new Date().toISOString();
    this.databaseService.db
      .insert(sqlPersonalPracticeSharesTable)
      .values({
        id: shareId,
        problemId: problem.id,
        workspaceId: workspace.id,
        schemaVersionId: problem.schemaVersionId,
        token: randomUUID().replace(/-/g, ''),
        enabled: true,
        createdBy: userId,
        createdAt: now,
        disabledAt: null,
      })
      .run();

    const share = this.databaseService.db
      .select()
      .from(sqlPersonalPracticeSharesTable)
      .where(eq(sqlPersonalPracticeSharesTable.id, shareId))
      .get();
    if (!share)
      throw new InternalServerErrorException('Failed to create share.');
    return this.toPersonalShare(share);
  }

  unsharePersonalPracticeProblem(
    workspaceId: string,
    id: string,
    userId: string,
  ) {
    const workspace = this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const problem = this.getPersonalPracticeProblemRow(workspace.id, id);
    if (!problem)
      throw new NotFoundException('SQL personal problem not found.');
    if (problem.createdBy !== userId)
      throw new ForbiddenException('Not authorized.');

    this.databaseService.db
      .update(sqlPersonalPracticeSharesTable)
      .set({ enabled: false, disabledAt: new Date().toISOString() })
      .where(eq(sqlPersonalPracticeSharesTable.problemId, id))
      .run();
  }

  gradePersonalPracticeProblem(
    workspaceId: string,
    id: string,
    body: unknown,
    userId: string,
  ): SqlUserPracticeGradeResponse {
    this.assertPersonalWorkspaceOwner(workspaceId, userId);
    const problem = this.getPersonalPracticeProblemRow(workspaceId, id);
    if (!problem)
      throw new NotFoundException('SQL personal problem not found.');
    const schemaVersion = this.getPersonalSchemaVersion(
      problem.schemaVersionId,
    );
    const input = gradeSqlUserPracticeProblemSchema.parse(body);
    const response = this.gradePersonalProblemWithSchema(
      problem,
      schemaVersion,
      input.submittedSql,
      this.getPersonalPracticeRuntimeUserId(
        workspaceId,
        schemaVersion.id,
        userId,
      ),
    );
    this.recordPersonalPracticeSubmission({
      userId,
      problem,
      schemaVersion,
      submittedSql: input.submittedSql,
      result: response,
      shareId: null,
    });
    return response;
  }

  getPublicPersonalPracticeProblem(
    token: string,
    userId?: string,
  ): SqlPersonalPracticePublicProblemResponse | null {
    const share = this.getEnabledPersonalShareByToken(token);
    if (!share) return null;
    const problem = this.getPersonalPracticeProblemRow(
      share.workspaceId,
      share.problemId,
    );
    if (!problem || problem.status !== 'published') return null;
    const workspace = this.getPersonalWorkspaceById(share.workspaceId);
    if (!workspace) return null;
    const schemaVersion = this.getPersonalSchemaVersion(share.schemaVersionId);
    const tables = this.getPersonalPracticeTablesForSchema(
      share.workspaceId,
      schemaVersion,
      this.getPublicPersonalPracticeRuntimeUserId(token, schemaVersion.id),
    );
    const submissionStatus = userId
      ? this.getPersonalSubmissionStatus(userId, problem.id)
      : null;
    const publicProblem = this.toPersonalProblem(problem, submissionStatus);
    const {
      answerSql: _answerSql,
      createdBy: _createdBy,
      shareToken: _shareToken,
      shareEnabled: _shareEnabled,
      ...safeProblem
    } = publicProblem;

    return {
      workspace: { id: workspace.id, title: workspace.title },
      schemaVersion: {
        id: schemaVersion.id,
        version: schemaVersion.version,
        title: schemaVersion.title,
        dbFileHash: schemaVersion.dbFileHash,
      },
      problem: safeProblem,
      submissionStatus,
      tables,
      erdMmd: schemaVersion.erdMmd,
    };
  }

  gradePublicPersonalPracticeProblem(
    token: string,
    body: unknown,
    userId?: string,
  ): SqlUserPracticeGradeResponse {
    const share = this.getEnabledPersonalShareByToken(token);
    if (!share) throw new NotFoundException('SQL personal share not found.');
    const problem = this.getPersonalPracticeProblemRow(
      share.workspaceId,
      share.problemId,
    );
    if (!problem || problem.status !== 'published') {
      throw new NotFoundException('SQL personal problem not found.');
    }
    const schemaVersion = this.getPersonalSchemaVersion(share.schemaVersionId);
    const input = gradeSqlUserPracticeProblemSchema.parse(body);
    const response = this.gradePersonalProblemWithSchema(
      problem,
      schemaVersion,
      input.submittedSql,
      this.getPublicPersonalPracticeRuntimeUserId(token, schemaVersion.id),
    );
    if (userId) {
      this.recordPersonalPracticeSubmission({
        userId,
        problem,
        schemaVersion,
        submittedSql: input.submittedSql,
        result: response,
        shareId: share.id,
      });
    }
    return response;
  }

  getPublicPersonalPracticeTableRows(
    token: string,
    tableName: string,
  ): SqlExecuteResponse {
    const share = this.getEnabledPersonalShareByToken(token);
    if (!share) throw new NotFoundException('SQL personal share not found.');
    const problem = this.getPersonalPracticeProblemRow(
      share.workspaceId,
      share.problemId,
    );
    if (!problem || problem.status !== 'published') {
      throw new NotFoundException('SQL personal problem not found.');
    }
    const schemaVersion = this.getPersonalSchemaVersion(share.schemaVersionId);
    return this.executePersonalPracticeTablePreview(
      tableName,
      schemaVersion,
      this.getPublicPersonalPracticeRuntimeUserId(token, schemaVersion.id),
    );
  }

  listUserPracticeProblems(
    query: SqlUserPracticeProblemListQuery,
    userId: string,
  ): SqlUserPracticeProblemListResponse {
    const schema = this.ensureUserPracticeSchema();
    const conditions = [eq(sqlUserPracticeProblemsTable.schemaId, schema.id)];

    if (query.level) {
      conditions.push(eq(sqlUserPracticeProblemsTable.level, query.level));
    }

    if (query.mine) {
      conditions.push(eq(sqlUserPracticeProblemsTable.createdBy, userId));
    }

    const rows = this.databaseService.db
      .select({
        id: sqlUserPracticeProblemsTable.id,
        schemaId: sqlUserPracticeProblemsTable.schemaId,
        title: sqlUserPracticeProblemsTable.title,
        description: sqlUserPracticeProblemsTable.description,
        level: sqlUserPracticeProblemsTable.level,
        targetTables: sqlUserPracticeProblemsTable.targetTables,
        starterSql: sqlUserPracticeProblemsTable.starterSql,
        answerSql: sqlUserPracticeProblemsTable.answerSql,
        explanation: sqlUserPracticeProblemsTable.explanation,
        createdBy: sqlUserPracticeProblemsTable.createdBy,
        authorName: usersTable.name,
        visibility: sqlUserPracticeProblemsTable.visibility,
        status: sqlUserPracticeProblemsTable.status,
        createdAt: sqlUserPracticeProblemsTable.createdAt,
        updatedAt: sqlUserPracticeProblemsTable.updatedAt,
      })
      .from(sqlUserPracticeProblemsTable)
      .innerJoin(
        usersTable,
        eq(usersTable.id, sqlUserPracticeProblemsTable.createdBy),
      )
      .where(and(...conditions))
      .orderBy(
        sqlUserPracticeProblemsTable.level,
        desc(sqlUserPracticeProblemsTable.updatedAt),
      )
      .all();

    return {
      schema,
      problems: rows,
    };
  }

  getUserPracticeProblem(id: string) {
    return this.databaseService.db
      .select({
        id: sqlUserPracticeProblemsTable.id,
        schemaId: sqlUserPracticeProblemsTable.schemaId,
        title: sqlUserPracticeProblemsTable.title,
        description: sqlUserPracticeProblemsTable.description,
        level: sqlUserPracticeProblemsTable.level,
        targetTables: sqlUserPracticeProblemsTable.targetTables,
        starterSql: sqlUserPracticeProblemsTable.starterSql,
        answerSql: sqlUserPracticeProblemsTable.answerSql,
        explanation: sqlUserPracticeProblemsTable.explanation,
        createdBy: sqlUserPracticeProblemsTable.createdBy,
        authorName: usersTable.name,
        visibility: sqlUserPracticeProblemsTable.visibility,
        status: sqlUserPracticeProblemsTable.status,
        createdAt: sqlUserPracticeProblemsTable.createdAt,
        updatedAt: sqlUserPracticeProblemsTable.updatedAt,
      })
      .from(sqlUserPracticeProblemsTable)
      .innerJoin(
        usersTable,
        eq(usersTable.id, sqlUserPracticeProblemsTable.createdBy),
      )
      .where(eq(sqlUserPracticeProblemsTable.id, id))
      .get();
  }

  createUserPracticeProblem(
    input: CreateSqlUserPracticeProblemInput,
    userId: string,
  ): SqlUserPracticeProblem | undefined {
    const schema = this.ensureUserPracticeSchema();
    this.validateProblemTables(input.targetTables, userId);
    this.validateAnswerSql(input.answerSql, userId);

    const id = randomUUID();
    const now = new Date().toISOString();

    this.databaseService.db
      .insert(sqlUserPracticeProblemsTable)
      .values({
        id,
        schemaId: schema.id,
        title: input.title,
        description: input.description,
        level: input.level,
        targetTables: input.targetTables,
        starterSql: input.starterSql,
        answerSql: input.answerSql,
        explanation: input.explanation,
        createdBy: userId,
        visibility: input.visibility,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getUserPracticeProblem(id);
  }

  updateUserPracticeProblem(
    id: string,
    input: UpdateSqlUserPracticeProblemInput,
    userId: string,
  ): SqlUserPracticeProblem | undefined {
    const problem = this.getUserPracticeProblem(id);
    if (!problem) throw new NotFoundException('SQL user problem not found.');
    if (problem.createdBy !== userId) {
      throw new ForbiddenException('Not authorized.');
    }

    if (input.targetTables) {
      this.validateProblemTables(input.targetTables, userId);
    }
    if (input.answerSql) {
      this.validateAnswerSql(input.answerSql, userId);
    }

    this.databaseService.db
      .update(sqlUserPracticeProblemsTable)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(sqlUserPracticeProblemsTable.id, id))
      .run();

    return this.getUserPracticeProblem(id);
  }

  deleteUserPracticeProblem(id: string, userId: string) {
    const problem = this.getUserPracticeProblem(id);
    if (!problem) throw new NotFoundException('SQL user problem not found.');
    if (problem.createdBy !== userId) {
      throw new ForbiddenException('Not authorized.');
    }

    this.databaseService.db
      .delete(sqlUserPracticeProblemsTable)
      .where(eq(sqlUserPracticeProblemsTable.id, id))
      .run();
  }

  async generateUserPracticeAnswer(
    input: GenerateSqlUserPracticeAnswerInput,
    userId: string,
  ): Promise<SqlUserPracticeGenerateAnswerResponse> {
    this.validateProblemTables(input.targetTables, userId);
    const prompt = this.buildUserPracticeAnswerPrompt(input, userId);
    const raw = await this.callGroq(prompt, 'general');
    const parsed = this.parseGeneratedAnswer(raw);

    if (!parsed.answerSql) {
      throw new InternalServerErrorException('정답 SQL을 생성하지 못했습니다.');
    }

    this.validateAnswerSql(parsed.answerSql, userId);

    return {
      answerSql: parsed.answerSql,
      explanation: parsed.explanation,
    };
  }

  gradeUserPracticeProblem(
    problemId: string,
    body: unknown,
    userId: string,
  ): SqlUserPracticeGradeResponse {
    const input = gradeSqlUserPracticeProblemSchema.parse(body);
    const problem = this.getUserPracticeProblem(problemId);
    if (!problem) throw new NotFoundException('SQL user problem not found.');

    const execution = this.executeUserPracticeSelectForGrade(
      input.submittedSql,
      userId,
    );

    if (!execution.success) {
      return {
        problemId,
        submittedSql: input.submittedSql,
        answerSql: problem.answerSql,
        isCorrect: false,
        feedback: `SQL 실행에 실패했습니다.\n\n${execution.message}`,
        execution,
        answerExecution: null,
      };
    }

    const answerExecution = this.executeUserPracticeSelectForGrade(
      problem.answerSql,
      userId,
    );

    if (!answerExecution.success) {
      throw new InternalServerErrorException(
        `저장된 정답 SQL을 실행할 수 없습니다. ${answerExecution.message}`,
      );
    }

    const isCorrect = this.isSameSqlResult(execution, answerExecution);
    const now = new Date().toISOString();
    const seedHash = this.getSeedHash(this.getUserPracticeSeed());
    const exampleLevel = this.toUserPracticeSubmissionLevel(problem.level);
    const submission: SqlPracticeSubmission = {
      id: randomUUID(),
      userId,
      seedFile: USER_PRACTICE_SEED_FILE,
      seedHash,
      exampleId: problem.id,
      exampleTitle: problem.title,
      exampleLevel,
      exampleOrder: problem.level,
      submittedSql: input.submittedSql,
      answerSql: problem.answerSql,
      isCorrect,
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      feedback: isCorrect
        ? '정답입니다. 제출 SQL과 정답 SQL의 실행 결과가 동일합니다.'
        : '오답입니다. 제출 SQL과 정답 SQL의 실행 결과가 다릅니다. 조회 컬럼, 행, 정렬 조건을 확인해주세요.',
      geminiRaw: null,
      createdAt: now,
    };

    this.databaseService.db
      .insert(sqlPracticeSubmissionsTable)
      .values(submission)
      .run();
    this.databaseService.db
      .insert(sqlPracticeSubmissionLogsTable)
      .values({
        id: randomUUID(),
        submissionId: submission.id,
        userId,
        seedFile: USER_PRACTICE_SEED_FILE,
        seedHash,
        exampleId: problem.id,
        exampleTitle: problem.title,
        exampleLevel,
        exampleOrder: problem.level,
        isCorrect,
        score: submission.score,
        maxScore: submission.maxScore,
        createdAt: now,
      })
      .run();

    return {
      problemId,
      submittedSql: input.submittedSql,
      answerSql: problem.answerSql,
      isCorrect,
      feedback: submission.feedback,
      execution,
      answerExecution,
    };
  }

  getMyUserPracticeSubmissions(
    userId: string,
  ): SqlPracticeMySubmissionsResponse {
    return this.getMySubmissionSummary(userId, USER_PRACTICE_SEED_FILE);
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
      .orderBy(
        desc(sqlPracticeNotesTable.pinned),
        desc(sqlPracticeNotesTable.updatedAt),
      )
      .all();
  }

  getNoteById(id: string) {
    return this.databaseService.db
      .select()
      .from(sqlPracticeNotesTable)
      .where(eq(sqlPracticeNotesTable.id, id))
      .get();
  }

  getPublicNoteById(id: string) {
    return this.databaseService.db
      .select({
        id: sqlPracticeNotesTable.id,
        userId: sqlPracticeNotesTable.userId,
        authorName: usersTable.name,
        seedFile: sqlPracticeNotesTable.seedFile,
        exampleId: sqlPracticeNotesTable.exampleId,
        exampleTitle: sqlPracticeNotesTable.exampleTitle,
        tableName: sqlPracticeNotesTable.tableName,
        title: sqlPracticeNotesTable.title,
        content: sqlPracticeNotesTable.content,
        pinned: sqlPracticeNotesTable.pinned,
        isPublic: sqlPracticeNotesTable.isPublic,
        publicToken: sqlPracticeNotesTable.publicToken,
        publicSharedAt: sqlPracticeNotesTable.publicSharedAt,
        orderIdx: sqlPracticeNotesTable.orderIdx,
        createdAt: sqlPracticeNotesTable.createdAt,
        updatedAt: sqlPracticeNotesTable.updatedAt,
      })
      .from(sqlPracticeNotesTable)
      .innerJoin(usersTable, eq(usersTable.id, sqlPracticeNotesTable.userId))
      .where(eq(sqlPracticeNotesTable.id, id))
      .get();
  }

  getPublicNoteByToken(token: string) {
    return this.databaseService.db
      .select({
        id: sqlPracticeNotesTable.id,
        authorName: usersTable.name,
        seedFile: sqlPracticeNotesTable.seedFile,
        exampleId: sqlPracticeNotesTable.exampleId,
        exampleTitle: sqlPracticeNotesTable.exampleTitle,
        tableName: sqlPracticeNotesTable.tableName,
        title: sqlPracticeNotesTable.title,
        content: sqlPracticeNotesTable.content,
        pinned: sqlPracticeNotesTable.pinned,
        isPublic: sqlPracticeNotesTable.isPublic,
        publicToken: sqlPracticeNotesTable.publicToken,
        publicSharedAt: sqlPracticeNotesTable.publicSharedAt,
        orderIdx: sqlPracticeNotesTable.orderIdx,
        createdAt: sqlPracticeNotesTable.createdAt,
        updatedAt: sqlPracticeNotesTable.updatedAt,
      })
      .from(sqlPracticeNotesTable)
      .innerJoin(usersTable, eq(usersTable.id, sqlPracticeNotesTable.userId))
      .where(
        and(
          eq(sqlPracticeNotesTable.publicToken, token),
          eq(sqlPracticeNotesTable.isPublic, true),
        ),
      )
      .get();
  }

  enableNotePublicShare(id: string, userId: string) {
    const note = this.getNoteById(id);
    if (!note) throw new NotFoundException('SQL note not found.');
    if (note.userId !== userId) throw new ForbiddenException('Not authorized.');

    const now = new Date().toISOString();
    const publicToken = note.publicToken ?? randomUUID();

    this.databaseService.db
      .update(sqlPracticeNotesTable)
      .set({
        isPublic: true,
        publicToken,
        publicSharedAt: note.publicSharedAt ?? now,
        updatedAt: now,
      })
      .where(eq(sqlPracticeNotesTable.id, id))
      .run();

    return this.getNoteById(id);
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

  async gradeAndSaveSubmission(
    body: unknown,
    userId: string,
  ): Promise<SqlPracticeGradeSubmissionResponse> {
    const input = gradeSqlPracticeSubmissionSchema.parse(body);
    const syntaxCheck = this.executeSubmittedSqlForGrade(
      input.submittedSql,
      userId,
    );
    let geminiRaw: string | null = null;
    let parsed: {
      validity: SqlGradeValidity | null;
      body: string;
    };

    if (syntaxCheck.success) {
      geminiRaw = await this.callGroq(
        this.buildSqlGradePrompt(input),
        'grading',
      );
      parsed = this.parseSqlGradeResponse(geminiRaw);
    } else {
      parsed = {
        validity: 'incorrect',
        body: `SQL 실행에 실패했습니다.\n\n오류: ${syntaxCheck.message}\n\n문법 오류나 테이블/컬럼 이름, GROUP BY/FROM/ORDER BY 절의 순서를 확인해주세요.`,
      };
    }

    if (!parsed.validity) {
      throw new InternalServerErrorException(
        'Gemini 채점 결과를 판별하지 못했습니다.',
      );
    }

    const now = new Date().toISOString();
    const isCorrect = parsed.validity === 'correct';
    const submission: SqlPracticeSubmission = {
      id: randomUUID(),
      userId,
      seedFile: input.seedFile,
      seedHash: input.seedHash ?? null,
      exampleId: input.exampleId,
      exampleTitle: input.exampleTitle,
      exampleLevel: input.exampleLevel,
      exampleOrder: input.exampleOrder,
      submittedSql: input.submittedSql,
      answerSql: input.answerSql,
      isCorrect,
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      feedback: parsed.body,
      geminiRaw,
      createdAt: now,
    };

    this.databaseService.db
      .insert(sqlPracticeSubmissionsTable)
      .values(submission)
      .run();
    this.databaseService.db
      .insert(sqlPracticeSubmissionLogsTable)
      .values({
        id: randomUUID(),
        submissionId: submission.id,
        userId,
        seedFile: input.seedFile,
        seedHash: input.seedHash ?? null,
        exampleId: input.exampleId,
        exampleTitle: input.exampleTitle,
        exampleLevel: input.exampleLevel,
        exampleOrder: input.exampleOrder,
        isCorrect,
        score: submission.score,
        maxScore: submission.maxScore,
        createdAt: now,
      })
      .run();

    return {
      submission,
      summary: this.getMySubmissionSummary(userId, input.seedFile).summary,
    };
  }

  getMySubmissionSummary(
    userId: string,
    seedFile: string,
  ): SqlPracticeMySubmissionsResponse {
    const parsed = sqlPracticeSubmissionSeedQuerySchema.parse({ seedFile });
    const rows = this.databaseService.db
      .select()
      .from(sqlPracticeSubmissionsTable)
      .where(
        and(
          eq(sqlPracticeSubmissionsTable.userId, userId),
          eq(sqlPracticeSubmissionsTable.seedFile, parsed.seedFile),
        ),
      )
      .orderBy(desc(sqlPracticeSubmissionsTable.createdAt))
      .all();

    const byExample: Record<string, SqlPracticeSubmissionStatus> = {};

    for (const row of rows) {
      const previous = byExample[row.exampleId];
      const bestScore = Math.max(previous?.bestScore ?? 0, row.score);

      byExample[row.exampleId] = {
        exampleId: row.exampleId,
        bestScore,
        isCorrect: bestScore > 0,
        lastSubmittedAt: previous?.lastSubmittedAt ?? row.createdAt,
        lastSubmissionId: previous?.lastSubmissionId ?? row.id,
      };
    }

    const statuses = Object.values(byExample);
    const totalScore = statuses.reduce((sum, item) => sum + item.bestScore, 0);

    return {
      seedFile: parsed.seedFile,
      summary: {
        seedFile: parsed.seedFile,
        totalScore,
        maxScore: statuses.length,
        correctCount: statuses.filter((item) => item.isCorrect).length,
        submittedCount: statuses.length,
      },
      byExample,
    };
  }

  private getPersonalSubmissionStatusByProblemIds(
    userId: string,
    problemIds: string[],
  ): Record<string, SqlPersonalPracticeSubmissionStatus> {
    if (problemIds.length === 0) return {};

    const rows = this.databaseService.db
      .select()
      .from(sqlPersonalPracticeSubmissionsTable)
      .where(
        and(
          eq(sqlPersonalPracticeSubmissionsTable.userId, userId),
          inArray(sqlPersonalPracticeSubmissionsTable.problemId, problemIds),
        ),
      )
      .orderBy(desc(sqlPersonalPracticeSubmissionsTable.createdAt))
      .all();

    const byProblem: Record<string, SqlPersonalPracticeSubmissionStatus> = {};

    for (const row of rows) {
      const previous = byProblem[row.problemId];
      const bestScore = Math.max(previous?.bestScore ?? 0, row.score);

      byProblem[row.problemId] = {
        problemId: row.problemId,
        bestScore,
        isCorrect: bestScore > 0,
        lastSubmittedAt: previous?.lastSubmittedAt ?? row.createdAt,
        lastSubmissionId: previous?.lastSubmissionId ?? row.id,
      };
    }

    return byProblem;
  }

  private getPersonalSubmissionStatus(
    userId: string,
    problemId: string,
  ): SqlPersonalPracticeSubmissionStatus | null {
    return (
      this.getPersonalSubmissionStatusByProblemIds(userId, [problemId])[
        problemId
      ] ?? null
    );
  }

  private recordPersonalPracticeSubmission(input: {
    userId: string;
    problem: {
      id: string;
      workspaceId: string;
      schemaVersionId: string;
      answerSql: string;
    };
    schemaVersion: SqlPersonalPracticeSchemaVersion;
    submittedSql: string;
    result: SqlUserPracticeGradeResponse;
    shareId: string | null;
  }) {
    this.databaseService.db
      .insert(sqlPersonalPracticeSubmissionsTable)
      .values({
        id: randomUUID(),
        userId: input.userId,
        problemId: input.problem.id,
        workspaceId: input.problem.workspaceId,
        schemaVersionId: input.schemaVersion.id,
        shareId: input.shareId,
        submittedSql: input.submittedSql,
        answerSql: input.problem.answerSql,
        isCorrect: input.result.isCorrect,
        score: input.result.isCorrect ? 1 : 0,
        maxScore: 1,
        feedback: input.result.feedback,
        createdAt: new Date().toISOString(),
      })
      .run();
  }

  getMySubmissions(
    query: unknown,
    userId: string,
  ): SqlPracticeMySubmissionsResponse {
    const parsed = sqlPracticeSubmissionSeedQuerySchema.parse(query);
    return this.getMySubmissionSummary(userId, parsed.seedFile);
  }

  getRanking(query: unknown): SqlPracticeRankingResponse {
    const { seedFile } = sqlPracticeSubmissionSeedQuerySchema.parse(query);
    const rows = this.databaseService.db
      .select({
        userId: sqlPracticeSubmissionsTable.userId,
        userName: usersTable.name,
        exampleId: sqlPracticeSubmissionsTable.exampleId,
        score: sqlPracticeSubmissionsTable.score,
        createdAt: sqlPracticeSubmissionsTable.createdAt,
      })
      .from(sqlPracticeSubmissionsTable)
      .leftJoin(
        usersTable,
        eq(sqlPracticeSubmissionsTable.userId, usersTable.id),
      )
      .where(eq(sqlPracticeSubmissionsTable.seedFile, seedFile))
      .all();

    const users = new Map<
      string,
      {
        userName: string;
        examples: Map<string, number>;
        submittedExamples: Set<string>;
        lastSubmittedAt: string;
      }
    >();

    for (const row of rows) {
      const current = users.get(row.userId) ?? {
        userName: row.userName ?? 'Unknown User',
        examples: new Map<string, number>(),
        submittedExamples: new Set<string>(),
        lastSubmittedAt: row.createdAt,
      };

      current.userName = row.userName ?? current.userName;
      current.submittedExamples.add(row.exampleId);
      current.examples.set(
        row.exampleId,
        Math.max(current.examples.get(row.exampleId) ?? 0, row.score),
      );
      if (row.createdAt > current.lastSubmittedAt) {
        current.lastSubmittedAt = row.createdAt;
      }
      users.set(row.userId, current);
    }

    const ranked = [...users.entries()]
      .map(([userId, item]) => {
        const scores = [...item.examples.values()];
        const totalScore = scores.reduce((sum, score) => sum + score, 0);

        return {
          rank: 0,
          userId,
          userName: item.userName,
          totalScore,
          correctCount: scores.filter((score) => score > 0).length,
          submittedCount: item.submittedExamples.size,
          lastSubmittedAt: item.lastSubmittedAt,
        };
      })
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (a.lastSubmittedAt !== b.lastSubmittedAt) {
          return a.lastSubmittedAt.localeCompare(b.lastSubmittedAt);
        }
        return a.userName.localeCompare(b.userName);
      });

    let previousScore: number | null = null;
    let previousRank = 0;

    const rankings = ranked.map((item, index) => {
      const rank = previousScore === item.totalScore ? previousRank : index + 1;
      previousScore = item.totalScore;
      previousRank = rank;
      return { ...item, rank };
    });

    return { seedFile, rankings };
  }

  getRecentActivity(query: unknown): SqlPracticeActivityResponse {
    const { seedFile, limit } =
      sqlPracticeSubmissionActivityQuerySchema.parse(query);
    const rows = this.databaseService.db
      .select({
        id: sqlPracticeSubmissionLogsTable.id,
        userId: sqlPracticeSubmissionLogsTable.userId,
        userName: usersTable.name,
        seedFile: sqlPracticeSubmissionLogsTable.seedFile,
        exampleId: sqlPracticeSubmissionLogsTable.exampleId,
        exampleTitle: sqlPracticeSubmissionLogsTable.exampleTitle,
        exampleLevel: sqlPracticeSubmissionLogsTable.exampleLevel,
        exampleOrder: sqlPracticeSubmissionLogsTable.exampleOrder,
        isCorrect: sqlPracticeSubmissionLogsTable.isCorrect,
        score: sqlPracticeSubmissionLogsTable.score,
        maxScore: sqlPracticeSubmissionLogsTable.maxScore,
        createdAt: sqlPracticeSubmissionLogsTable.createdAt,
      })
      .from(sqlPracticeSubmissionLogsTable)
      .leftJoin(
        usersTable,
        eq(sqlPracticeSubmissionLogsTable.userId, usersTable.id),
      )
      .where(eq(sqlPracticeSubmissionLogsTable.seedFile, seedFile))
      .orderBy(desc(sqlPracticeSubmissionLogsTable.createdAt))
      .limit(limit)
      .all();

    return {
      seedFile,
      activities: rows.map((row) => ({
        ...row,
        userName: row.userName ?? 'Unknown User',
      })),
    };
  }

  getMyRecentActivity(
    query: unknown,
    userId: string,
  ): SqlPracticeActivityResponse {
    const { seedFile, limit } =
      sqlPracticeSubmissionActivityQuerySchema.parse(query);
    const rows = this.databaseService.db
      .select({
        id: sqlPracticeSubmissionLogsTable.id,
        userId: sqlPracticeSubmissionLogsTable.userId,
        userName: usersTable.name,
        seedFile: sqlPracticeSubmissionLogsTable.seedFile,
        exampleId: sqlPracticeSubmissionLogsTable.exampleId,
        exampleTitle: sqlPracticeSubmissionLogsTable.exampleTitle,
        exampleLevel: sqlPracticeSubmissionLogsTable.exampleLevel,
        exampleOrder: sqlPracticeSubmissionLogsTable.exampleOrder,
        isCorrect: sqlPracticeSubmissionLogsTable.isCorrect,
        score: sqlPracticeSubmissionLogsTable.score,
        maxScore: sqlPracticeSubmissionLogsTable.maxScore,
        createdAt: sqlPracticeSubmissionLogsTable.createdAt,
      })
      .from(sqlPracticeSubmissionLogsTable)
      .leftJoin(
        usersTable,
        eq(sqlPracticeSubmissionLogsTable.userId, usersTable.id),
      )
      .where(
        and(
          eq(sqlPracticeSubmissionLogsTable.userId, userId),
          eq(sqlPracticeSubmissionLogsTable.seedFile, seedFile),
        ),
      )
      .orderBy(desc(sqlPracticeSubmissionLogsTable.createdAt))
      .limit(limit)
      .all();

    return {
      seedFile,
      activities: rows.map((row) => ({
        ...row,
        userName: row.userName ?? 'Unknown User',
      })),
    };
  }

  deleteMyActivityLog(id: string, userId: string) {
    const row = this.databaseService.db
      .select({
        seedFile: sqlPracticeSubmissionLogsTable.seedFile,
      })
      .from(sqlPracticeSubmissionLogsTable)
      .where(
        and(
          eq(sqlPracticeSubmissionLogsTable.id, id),
          eq(sqlPracticeSubmissionLogsTable.userId, userId),
        ),
      )
      .get();

    if (!row)
      throw new NotFoundException('SQL practice activity log not found.');

    this.databaseService.db
      .delete(sqlPracticeSubmissionLogsTable)
      .where(eq(sqlPracticeSubmissionLogsTable.id, id))
      .run();

    return {
      seedFile: row.seedFile,
      deletedCount: 1,
    };
  }

  clearMyActivityLogs(query: unknown, userId: string) {
    const { seedFile } = sqlPracticeSubmissionSeedQuerySchema.parse(query);
    const result = this.databaseService.db
      .delete(sqlPracticeSubmissionLogsTable)
      .where(
        and(
          eq(sqlPracticeSubmissionLogsTable.userId, userId),
          eq(sqlPracticeSubmissionLogsTable.seedFile, seedFile),
        ),
      )
      .run();

    return {
      seedFile,
      deletedCount: result.changes,
    };
  }

  private executeSubmittedSqlForGrade(
    query: string,
    userId: string,
  ): {
    success: boolean;
    message: string;
  } {
    const start = Date.now();

    try {
      const { query: sanitizedQuery, type } = sanitizeSql(
        query,
        this.getMaxQueryLength(),
      );

      if (type !== 'SELECT') {
        return {
          success: false,
          message: '답안 제출은 SELECT/WITH 조회 쿼리만 허용됩니다.',
        };
      }

      const freshness = this.ensureDatabaseFresh(userId);
      const db = this.openDatabase(userId);

      try {
        const response = this.executeReader(
          db,
          sanitizedQuery,
          type,
          start,
          freshness.seedReloaded,
        );
        return {
          success: response.success,
          message: response.message,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error ? error.message : 'SQL execution failed.',
        };
      } finally {
        db.close();
      }
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'SQL validation failed.',
      };
    }
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

    for (const row of statement.iterate() as Iterable<
      Record<string, unknown>
    >) {
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

  private ensureDatabaseFresh(
    userId: string,
    activeSeed = this.resolveActiveSeedFile(userId),
  ): Freshness {
    const seedHash = this.getSeedHash(activeSeed);
    const dbFile = this.getDatabaseFile(userId);
    const seedState = this.readSeedState(userId);

    if (
      !existsSync(dbFile) ||
      seedState?.seedHash !== seedHash ||
      seedState?.source !== activeSeed.source ||
      seedState?.fileName !== activeSeed.fileName
    ) {
      const loadedHash = this.rebuildDatabase(userId, seedHash, activeSeed);
      const nextState = this.readSeedState(userId);
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

  private rebuildDatabase(
    userId: string,
    currentHash?: string,
    activeSeed = this.resolveActiveSeedFile(userId),
  ) {
    const dbFile = this.getDatabaseFile(userId);
    mkdirSync(dirname(dbFile), { recursive: true });

    for (const file of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) {
      if (existsSync(file)) {
        rmSync(file, { force: true });
      }
    }

    const db = this.openDatabase(userId);

    try {
      const seedSql = readFileSync(activeSeed.filePath, 'utf8');
      const seedHash = currentHash ?? this.hashSql(seedSql);
      if (!seedSql.trim()) {
        throw new InternalServerErrorException(
          `${activeSeed.fileName} is empty.`,
        );
      }
      db.exec(seedSql);
      this.writeSeedState(userId, {
        seedHash,
        loadedAt: new Date().toISOString(),
        source: activeSeed.source,
        fileName: activeSeed.fileName,
      });
      return seedHash;
    } catch (error) {
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'Failed to initialize SQL practice database.',
      );
    } finally {
      db.close();
    }
  }

  private openDatabase(userId: string) {
    const db = new Database(this.getDatabaseFile(userId));
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

  private getActiveSeedSummary(userId: string, seedHash?: string) {
    const activeSeed = this.resolveActiveSeedFile(userId);
    return this.buildSeedSummary(activeSeed, activeSeed, seedHash);
  }

  private scanSeedDirectory(
    source: SqlPracticeSeedSource,
    activeSeed: ResolvedSeed,
  ) {
    const seedDir =
      source === 'builtin'
        ? this.getBuiltinSeedDir()
        : this.getUploadedSeedDir();
    if (!existsSync(seedDir)) return [];

    const fileNames = readdirSync(seedDir)
      .filter((fileName) => seedFileNameSchema.safeParse(fileName).success)
      .filter((fileName) => statSync(join(seedDir, fileName)).isFile())
      .sort((a, b) => a.localeCompare(b));

    const hasNumberedBuiltinSeeds =
      source === 'builtin' &&
      fileNames.some((fileName) => /^\d{2}_/.test(fileName));

    return fileNames
      .filter(
        (fileName) =>
          !(hasNumberedBuiltinSeeds && fileName === LEGACY_SEED_FILE),
      )
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

  private buildSeedSummary(
    seed: ResolvedSeed,
    activeSeed: ResolvedSeed,
    hashOverride?: string,
  ) {
    const sql = readFileSync(seed.filePath, 'utf8');
    const stats = statSync(seed.filePath);
    const meta = this.parseSeedMeta(sql, seed.fileName);

    return {
      ...meta,
      source: seed.source,
      fileName: seed.fileName,
      hash: hashOverride ?? this.hashSql(sql),
      sizeBytes: stats.size,
      updatedAt: Number.isFinite(stats.mtimeMs)
        ? stats.mtime.toISOString()
        : null,
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
    const tables =
      this.parseMetaList(rawMeta.tables) ?? this.extractTableNames(sql);

    return {
      title,
      slug: rawMeta.slug?.trim() || this.toFallbackSlug(fileName),
      level: this.parseSeedLevel(rawMeta.level),
      description:
        rawMeta.description?.trim() || `${title} SQL 연습 파일입니다.`,
      topics: this.parseMetaList(rawMeta.topics) ?? [],
      tables,
      recommendedQueries: this.parseRecommendedQueries(
        rawMeta.recommendedQueries,
      ),
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
        error instanceof Error
          ? error.message
          : `Failed to validate ${fileName}.`,
      );
    } finally {
      db.close();
    }
  }

  private resolveActiveSeedFile(userId: string): ResolvedSeed {
    const activeState = this.readActiveSeedState(userId);
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
      builtinFileNames.find(
        (candidate) => candidate === DEFAULT_BUILTIN_SEED_FILE,
      ) ??
      builtinFileNames.find((candidate) => candidate === LEGACY_SEED_FILE) ??
      builtinFileNames[0] ??
      DEFAULT_BUILTIN_SEED_FILE;

    return this.resolveSeedFile('builtin', fileName);
  }

  private resolveSeedFile(
    source: SqlPracticeSeedSource,
    fileName: string,
  ): ResolvedSeed {
    const parsed = seedFileNameSchema.safeParse(fileName);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Invalid SQL seed file.',
      );
    }

    const seedDir =
      source === 'builtin'
        ? this.getBuiltinSeedDir()
        : this.getUploadedSeedDir();
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

  private getUserPracticeSeed(): ResolvedSeed {
    const seedFile = join(
      this.getUserPracticeSeedDir(),
      USER_PRACTICE_SEED_FILE,
    );
    if (!existsSync(seedFile) || !statSync(seedFile).isFile()) {
      throw new InternalServerErrorException(
        `SQL user practice seed file not found: ${seedFile}`,
      );
    }

    return {
      source: 'builtin',
      fileName: USER_PRACTICE_SEED_FILE,
      filePath: seedFile,
    };
  }

  private getUserPracticeSeedDir() {
    const candidates = [
      join(__dirname, 'user-seeds'),
      join(process.cwd(), 'src/sql-practice/user-seeds'),
      join(process.cwd(), 'dist/sql-practice/user-seeds'),
      join(process.cwd(), 'dist/src/sql-practice/user-seeds'),
    ];

    return (
      candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
    );
  }

  private ensureUserPracticeSchema(): SqlUserPracticeSchema {
    const existing = this.databaseService.db
      .select()
      .from(sqlUserPracticeSchemasTable)
      .where(eq(sqlUserPracticeSchemasTable.isActive, true))
      .orderBy(desc(sqlUserPracticeSchemasTable.version))
      .get();

    if (existing) {
      return this.toUserPracticeSchema(existing);
    }

    const seed = this.getUserPracticeSeed();
    const schemaSql = readFileSync(seed.filePath, 'utf8');
    const erdFile = join(this.getUserPracticeSeedDir(), 'user_commerce.mmd');
    const id = randomUUID();
    const now = new Date().toISOString();

    this.databaseService.db
      .insert(sqlUserPracticeSchemasTable)
      .values({
        id,
        title: '유저 커머스 운영 DB',
        description:
          '유저가 직접 SQL 문제를 출제하고 풀기 위한 공용 커머스 운영 DB입니다.',
        schemaSql,
        erdMmd: existsSync(erdFile) ? readFileSync(erdFile, 'utf8') : null,
        dbFileHash: this.hashSql(schemaSql),
        sourceType: 'seed',
        replacedFromSchemaId: null,
        version: 1,
        createdBy: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const created = this.databaseService.db
      .select()
      .from(sqlUserPracticeSchemasTable)
      .where(eq(sqlUserPracticeSchemasTable.id, id))
      .get();

    if (!created) {
      throw new InternalServerErrorException(
        'Failed to initialize SQL user practice schema.',
      );
    }

    return this.toUserPracticeSchema(created);
  }

  private toUserPracticeSchema(
    row: typeof sqlUserPracticeSchemasTable.$inferSelect,
  ): SqlUserPracticeSchema {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      version: row.version,
      dbFileHash: row.dbFileHash,
      sourceType: row.sourceType,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private getUserPracticeRuntimeUserId(userId: string) {
    return `${USER_PRACTICE_RUNTIME_SCOPE}:${userId}`;
  }

  private ensureDefaultPersonalWorkspace(
    userId: string,
  ): SqlPersonalPracticeWorkspace {
    const existing = this.databaseService.db
      .select()
      .from(sqlPersonalPracticeWorkspacesTable)
      .where(eq(sqlPersonalPracticeWorkspacesTable.ownerId, userId))
      .orderBy(desc(sqlPersonalPracticeWorkspacesTable.updatedAt))
      .get();

    if (existing) {
      const workspace = this.toPersonalWorkspace(existing);
      if (!workspace.activeSchemaVersionId) {
        this.createInitialPersonalSchemaVersion(workspace.id, userId);
        return this.assertPersonalWorkspaceOwner(workspace.id, userId);
      }
      return workspace;
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const ownerName =
      this.databaseService.db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .get()?.name ?? '나';
    this.databaseService.db
      .insert(sqlPersonalPracticeWorkspacesTable)
      .values({
        id,
        ownerId: userId,
        title: `${ownerName}의 SQL 연습장`,
        description: '개인 SQL 문제를 만들고 공유하는 연습장입니다.',
        activeSchemaVersionId: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    this.createInitialPersonalSchemaVersion(id, userId);
    return this.assertPersonalWorkspaceOwner(id, userId);
  }

  private createInitialPersonalSchemaVersion(
    workspaceId: string,
    userId: string,
  ) {
    const seed = this.getUserPracticeSeed();
    const schemaSql = readFileSync(seed.filePath, 'utf8');
    const erdFile = join(this.getUserPracticeSeedDir(), 'user_commerce.mmd');
    const id = randomUUID();
    const now = new Date().toISOString();

    this.databaseService.db
      .insert(sqlPersonalPracticeSchemaVersionsTable)
      .values({
        id,
        workspaceId,
        version: 1,
        title: '개인 커머스 운영 DB',
        description: '개인 SQL 문제 출제를 위한 기본 커머스 DB입니다.',
        schemaSql,
        erdMmd: existsSync(erdFile) ? readFileSync(erdFile, 'utf8') : null,
        dbFileHash: this.hashSql(schemaSql),
        sourceType: 'seed',
        sourceFileName: seed.fileName,
        replacedFromSchemaVersionId: null,
        createdBy: userId,
        createdAt: now,
      })
      .run();

    this.databaseService.db
      .update(sqlPersonalPracticeWorkspacesTable)
      .set({ activeSchemaVersionId: id, updatedAt: now })
      .where(eq(sqlPersonalPracticeWorkspacesTable.id, workspaceId))
      .run();
  }

  private assertPersonalWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): SqlPersonalPracticeWorkspace {
    const workspace = this.getPersonalWorkspaceById(workspaceId);
    if (!workspace)
      throw new NotFoundException('SQL personal workspace not found.');
    if (workspace.ownerId !== userId)
      throw new ForbiddenException('Not authorized.');
    return workspace;
  }

  private getPersonalWorkspaceById(
    workspaceId: string,
  ): SqlPersonalPracticeWorkspace | null {
    const workspace = this.databaseService.db
      .select()
      .from(sqlPersonalPracticeWorkspacesTable)
      .where(eq(sqlPersonalPracticeWorkspacesTable.id, workspaceId))
      .get();
    return workspace ? this.toPersonalWorkspace(workspace) : null;
  }

  private getActivePersonalSchemaVersion(
    workspaceId: string,
  ): SqlPersonalPracticeSchemaVersion {
    const workspace = this.getPersonalWorkspaceById(workspaceId);
    if (!workspace)
      throw new NotFoundException('SQL personal workspace not found.');
    if (!workspace.activeSchemaVersionId) {
      throw new InternalServerErrorException(
        'Active personal schema version is missing.',
      );
    }
    return this.getPersonalSchemaVersion(workspace.activeSchemaVersionId);
  }

  private getPersonalSchemaVersion(
    id: string,
  ): SqlPersonalPracticeSchemaVersion {
    const row = this.databaseService.db
      .select()
      .from(sqlPersonalPracticeSchemaVersionsTable)
      .where(eq(sqlPersonalPracticeSchemaVersionsTable.id, id))
      .get();
    if (!row)
      throw new NotFoundException('SQL personal schema version not found.');
    return this.toPersonalSchemaVersion(row);
  }

  private buildPersonalPracticeSeed(
    schemaVersion: SqlPersonalPracticeSchemaVersion & { schemaSql?: string },
  ): ResolvedSeed {
    const schemaSql =
      schemaVersion.schemaSql ??
      this.databaseService.db
        .select({ schemaSql: sqlPersonalPracticeSchemaVersionsTable.schemaSql })
        .from(sqlPersonalPracticeSchemaVersionsTable)
        .where(eq(sqlPersonalPracticeSchemaVersionsTable.id, schemaVersion.id))
        .get()?.schemaSql;
    if (!schemaSql) {
      throw new InternalServerErrorException('Personal schema SQL is missing.');
    }

    const seedDir = this.getPersonalPracticeSeedDir();
    mkdirSync(seedDir, { recursive: true });
    const fileName = `${schemaVersion.id}.sql`;
    const filePath = join(seedDir, fileName);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, schemaSql);
    }

    return {
      source: 'uploaded',
      fileName,
      filePath,
    };
  }

  private removePersonalPracticeSeedFile(schemaVersionId: string) {
    const filePath = join(
      this.getPersonalPracticeSeedDir(),
      `${schemaVersionId}.sql`,
    );
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }

  private getPersonalPracticeSeedDir() {
    const configured =
      this.configService.get<string>('SQL_PERSONAL_PRACTICE_SCHEMA_DIR') ??
      './data/sql-practice/personal-schema-versions';
    return isAbsolute(configured)
      ? configured
      : join(process.cwd(), configured);
  }

  private getPersonalPracticeRuntimeUserId(
    workspaceId: string,
    schemaVersionId: string,
    userId: string,
  ) {
    return `${PERSONAL_PRACTICE_RUNTIME_SCOPE}:${workspaceId}:${schemaVersionId}:${userId}`;
  }

  private getPublicPersonalPracticeRuntimeUserId(
    token: string,
    schemaVersionId: string,
  ) {
    return `${PUBLIC_PERSONAL_PRACTICE_RUNTIME_SCOPE}:${schemaVersionId}:${token}`;
  }

  private getPersonalPracticeTablesForSchema(
    workspaceId: string,
    schemaVersion: SqlPersonalPracticeSchemaVersion,
    runtimeUserId: string,
  ): TableInfo[] {
    const seed = this.buildPersonalPracticeSeed(schemaVersion);
    this.ensureDatabaseFresh(runtimeUserId, seed);
    const db = this.openDatabase(runtimeUserId);

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

  private getPersonalPracticeProblemRow(workspaceId: string, id: string) {
    return this.databaseService.db
      .select({
        id: sqlPersonalPracticeProblemsTable.id,
        workspaceId: sqlPersonalPracticeProblemsTable.workspaceId,
        schemaVersionId: sqlPersonalPracticeProblemsTable.schemaVersionId,
        title: sqlPersonalPracticeProblemsTable.title,
        description: sqlPersonalPracticeProblemsTable.description,
        level: sqlPersonalPracticeProblemsTable.level,
        targetTables: sqlPersonalPracticeProblemsTable.targetTables,
        starterSql: sqlPersonalPracticeProblemsTable.starterSql,
        answerSql: sqlPersonalPracticeProblemsTable.answerSql,
        explanation: sqlPersonalPracticeProblemsTable.explanation,
        status: sqlPersonalPracticeProblemsTable.status,
        createdBy: sqlPersonalPracticeProblemsTable.createdBy,
        authorName: usersTable.name,
        shareToken: sqlPersonalPracticeSharesTable.token,
        shareEnabled: sqlPersonalPracticeSharesTable.enabled,
        createdAt: sqlPersonalPracticeProblemsTable.createdAt,
        updatedAt: sqlPersonalPracticeProblemsTable.updatedAt,
      })
      .from(sqlPersonalPracticeProblemsTable)
      .innerJoin(
        usersTable,
        eq(usersTable.id, sqlPersonalPracticeProblemsTable.createdBy),
      )
      .leftJoin(
        sqlPersonalPracticeSharesTable,
        and(
          eq(
            sqlPersonalPracticeSharesTable.problemId,
            sqlPersonalPracticeProblemsTable.id,
          ),
          eq(sqlPersonalPracticeSharesTable.enabled, true),
        ),
      )
      .where(
        and(
          eq(sqlPersonalPracticeProblemsTable.workspaceId, workspaceId),
          eq(sqlPersonalPracticeProblemsTable.id, id),
        ),
      )
      .get();
  }

  private getEnabledPersonalShareByToken(token: string) {
    return this.databaseService.db
      .select()
      .from(sqlPersonalPracticeSharesTable)
      .where(
        and(
          eq(sqlPersonalPracticeSharesTable.token, token),
          eq(sqlPersonalPracticeSharesTable.enabled, true),
        ),
      )
      .get();
  }

  private validatePersonalProblemTables(
    tableNames: string[],
    workspaceId: string,
    schemaVersion: SqlPersonalPracticeSchemaVersion,
    runtimeUserId: string,
  ) {
    if (tableNames.length === 0) return;
    const tables = this.getPersonalPracticeTablesForSchema(
      workspaceId,
      schemaVersion,
      runtimeUserId,
    );
    const existingTables = new Set(tables.map((table) => table.tableName));
    const invalidTable = tableNames.find(
      (tableName) => !existingTables.has(tableName),
    );

    if (invalidTable) {
      throw new BadRequestException(`Unknown target table: ${invalidTable}`);
    }
  }

  private validatePersonalAnswerSql(
    answerSql: string,
    workspaceId: string,
    schemaVersion: SqlPersonalPracticeSchemaVersion,
    runtimeUserId: string,
  ) {
    const { query, type } = sanitizeSql(answerSql, this.getMaxQueryLength());
    if (type !== 'SELECT') {
      throw new BadRequestException(
        '정답 SQL은 SELECT/WITH 조회 쿼리만 허용됩니다.',
      );
    }

    const seed = this.buildPersonalPracticeSeed(schemaVersion);
    this.ensureDatabaseFresh(runtimeUserId, seed);
    const db = this.openDatabase(runtimeUserId);

    try {
      db.prepare(query).all();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : '정답 SQL을 실행할 수 없습니다.',
      );
    } finally {
      db.close();
    }
  }

  private buildPersonalPracticeAnswerPrompt(
    workspaceId: string,
    schemaVersion: SqlPersonalPracticeSchemaVersion,
    input: GenerateSqlUserPracticeAnswerInput,
    runtimeUserId: string,
  ) {
    const tables = this.getPersonalPracticeTablesForSchema(
      workspaceId,
      schemaVersion,
      runtimeUserId,
    );
    const relatedTables =
      input.targetTables.length > 0
        ? input.targetTables
        : tables.map((table) => table.tableName);
    const requested = new Set(relatedTables);
    const contextTables = tables.filter((table) =>
      requested.has(table.tableName),
    );
    const tableSummaries = (contextTables.length > 0 ? contextTables : tables)
      .map((table) => {
        const columns = table.columns
          .map((column) => {
            const flags = [
              column.primaryKey ? 'PK' : '',
              column.notNull ? 'NOT NULL' : '',
            ].filter(Boolean);
            const flagText = flags.length ? ` (${flags.join(', ')})` : '';
            return `- ${column.name} ${column.type}${flagText}`;
          })
          .join('\n');
        return `table ${table.tableName} (${table.rowCount} rows)\n${columns}`;
      })
      .join('\n\n');

    return `개인 SQL 연습 문제에 맞는 정답 SQL을 생성해주세요.

반드시 아래 형식만 출력하세요. 다른 설명, Markdown, code fence는 쓰지 마세요.

[SQL]
SELECT ...

[EXPLANATION]
한국어 해설 한 문장

[문제 제목]
${input.title ?? '(제목 없음)'}

[문제 설명]
${input.description}

[난이도]
Level ${input.level}

[관련 테이블]
${relatedTables.join(', ')}

[테이블 스키마]
${tableSummaries}

[생성 규칙]
- SQLite 문법만 사용하세요.
- SELECT 또는 WITH로 시작하는 조회 쿼리만 생성하세요.
- 문제 설명을 만족하는 가장 단순하고 명확한 정답 SQL을 생성하세요.
- INSERT, UPDATE, DELETE, CREATE, DROP, ALTER는 절대 사용하지 마세요.
- 테이블과 컬럼은 제공된 스키마에 있는 이름만 사용하세요.`;
  }

  private gradePersonalProblemWithSchema(
    problem: {
      id: string;
      answerSql: string;
    },
    schemaVersion: SqlPersonalPracticeSchemaVersion,
    submittedSql: string,
    runtimeUserId: string,
  ): SqlUserPracticeGradeResponse {
    const execution = this.executePersonalPracticeSelectForGrade(
      submittedSql,
      schemaVersion,
      runtimeUserId,
    );

    if (!execution.success) {
      return {
        problemId: problem.id,
        submittedSql,
        answerSql: problem.answerSql,
        isCorrect: false,
        feedback: `SQL 실행에 실패했습니다.\n\n${execution.message}`,
        execution,
        answerExecution: null,
      };
    }

    const answerExecution = this.executePersonalPracticeSelectForGrade(
      problem.answerSql,
      schemaVersion,
      runtimeUserId,
    );

    if (!answerExecution.success) {
      throw new InternalServerErrorException(
        `저장된 정답 SQL을 실행할 수 없습니다. ${answerExecution.message}`,
      );
    }

    const isCorrect = this.isSameSqlResult(execution, answerExecution);
    return {
      problemId: problem.id,
      submittedSql,
      answerSql: problem.answerSql,
      isCorrect,
      feedback: isCorrect
        ? '정답입니다. 제출 SQL과 정답 SQL의 실행 결과가 동일합니다.'
        : '오답입니다. 제출 SQL과 정답 SQL의 실행 결과가 다릅니다. 조회 컬럼, 행, 정렬 조건을 확인해주세요.',
      execution,
      answerExecution,
    };
  }

  private executePersonalPracticeSelectForGrade(
    query: string,
    schemaVersion: SqlPersonalPracticeSchemaVersion,
    runtimeUserId: string,
  ): SqlExecuteResponse {
    const start = Date.now();

    try {
      const { query: sanitizedQuery, type } = sanitizeSql(
        query,
        this.getMaxQueryLength(),
      );

      if (type !== 'SELECT') {
        return {
          success: false,
          type,
          columns: null,
          rows: null,
          affectedRows: 0,
          message: '답안 제출은 SELECT/WITH 조회 쿼리만 허용됩니다.',
          executionTimeMs: Date.now() - start,
          schemaChanged: false,
        };
      }

      const seed = this.buildPersonalPracticeSeed(schemaVersion);
      const freshness = this.ensureDatabaseFresh(runtimeUserId, seed);
      const db = this.openDatabase(runtimeUserId);

      try {
        return this.executeReader(
          db,
          sanitizedQuery,
          type,
          start,
          freshness.seedReloaded,
        );
      } catch (error) {
        return {
          success: false,
          type,
          columns: null,
          rows: null,
          affectedRows: 0,
          message:
            error instanceof Error ? error.message : 'SQL execution failed.',
          executionTimeMs: Date.now() - start,
          schemaChanged: false,
          seedReloaded: freshness.seedReloaded,
        };
      } finally {
        db.close();
      }
    } catch (error) {
      return {
        success: false,
        type: 'OTHER',
        columns: null,
        rows: null,
        affectedRows: 0,
        message:
          error instanceof Error ? error.message : 'SQL validation failed.',
        executionTimeMs: Date.now() - start,
        schemaChanged: false,
      };
    }
  }

  private executePersonalPracticeTablePreview(
    tableName: string,
    schemaVersion: SqlPersonalPracticeSchemaVersion,
    runtimeUserId: string,
  ): SqlExecuteResponse {
    const start = Date.now();
    const seed = this.buildPersonalPracticeSeed(schemaVersion);
    const freshness = this.ensureDatabaseFresh(runtimeUserId, seed);
    const db = this.openDatabase(runtimeUserId);

    try {
      this.ensureTableExists(db, tableName);
      return this.executeReader(
        db,
        `SELECT * FROM ${quoteIdentifier(tableName)} LIMIT 50`,
        'SELECT',
        start,
        freshness.seedReloaded,
      );
    } finally {
      db.close();
    }
  }

  private validateUploadedPersonalSqlFile(
    file: UploadedSqlFile | undefined,
  ): string {
    if (!file) {
      throw new BadRequestException('SQL 파일을 선택해주세요.');
    }

    if (!file.originalname.toLowerCase().endsWith('.sql')) {
      throw new BadRequestException('.sql 파일만 업로드할 수 있습니다.');
    }

    if (file.size > PERSONAL_SCHEMA_UPLOAD_MAX_BYTES) {
      throw new BadRequestException(
        'SQL 파일은 2MB 이하만 업로드할 수 있습니다.',
      );
    }

    const schemaSql = file.buffer.toString('utf8');
    if (!schemaSql.trim()) {
      throw new BadRequestException('SQL 파일이 비어 있습니다.');
    }

    return schemaSql;
  }

  private validatePersonalSchemaSql(schemaSql: string) {
    const upperSql = schemaSql.toUpperCase();
    const blockedPatterns = [
      /\bATTACH\b/,
      /\bDETACH\b/,
      /\bLOAD_EXTENSION\b/,
      /\bWRITABLE_SCHEMA\b/,
      /^\s*\.(READ|SHELL|OPEN|LOAD)\b/m,
    ];

    if (blockedPatterns.some((pattern) => pattern.test(upperSql))) {
      throw new BadRequestException(
        '허용되지 않는 SQL 구문이 포함되어 있습니다.',
      );
    }
  }

  private getNextPersonalSchemaVersion(workspaceId: string) {
    const latest = this.databaseService.db
      .select({ version: sqlPersonalPracticeSchemaVersionsTable.version })
      .from(sqlPersonalPracticeSchemaVersionsTable)
      .where(
        eq(sqlPersonalPracticeSchemaVersionsTable.workspaceId, workspaceId),
      )
      .orderBy(desc(sqlPersonalPracticeSchemaVersionsTable.version))
      .limit(1)
      .get();

    return (latest?.version ?? 0) + 1;
  }

  private removeRuntimeDatabase(runtimeUserId: string) {
    const dbFile = this.getDatabaseFile(runtimeUserId);
    for (const file of [
      dbFile,
      `${dbFile}-wal`,
      `${dbFile}-shm`,
      this.getSeedStateFile(runtimeUserId),
    ]) {
      if (existsSync(file)) {
        rmSync(file, { force: true });
      }
    }
  }

  private toPersonalWorkspace(
    row: typeof sqlPersonalPracticeWorkspacesTable.$inferSelect,
  ): SqlPersonalPracticeWorkspace {
    return {
      id: row.id,
      ownerId: row.ownerId,
      title: row.title,
      description: row.description,
      activeSchemaVersionId: row.activeSchemaVersionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toPersonalSchemaVersion(
    row: typeof sqlPersonalPracticeSchemaVersionsTable.$inferSelect,
  ): SqlPersonalPracticeSchemaVersion {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      version: row.version,
      title: row.title,
      description: row.description,
      erdMmd: row.erdMmd,
      dbFileHash: row.dbFileHash,
      sourceType: row.sourceType,
      sourceFileName: row.sourceFileName,
      replacedFromSchemaVersionId: row.replacedFromSchemaVersionId,
      createdAt: row.createdAt,
    };
  }

  private toPersonalProblem(
    row: {
      id: string;
      workspaceId: string;
      schemaVersionId: string;
      title: string;
      description: string;
      level: number;
      targetTables: string[];
      starterSql: string | null;
      answerSql: string;
      explanation: string | null;
      status: 'draft' | 'published' | 'archived';
      createdBy: string;
      authorName: string | null;
      shareToken: string | null;
      shareEnabled: boolean | null;
      createdAt: string;
      updatedAt: string;
    },
    submissionStatus: SqlPersonalPracticeSubmissionStatus | null = null,
  ): SqlPersonalPracticeProblem {
    return {
      id: row.id,
      workspaceId: row.workspaceId,
      schemaVersionId: row.schemaVersionId,
      title: row.title,
      description: row.description,
      level: row.level,
      targetTables: row.targetTables,
      starterSql: row.starterSql,
      answerSql: row.answerSql,
      explanation: row.explanation,
      status: row.status,
      createdBy: row.createdBy,
      authorName: row.authorName,
      shareToken: row.shareToken,
      shareEnabled: Boolean(row.shareEnabled),
      submissionStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toPersonalShare(
    row: typeof sqlPersonalPracticeSharesTable.$inferSelect,
  ): SqlPersonalPracticeShare {
    return {
      id: row.id,
      problemId: row.problemId,
      workspaceId: row.workspaceId,
      schemaVersionId: row.schemaVersionId,
      token: row.token,
      enabled: row.enabled,
      createdAt: row.createdAt,
      disabledAt: row.disabledAt,
    };
  }

  private validateProblemTables(tableNames: string[], userId: string) {
    if (tableNames.length === 0) return;

    const existingTables = new Set(
      this.getUserPracticeTables(userId).map((table) => table.tableName),
    );
    const invalidTable = tableNames.find(
      (tableName) => !existingTables.has(tableName),
    );

    if (invalidTable) {
      throw new BadRequestException(`Unknown target table: ${invalidTable}`);
    }
  }

  private validateAnswerSql(answerSql: string, userId: string) {
    const { query, type } = sanitizeSql(answerSql, this.getMaxQueryLength());
    if (type !== 'SELECT') {
      throw new BadRequestException(
        '정답 SQL은 SELECT/WITH 조회 쿼리만 허용됩니다.',
      );
    }

    const runtimeUserId = this.getUserPracticeRuntimeUserId(userId);
    const activeSeed = this.getUserPracticeSeed();
    this.ensureDatabaseFresh(runtimeUserId, activeSeed);
    const db = this.openDatabase(runtimeUserId);

    try {
      db.prepare(query).all();
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : '정답 SQL을 실행할 수 없습니다.',
      );
    } finally {
      db.close();
    }
  }

  private buildUserPracticeAnswerPrompt(
    input: GenerateSqlUserPracticeAnswerInput,
    userId: string,
  ) {
    const relatedTables =
      input.targetTables.length > 0
        ? input.targetTables
        : this.getUserPracticeTables(userId).map((table) => table.tableName);
    const tableSummaries = this.getUserPracticeTablePromptContext(
      userId,
      relatedTables,
    );

    return `유저가 만든 SQL 연습 문제에 맞는 정답 SQL을 생성해주세요.

반드시 아래 형식만 출력하세요. 다른 설명, Markdown, code fence는 쓰지 마세요.

[SQL]
SELECT ...

[EXPLANATION]
한국어 해설 한 문장

[문제 제목]
${input.title ?? '(제목 없음)'}

[문제 설명]
${input.description}

[난이도]
Level ${input.level}

[관련 테이블]
${relatedTables.join(', ')}

[테이블 스키마]
${tableSummaries}

[생성 규칙]
- SQLite 문법만 사용하세요.
- SELECT 또는 WITH로 시작하는 조회 쿼리만 생성하세요.
- 문제 설명을 만족하는 가장 단순하고 명확한 정답 SQL을 생성하세요.
- INSERT, UPDATE, DELETE, CREATE, DROP, ALTER는 절대 사용하지 마세요.
- 테이블과 컬럼은 제공된 스키마에 있는 이름만 사용하세요.`;
  }

  private getUserPracticeTablePromptContext(
    userId: string,
    tableNames: string[],
  ) {
    const tables = this.getUserPracticeTables(userId);
    const requested = new Set(tableNames);
    const selected = tables.filter((table) => requested.has(table.tableName));
    const contextTables = selected.length > 0 ? selected : tables;

    return contextTables
      .map((table) => {
        const columns = table.columns
          .map((column) => {
            const flags = [
              column.primaryKey ? 'PK' : '',
              column.notNull ? 'NOT NULL' : '',
            ].filter(Boolean);
            const flagText = flags.length ? ` (${flags.join(', ')})` : '';
            return `- ${column.name} ${column.type}${flagText}`;
          })
          .join('\n');

        return `table ${table.tableName} (${table.rowCount} rows)\n${columns}`;
      })
      .join('\n\n');
  }

  private parseGeneratedAnswer(raw: string): {
    answerSql: string;
    explanation: string | null;
  } {
    const sqlBlock =
      raw.match(/\[SQL\]\s*([\s\S]*?)(?:\[EXPLANATION\]|$)/i)?.[1] ?? raw;
    const explanation =
      raw.match(/\[EXPLANATION\]\s*([\s\S]*)/i)?.[1]?.trim() || null;

    return {
      answerSql: this.stripSqlCodeFence(sqlBlock).trim(),
      explanation,
    };
  }

  private stripSqlCodeFence(value: string) {
    return value
      .replace(/^```sql\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  private executeUserPracticeSelectForGrade(
    query: GradeSqlUserPracticeProblemInput['submittedSql'],
    userId: string,
  ): SqlExecuteResponse {
    const start = Date.now();

    try {
      const { query: sanitizedQuery, type } = sanitizeSql(
        query,
        this.getMaxQueryLength(),
      );

      if (type !== 'SELECT') {
        return {
          success: false,
          type,
          columns: null,
          rows: null,
          affectedRows: 0,
          message: '답안 제출은 SELECT/WITH 조회 쿼리만 허용됩니다.',
          executionTimeMs: Date.now() - start,
          schemaChanged: false,
        };
      }

      const activeSeed = this.getUserPracticeSeed();
      const runtimeUserId = this.getUserPracticeRuntimeUserId(userId);
      const freshness = this.ensureDatabaseFresh(runtimeUserId, activeSeed);
      const db = this.openDatabase(runtimeUserId);

      try {
        return this.executeReader(
          db,
          sanitizedQuery,
          type,
          start,
          freshness.seedReloaded,
        );
      } catch (error) {
        return {
          success: false,
          type,
          columns: null,
          rows: null,
          affectedRows: 0,
          message:
            error instanceof Error ? error.message : 'SQL execution failed.',
          executionTimeMs: Date.now() - start,
          schemaChanged: false,
          seedReloaded: freshness.seedReloaded,
        };
      } finally {
        db.close();
      }
    } catch (error) {
      return {
        success: false,
        type: 'OTHER',
        columns: null,
        rows: null,
        affectedRows: 0,
        message:
          error instanceof Error ? error.message : 'SQL validation failed.',
        executionTimeMs: Date.now() - start,
        schemaChanged: false,
      };
    }
  }

  private isSameSqlResult(
    submitted: SqlExecuteResponse,
    answer: SqlExecuteResponse,
  ) {
    if (!submitted.success || !answer.success) return false;
    return (
      JSON.stringify(submitted.columns ?? []) ===
        JSON.stringify(answer.columns ?? []) &&
      JSON.stringify(submitted.rows ?? []) === JSON.stringify(answer.rows ?? [])
    );
  }

  private toUserPracticeSubmissionLevel(
    level: number,
  ): SqlPracticeSubmissionLevel {
    if (level >= 5) return 'advanced';
    if (level >= 3) return 'intermediate';
    return 'beginner';
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

    return (
      candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
    );
  }

  private getUploadedSeedDir() {
    const configured =
      this.configService.get<string>('SQL_PRACTICE_UPLOAD_SEED_DIR') ??
      './data/sql-practice/seeds';
    return isAbsolute(configured)
      ? configured
      : join(process.cwd(), configured);
  }

  private getConfiguredSeedFile() {
    const configured = this.configService
      .get<string>('SQL_PRACTICE_SEED_FILE')
      ?.trim();
    if (!configured) return null;
    return isAbsolute(configured)
      ? configured
      : join(process.cwd(), configured);
  }

  private getBaseDatabaseFile() {
    const configured =
      this.configService.get<string>('SQL_PRACTICE_DB_FILE') ??
      './data/sql-practice/runtime/practice.sqlite';
    return isAbsolute(configured)
      ? configured
      : join(process.cwd(), configured);
  }

  private getDatabaseFile(userId: string) {
    const baseFile = this.getBaseDatabaseFile();
    return join(
      dirname(baseFile),
      'users',
      this.getUserRuntimeKey(userId),
      basename(baseFile),
    );
  }

  private getSeedHash(activeSeed: ResolvedSeed) {
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

  private getSeedStateFile(userId: string) {
    return `${this.getDatabaseFile(userId)}.seedhash`;
  }

  private readSeedState(userId: string): SeedState | null {
    const stateFile = this.getSeedStateFile(userId);
    if (!existsSync(stateFile)) return null;

    try {
      return JSON.parse(readFileSync(stateFile, 'utf8')) as SeedState;
    } catch {
      return null;
    }
  }

  private writeSeedState(userId: string, state: SeedState) {
    writeFileSync(
      this.getSeedStateFile(userId),
      JSON.stringify(state, null, 2),
    );
  }

  private getActiveSeedBaseStateFile() {
    const configured =
      this.configService.get<string>('SQL_PRACTICE_ACTIVE_SEED_FILE') ??
      './data/sql-practice/active-seed.json';
    return isAbsolute(configured)
      ? configured
      : join(process.cwd(), configured);
  }

  private getActiveSeedStateFile(userId: string) {
    const baseFile = this.getActiveSeedBaseStateFile();
    return join(
      dirname(baseFile),
      'users',
      this.getUserRuntimeKey(userId),
      basename(baseFile),
    );
  }

  private readActiveSeedState(userId: string): ActiveSeedState | null {
    const stateFile = this.getActiveSeedStateFile(userId);
    if (!existsSync(stateFile)) return null;

    try {
      const parsed = activateSeedSchema.safeParse(
        JSON.parse(readFileSync(stateFile, 'utf8')),
      );
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private writeActiveSeedState(userId: string, state: ActiveSeedState) {
    const stateFile = this.getActiveSeedStateFile(userId);
    mkdirSync(dirname(stateFile), { recursive: true });
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }

  private getUserRuntimeKey(userId: string) {
    const safe = userId
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 64);
    const hash = createHash('sha256').update(userId).digest('hex').slice(0, 8);
    return `${safe || 'user'}-${hash}`;
  }

  private getMaxRows() {
    const value = Number(
      this.configService.get<string>('SQL_PRACTICE_MAX_ROWS') ?? 500,
    );
    return Number.isFinite(value) && value > 0 ? Math.min(value, 5000) : 500;
  }

  private getMaxQueryLength() {
    const value = Number(
      this.configService.get<string>('SQL_PRACTICE_MAX_QUERY_LENGTH') ?? 10000,
    );
    return Number.isFinite(value) && value > 0 ? Math.min(value, 50000) : 10000;
  }

  async geminiAsk(body: unknown): Promise<{ answer: string }> {
    const { content, mode } = geminiAskSchema.parse(body);
    return { answer: await this.callGroq(content, mode) };
  }

  private buildSqlGradePrompt(input: GradeSqlPracticeSubmissionInput) {
    return `SQL 연습 문제의 사용자 제출 답안을 채점해주세요.

[문제]
제목: ${input.exampleTitle}
설명: ${input.description}
힌트: ${input.hint}
관련 테이블: ${input.relatedTables.join(', ')}

[실제 정답 SQL]
${input.answerSql}

[사용자 제출 SQL]
${input.submittedSql}

[채점 요청]
사용자 제출 SQL이 문제 요구사항과 실제 정답 SQL의 결과를 같은 의미로 만족하는지 판별해주세요.`;
  }

  private parseSqlGradeResponse(raw: string): {
    validity: SqlGradeValidity | null;
    body: string;
  } {
    const firstLine = raw.split('\n')[0]?.trim();

    if (firstLine === '[SQL_CORRECT]') {
      return {
        validity: 'correct',
        body: raw.slice(firstLine.length).replace(/^\n/, ''),
      };
    }

    if (firstLine === '[SQL_INCORRECT]') {
      return {
        validity: 'incorrect',
        body: raw.slice(firstLine.length).replace(/^\n/, ''),
      };
    }

    return { validity: null, body: raw };
  }

  private async callGemini(
    content: string,
    mode: 'sql' | 'general' | 'grading',
  ): Promise<string> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured.',
      );
    }

    let systemPrompt =
      "You are a helpful assistant. Answer the user's question clearly and concisely. Respond in Korean.";

    if (mode === 'sql') {
      systemPrompt = `You are an SQL expert. When given an SQL query:
1. The VERY FIRST line of your response must be exactly one of: [SQL_VALID] or [SQL_INVALID] — nothing else on that line.
2. Then on the next line, provide: validation result, explanation of what the query does, any errors or improvements, and a corrected version if needed.
Respond in Korean.`;
    }

    if (mode === 'grading') {
      systemPrompt = `You are an SQL grading assistant. Compare the reference answer SQL with the submitted SQL for the given practice problem.
1. The VERY FIRST line of your response must be exactly one of: [SQL_CORRECT] or [SQL_INCORRECT] — nothing else on that line.
2. Mark [SQL_CORRECT] only when the submitted SQL would produce the same required result as the reference answer for the problem, allowing harmless differences such as aliases, whitespace, or equivalent syntax.
3. Then explain in Korean why it is correct or incorrect. If incorrect, point out the smallest concrete fix.`;
    }

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
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  private async callDeepSeek(
    content: string,
    mode: 'sql' | 'general' | 'grading',
  ): Promise<string> {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'DeepSeek API key is not configured.',
      );
    }

    let systemPrompt =
      "You are a helpful assistant. Answer the user's question clearly and concisely. Respond in Korean.";

    if (mode === 'sql') {
      systemPrompt = `You are an SQL expert. When given an SQL query:
1. The VERY FIRST line of your response must be exactly one of: [SQL_VALID] or [SQL_INVALID] — nothing else on that line.
2. Then on the next line, provide: validation result, explanation of what the query does, any errors or improvements, and a corrected version if needed.
Respond in Korean.`;
    }

    if (mode === 'grading') {
      systemPrompt = `You are an SQL grading assistant. Compare the reference answer SQL with the submitted SQL for the given practice problem.
1. The VERY FIRST line of your response must be exactly one of: [SQL_CORRECT] or [SQL_INCORRECT] — nothing else on that line.
2. Mark [SQL_CORRECT] only when the submitted SQL would produce the same required result as the reference answer for the problem, allowing harmless differences such as aliases, whitespace, or equivalent syntax.
3. Then explain in Korean why it is correct or incorrect. If incorrect, point out the smallest concrete fix.`;
    }

    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new InternalServerErrorException(`DeepSeek API error: ${err}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? '';
  }

  private async callGrok(
    content: string,
    mode: 'sql' | 'general' | 'grading',
  ): Promise<string> {
    const apiKey = this.configService.get<string>('GROK_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Grok API key is not configured.');
    }

    let systemPrompt =
      "You are a helpful assistant. Answer the user's question clearly and concisely. Respond in Korean.";

    if (mode === 'sql') {
      systemPrompt = `You are an SQL expert. When given an SQL query:
1. The VERY FIRST line of your response must be exactly one of: [SQL_VALID] or [SQL_INVALID] — nothing else on that line.
2. Then on the next line, provide: validation result, explanation of what the query does, any errors or improvements, and a corrected version if needed.
Respond in Korean.`;
    }

    if (mode === 'grading') {
      systemPrompt = `You are an SQL grading assistant. Compare the reference answer SQL with the submitted SQL for the given practice problem.
1. The VERY FIRST line of your response must be exactly one of: [SQL_CORRECT] or [SQL_INCORRECT] — nothing else on that line.
2. Mark [SQL_CORRECT] only when the submitted SQL would produce the same required result as the reference answer for the problem, allowing harmless differences such as aliases, whitespace, or equivalent syntax.
3. Then explain in Korean why it is correct or incorrect. If incorrect, point out the smallest concrete fix.`;
    }

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new InternalServerErrorException(`Grok API error: ${err}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? '';
  }

  private async callGroq(
    content: string,
    mode: 'sql' | 'general' | 'grading',
  ): Promise<string> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('Groq API key is not configured.');
    }

    let systemPrompt =
      "You are a helpful assistant. Answer the user's question clearly and concisely. Respond in Korean.";

    if (mode === 'sql') {
      systemPrompt = `You are an SQL expert. When given an SQL query:
1. The VERY FIRST line of your response must be exactly one of: [SQL_VALID] or [SQL_INVALID] — nothing else on that line.
2. Then on the next line, provide: validation result, explanation of what the query does, any errors or improvements, and a corrected version if needed.
Respond in Korean.`;
    }

    if (mode === 'grading') {
      systemPrompt = `You are an SQL grading assistant. Compare the reference answer SQL with the submitted SQL for the given practice problem.
1. The VERY FIRST line of your response must be exactly one of: [SQL_CORRECT] or [SQL_INCORRECT] — nothing else on that line.
2. Mark [SQL_CORRECT] only when the submitted SQL would produce the same required result as the reference answer for the problem, allowing harmless differences such as aliases, whitespace, or equivalent syntax.
3. Then explain in Korean why it is correct or incorrect. If incorrect, point out the smallest concrete fix.`;
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new InternalServerErrorException(`Groq API error: ${err}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? '';
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
