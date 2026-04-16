import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import {
  drizzle,
  type BetterSQLite3Database,
} from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { catalogSeed } from '../catalog/catalog.seed';
import {
  categoriesTable,
  prototypesTable,
  schema,
  type PrototypeInsert,
} from './schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private sqlite!: Database.Database;
  db!: BetterSQLite3Database<typeof schema>;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const configuredPath =
      this.configService.get<string>('DATABASE_FILE') ??
      './data/towercrane-catalog.sqlite';
    const databaseFile = isAbsolute(configuredPath)
      ? configuredPath
      : join(process.cwd(), configuredPath);

    mkdirSync(dirname(databaseFile), { recursive: true });

    this.sqlite = new Database(databaseFile);
    this.sqlite.pragma('foreign_keys = ON');
    this.sqlite.pragma('journal_mode = WAL');
    this.db = drizzle(this.sqlite, { schema });

    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        group_name TEXT NOT NULL,
        icon_key TEXT NOT NULL,
        tags TEXT NOT NULL,
        checklist TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prototypes (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        title TEXT NOT NULL,
        repo_url TEXT NOT NULL,
        summary TEXT NOT NULL,
        status TEXT NOT NULL,
        visibility TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
    `);

    this.seedDefaults();
  }

  onModuleDestroy() {
    this.sqlite?.close();
  }

  private seedDefaults() {
    const existing = this.sqlite
      .prepare('SELECT COUNT(*) as count FROM categories')
      .get() as { count: number };

    if (existing.count > 0) {
      return;
    }

    const now = new Date().toISOString();

    for (const category of catalogSeed) {
      this.db
        .insert(categoriesTable)
        .values({
          id: category.id,
          title: category.title,
          summary: category.summary,
          group: category.group,
          iconKey: category.iconKey,
          tags: [...category.tags],
          checklist: [...category.checklist],
          createdAt: now,
        })
        .run();

      if (category.prototypes.length > 0) {
        const prototypeRows: PrototypeInsert[] = category.prototypes.map(
          (prototype) => ({
            id: prototype.id,
            categoryId: category.id,
            title: prototype.title,
            repoUrl: prototype.repoUrl,
            summary: prototype.summary,
            status: prototype.status,
            visibility: prototype.visibility,
            updatedAt: prototype.updatedAt,
          }),
        );

        this.db.insert(prototypesTable).values(prototypeRows).run();
      }
    }
  }

  health() {
    const categoryCount = this.db
      .select({ count: sql<number>`count(*)` })
      .from(categoriesTable)
      .get();

    return {
      database: 'sqlite',
      categories: categoryCount?.count ?? 0,
    };
  }
}
