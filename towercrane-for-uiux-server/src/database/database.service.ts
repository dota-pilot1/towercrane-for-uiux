import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import {
  drizzle,
  type BetterSQLite3Database,
} from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { randomUUID, scryptSync } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { catalogSeed } from '../catalog/catalog.seed';
import {
  categoriesTable,
  menusTable,
  meetingRoomsTable,
  prototypesTable,
  schema,
  sessionsTable,
  usersTable,
  type PrototypeInsert,
  type UserInsert,
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
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS email_verifications (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        purpose TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        fail_count INTEGER NOT NULL DEFAULT 0,
        verified INTEGER NOT NULL DEFAULT 0,
        verified_token_hash TEXT UNIQUE,
        verified_token_expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_email_verifications_email_purpose_created
        ON email_verifications(email, purpose, created_at);

      CREATE INDEX IF NOT EXISTS idx_email_verifications_verified_token
        ON email_verifications(verified_token_hash);

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        group_name TEXT NOT NULL,
        icon_key TEXT NOT NULL,
        tags TEXT NOT NULL,
        checklist TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS prototypes (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        title TEXT NOT NULL,
        repo_url TEXT NOT NULL,
        demo_url TEXT,
        figma_url TEXT,
        summary TEXT NOT NULL,
        status TEXT NOT NULL,
        visibility TEXT NOT NULL,
        tags TEXT NOT NULL,
        checklist TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS doc_sections (
        id TEXT PRIMARY KEY,
        prototype_id TEXT NOT NULL,
        title TEXT NOT NULL,
        order_idx INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(prototype_id) REFERENCES prototypes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        order_idx INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(section_id) REFERENCES doc_sections(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS prototype_reviews (
        id TEXT PRIMARY KEY,
        prototype_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(prototype_id) REFERENCES prototypes(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(prototype_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS document_blocks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        block_type TEXT NOT NULL,
        block_title TEXT,
        content TEXT NOT NULL,
        order_idx INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS prototype_images (
        id TEXT PRIMARY KEY,
        prototype_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        order_idx INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(prototype_id) REFERENCES prototypes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS menus (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        name TEXT NOT NULL,
        section_id TEXT,
        icon TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_visible INTEGER NOT NULL DEFAULT 1,
        required_role TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(parent_id) REFERENCES menus(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS meeting_rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        room_type TEXT NOT NULL,
        description TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS meeting_messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_role TEXT,
        content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'TEXT',
        payload TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_meeting_messages_room_created
        ON meeting_messages(room_id, created_at);

      CREATE TABLE IF NOT EXISTS meeting_dm_pairs (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        user_a_id TEXT NOT NULL,
        user_b_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY(user_a_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(user_b_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_a_id, user_b_id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_dm_pairs_users
        ON meeting_dm_pairs(user_a_id, user_b_id);
    `);

    this.migrateLegacySchema();
    this.seedDefaults();
  }

  onModuleDestroy() {
    this.sqlite?.close();
  }

  private seedDefaults() {
    const existing = this.sqlite
      .prepare('SELECT COUNT(*) as count FROM users')
      .get() as { count: number };

    const now = new Date().toISOString();
    const demoUser = this.ensureDemoUser(now);

    const existingMenus = this.sqlite
      .prepare('SELECT COUNT(*) as count FROM menus')
      .get() as { count: number };

    if (existingMenus.count === 0) {
      const adminMenuId = randomUUID();
      const initialMenus = [
        {
          id: randomUUID(),
          name: 'Prototype',
          sectionId: 'prototype',
          icon: 'GitBranch',
          displayOrder: 0,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'Chatbot',
          sectionId: 'chatbot',
          icon: 'Bot',
          displayOrder: 1,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'README',
          sectionId: 'readme',
          icon: 'BookOpenText',
          displayOrder: 2,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'AI 개발 방법론',
          sectionId: 'ai_methodology',
          icon: 'Zap',
          displayOrder: 3,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: adminMenuId,
          name: 'Admin',
          sectionId: 'admin_dropdown',
          icon: 'ShieldCheck',
          displayOrder: 4,
          isVisible: true,
          requiredRole: 'admin',
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: '유저 관리',
          sectionId: 'users',
          icon: 'UserCog',
          displayOrder: 0,
          isVisible: true,
          requiredRole: 'admin',
          parentId: adminMenuId,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'README 관리',
          sectionId: 'readme_admin',
          icon: 'FileText',
          displayOrder: 1,
          isVisible: true,
          requiredRole: 'admin',
          parentId: adminMenuId,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: '메뉴 관리',
          sectionId: 'menu_admin',
          icon: 'LayoutGrid',
          displayOrder: 2,
          isVisible: true,
          requiredRole: 'admin',
          parentId: adminMenuId,
          createdAt: now,
          updatedAt: now,
        },
      ];
      this.db.insert(menusTable).values(initialMenus).run();
    }

    const existingMeetingRooms = this.sqlite
      .prepare('SELECT COUNT(*) as count FROM meeting_rooms')
      .get() as { count: number };

    if (existingMeetingRooms.count === 0) {
      this.db
        .insert(meetingRoomsTable)
        .values([
          {
            id: 'meeting-notice',
            name: '공지',
            roomType: 'ANNOUNCE',
            description: '프로젝트 공지와 변경사항',
            orderIdx: 0,
            archived: false,
            createdBy: demoUser.id,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'meeting-internal',
            name: '매장-내부',
            roomType: 'INTERNAL',
            description: '운영 회의와 결정사항',
            orderIdx: 1,
            archived: false,
            createdBy: demoUser.id,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'meeting-free',
            name: '자유',
            roomType: 'FREE',
            description: '가벼운 공유와 질문',
            orderIdx: 2,
            archived: false,
            createdBy: demoUser.id,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: 'meeting-qna',
            name: '디자이너-Q&A',
            roomType: 'QNA',
            description: '공개 질문과 답변',
            orderIdx: 3,
            archived: false,
            createdBy: demoUser.id,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .run();
    }

    if (existing.count > 0) {
      return;
    }

    for (const category of catalogSeed) {
      this.db
        .insert(categoriesTable)
        .values({
          id: category.id,
          userId: demoUser.id,
          title: category.title,
          summary: category.summary,
          group: category.group,
          iconKey: category.iconKey,
          tags: [...category.tags],
          checklist: [...category.checklist],
          createdAt: now,
          updatedAt: now,
        })
        .run();

      if (category.prototypes.length > 0) {
        const prototypeRows: PrototypeInsert[] = category.prototypes.map(
          (prototype) => ({
            id: prototype.id,
            categoryId: category.id,
            title: prototype.title,
            repoUrl: prototype.repoUrl,
            demoUrl: prototype.demoUrl || null,
            figmaUrl: prototype.figmaUrl || null,
            summary: prototype.summary,
            status: prototype.status,
            visibility: prototype.visibility,
            tags: [],
            checklist: prototype.checklist || [],
            notes: null,
            createdAt: now,
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
    const userCount = this.db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .get();

    return {
      database: 'sqlite',
      users: userCount?.count ?? 0,
      categories: categoryCount?.count ?? 0,
    };
  }

  private migrateLegacySchema() {
    this.ensureColumn(
      'users',
      'role',
      "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' NOT NULL",
    );
    this.ensureColumn(
      'categories',
      'user_id',
      "ALTER TABLE categories ADD COLUMN user_id TEXT DEFAULT '' NOT NULL",
    );
    this.ensureColumn(
      'categories',
      'updated_at',
      "ALTER TABLE categories ADD COLUMN updated_at TEXT DEFAULT '' NOT NULL",
    );
    this.ensureColumn(
      'categories',
      'tags',
      "ALTER TABLE categories ADD COLUMN tags TEXT DEFAULT '[]' NOT NULL",
    );
    this.ensureColumn(
      'categories',
      'checklist',
      "ALTER TABLE categories ADD COLUMN checklist TEXT DEFAULT '[]' NOT NULL",
    );
    this.ensureColumn(
      'prototypes',
      'demo_url',
      'ALTER TABLE prototypes ADD COLUMN demo_url TEXT',
    );
    this.ensureColumn(
      'prototypes',
      'figma_url',
      'ALTER TABLE prototypes ADD COLUMN figma_url TEXT',
    );
    this.ensureColumn(
      'prototypes',
      'tags',
      "ALTER TABLE prototypes ADD COLUMN tags TEXT DEFAULT '[]' NOT NULL",
    );
    this.ensureColumn(
      'prototypes',
      'notes',
      'ALTER TABLE prototypes ADD COLUMN notes TEXT',
    );
    this.ensureColumn(
      'prototypes',
      'checklist',
      "ALTER TABLE prototypes ADD COLUMN checklist TEXT DEFAULT '[]' NOT NULL",
    );
    this.ensureColumn(
      'prototypes',
      'created_at',
      "ALTER TABLE prototypes ADD COLUMN created_at TEXT DEFAULT '' NOT NULL",
    );
    this.ensureColumn(
      'categories',
      'order_idx',
      'ALTER TABLE categories ADD COLUMN order_idx INTEGER DEFAULT 0 NOT NULL',
    );
    this.ensureColumn(
      'meeting_rooms',
      'archived',
      'ALTER TABLE meeting_rooms ADD COLUMN archived INTEGER DEFAULT 0 NOT NULL',
    );
    this.ensureColumn(
      'meeting_messages',
      'payload',
      'ALTER TABLE meeting_messages ADD COLUMN payload TEXT',
    );

    const now = new Date().toISOString();
    const demoUser = this.ensureDemoUser(now);

    this.sqlite
      .prepare(
        `
          UPDATE categories
          SET user_id = ?, updated_at = COALESCE(NULLIF(updated_at, ''), created_at)
          WHERE user_id = ''
        `,
      )
      .run(demoUser.id);

    this.sqlite
      .prepare(
        `
          UPDATE prototypes
          SET created_at = COALESCE(NULLIF(created_at, ''), updated_at),
              tags = COALESCE(NULLIF(tags, ''), '[]')
          WHERE created_at = '' OR tags = ''
        `,
      )
      .run();
  }

  private ensureColumn(
    tableName: string,
    columnName: string,
    statement: string,
  ) {
    const columns = this.sqlite
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as Array<{ name: string }>;

    if (columns.some((column) => column.name === columnName)) {
      return;
    }

    this.sqlite.exec(statement);
  }

  private ensureDemoUser(now: string) {
    const existing = this.db
      .select()
      .from(usersTable)
      .where(sql`${usersTable.email} = 'seed@towercrane.local'`)
      .get();

    if (existing) {
      return existing;
    }

    const demoUser: UserInsert = {
      id: randomUUID(),
      email: 'seed@towercrane.local',
      passwordHash: this.hashSeedPassword('towercrane-demo'),
      name: 'Seed User',
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(usersTable).values(demoUser).run();

    return demoUser;
  }

  private hashSeedPassword(password: string) {
    return scryptSync(password, 'towercrane-seed-salt', 64).toString('hex');
  }
}
