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
import { eq } from 'drizzle-orm';
import {
  categoriesTable,
  challengeCategoriesTable,
  challengeSectionsTable,
  devChallengeCategoriesTable,
  devChallengeSectionsTable,
  devChallengeAssignmentsTable,
  devChallengeAssignmentBlocksTable,
  menusTable,
  prototypesTable,
  schema,
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
        profile_image_url TEXT,
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

      CREATE TABLE IF NOT EXISTS api_doc_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        emoji TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_api_doc_categories_order
        ON api_doc_categories(order_idx);

      CREATE TABLE IF NOT EXISTS api_doc_endpoints (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        title TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        path TEXT NOT NULL DEFAULT '',
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(category_id) REFERENCES api_doc_categories(id) ON DELETE CASCADE,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_api_doc_endpoints_category_order
        ON api_doc_endpoints(category_id, order_idx);

      CREATE TABLE IF NOT EXISTS api_doc_blocks (
        id TEXT PRIMARY KEY,
        endpoint_id TEXT NOT NULL,
        block_type TEXT NOT NULL DEFAULT 'API',
        content TEXT NOT NULL,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(endpoint_id) REFERENCES api_doc_endpoints(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_api_doc_blocks_endpoint_order
        ON api_doc_blocks(endpoint_id, order_idx);

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        task_type TEXT NOT NULL DEFAULT 'FEATURE',
        status TEXT NOT NULL DEFAULT 'TODO',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        reporter_id TEXT NOT NULL,
        assignee_id TEXT,
        due_date TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(assignee_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status_order
        ON tasks(status, order_idx);

      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
        ON tasks(assignee_id, status);

      CREATE INDEX IF NOT EXISTS idx_tasks_archived_updated
        ON tasks(archived, updated_at);

      CREATE TABLE IF NOT EXISTS task_checklists (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        content TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_checklists_task_order
        ON task_checklists(task_id, order_idx);

      CREATE TABLE IF NOT EXISTS task_comments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_comments_task_created
        ON task_comments(task_id, created_at);

      CREATE TABLE IF NOT EXISTS task_attachments (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        content_type TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_attachments_task_created
        ON task_attachments(task_id, created_at);

      CREATE TABLE IF NOT EXISTS task_activity_logs (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        actor_id TEXT,
        activity_type TEXT NOT NULL,
        from_value TEXT,
        to_value TEXT,
        message TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task_created
        ON task_activity_logs(task_id, created_at);

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

      CREATE TABLE IF NOT EXISTS challenge_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        summary TEXT,
        icon TEXT NOT NULL DEFAULT 'Trophy',
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS challenge_sections (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(category_id) REFERENCES challenge_categories(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_challenge_sections_category
        ON challenge_sections(category_id, order_idx);

      CREATE TABLE IF NOT EXISTS challenge_topics (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL,
        block_type TEXT NOT NULL,
        block_title TEXT,
        content TEXT NOT NULL,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(section_id) REFERENCES challenge_sections(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_challenge_topics_section
        ON challenge_topics(section_id, order_idx);

      CREATE TABLE IF NOT EXISTS challenge_submissions (
        id TEXT PRIMARY KEY,
        topic_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        max_score INTEGER NOT NULL DEFAULT 0,
        checked_items TEXT NOT NULL DEFAULT '[]',
        admin_rating INTEGER,
        admin_feedback TEXT,
        rated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(topic_id) REFERENCES challenge_topics(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(rated_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_challenge_submissions_topic_user
        ON challenge_submissions(topic_id, user_id);

      CREATE TABLE IF NOT EXISTS challenge_gpt_threads (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
        is_shared INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(section_id) REFERENCES challenge_sections(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_challenge_gpt_threads_section_user
        ON challenge_gpt_threads(section_id, user_id);

      CREATE TABLE IF NOT EXISTS challenge_gpt_messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens_in INTEGER,
        tokens_out INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY(thread_id) REFERENCES challenge_gpt_threads(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_challenge_gpt_messages_thread_created
        ON challenge_gpt_messages(thread_id, created_at);

      CREATE TABLE IF NOT EXISTS challenge_user_notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        section_id TEXT,
        topic_id TEXT,
        title TEXT,
        content TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'private',
        pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(section_id) REFERENCES challenge_sections(id) ON DELETE CASCADE,
        FOREIGN KEY(topic_id) REFERENCES challenge_topics(id) ON DELETE CASCADE,
        CHECK((section_id IS NOT NULL) OR (topic_id IS NOT NULL))
      );

      CREATE INDEX IF NOT EXISTS idx_challenge_user_notes_user_section
        ON challenge_user_notes(user_id, section_id, visibility);

      CREATE INDEX IF NOT EXISTS idx_challenge_user_notes_user_topic
        ON challenge_user_notes(user_id, topic_id, visibility);

      CREATE TABLE IF NOT EXISTS sql_practice_notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        seed_file TEXT,
        example_id TEXT,
        example_title TEXT,
        table_name TEXT,
        title TEXT,
        content TEXT NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sql_practice_notes_user_updated
        ON sql_practice_notes(user_id, pinned, updated_at);

      CREATE INDEX IF NOT EXISTS idx_sql_practice_notes_user_seed
        ON sql_practice_notes(user_id, seed_file);

      CREATE INDEX IF NOT EXISTS idx_sql_practice_notes_user_example
        ON sql_practice_notes(user_id, example_id);

      CREATE INDEX IF NOT EXISTS idx_sql_practice_notes_user_table
        ON sql_practice_notes(user_id, table_name);

      CREATE TABLE IF NOT EXISTS sql_practice_submissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        seed_file TEXT NOT NULL,
        seed_hash TEXT,
        example_id TEXT NOT NULL,
        example_title TEXT NOT NULL,
        example_level TEXT NOT NULL,
        example_order INTEGER NOT NULL,
        submitted_sql TEXT NOT NULL,
        answer_sql TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        max_score INTEGER NOT NULL DEFAULT 1,
        feedback TEXT NOT NULL,
        gemini_raw TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sql_practice_submissions_user_seed_created
        ON sql_practice_submissions(user_id, seed_file, created_at);

      CREATE INDEX IF NOT EXISTS idx_sql_practice_submissions_user_seed_example
        ON sql_practice_submissions(user_id, seed_file, example_id);

      CREATE INDEX IF NOT EXISTS idx_sql_practice_submissions_seed_score
        ON sql_practice_submissions(seed_file, score, created_at);

      CREATE TABLE IF NOT EXISTS dev_challenge_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        summary TEXT,
        icon TEXT NOT NULL DEFAULT 'Trophy',
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS dev_challenge_sections (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(category_id) REFERENCES dev_challenge_categories(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_dev_challenge_sections_category
        ON dev_challenge_sections(category_id, order_idx);

      CREATE TABLE IF NOT EXISTS dev_challenge_assignments (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        difficulty TEXT NOT NULL DEFAULT 'BASIC',
        status TEXT NOT NULL DEFAULT 'DRAFT',
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(section_id) REFERENCES dev_challenge_sections(id) ON DELETE CASCADE,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_dev_challenge_assignments_section
        ON dev_challenge_assignments(section_id, order_idx);

      CREATE TABLE IF NOT EXISTS dev_challenge_assignment_blocks (
        id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL,
        block_type TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(assignment_id) REFERENCES dev_challenge_assignments(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_dev_challenge_assignment_blocks_assignment
        ON dev_challenge_assignment_blocks(assignment_id, order_idx);

      CREATE TABLE IF NOT EXISTS dev_challenge_submissions (
        id TEXT PRIMARY KEY,
        assignment_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        comment TEXT NOT NULL DEFAULT '',
        github_url TEXT,
        status TEXT NOT NULL DEFAULT 'SUBMITTED',
        score INTEGER NOT NULL DEFAULT 0,
        max_score INTEGER NOT NULL DEFAULT 0,
        checked_items TEXT NOT NULL DEFAULT '[]',
        admin_rating INTEGER,
        admin_feedback TEXT,
        reviewed_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(assignment_id) REFERENCES dev_challenge_assignments(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_dev_challenge_submissions_assignment_user
        ON dev_challenge_submissions(assignment_id, user_id);
    `);

    this.migrateLegacySchema();
    this.seedDefaults();
    this.ensureTestUsers();
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
          name: 'AI 개발 방법론',
          sectionId: 'ai_methodology',
          icon: 'Zap',
          displayOrder: 0,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: '회의실',
          sectionId: 'meeting',
          icon: 'MessagesSquare',
          displayOrder: 1,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'Prototype',
          sectionId: 'prototype',
          icon: 'GitBranch',
          displayOrder: 2,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: '업무 관리',
          sectionId: 'task',
          icon: 'CheckSquare',
          displayOrder: 3,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'Postman',
          sectionId: 'api_doc',
          icon: 'Send',
          displayOrder: 4,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'SQL 연습장',
          sectionId: 'sql',
          icon: 'Database',
          displayOrder: 5,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'SQL 예제',
          sectionId: 'sql_examples',
          icon: 'BookOpenCheck',
          displayOrder: 6,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'Study Diary',
          sectionId: 'study_diary',
          icon: 'BookOpen',
          displayOrder: 7,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'Dev Challenge',
          sectionId: 'dev_challenge',
          icon: 'Trophy',
          displayOrder: 8,
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
          displayOrder: 9,
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
          displayOrder: 10,
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

    this.reconcileStudyDiaryAndDevChallengeMenus(now);

    const existingTaskMenu = this.sqlite
      .prepare("SELECT id FROM menus WHERE section_id = 'task' LIMIT 1")
      .get() as { id: string } | undefined;

    if (!existingTaskMenu) {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET display_order = display_order + 1, updated_at = ?
            WHERE parent_id IS NULL AND display_order >= 4
          `,
        )
        .run(now);

      this.db
        .insert(menusTable)
        .values({
          id: randomUUID(),
          name: '업무 관리',
          sectionId: 'task',
          icon: 'CheckSquare',
          displayOrder: 4,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    const existingApiDocMenu = this.sqlite
      .prepare("SELECT id FROM menus WHERE section_id = 'api_doc' LIMIT 1")
      .get() as { id: string } | undefined;

    if (!existingApiDocMenu) {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET display_order = display_order + 1, updated_at = ?
            WHERE parent_id IS NULL AND display_order >= 5
          `,
        )
        .run(now);

      this.db
        .insert(menusTable)
        .values({
          id: randomUUID(),
          name: 'API 문서',
          sectionId: 'api_doc',
          icon: 'FileJson',
          displayOrder: 5,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    const apiDocMenuForSqlPlacement = this.sqlite
      .prepare(
        "SELECT id, display_order as displayOrder FROM menus WHERE section_id = 'api_doc' LIMIT 1",
      )
      .get() as { id: string; displayOrder: number } | undefined;

    const existingSqlPracticeMenu = this.sqlite
      .prepare("SELECT id FROM menus WHERE section_id = 'sql' LIMIT 1")
      .get() as { id: string } | undefined;

    if (!existingSqlPracticeMenu) {
      const displayOrder = (apiDocMenuForSqlPlacement?.displayOrder ?? 4) + 1;

      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET display_order = display_order + 1, updated_at = ?
            WHERE parent_id IS NULL AND display_order >= ?
          `,
        )
        .run(now, displayOrder);

      this.db
        .insert(menusTable)
        .values({
          id: randomUUID(),
          name: 'SQL 연습장',
          sectionId: 'sql',
          icon: 'Database',
          displayOrder,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    this.sqlite
      .prepare(
        `
          DELETE FROM menus
          WHERE section_id = 'sql'
            AND rowid NOT IN (
              SELECT MIN(rowid)
              FROM menus
              WHERE section_id = 'sql'
            )
        `,
      )
      .run();

    const sqlPracticeMenuForExamplesPlacement = this.sqlite
      .prepare(
        "SELECT id, display_order as displayOrder FROM menus WHERE section_id = 'sql' LIMIT 1",
      )
      .get() as { id: string; displayOrder: number } | undefined;

    const existingSqlExamplesMenu = this.sqlite
      .prepare("SELECT id FROM menus WHERE section_id = 'sql_examples' LIMIT 1")
      .get() as { id: string } | undefined;

    if (!existingSqlExamplesMenu) {
      const displayOrder = (sqlPracticeMenuForExamplesPlacement?.displayOrder ?? 5) + 1;

      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET display_order = display_order + 1, updated_at = ?
            WHERE parent_id IS NULL AND display_order >= ?
          `,
        )
        .run(now, displayOrder);

      this.db
        .insert(menusTable)
        .values({
          id: randomUUID(),
          name: 'SQL 예제',
          sectionId: 'sql_examples',
          icon: 'BookOpenCheck',
          displayOrder,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    this.sqlite
      .prepare(
        `
          DELETE FROM menus
          WHERE section_id = 'sql_examples'
            AND rowid NOT IN (
              SELECT MIN(rowid)
              FROM menus
              WHERE section_id = 'sql_examples'
            )
        `,
      )
      .run();

    this.sqlite
      .prepare(
        `
          UPDATE menus
          SET is_visible = 0, updated_at = ?
          WHERE section_id = 'readme'
            OR (parent_id IS NULL AND section_id IS NULL AND name = '새 메뉴')
        `,
      )
      .run(now);

    const defaultMeetingRooms = [
      {
        id: 'meeting-notice',
        name: '공지',
        roomType: 'ANNOUNCE',
        description: '프로젝트 공지와 변경사항',
        orderIdx: 0,
      },
      {
        id: 'meeting-internal',
        name: '프로토타입 공유',
        roomType: 'PROTOTYPE',
        description: '새 프로토타입 등록과 공유',
        orderIdx: 1,
      },
      {
        id: 'meeting-free',
        name: '피드백',
        roomType: 'FEEDBACK',
        description: 'UI/UX 리뷰와 의견',
        orderIdx: 2,
      },
      {
        id: 'meeting-qna',
        name: '버그/이슈',
        roomType: 'ISSUE',
        description: '재현 문제와 동작 오류',
        orderIdx: 3,
      },
      {
        id: 'meeting-decision',
        name: '결정사항',
        roomType: 'DECISION',
        description: '확정된 UX 방향과 스펙',
        orderIdx: 4,
      },
      {
        id: 'meeting-resource',
        name: '자료',
        roomType: 'RESOURCE',
        description: '레퍼런스, 문서, 링크',
        orderIdx: 5,
      },
    ];

    const upsertMeetingRoom = this.sqlite.prepare(`
      INSERT INTO meeting_rooms (
        id, name, room_type, description, order_idx, archived, created_by, created_at, updated_at
      ) VALUES (
        @id, @name, @roomType, @description, @orderIdx, 0, @createdBy, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        room_type = excluded.room_type,
        description = excluded.description,
        order_idx = excluded.order_idx,
        archived = 0,
        updated_at = excluded.updated_at
      WHERE meeting_rooms.name IS NOT excluded.name
        OR meeting_rooms.room_type IS NOT excluded.room_type
        OR meeting_rooms.description IS NOT excluded.description
        OR meeting_rooms.order_idx IS NOT excluded.order_idx
        OR meeting_rooms.archived IS NOT 0
    `);

    for (const room of defaultMeetingRooms) {
      upsertMeetingRoom.run({
        ...room,
        createdBy: demoUser.id,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Seed Challenge category and section (idempotent)
    const existingChallengeCategory = this.db
      .select()
      .from(challengeCategoriesTable)
      .get();

    if (!existingChallengeCategory) {
      const categoryId = randomUUID();
      this.db
        .insert(challengeCategoriesTable)
        .values({
          id: categoryId,
          name: 'Spring Boot',
          summary: 'Spring Framework 기초 학습',
          icon: 'Trophy',
          createdBy: demoUser.id,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      this.db
        .insert(challengeSectionsTable)
        .values({
          id: randomUUID(),
          categoryId: categoryId,
          title: '1회차',
          summary: 'Spring Boot 시작하기',
          orderIdx: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    const existingDevChallengeCategory = this.db
      .select()
      .from(devChallengeCategoriesTable)
      .get();

    if (!existingDevChallengeCategory) {
      const categoryId = randomUUID();
      const sectionId = randomUUID();
      this.db
        .insert(devChallengeCategoriesTable)
        .values({
          id: categoryId,
          name: 'Frontend',
          summary: '프론트엔드 개발 챌린지',
          icon: 'Trophy',
          createdBy: demoUser.id,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      this.db
        .insert(devChallengeSectionsTable)
        .values({
          id: sectionId,
          categoryId,
          title: '1회차',
          summary: '첫 개발 챌린지',
          orderIdx: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const assignmentId = randomUUID();
      this.db
        .insert(devChallengeAssignmentsTable)
        .values({
          id: assignmentId,
          sectionId,
          title: '컴포넌트 상태 관리 챌린지',
          summary: '간단한 요구사항을 읽고 상태 기반 UI를 구현합니다.',
          difficulty: 'BASIC',
          status: 'PUBLISHED',
          orderIdx: 0,
          createdBy: demoUser.id,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      this.db
        .insert(devChallengeAssignmentBlocksTable)
        .values([
          {
            id: randomUUID(),
            assignmentId,
            blockType: 'NOTE',
            title: '챌린지 설명',
            content: '선택한 UI 상태에 따라 화면 문구와 버튼 상태가 자연스럽게 바뀌는 컴포넌트를 구현하세요.',
            orderIdx: 0,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: randomUUID(),
            assignmentId,
            blockType: 'CHECKLIST',
            title: '완료 조건',
            content: JSON.stringify([
              { id: 'state-ui', label: '상태별 UI가 명확하게 구분된다' },
              { id: 'empty-loading-error', label: '빈 상태, 로딩, 오류 상태를 처리한다' },
              { id: 'responsive', label: '모바일/데스크톱 레이아웃이 깨지지 않는다' },
            ]),
            orderIdx: 1,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .run();
    }

    const existingDevChallengeAssignment = this.db
      .select()
      .from(devChallengeAssignmentsTable)
      .get();

    if (!existingDevChallengeAssignment) {
      const firstSection = this.db
        .select()
        .from(devChallengeSectionsTable)
        .orderBy(devChallengeSectionsTable.orderIdx)
        .get();

      if (firstSection) {
        const assignmentId = randomUUID();
        this.db
          .insert(devChallengeAssignmentsTable)
          .values({
            id: assignmentId,
            sectionId: firstSection.id,
            title: '컴포넌트 상태 관리 챌린지',
            summary: '간단한 요구사항을 읽고 상태 기반 UI를 구현합니다.',
            difficulty: 'BASIC',
            status: 'PUBLISHED',
            orderIdx: 0,
            createdBy: demoUser.id,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        this.db
          .insert(devChallengeAssignmentBlocksTable)
          .values([
            {
              id: randomUUID(),
              assignmentId,
              blockType: 'NOTE',
              title: '챌린지 설명',
              content: '선택한 UI 상태에 따라 화면 문구와 버튼 상태가 자연스럽게 바뀌는 컴포넌트를 구현하세요.',
              orderIdx: 0,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: randomUUID(),
              assignmentId,
              blockType: 'CHECKLIST',
              title: '완료 조건',
              content: JSON.stringify([
                { id: 'state-ui', label: '상태별 UI가 명확하게 구분된다' },
                { id: 'empty-loading-error', label: '빈 상태, 로딩, 오류 상태를 처리한다' },
                { id: 'responsive', label: '모바일/데스크톱 레이아웃이 깨지지 않는다' },
              ]),
              orderIdx: 1,
              createdAt: now,
              updatedAt: now,
            },
          ])
          .run();
      }
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
      'users',
      'profile_image_url',
      'ALTER TABLE users ADD COLUMN profile_image_url TEXT',
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
      'challenge_categories',
      'order_idx',
      'ALTER TABLE challenge_categories ADD COLUMN order_idx INTEGER DEFAULT 0 NOT NULL',
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

  private reconcileStudyDiaryAndDevChallengeMenus(now: string) {
    const legacyChallengeMenu = this.sqlite
      .prepare(
        `
          SELECT id, display_order as displayOrder
          FROM menus
          WHERE section_id = 'challenge'
          ORDER BY display_order ASC
          LIMIT 1
        `,
      )
      .get() as { id: string; displayOrder: number } | undefined;

    const existingStudyDiaryMenu = this.sqlite
      .prepare(
        `
          SELECT id, display_order as displayOrder
          FROM menus
          WHERE section_id = 'study_diary'
          ORDER BY display_order ASC
          LIMIT 1
        `,
      )
      .get() as { id: string; displayOrder: number } | undefined;

    if (legacyChallengeMenu && !existingStudyDiaryMenu) {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET name = 'Study Diary',
                section_id = 'study_diary',
                icon = 'BookOpen',
                is_visible = 1,
                updated_at = ?
            WHERE id = ?
          `,
        )
        .run(now, legacyChallengeMenu.id);
    } else if (legacyChallengeMenu && existingStudyDiaryMenu) {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET is_visible = 0,
                updated_at = ?
            WHERE section_id = 'challenge'
          `,
        )
        .run(now);
    }

    let studyDiaryMenu = this.sqlite
      .prepare(
        `
          SELECT id, display_order as displayOrder
          FROM menus
          WHERE section_id = 'study_diary'
          ORDER BY display_order ASC
          LIMIT 1
        `,
      )
      .get() as { id: string; displayOrder: number } | undefined;

    if (!studyDiaryMenu) {
      const sqlExamplesMenu = this.sqlite
        .prepare(
          `
            SELECT display_order as displayOrder
            FROM menus
            WHERE section_id = 'sql_examples'
            ORDER BY display_order ASC
            LIMIT 1
          `,
        )
        .get() as { displayOrder: number } | undefined;
      const displayOrder = (sqlExamplesMenu?.displayOrder ?? 6) + 1;

      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET display_order = display_order + 1, updated_at = ?
            WHERE parent_id IS NULL AND display_order >= ?
          `,
        )
        .run(now, displayOrder);

      this.db
        .insert(menusTable)
        .values({
          id: randomUUID(),
          name: 'Study Diary',
          sectionId: 'study_diary',
          icon: 'BookOpen',
          displayOrder,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      studyDiaryMenu = this.sqlite
        .prepare(
          `
            SELECT id, display_order as displayOrder
            FROM menus
            WHERE section_id = 'study_diary'
            ORDER BY display_order ASC
            LIMIT 1
          `,
        )
        .get() as { id: string; displayOrder: number } | undefined;
    } else {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET name = 'Study Diary',
                icon = 'BookOpen',
                is_visible = 1,
                updated_at = ?
            WHERE id = ?
          `,
        )
        .run(now, studyDiaryMenu.id);
    }

    this.sqlite
      .prepare(
        `
          DELETE FROM menus
          WHERE section_id = 'study_diary'
            AND rowid NOT IN (
              SELECT MIN(rowid)
              FROM menus
              WHERE section_id = 'study_diary'
            )
        `,
      )
      .run();

    const existingDevChallengeMenu = this.sqlite
      .prepare("SELECT id FROM menus WHERE section_id = 'dev_challenge' LIMIT 1")
      .get() as { id: string } | undefined;

    if (!existingDevChallengeMenu) {
      const displayOrder = (studyDiaryMenu?.displayOrder ?? 7) + 1;

      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET display_order = display_order + 1, updated_at = ?
            WHERE parent_id IS NULL AND display_order >= ?
          `,
        )
        .run(now, displayOrder);

      this.db
        .insert(menusTable)
        .values({
          id: randomUUID(),
          name: 'Dev Challenge',
          sectionId: 'dev_challenge',
          icon: 'Trophy',
          displayOrder,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    } else {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET name = 'Dev Challenge',
                icon = 'Trophy',
                is_visible = 1,
                updated_at = ?
            WHERE section_id = 'dev_challenge'
          `,
        )
        .run(now);
    }
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
      .where(sql`${usersTable.email} = 'terecal@daum.net'`)
      .get();

    if (existing) {
      return existing;
    }

    const demoUser: UserInsert = {
      id: randomUUID(),
      email: 'terecal@daum.net',
      passwordHash: this.hashSeedPassword('password123'),
      name: 'Seed User',
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(usersTable).values(demoUser).run();

    return demoUser;
  }

  private ensureTestUsers() {
    const now = new Date().toISOString();
    const testUsers = [
      { email: 'test01@hibot.dev', name: '김민준' },
      { email: 'test02@hibot.dev', name: '이서연' },
      { email: 'test03@hibot.dev', name: '박지호' },
      { email: 'test04@hibot.dev', name: '최유나' },
      { email: 'test05@hibot.dev', name: '정현우' },
      { email: 'test06@hibot.dev', name: '강소희' },
      { email: 'test07@hibot.dev', name: '윤태양' },
      { email: 'test08@hibot.dev', name: '임하늘' },
      { email: 'test09@hibot.dev', name: '오지훈' },
      { email: 'test10@hibot.dev', name: '한수빈' },
    ];

    for (const u of testUsers) {
      const existing = this.db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, u.email))
        .get();

      if (!existing) {
        this.db
          .insert(usersTable)
          .values({
            id: randomUUID(),
            email: u.email,
            passwordHash: this.hashSeedPassword('test1234'),
            name: u.name,
            role: 'user',
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    }
  }

  private hashSeedPassword(password: string) {
    const salt = 'towercrane-seed-salt';
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }
}
