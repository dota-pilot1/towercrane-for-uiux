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
  boardConfigsTable,
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
  evalCategoriesTable,
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

      CREATE TABLE IF NOT EXISTS study_diaries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        visibility TEXT NOT NULL DEFAULT 'private',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_study_diaries_user
        ON study_diaries(user_id);

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

      CREATE TABLE IF NOT EXISTS board_configs (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        allow_user_write INTEGER NOT NULL DEFAULT 0,
        allow_comment INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_board_configs_active_order
        ON board_configs(is_active, order_idx);

      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        board_config_id TEXT NOT NULL,
        author_id TEXT,
        author_name TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'PUBLISHED',
        pinned INTEGER NOT NULL DEFAULT 0,
        pinned_order INTEGER,
        answered INTEGER NOT NULL DEFAULT 0,
        view_count INTEGER NOT NULL DEFAULT 0,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(board_config_id) REFERENCES board_configs(id) ON DELETE CASCADE,
        FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_boards_config_status_deleted
        ON boards(board_config_id, status, deleted_at);

      CREATE INDEX IF NOT EXISTS idx_boards_pinned_order
        ON boards(board_config_id, pinned, pinned_order, created_at);

      CREATE TABLE IF NOT EXISTS board_comments (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        author_id TEXT,
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        admin_reply INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE,
        FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_board_comments_board_deleted
        ON board_comments(board_id, deleted);

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
        mmd_content TEXT NOT NULL DEFAULT '',
        task_type TEXT NOT NULL DEFAULT 'FEATURE',
        status TEXT NOT NULL DEFAULT 'TODO',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        reporter_id TEXT NOT NULL,
        assignee_id TEXT,
        scope TEXT NOT NULL DEFAULT 'TEAM',
        owner_id TEXT,
        visibility TEXT NOT NULL DEFAULT 'TEAM',
        due_date TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(assignee_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE SET NULL
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

      CREATE TABLE IF NOT EXISTS project_issue_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        order_idx INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_project_issue_categories_order
        ON project_issue_categories(archived, order_idx, created_at);

      CREATE TABLE IF NOT EXISTS project_issues (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        issue_type TEXT NOT NULL DEFAULT 'BUG',
        status TEXT NOT NULL DEFAULT 'OPEN',
        priority TEXT NOT NULL DEFAULT 'MEDIUM',
        reporter_id TEXT NOT NULL,
        assignee_id TEXT,
        due_date TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_id) REFERENCES project_issue_categories(id) ON DELETE CASCADE,
        FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(assignee_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_project_issues_project_order
        ON project_issues(project_id, archived, status, order_idx);

      CREATE INDEX IF NOT EXISTS idx_project_issues_assignee
        ON project_issues(assignee_id, archived, status);

      CREATE INDEX IF NOT EXISTS idx_project_issues_reporter
        ON project_issues(reporter_id, created_at);

      CREATE TABLE IF NOT EXISTS project_issue_checklists (
        id TEXT PRIMARY KEY,
        project_issue_id TEXT NOT NULL,
        content TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_issue_id) REFERENCES project_issues(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_project_issue_checklists_issue_order
        ON project_issue_checklists(project_issue_id, order_idx);

      CREATE TABLE IF NOT EXISTS project_issue_comments (
        id TEXT PRIMARY KEY,
        project_issue_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(project_issue_id) REFERENCES project_issues(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_project_issue_comments_issue_created
        ON project_issue_comments(project_issue_id, created_at);

      CREATE TABLE IF NOT EXISTS project_issue_attachments (
        id TEXT PRIMARY KEY,
        project_issue_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        content_type TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(project_issue_id) REFERENCES project_issues(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_project_issue_attachments_issue_created
        ON project_issue_attachments(project_issue_id, created_at);

      CREATE TABLE IF NOT EXISTS project_issue_activity_logs (
        id TEXT PRIMARY KEY,
        project_issue_id TEXT NOT NULL,
        actor_id TEXT,
        activity_type TEXT NOT NULL,
        from_value TEXT,
        to_value TEXT,
        message TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(project_issue_id) REFERENCES project_issues(id) ON DELETE CASCADE,
        FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_project_issue_activity_logs_issue_created
        ON project_issue_activity_logs(project_issue_id, created_at);

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
        diary_id TEXT,
        name TEXT NOT NULL,
        summary TEXT,
        icon TEXT NOT NULL DEFAULT 'Trophy',
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(diary_id) REFERENCES study_diaries(id) ON DELETE CASCADE,
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
        is_public INTEGER NOT NULL DEFAULT 0,
        public_token TEXT UNIQUE,
        public_shared_at TEXT,
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

      CREATE TABLE IF NOT EXISTS sql_practice_submission_logs (
        id TEXT PRIMARY KEY,
        submission_id TEXT UNIQUE,
        user_id TEXT NOT NULL,
        seed_file TEXT NOT NULL,
        seed_hash TEXT,
        example_id TEXT NOT NULL,
        example_title TEXT NOT NULL,
        example_level TEXT NOT NULL,
        example_order INTEGER NOT NULL,
        is_correct INTEGER NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        max_score INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sql_practice_submission_logs_user_seed_created
        ON sql_practice_submission_logs(user_id, seed_file, created_at);

      CREATE INDEX IF NOT EXISTS idx_sql_practice_submission_logs_seed_created
        ON sql_practice_submission_logs(seed_file, created_at);

      CREATE TABLE IF NOT EXISTS sql_user_practice_schemas (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        schema_sql TEXT NOT NULL,
        erd_mmd TEXT,
        db_file_hash TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'seed',
        replaced_from_schema_id TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_by TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sql_user_practice_schemas_active
        ON sql_user_practice_schemas(is_active, version);

      CREATE TABLE IF NOT EXISTS sql_user_practice_problems (
        id TEXT PRIMARY KEY,
        schema_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        target_tables TEXT NOT NULL DEFAULT '[]',
        starter_sql TEXT,
        answer_sql TEXT NOT NULL,
        explanation TEXT,
        created_by TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'public',
        status TEXT NOT NULL DEFAULT 'published',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(schema_id) REFERENCES sql_user_practice_schemas(id) ON DELETE CASCADE,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sql_user_practice_problems_schema_level
        ON sql_user_practice_problems(schema_id, level, status, created_at);

      CREATE INDEX IF NOT EXISTS idx_sql_user_practice_problems_creator
        ON sql_user_practice_problems(created_by, updated_at);

      CREATE TABLE IF NOT EXISTS sql_personal_practice_workspaces (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        active_schema_version_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sql_personal_workspaces_owner
        ON sql_personal_practice_workspaces(owner_id, updated_at);

      CREATE TABLE IF NOT EXISTS sql_personal_practice_schema_versions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        schema_sql TEXT NOT NULL,
        erd_mmd TEXT,
        db_file_hash TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'seed',
        source_file_name TEXT,
        replaced_from_schema_version_id TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES sql_personal_practice_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_sql_personal_schema_versions_workspace_version
        ON sql_personal_practice_schema_versions(workspace_id, version);

      CREATE INDEX IF NOT EXISTS idx_sql_personal_schema_versions_workspace_created
        ON sql_personal_practice_schema_versions(workspace_id, created_at);

      CREATE TABLE IF NOT EXISTS sql_personal_practice_problems (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        schema_version_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        target_tables TEXT NOT NULL DEFAULT '[]',
        starter_sql TEXT,
        answer_sql TEXT NOT NULL,
        explanation TEXT,
        status TEXT NOT NULL DEFAULT 'published',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES sql_personal_practice_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(schema_version_id) REFERENCES sql_personal_practice_schema_versions(id) ON DELETE RESTRICT,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sql_personal_problems_workspace_level
        ON sql_personal_practice_problems(workspace_id, level, status, updated_at);

      CREATE INDEX IF NOT EXISTS idx_sql_personal_problems_schema
        ON sql_personal_practice_problems(schema_version_id, updated_at);

      CREATE TABLE IF NOT EXISTS sql_personal_practice_shares (
        id TEXT PRIMARY KEY,
        problem_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        schema_version_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        disabled_at TEXT,
        FOREIGN KEY(problem_id) REFERENCES sql_personal_practice_problems(id) ON DELETE CASCADE,
        FOREIGN KEY(workspace_id) REFERENCES sql_personal_practice_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(schema_version_id) REFERENCES sql_personal_practice_schema_versions(id) ON DELETE RESTRICT,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_sql_personal_shares_token
        ON sql_personal_practice_shares(token);

      CREATE INDEX IF NOT EXISTS idx_sql_personal_shares_problem_enabled
        ON sql_personal_practice_shares(problem_id, enabled);

      CREATE TABLE IF NOT EXISTS sql_personal_practice_submissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        problem_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        schema_version_id TEXT NOT NULL,
        share_id TEXT,
        submitted_sql TEXT NOT NULL,
        answer_sql TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        max_score INTEGER NOT NULL DEFAULT 1,
        feedback TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(problem_id) REFERENCES sql_personal_practice_problems(id) ON DELETE CASCADE,
        FOREIGN KEY(workspace_id) REFERENCES sql_personal_practice_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(schema_version_id) REFERENCES sql_personal_practice_schema_versions(id) ON DELETE RESTRICT,
        FOREIGN KEY(share_id) REFERENCES sql_personal_practice_shares(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sql_personal_submissions_user_problem_created
        ON sql_personal_practice_submissions(user_id, problem_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_sql_personal_submissions_problem_created
        ON sql_personal_practice_submissions(problem_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_sql_personal_submissions_share_user
        ON sql_personal_practice_submissions(share_id, user_id, created_at);

      INSERT OR IGNORE INTO sql_practice_submission_logs (
        id,
        submission_id,
        user_id,
        seed_file,
        seed_hash,
        example_id,
        example_title,
        example_level,
        example_order,
        is_correct,
        score,
        max_score,
        created_at
      )
      SELECT
        id,
        id,
        user_id,
        seed_file,
        seed_hash,
        example_id,
        example_title,
        example_level,
        example_order,
        is_correct,
        score,
        max_score,
        created_at
      FROM sql_practice_submissions;

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

      CREATE TABLE IF NOT EXISTS eval_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS evaluatees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS eval_items (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL REFERENCES eval_categories(id) ON DELETE CASCADE,
        evaluatee_id TEXT NOT NULL REFERENCES evaluatees(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS eval_scores (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL REFERENCES eval_items(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    this.migrateLegacySchema();
    this.migrateChatSchema();
    this.migrateProjectIssueSchema();
    this.seedDefaults();
    this.seedEvalCategories();
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
      const sqlGroupMenuId = randomUUID();
      const aiNativeGroupMenuId = randomUUID();
      const initialMenus = [
        {
          id: aiNativeGroupMenuId,
          name: 'AI Native',
          sectionId: 'ai_native_group',
          icon: 'Bot',
          displayOrder: 0,
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
          displayOrder: 0,
          isVisible: true,
          requiredRole: null,
          parentId: aiNativeGroupMenuId,
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
          id: sqlGroupMenuId,
          name: 'SQL Prac',
          sectionId: 'sql_group',
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
          name: 'SQL 연습장(공식)',
          sectionId: 'sql',
          icon: 'Database',
          displayOrder: 0,
          isVisible: true,
          requiredRole: null,
          parentId: sqlGroupMenuId,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'SQL 연습장(유저)',
          sectionId: 'sql_user',
          icon: 'FileUp',
          displayOrder: 1,
          isVisible: true,
          requiredRole: null,
          parentId: sqlGroupMenuId,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'SQL 연습장(개인)',
          sectionId: 'sql_personal',
          icon: 'UserRound',
          displayOrder: 2,
          isVisible: true,
          requiredRole: null,
          parentId: sqlGroupMenuId,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'SQL 예제',
          sectionId: 'sql_examples',
          icon: 'BookOpenCheck',
          displayOrder: 3,
          isVisible: true,
          requiredRole: null,
          parentId: sqlGroupMenuId,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: '학습 일지',
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
          name: 'Challenge',
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

    this.reconcileAiNativeMenus(now);
    this.reconcileStudyDiaryAndDevChallengeMenus(now);
    this.reconcileTaskMenus(now);
    this.seedBoardConfigs(now);
    this.reconcileBoardMenus(now);
    this.reconcileSqlPracticeMenus(now);

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

    // 챗봇 루트 메뉴 + 5개 자식 upsert
    const existingChatbotPilot = this.sqlite
      .prepare("SELECT id FROM menus WHERE section_id = 'chatbot_pilot' AND parent_id IS NULL LIMIT 1")
      .get() as { id: string } | undefined;

    if (!existingChatbotPilot) {
      const chatbotPilotId = randomUUID();
      this.db
        .insert(menusTable)
        .values({
          id: chatbotPilotId,
          name: '챗봇',
          sectionId: 'chatbot_pilot',
          icon: 'BotMessageSquare',
          displayOrder: 9,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const children = [
        { name: '기본 채팅',    sectionId: 'chatbot_basic',     icon: 'MessageCircle', displayOrder: 0 },
        { name: '스트리밍 응답', sectionId: 'chatbot_streaming', icon: 'Zap',           displayOrder: 1 },
        { name: '히스토리 관리', sectionId: 'chatbot_history',   icon: 'History',       displayOrder: 2 },
        { name: 'React Flow',   sectionId: 'chatbot_flow',      icon: 'GitFork',       displayOrder: 3 },
        { name: '파일 첨부',    sectionId: 'chatbot_files',     icon: 'Paperclip',     displayOrder: 4 },
      ];
      for (const child of children) {
        this.db
          .insert(menusTable)
          .values({
            id: randomUUID(),
            name: child.name,
            sectionId: child.sectionId,
            icon: child.icon,
            displayOrder: child.displayOrder,
            isVisible: true,
            requiredRole: null,
            parentId: chatbotPilotId,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    } else {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET name = '챗봇',
                icon = 'BotMessageSquare',
                is_visible = 1,
                updated_at = ?
            WHERE id = ?
          `,
        )
        .run(now, existingChatbotPilot.id);
    }

    // 루트 메뉴 표시 순서 고정:
    // 0:AI Native, 1:회의실, 2:업무관리, 3:Postman, 4:학습 일지,
    // 5:게시판, 6:SQL Prac, 7:Challenge, 8:Prototype, 9:챗봇, 10:Admin
    const rootMenuOrder: Array<{ sectionId: string | string[]; displayOrder: number }> = [
      { sectionId: ['task_group', 'task'],      displayOrder: 0 },
      { sectionId: 'api_doc',                  displayOrder: 1 },
      { sectionId: 'meeting',                  displayOrder: 2 },
      { sectionId: 'study_diary',              displayOrder: 3 },
      { sectionId: 'ai_native_group',          displayOrder: 4 },
      { sectionId: 'boards',                   displayOrder: 5 },
      { sectionId: 'sql_group',                displayOrder: 6 },
      { sectionId: 'dev_challenge',            displayOrder: 7 },
      { sectionId: 'prototype',                displayOrder: 8 },
      { sectionId: 'chatbot_pilot',            displayOrder: 9 },
      { sectionId: 'admin_dropdown',           displayOrder: 10 },
    ];
    for (const { sectionId, displayOrder } of rootMenuOrder) {
      const ids = Array.isArray(sectionId) ? sectionId : [sectionId];
      for (const id of ids) {
        this.sqlite
          .prepare(
            `UPDATE menus SET display_order = ?, updated_at = ? WHERE section_id = ? AND parent_id IS NULL`,
          )
          .run(displayOrder, now, id);
      }
    }

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
      const demoDiary = this.ensureStudyDiaryForUser(
        demoUser.id,
        demoUser.name,
        now,
      );
      this.db
        .insert(challengeCategoriesTable)
        .values({
          id: categoryId,
          diaryId: demoDiary.id,
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
            content:
              '선택한 UI 상태에 따라 화면 문구와 버튼 상태가 자연스럽게 바뀌는 컴포넌트를 구현하세요.',
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
              {
                id: 'empty-loading-error',
                label: '빈 상태, 로딩, 오류 상태를 처리한다',
              },
              {
                id: 'responsive',
                label: '모바일/데스크톱 레이아웃이 깨지지 않는다',
              },
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
              content:
                '선택한 UI 상태에 따라 화면 문구와 버튼 상태가 자연스럽게 바뀌는 컴포넌트를 구현하세요.',
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
                {
                  id: 'empty-loading-error',
                  label: '빈 상태, 로딩, 오류 상태를 처리한다',
                },
                {
                  id: 'responsive',
                  label: '모바일/데스크톱 레이아웃이 깨지지 않는다',
                },
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
      'challenge_categories',
      'diary_id',
      'ALTER TABLE challenge_categories ADD COLUMN diary_id TEXT',
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
    this.ensureColumn(
      'sql_practice_notes',
      'is_public',
      'ALTER TABLE sql_practice_notes ADD COLUMN is_public INTEGER DEFAULT 0 NOT NULL',
    );
    this.ensureColumn(
      'sql_practice_notes',
      'public_token',
      'ALTER TABLE sql_practice_notes ADD COLUMN public_token TEXT',
    );
    this.ensureColumn(
      'sql_practice_notes',
      'public_shared_at',
      'ALTER TABLE sql_practice_notes ADD COLUMN public_shared_at TEXT',
    );
    this.ensureColumn(
      'tasks',
      'scope',
      "ALTER TABLE tasks ADD COLUMN scope TEXT DEFAULT 'TEAM' NOT NULL",
    );
    this.ensureColumn(
      'tasks',
      'owner_id',
      'ALTER TABLE tasks ADD COLUMN owner_id TEXT',
    );
    this.ensureColumn(
      'tasks',
      'visibility',
      "ALTER TABLE tasks ADD COLUMN visibility TEXT DEFAULT 'TEAM' NOT NULL",
    );
    this.ensureColumn(
      'tasks',
      'mmd_content',
      "ALTER TABLE tasks ADD COLUMN mmd_content TEXT DEFAULT '' NOT NULL",
    );
    this.sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_study_diaries_user
        ON study_diaries(user_id);

      CREATE INDEX IF NOT EXISTS idx_challenge_categories_diary
        ON challenge_categories(diary_id, order_idx);

      CREATE INDEX IF NOT EXISTS idx_sql_practice_notes_public_token
        ON sql_practice_notes(public_token);

      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_scope
        ON tasks(assignee_id, scope, archived, status);

      CREATE INDEX IF NOT EXISTS idx_tasks_owner_scope
        ON tasks(owner_id, scope, archived, status);

      CREATE INDEX IF NOT EXISTS idx_tasks_visibility_updated
        ON tasks(visibility, archived, updated_at);
    `);

    const now = new Date().toISOString();
    const demoUser = this.ensureDemoUser(now);
    this.ensureStudyDiariesForUsers(now);
    this.backfillChallengeCategoryDiaries(demoUser.id, now);

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

  private reconcileAiNativeMenus(now: string) {
    let aiNativeGroup = this.sqlite
      .prepare(
        `SELECT id, display_order as displayOrder FROM menus WHERE section_id = 'ai_native_group' AND parent_id IS NULL LIMIT 1`,
      )
      .get() as { id: string; displayOrder: number } | undefined;

    const aiNativeGroupMenuId = randomUUID();

    if (!aiNativeGroup) {
      this.sqlite
        .prepare(`UPDATE menus SET display_order = display_order + 1, updated_at = ? WHERE parent_id IS NULL AND display_order >= 0`)
        .run(now);

      this.db
        .insert(menusTable)
        .values({
          id: aiNativeGroupMenuId,
          name: 'AI Native',
          sectionId: 'ai_native_group',
          icon: 'Bot',
          displayOrder: 0,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      aiNativeGroup = { id: aiNativeGroupMenuId, displayOrder: 0 };
    } else {
      this.sqlite
        .prepare(`UPDATE menus SET name = 'AI Native', icon = 'Bot', is_visible = 1, updated_at = ? WHERE id = ?`)
        .run(now, aiNativeGroup.id);
    }

    // ai_service_request — AI Native 1번째 자식
    const existingAiServiceRequest = this.sqlite
      .prepare(`SELECT id FROM menus WHERE section_id = 'ai_service_request' LIMIT 1`)
      .get() as { id: string } | undefined;

    if (!existingAiServiceRequest) {
      this.db
        .insert(menusTable)
        .values({
          id: randomUUID(),
          name: 'AI 서비스 신청',
          sectionId: 'ai_service_request',
          icon: 'FilePlus2',
          displayOrder: 0,
          isVisible: true,
          requiredRole: null,
          parentId: aiNativeGroup.id,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    } else {
      this.sqlite
        .prepare(`UPDATE menus SET name = 'AI 서비스 신청', icon = 'FilePlus2', parent_id = ?, display_order = 0, is_visible = 1, updated_at = ? WHERE id = ?`)
        .run(aiNativeGroup.id, now, existingAiServiceRequest.id);
    }

    // ai_methodology를 ai_native_group의 자식으로 이동
    this.sqlite
      .prepare(
        `UPDATE menus SET parent_id = ?, display_order = 1, updated_at = ? WHERE section_id = 'ai_methodology'`,
      )
      .run(aiNativeGroup.id, now);

    // ai_evaluation — AI Native 3번째 자식
    const existingAiEval = this.sqlite
      .prepare(`SELECT id FROM menus WHERE section_id = 'ai_evaluation' LIMIT 1`)
      .get() as { id: string } | undefined;

    if (!existingAiEval) {
      this.db
        .insert(menusTable)
        .values({
          id: randomUUID(),
          name: 'AI 활용 능력 평가',
          sectionId: 'ai_evaluation',
          icon: 'ClipboardCheck',
          displayOrder: 2,
          isVisible: true,
          requiredRole: null,
          parentId: aiNativeGroup.id,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    } else {
      this.sqlite
        .prepare(`UPDATE menus SET name = 'AI 활용 능력 평가', icon = 'ClipboardCheck', parent_id = ?, display_order = 2, is_visible = 1, updated_at = ? WHERE id = ?`)
        .run(aiNativeGroup.id, now, existingAiEval.id);
    }
  }

  private seedEvalCategories() {
    const categories = [
      { id: 'cat_tech',   name: '기술 역량',   displayOrder: 0 },
      { id: 'cat_collab', name: '협업 역량',   displayOrder: 1 },
      { id: 'cat_prod',   name: '업무 생산성', displayOrder: 2 },
    ];
    for (const cat of categories) {
      const existing = this.sqlite
        .prepare(`SELECT id FROM eval_categories WHERE id = ?`)
        .get(cat.id);
      if (!existing) {
        this.db.insert(evalCategoriesTable).values(cat).run();
      }
    }
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
            SET name = '학습 일지',
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
          name: '학습 일지',
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
            SET name = '학습 일지',
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
      .prepare(
        "SELECT id FROM menus WHERE section_id = 'dev_challenge' LIMIT 1",
      )
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
          name: 'Challenge',
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
            SET name = 'Challenge',
                icon = 'Trophy',
                is_visible = 1,
                updated_at = ?
            WHERE section_id = 'dev_challenge'
          `,
        )
        .run(now);
    }
  }

  private reconcileSqlPracticeMenus(now: string) {
    const apiDocMenu = this.sqlite
      .prepare(
        `
          SELECT display_order as displayOrder
          FROM menus
          WHERE section_id = 'api_doc'
          ORDER BY display_order ASC
          LIMIT 1
        `,
      )
      .get() as { displayOrder: number } | undefined;

    const existingOfficialMenu = this.sqlite
      .prepare(
        `
          SELECT id, parent_id as parentId, display_order as displayOrder
          FROM menus
          WHERE section_id = 'sql'
          ORDER BY rowid ASC
          LIMIT 1
        `,
      )
      .get() as
      | { id: string; parentId: string | null; displayOrder: number }
      | undefined;

    let sqlGroupMenu = this.sqlite
      .prepare(
        `
          SELECT id, display_order as displayOrder
          FROM menus
          WHERE section_id = 'sql_group'
          ORDER BY rowid ASC
          LIMIT 1
        `,
      )
      .get() as { id: string; displayOrder: number } | undefined;

    if (!sqlGroupMenu) {
      const displayOrder =
        existingOfficialMenu?.parentId === null
          ? existingOfficialMenu.displayOrder
          : (apiDocMenu?.displayOrder ?? 4) + 1;
      const sqlGroupMenuId = randomUUID();

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
          id: sqlGroupMenuId,
          name: 'SQL Prac',
          sectionId: 'sql_group',
          icon: 'Database',
          displayOrder,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      sqlGroupMenu = { id: sqlGroupMenuId, displayOrder };
    } else {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET name = 'SQL Prac',
                icon = 'Database',
                parent_id = NULL,
                is_visible = 1,
                required_role = NULL,
                updated_at = ?
            WHERE id = ?
          `,
        )
        .run(now, sqlGroupMenu.id);
    }

    this.upsertMenuBySectionId({
      sectionId: 'sql',
      name: 'SQL 연습장(공식)',
      icon: 'Database',
      displayOrder: 0,
      parentId: sqlGroupMenu.id,
      requiredRole: null,
      now,
    });

    this.upsertMenuBySectionId({
      sectionId: 'sql_user',
      name: 'SQL 연습장(유저)',
      icon: 'FileUp',
      displayOrder: 1,
      parentId: sqlGroupMenu.id,
      requiredRole: null,
      now,
    });

    this.upsertMenuBySectionId({
      sectionId: 'sql_personal',
      name: 'SQL 연습장(개인)',
      icon: 'UserRound',
      displayOrder: 2,
      parentId: sqlGroupMenu.id,
      requiredRole: null,
      now,
    });

    const existingSqlExamplesMenu = this.sqlite
      .prepare(
        `
          SELECT id
          FROM menus
          WHERE section_id = 'sql_examples'
          ORDER BY rowid ASC
          LIMIT 1
        `,
      )
      .get() as { id: string } | undefined;

    if (existingSqlExamplesMenu) {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET name = 'SQL 예제',
                icon = 'BookOpenCheck',
                display_order = 3,
                parent_id = ?,
                is_visible = 1,
                required_role = NULL,
                updated_at = ?
            WHERE id = ?
          `,
        )
        .run(sqlGroupMenu.id, now, existingSqlExamplesMenu.id);
    } else {
      this.db
        .insert(menusTable)
        .values({
          id: randomUUID(),
          name: 'SQL 예제',
          sectionId: 'sql_examples',
          icon: 'BookOpenCheck',
          displayOrder: 3,
          isVisible: true,
          requiredRole: null,
          parentId: sqlGroupMenu.id,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    this.sqlite
      .prepare(
        `
          DELETE FROM menus
          WHERE section_id IN ('sql_group', 'sql', 'sql_user', 'sql_personal', 'sql_examples')
            AND rowid NOT IN (
              SELECT MIN(rowid)
              FROM menus
              WHERE section_id IN ('sql_group', 'sql', 'sql_user', 'sql_personal', 'sql_examples')
              GROUP BY section_id
            )
        `,
      )
      .run();
  }

  private seedBoardConfigs(now: string) {
    const defaults = [
      {
        id: 'board-config-notice',
        code: 'notice',
        kind: 'NOTICE' as const,
        name: '공지사항',
        description: '프로젝트 공지와 안내를 확인합니다.',
        allowUserWrite: false,
        allowComment: false,
        isActive: true,
        orderIdx: 0,
      },
      {
        id: 'board-config-inquiry',
        code: 'inquiry',
        kind: 'INQUIRY' as const,
        name: '문의 게시판',
        description: '질문과 요청을 남기고 답변을 확인합니다.',
        allowUserWrite: true,
        allowComment: true,
        isActive: true,
        orderIdx: 1,
      },
      {
        id: 'board-config-qna',
        code: 'qna',
        kind: 'QNA' as const,
        name: 'Q&A 게시판',
        description: '구현과 사용 중 생긴 질문을 공유합니다.',
        allowUserWrite: true,
        allowComment: true,
        isActive: true,
        orderIdx: 2,
      },
      {
        id: 'board-config-free',
        code: 'free',
        kind: 'FREE' as const,
        name: '자유 게시판',
        description: '자유롭게 의견과 정보를 나눕니다.',
        allowUserWrite: true,
        allowComment: true,
        isActive: true,
        orderIdx: 3,
      },
    ];

    for (const config of defaults) {
      this.db
        .insert(boardConfigsTable)
        .values({
          ...config,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: boardConfigsTable.code,
          set: {
            kind: config.kind,
            name: config.name,
            description: config.description,
            orderIdx: config.orderIdx,
            updatedAt: now,
          },
        })
        .run();
    }
  }

  private reconcileBoardMenus(now: string) {
    let boardMenu = this.sqlite
      .prepare(
        `
          SELECT id, display_order as displayOrder
          FROM menus
          WHERE section_id = 'boards'
          ORDER BY display_order ASC
          LIMIT 1
        `,
      )
      .get() as { id: string; displayOrder: number } | undefined;

    if (!boardMenu) {
      const adminMenu = this.sqlite
        .prepare(
          `
            SELECT display_order as displayOrder
            FROM menus
            WHERE section_id = 'admin_dropdown'
            ORDER BY display_order ASC
            LIMIT 1
          `,
        )
        .get() as { displayOrder: number } | undefined;
      const displayOrder = adminMenu?.displayOrder ?? 11;

      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET display_order = display_order + 1, updated_at = ?
            WHERE parent_id IS NULL AND display_order >= ?
          `,
        )
        .run(now, displayOrder);

      boardMenu = {
        id: randomUUID(),
        displayOrder,
      };

      this.db
        .insert(menusTable)
        .values({
          id: boardMenu.id,
          name: '게시판',
          sectionId: 'boards',
          icon: 'MessageSquareText',
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
            SET name = '게시판',
                icon = 'MessageSquareText',
                is_visible = 1,
                required_role = NULL,
                updated_at = ?
            WHERE id = ?
          `,
        )
        .run(now, boardMenu.id);
    }

    this.upsertMenuBySectionId({
      sectionId: 'board_notice',
      name: '공지사항',
      icon: 'Megaphone',
      displayOrder: 0,
      parentId: boardMenu.id,
      requiredRole: null,
      now,
    });

    this.upsertMenuBySectionId({
      sectionId: 'board_inquiry',
      name: '문의 게시판',
      icon: 'MessagesSquare',
      displayOrder: 1,
      parentId: boardMenu.id,
      requiredRole: null,
      now,
    });

    this.upsertMenuBySectionId({
      sectionId: 'board_qna',
      name: 'Q&A 게시판',
      icon: 'CircleHelp',
      displayOrder: 2,
      parentId: boardMenu.id,
      requiredRole: null,
      now,
    });

    this.upsertMenuBySectionId({
      sectionId: 'board_free',
      name: '자유 게시판',
      icon: 'MessageCircle',
      displayOrder: 3,
      parentId: boardMenu.id,
      requiredRole: null,
      now,
    });

    const adminMenu = this.sqlite
      .prepare(
        `
          SELECT id
          FROM menus
          WHERE section_id = 'admin_dropdown'
             OR (parent_id IS NULL AND required_role = 'admin')
          ORDER BY display_order ASC
          LIMIT 1
        `,
      )
      .get() as { id: string } | undefined;

    if (adminMenu) {
      this.upsertMenuBySectionId({
        sectionId: 'admin_board_configs',
        name: '게시판 설정',
        icon: 'Settings2',
        displayOrder: 3,
        parentId: adminMenu.id,
        requiredRole: 'admin',
        now,
      });

      this.upsertMenuBySectionId({
        sectionId: 'admin_boards',
        name: '게시글 관리',
        icon: 'Newspaper',
        displayOrder: 4,
        parentId: adminMenu.id,
        requiredRole: 'admin',
        now,
      });
    }

    this.sqlite
      .prepare(
        `
          DELETE FROM menus
          WHERE section_id IN (
            'boards',
            'board_notice',
            'board_inquiry',
            'board_qna',
            'board_free',
            'admin_board_configs',
            'admin_boards'
          )
            AND rowid NOT IN (
              SELECT MIN(rowid)
              FROM menus
              WHERE section_id IN (
                'boards',
                'board_notice',
                'board_inquiry',
                'board_qna',
                'board_free',
                'admin_board_configs',
                'admin_boards'
              )
              GROUP BY section_id
            )
        `,
      )
      .run();
  }

  private upsertMenuBySectionId(input: {
    sectionId: string;
    name: string;
    icon: string;
    displayOrder: number;
    parentId: string | null;
    requiredRole: string | null;
    now: string;
  }) {
    const existing = this.sqlite
      .prepare('SELECT id FROM menus WHERE section_id = ? LIMIT 1')
      .get(input.sectionId) as { id: string } | undefined;

    if (existing) {
      this.db
        .update(menusTable)
        .set({
          name: input.name,
          icon: input.icon,
          displayOrder: input.displayOrder,
          parentId: input.parentId,
          requiredRole: input.requiredRole,
          isVisible: true,
          updatedAt: input.now,
        })
        .where(eq(menusTable.id, existing.id))
        .run();
      return;
    }

    this.db
      .insert(menusTable)
      .values({
        id: randomUUID(),
        parentId: input.parentId,
        name: input.name,
        sectionId: input.sectionId,
        icon: input.icon,
        displayOrder: input.displayOrder,
        isVisible: true,
        requiredRole: input.requiredRole,
        createdAt: input.now,
        updatedAt: input.now,
      })
      .run();
  }

  private reconcileTaskMenus(now: string) {
    let taskMenu = this.sqlite
      .prepare(
        `
          SELECT id, display_order as displayOrder
          FROM menus
          WHERE section_id IN ('task_group', 'task')
            AND parent_id IS NULL
          ORDER BY
            CASE WHEN section_id = 'task_group' THEN 0 ELSE 1 END,
            display_order ASC
          LIMIT 1
        `,
      )
      .get() as { id: string; displayOrder: number } | undefined;

    if (!taskMenu) {
      const prototypeMenu = this.sqlite
        .prepare(
          `
            SELECT display_order as displayOrder
            FROM menus
            WHERE section_id = 'prototype'
            ORDER BY display_order ASC
            LIMIT 1
          `,
        )
        .get() as { displayOrder: number } | undefined;
      const displayOrder = (prototypeMenu?.displayOrder ?? 2) + 1;

      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET display_order = display_order + 1, updated_at = ?
            WHERE parent_id IS NULL AND display_order >= ?
          `,
        )
        .run(now, displayOrder);

      const taskMenuId = randomUUID();
      this.db
        .insert(menusTable)
        .values({
          id: taskMenuId,
          name: '업무 관리',
          sectionId: 'task_group',
          icon: 'CheckSquare',
          displayOrder,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      taskMenu = { id: taskMenuId, displayOrder };
    } else {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET name = '업무 관리',
                section_id = 'task_group',
                icon = 'CheckSquare',
                is_visible = 1,
                updated_at = ?
            WHERE id = ?
          `,
        )
        .run(now, taskMenu.id);
    }

    this.sqlite
      .prepare(
        `
          UPDATE menus
          SET is_visible = 0, updated_at = ?
          WHERE section_id = 'task'
            AND id <> ?
        `,
      )
      .run(now, taskMenu.id);

    const children = [
      {
        name: '전체 업무',
        sectionId: 'task_all',
        icon: 'ListChecks',
        displayOrder: 0,
      },
      {
        name: '내 업무',
        sectionId: 'task_my',
        icon: 'UserCheck',
        displayOrder: 1,
      },
      {
        name: '프로젝트 이슈',
        sectionId: 'project_issues',
        icon: 'ShieldAlert',
        displayOrder: 2,
      },
    ];

    for (const child of children) {
      const existing = this.sqlite
        .prepare('SELECT id FROM menus WHERE section_id = ? LIMIT 1')
        .get(child.sectionId) as { id: string } | undefined;

      if (existing) {
        this.sqlite
          .prepare(
            `
              UPDATE menus
              SET parent_id = ?,
                  name = ?,
                  icon = ?,
                  display_order = ?,
                  is_visible = 1,
                  required_role = NULL,
                  updated_at = ?
              WHERE id = ?
            `,
          )
          .run(
            taskMenu.id,
            child.name,
            child.icon,
            child.displayOrder,
            now,
            existing.id,
          );
      } else {
        this.db
          .insert(menusTable)
          .values({
            id: randomUUID(),
            parentId: taskMenu.id,
            name: child.name,
            sectionId: child.sectionId,
            icon: child.icon,
            displayOrder: child.displayOrder,
            isVisible: true,
            requiredRole: null,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    }

    this.sqlite
      .prepare(
        `
          UPDATE menus
          SET is_visible = 0, updated_at = ?
          WHERE section_id = 'task_issues'
        `,
      )
      .run(now);
  }

  private migrateChatSchema() {
    const hasUserIdCol = (this.sqlite
      .prepare(`PRAGMA table_info(chat_sessions)`)
      .all() as Array<{ name: string }>)
      .some((col) => col.name === 'user_id');

    if (!hasUserIdCol) {
      // 기존 데이터는 user_id 없으므로 초기화 후 컬럼 추가
      this.sqlite.exec(`DELETE FROM chat_messages`);
      this.sqlite.exec(`DELETE FROM chat_sessions`);
      this.sqlite.exec(
        `ALTER TABLE chat_sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
      );
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

  private migrateProjectIssueSchema() {
    const table = this.sqlite
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_issues'",
      )
      .get() as { name: string } | undefined;

    if (!table) return;

    const foreignKeys = this.sqlite
      .prepare('PRAGMA foreign_key_list(project_issues)')
      .all() as Array<{ from: string; table: string }>;
    const projectIdForeignKey = foreignKeys.find(
      (key) => key.from === 'project_id',
    );

    if (projectIdForeignKey?.table !== 'categories') return;

    const now = new Date().toISOString();
    this.sqlite
      .prepare(
        `
          INSERT OR IGNORE INTO project_issue_categories (
            id, name, description, order_idx, archived, created_by, created_at, updated_at
          )
          SELECT
            categories.id,
            categories.title,
            categories.summary,
            categories.order_idx,
            0,
            categories.user_id,
            ?,
            ?
          FROM categories
          WHERE EXISTS (
            SELECT 1 FROM project_issues
            WHERE project_issues.project_id = categories.id
          )
        `,
      )
      .run(now, now);

    this.sqlite
      .prepare(
        `
          INSERT OR IGNORE INTO project_issue_categories (
            id, name, description, order_idx, archived, created_by, created_at, updated_at
          )
          SELECT DISTINCT
            project_id,
            '이슈 카테고리',
            '',
            0,
            0,
            reporter_id,
            created_at,
            updated_at
          FROM project_issues
        `,
      )
      .run();

    this.sqlite.pragma('foreign_keys = OFF');
    try {
      this.sqlite.exec(`
        DROP TABLE IF EXISTS project_issues_next;

        CREATE TABLE IF NOT EXISTS project_issues_next (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          issue_type TEXT NOT NULL DEFAULT 'BUG',
          status TEXT NOT NULL DEFAULT 'OPEN',
          priority TEXT NOT NULL DEFAULT 'MEDIUM',
          reporter_id TEXT NOT NULL,
          assignee_id TEXT,
          due_date TEXT,
          order_idx INTEGER NOT NULL DEFAULT 0,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(project_id) REFERENCES project_issue_categories(id) ON DELETE CASCADE,
          FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(assignee_id) REFERENCES users(id) ON DELETE SET NULL
        );

        INSERT INTO project_issues_next (
          id, project_id, title, content, issue_type, status, priority, reporter_id,
          assignee_id, due_date, order_idx, archived, created_at, updated_at
        )
        SELECT
          id, project_id, title, content, issue_type, status, priority, reporter_id,
          assignee_id, due_date, order_idx, archived, created_at, updated_at
        FROM project_issues;

        DROP TABLE project_issues;
        ALTER TABLE project_issues_next RENAME TO project_issues;

        CREATE INDEX IF NOT EXISTS idx_project_issues_project_order
          ON project_issues(project_id, archived, status, order_idx);
        CREATE INDEX IF NOT EXISTS idx_project_issues_assignee
          ON project_issues(assignee_id, archived, status);
        CREATE INDEX IF NOT EXISTS idx_project_issues_reporter
          ON project_issues(reporter_id, created_at);
      `);
    } finally {
      this.sqlite.pragma('foreign_keys = ON');
    }
  }

  private ensureStudyDiariesForUsers(now: string) {
    const users = this.sqlite
      .prepare('SELECT id, name FROM users')
      .all() as Array<{ id: string; name: string }>;

    const insertDiary = this.sqlite.prepare(`
      INSERT INTO study_diaries (
        id, user_id, title, description, visibility, created_at, updated_at
      )
      SELECT ?, ?, ?, NULL, 'private', ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM study_diaries WHERE user_id = ?
      )
    `);

    for (const user of users) {
      insertDiary.run(
        randomUUID(),
        user.id,
        `${user.name}의 스터디 다이어리`,
        now,
        now,
        user.id,
      );
    }
  }

  private ensureStudyDiaryForUser(
    userId: string,
    userName: string,
    now: string,
  ) {
    const existing = this.sqlite
      .prepare('SELECT id FROM study_diaries WHERE user_id = ? LIMIT 1')
      .get(userId) as { id: string } | undefined;

    if (existing) {
      return existing;
    }

    const diary = { id: randomUUID() };
    this.sqlite
      .prepare(
        `
          INSERT INTO study_diaries (
            id, user_id, title, description, visibility, created_at, updated_at
          ) VALUES (?, ?, ?, NULL, 'private', ?, ?)
        `,
      )
      .run(diary.id, userId, `${userName}의 스터디 다이어리`, now, now);

    return diary;
  }

  private backfillChallengeCategoryDiaries(
    fallbackUserId: string,
    now: string,
  ) {
    const fallbackUser = this.sqlite
      .prepare('SELECT id, name FROM users WHERE id = ? LIMIT 1')
      .get(fallbackUserId) as { id: string; name: string } | undefined;

    if (!fallbackUser) {
      return;
    }

    const fallbackDiary = this.ensureStudyDiaryForUser(
      fallbackUser.id,
      fallbackUser.name,
      now,
    );

    this.sqlite
      .prepare(
        `
          UPDATE challenge_categories
          SET diary_id = (
            SELECT study_diaries.id
            FROM study_diaries
            WHERE study_diaries.user_id = challenge_categories.created_by
            LIMIT 1
          )
          WHERE diary_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM study_diaries
              WHERE study_diaries.user_id = challenge_categories.created_by
            )
        `,
      )
      .run();

    this.sqlite
      .prepare(
        `
          UPDATE challenge_categories
          SET diary_id = ?
          WHERE diary_id IS NULL
        `,
      )
      .run(fallbackDiary.id);
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
      { email: 'test11@hibot.dev', name: '신도윤' },
      { email: 'test12@hibot.dev', name: '류지아' },
      { email: 'test13@hibot.dev', name: '문준혁' },
      { email: 'test14@hibot.dev', name: '배나은' },
      { email: 'test15@hibot.dev', name: '전승호' },
      { email: 'test16@hibot.dev', name: '조하린' },
      { email: 'test17@hibot.dev', name: '엄태경' },
      { email: 'test18@hibot.dev', name: '남유진' },
      { email: 'test19@hibot.dev', name: '황재원' },
      { email: 'test20@hibot.dev', name: '서다인' },
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
