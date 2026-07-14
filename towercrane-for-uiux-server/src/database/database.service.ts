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
  devChallengeWorkspacesTable,
  devChallengeWorkspaceMembersTable,
  devChallengeCategoriesTable,
  devChallengeSectionsTable,
  devChallengeAssignmentsTable,
  devChallengeAssignmentBlocksTable,
  featurePlansTable,
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

  // study-plan → ai-study-note rename: 기존 데이터를 새 이름 테이블로 보존/이관.
  // 신 테이블이 이미 만들어졌더라도 비어있으면 버리고 데이터가 든 구 테이블로 교체한다. (멱등)
  private renameStudyPlanTables() {
    const renames: [string, string][] = [
      ['study_plans', 'ai_study_notes'],
      ['study_plan_items', 'ai_study_note_items'],
      ['study_plan_item_notes', 'ai_study_note_item_notes'],
    ];
    const exists = (name: string) =>
      Boolean(
        this.sqlite
          .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
          .get(name),
      );
    const rowCount = (name: string) =>
      (this.sqlite.prepare(`SELECT count(*) AS c FROM ${name}`).get() as {
        c: number;
      }).c;

    if (!renames.some(([oldName]) => exists(oldName))) return;

    this.sqlite.pragma('foreign_keys = OFF');
    this.sqlite.transaction(() => {
      for (const [oldName, newName] of renames) {
        if (!exists(oldName)) continue;
        if (exists(newName)) {
          if (rowCount(newName) > 0) continue; // 신 테이블에 데이터 있으면 손대지 않음
          this.sqlite.exec(`DROP TABLE ${newName}`); // 빈 신 테이블 폐기
        }
        this.sqlite.exec(`ALTER TABLE ${oldName} RENAME TO ${newName}`);
      }
    })();
    this.sqlite.pragma('foreign_keys = ON');
  }

  // visibility 'shared' 값 폐기 → 'public'으로 정규화 (멱등).
  // ai_study_notes가 있을 때만 실행(신규 설치엔 shared 데이터가 없으므로 no-op).
  private normalizeAiStudyNoteVisibility() {
    const exists = Boolean(
      this.sqlite
        .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
        .get('ai_study_notes'),
    );
    if (!exists) return;
    this.sqlite.exec(
      "UPDATE ai_study_notes SET visibility='public' WHERE visibility='shared'",
    );
  }

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
    this.sqlite.pragma('busy_timeout = 5000');
    this.db = drizzle(this.sqlite, { schema });

    // 테이블 생성 전에 구 study_plan 테이블을 ai_study_note로 rename (데이터 보존)
    this.renameStudyPlanTables();
    // 폐기된 'shared' 공개범위를 'public'으로 정규화
    this.normalizeAiStudyNoteVisibility();

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

      CREATE INDEX IF NOT EXISTS idx_study_diaries_user
        ON study_diaries(user_id, created_at);

      CREATE TABLE IF NOT EXISTS ax_study_workspaces (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        visibility TEXT NOT NULL DEFAULT 'private',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ax_study_workspaces_user
        ON ax_study_workspaces(user_id, created_at);

      CREATE TABLE IF NOT EXISTS ax_study_notes (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES ax_study_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ax_study_notes_workspace
        ON ax_study_notes(workspace_id, order_idx);

      CREATE TABLE IF NOT EXISTS ai_study_notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        visibility TEXT NOT NULL DEFAULT 'private',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ai_study_notes_user
        ON ai_study_notes(user_id, created_at);

      CREATE TABLE IF NOT EXISTS ai_study_note_items (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        resource_url TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(plan_id) REFERENCES ai_study_notes(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ai_study_note_items_plan
        ON ai_study_note_items(plan_id, order_idx);

      CREATE TABLE IF NOT EXISTS ai_study_note_item_notes (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(item_id) REFERENCES ai_study_note_items(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ai_study_note_item_notes_item
        ON ai_study_note_item_notes(item_id, order_idx);

      CREATE TABLE IF NOT EXISTS ax_board_posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'free',
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ax_board_posts_category
        ON ax_board_posts(category, created_at);

      CREATE TABLE IF NOT EXISTS ax_board_comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(post_id) REFERENCES ax_board_posts(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_ax_board_comments_post
        ON ax_board_comments(post_id, created_at);

      CREATE TABLE IF NOT EXISTS prototype_workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS prototype_workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES prototype_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(workspace_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        group_name TEXT NOT NULL,
        icon_key TEXT NOT NULL,
        tags TEXT NOT NULL,
        checklist TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES prototype_workspaces(id) ON DELETE CASCADE,
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

      CREATE TABLE IF NOT EXISTS page_views (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        visitor_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        path TEXT NOT NULL,
        referrer TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_page_views_created_at
        ON page_views(created_at);
      CREATE INDEX IF NOT EXISTS idx_page_views_path
        ON page_views(path);
      CREATE INDEX IF NOT EXISTS idx_page_views_visitor
        ON page_views(visitor_id);

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

      CREATE TABLE IF NOT EXISTS api_doc_teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        emoji TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_api_doc_teams_order
        ON api_doc_teams(order_idx);

      CREATE TABLE IF NOT EXISTS api_doc_categories (
        id TEXT PRIMARY KEY,
        team_id TEXT,
        name TEXT NOT NULL,
        icon TEXT,
        emoji TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(team_id) REFERENCES api_doc_teams(id) ON DELETE CASCADE,
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

      CREATE TABLE IF NOT EXISTS meeting_workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS meeting_workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES meeting_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(workspace_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS task_workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS task_workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES task_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(workspace_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        acceptance_criteria TEXT NOT NULL DEFAULT '',
        plan TEXT NOT NULL DEFAULT '',
        folder_structure TEXT NOT NULL DEFAULT '',
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
        FOREIGN KEY(workspace_id) REFERENCES task_workspaces(id) ON DELETE SET NULL,
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

      CREATE TABLE IF NOT EXISTS task_references (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reference_type TEXT NOT NULL DEFAULT 'URL',
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_references_task_order
        ON task_references(task_id, order_idx, created_at);

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

      CREATE TABLE IF NOT EXISTS task_ai_reviews (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        format TEXT NOT NULL DEFAULT 'MARKDOWN',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'CODEX',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_ai_reviews_task_created
        ON task_ai_reviews(task_id, created_at);

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

      CREATE TABLE IF NOT EXISTS team_doc_nodes (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        order_idx INTEGER NOT NULL DEFAULT 0,
        content TEXT,
        file_url TEXT,
        file_name TEXT,
        content_type TEXT,
        file_size INTEGER,
        created_by TEXT,
        updated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(parent_id) REFERENCES team_doc_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_team_doc_nodes_parent_order
        ON team_doc_nodes(parent_id, order_idx);

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
        pinned INTEGER NOT NULL DEFAULT 0,
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

      CREATE TABLE IF NOT EXISTS meeting_room_reads (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        last_read_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(room_id) REFERENCES meeting_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(room_id, user_id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_room_reads_room_user
        ON meeting_room_reads(room_id, user_id);

      CREATE TABLE IF NOT EXISTS dev_management_rooms (
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

      CREATE INDEX IF NOT EXISTS idx_dev_management_rooms_order
        ON dev_management_rooms(archived, order_idx, created_at);

      CREATE TABLE IF NOT EXISTS dev_management_messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        sender_id TEXT,
        sender_type TEXT NOT NULL DEFAULT 'USER',
        sender_name TEXT NOT NULL,
        sender_role TEXT,
        content TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'TEXT',
        payload TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(room_id) REFERENCES dev_management_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_dev_management_messages_room_created
        ON dev_management_messages(room_id, created_at);

      CREATE TABLE IF NOT EXISTS dev_meeting_minutes (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        discussion_points TEXT NOT NULL DEFAULT '[]',
        decisions TEXT NOT NULL DEFAULT '[]',
        action_items TEXT NOT NULL DEFAULT '[]',
        open_questions TEXT NOT NULL DEFAULT '[]',
        source_message_ids TEXT NOT NULL DEFAULT '[]',
        created_by TEXT,
        created_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(room_id) REFERENCES dev_management_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_dev_meeting_minutes_room_created
        ON dev_meeting_minutes(room_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_dev_meeting_minutes_created
        ON dev_meeting_minutes(created_at);

      CREATE TABLE IF NOT EXISTS code_reviews (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        source_type TEXT NOT NULL,
        source_url TEXT NOT NULL,
        repository TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        findings TEXT NOT NULL DEFAULT '[]',
        test_gaps TEXT NOT NULL DEFAULT '[]',
        changed_files TEXT NOT NULL DEFAULT '[]',
        excluded_files TEXT NOT NULL DEFAULT '[]',
        diff_hash TEXT NOT NULL,
        diff_snapshot TEXT,
        model TEXT,
        created_by TEXT,
        created_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_code_reviews_source_hash
        ON code_reviews(source_url, diff_hash);

      CREATE INDEX IF NOT EXISTS idx_code_reviews_repository_created
        ON code_reviews(repository, created_at);

      CREATE TABLE IF NOT EXISTS feature_plans (
        id TEXT PRIMARY KEY,
        linked_task_id TEXT,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        acceptance_criteria TEXT NOT NULL DEFAULT '',
        plan TEXT NOT NULL DEFAULT '',
        folder_structure TEXT NOT NULL DEFAULT '',
        checklist TEXT NOT NULL DEFAULT '[]',
        mmd_content TEXT NOT NULL DEFAULT '',
        source_file_name TEXT,
        created_by TEXT,
        created_by_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(linked_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_feature_plans_created
        ON feature_plans(created_at);

      CREATE INDEX IF NOT EXISTS idx_feature_plans_linked_task
        ON feature_plans(linked_task_id);

      CREATE TABLE IF NOT EXISTS dev_management_bot_settings (
        room_id TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 1,
        response_mode TEXT NOT NULL DEFAULT 'MENTION_ONLY',
        updated_by TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(room_id) REFERENCES dev_management_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS dev_management_dm_pairs (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        user_a_id TEXT NOT NULL,
        user_b_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(room_id) REFERENCES dev_management_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY(user_a_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(user_b_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_a_id, user_b_id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_management_dm_pairs_users
        ON dev_management_dm_pairs(user_a_id, user_b_id);

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

      CREATE TABLE IF NOT EXISTS sql_team_practice_workspaces (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        active_schema_version_id TEXT,
        created_by TEXT NOT NULL,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_sql_team_workspaces_updated
        ON sql_team_practice_workspaces(archived, updated_at);

      CREATE TABLE IF NOT EXISTS sql_team_practice_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES sql_team_practice_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_sql_team_members_workspace_user
        ON sql_team_practice_members(workspace_id, user_id);

      CREATE INDEX IF NOT EXISTS idx_sql_team_members_user
        ON sql_team_practice_members(user_id, role);

      CREATE TABLE IF NOT EXISTS sql_team_practice_schema_versions (
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
        FOREIGN KEY(workspace_id) REFERENCES sql_team_practice_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_sql_team_schema_versions_workspace_version
        ON sql_team_practice_schema_versions(workspace_id, version);

      CREATE INDEX IF NOT EXISTS idx_sql_team_schema_versions_workspace_created
        ON sql_team_practice_schema_versions(workspace_id, created_at);

      CREATE TABLE IF NOT EXISTS sql_team_practice_problems (
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
        updated_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES sql_team_practice_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(schema_version_id) REFERENCES sql_team_practice_schema_versions(id) ON DELETE RESTRICT,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sql_team_problems_workspace_level
        ON sql_team_practice_problems(workspace_id, level, status, updated_at);

      CREATE INDEX IF NOT EXISTS idx_sql_team_problems_schema
        ON sql_team_practice_problems(schema_version_id, updated_at);

      CREATE INDEX IF NOT EXISTS idx_sql_team_problems_creator
        ON sql_team_practice_problems(created_by, updated_at);

      CREATE TABLE IF NOT EXISTS sql_team_practice_submissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        problem_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        schema_version_id TEXT NOT NULL,
        submitted_sql TEXT NOT NULL,
        answer_sql TEXT NOT NULL,
        is_correct INTEGER NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        max_score INTEGER NOT NULL DEFAULT 1,
        feedback TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(problem_id) REFERENCES sql_team_practice_problems(id) ON DELETE CASCADE,
        FOREIGN KEY(workspace_id) REFERENCES sql_team_practice_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(schema_version_id) REFERENCES sql_team_practice_schema_versions(id) ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_sql_team_submissions_user_problem_created
        ON sql_team_practice_submissions(user_id, problem_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_sql_team_submissions_problem_created
        ON sql_team_practice_submissions(problem_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_sql_team_submissions_workspace_score
        ON sql_team_practice_submissions(workspace_id, user_id, is_correct, created_at);

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

      CREATE TABLE IF NOT EXISTS dev_challenge_workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT 'Trophy',
        color TEXT,
        order_idx INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS dev_challenge_workspace_members (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES dev_challenge_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(workspace_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS dev_challenge_categories (
        id TEXT PRIMARY KEY,
        workspace_id TEXT,
        name TEXT NOT NULL,
        summary TEXT,
        icon TEXT NOT NULL DEFAULT 'Trophy',
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(workspace_id) REFERENCES dev_challenge_workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_dev_challenge_workspaces_order
        ON dev_challenge_workspaces(archived, order_idx, created_at);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_challenge_workspace_members_unique
        ON dev_challenge_workspace_members(workspace_id, user_id);

      CREATE INDEX IF NOT EXISTS idx_dev_challenge_workspace_members_user
        ON dev_challenge_workspace_members(user_id, workspace_id);

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

      CREATE TABLE IF NOT EXISTS knowledge_documents (
        id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        content_markdown TEXT NOT NULL DEFAULT '',
        content_json TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft',
        visibility TEXT NOT NULL DEFAULT 'all',
        owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        owner_name TEXT NOT NULL,
        effective_from TEXT,
        effective_to TEXT,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        published_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_knowledge_documents_channel_status_updated
        ON knowledge_documents(channel, status, updated_at);

      CREATE INDEX IF NOT EXISTS idx_knowledge_documents_owner
        ON knowledge_documents(owner_id, updated_at);

      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
        channel TEXT NOT NULL,
        chunk_index INTEGER NOT NULL DEFAULT 0,
        heading_path TEXT,
        chunk_text TEXT NOT NULL,
        token_estimate INTEGER,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document
        ON knowledge_chunks(document_id, chunk_index);

      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_channel
        ON knowledge_chunks(channel, created_at);

      CREATE TABLE IF NOT EXISTS usage_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        user_name TEXT NOT NULL,
        session_id TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt_tokens INTEGER NOT NULL DEFAULT 0,
        completion_tokens INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        estimated_cost_usd REAL NOT NULL DEFAULT 0,
        is_error INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date
        ON usage_logs(user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at
        ON usage_logs(created_at DESC);

      CREATE TABLE IF NOT EXISTS ai_service_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        user_name TEXT NOT NULL,
        service_type TEXT NOT NULL,
        purpose TEXT NOT NULL,
        estimated_usage TEXT NOT NULL,
        security_level TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reject_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ai_service_requests_user
        ON ai_service_requests(user_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_ai_service_requests_status
        ON ai_service_requests(status, created_at DESC);

      CREATE TABLE IF NOT EXISTS point_accounts (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        balance INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS point_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        ref_type TEXT,
        ref_id TEXT,
        memo TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_point_transactions_user
        ON point_transactions(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS point_topups (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        amount_krw INTEGER NOT NULL,
        points INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'paid',
        provider TEXT NOT NULL DEFAULT 'mock',
        provider_tx_id TEXT,
        created_at TEXT NOT NULL,
        paid_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_point_topups_user
        ON point_topups(user_id, created_at DESC);

      -- 멱등 보장: 같은 PG 결제건(provider + provider_tx_id)으로 중복 적립 방지
      CREATE UNIQUE INDEX IF NOT EXISTS idx_point_topups_provider_tx
        ON point_topups(provider, provider_tx_id);

      -- 조직도: 부서(본부 > 팀 계층). parent_id 자기참조
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT REFERENCES departments(id),
        order_idx INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_departments_parent
        ON departments(parent_id, order_idx);

      -- 전자결재 (towercrane-approval-system)
      CREATE TABLE IF NOT EXISTS approval_requests (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'GENERAL',
        status TEXT NOT NULL DEFAULT 'PENDING',
        meta TEXT,
        submitter_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(submitter_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_approval_requests_submitter
        ON approval_requests(submitter_id, created_at);

      CREATE TABLE IF NOT EXISTS approval_steps (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        approver_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        comment TEXT,
        acted_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
        FOREIGN KEY(approver_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_approval_steps_request
        ON approval_steps(request_id, "order");

      CREATE INDEX IF NOT EXISTS idx_approval_steps_approver
        ON approval_steps(approver_id, status);
    `);

    // users 컬럼(department_id/position)을 먼저 추가해야 이후 drizzle select(*)가 깨지지 않음
    this.migrateOrgSchema();
    this.migrateLegacySchema();
    this.migrateChatSchema();
    this.migrateProjectIssueSchema();
    this.migrateAiStudyNoteSchema();
    this.seedDefaults();
    this.seedEvalCategories();
    this.seedOrg();
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
          displayOrder: 1,
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
          displayOrder: 2,
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
          displayOrder: 0,
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
          name: 'SQL 연습장(개인)',
          sectionId: 'sql_personal',
          icon: 'UserRound',
          displayOrder: 1,
          isVisible: true,
          requiredRole: null,
          parentId: sqlGroupMenuId,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: randomUUID(),
          name: 'SQL 연습장(팀)',
          sectionId: 'sql_team',
          icon: 'UsersRound',
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
    this.reconcileDevStudyMenu(now);
    this.reconcileUsageStatsMenu(now);
    this.reconcileEnglishMenu(now);
    this.reconcileDevMarketMenus(now);
    this.reconcileDevAnalysisMenus(now);

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

    // React Flow 메뉴 완전 삭제 (항상 실행)
    this.sqlite
      .prepare(`DELETE FROM menus WHERE section_id = 'chatbot_flow'`)
      .run();

    // 챗봇 루트 메뉴 + 자식 upsert
    const existingChatbotPilot = this.sqlite
      .prepare(
        "SELECT id FROM menus WHERE section_id = 'chatbot_pilot' AND parent_id IS NULL LIMIT 1",
      )
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
        {
          name: '기본 채팅',
          sectionId: 'chatbot_basic',
          icon: 'MessageCircle',
          displayOrder: 0,
        },
        {
          name: '스트리밍 응답',
          sectionId: 'chatbot_streaming',
          icon: 'Zap',
          displayOrder: 1,
        },
        {
          name: '히스토리 관리',
          sectionId: 'chatbot_history',
          icon: 'History',
          displayOrder: 2,
        },
        {
          name: '파일 첨부',
          sectionId: 'chatbot_files',
          icon: 'Paperclip',
          displayOrder: 3,
        },
        {
          name: '지식 검색',
          sectionId: 'chatbot_knowledge',
          icon: 'Search',
          displayOrder: 4,
        },
      ];

      // React Flow 메뉴 완전 삭제
      this.sqlite
        .prepare(`DELETE FROM menus WHERE section_id = 'chatbot_flow'`)
        .run();
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

    // 챗봇 하위 메뉴 신규 항목 보장 (chatbot_pilot이 이미 존재해도 누락된 항목 추가)
    const chatbotParent = this.sqlite
      .prepare(`SELECT id FROM menus WHERE section_id = 'chatbot_pilot'`)
      .get() as { id: string } | undefined;
    const parentId = chatbotParent?.id;
    const ensureChatbotChild = (
      name: string,
      sectionId: string,
      icon: string,
      displayOrder: number,
    ) => {
      const existingRows = this.sqlite
        .prepare(
          `
            SELECT id
            FROM menus
            WHERE section_id = ?
            ORDER BY
              CASE WHEN parent_id = ? THEN 0 ELSE 1 END,
              display_order,
              created_at
          `,
        )
        .all(sectionId, parentId) as Array<{ id: string }>;

      if (existingRows.length === 0) {
        this.db
          .insert(menusTable)
          .values({
            id: randomUUID(),
            name,
            sectionId,
            icon,
            displayOrder,
            isVisible: true,
            requiredRole: null,
            parentId,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        return;
      }

      const [primary, ...duplicates] = existingRows;
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET name = ?,
                icon = ?,
                display_order = ?,
                is_visible = 1,
                required_role = NULL,
                parent_id = ?,
                updated_at = ?
            WHERE id = ?
          `,
        )
        .run(name, icon, displayOrder, parentId, now, primary.id);

      for (const duplicate of duplicates) {
        this.sqlite.prepare(`DELETE FROM menus WHERE id = ?`).run(duplicate.id);
      }
    };
    ensureChatbotChild('지식 검색', 'chatbot_knowledge', 'Search', 4);
    ensureChatbotChild('도구 호출', 'chatbot_tools', 'Wrench', 5);
    ensureChatbotChild('실시간 음성', 'chatbot_realtime', 'Mic2', 6);
    ensureChatbotChild(
      '기본 채팅 가이드',
      'chatbot_basic_guide',
      'BookOpen',
      10,
    );
    ensureChatbotChild(
      '스트리밍 가이드',
      'chatbot_streaming_guide',
      'BookOpen',
      11,
    );
    ensureChatbotChild(
      '히스토리 가이드',
      'chatbot_history_guide',
      'BookOpen',
      12,
    );
    ensureChatbotChild(
      '파일 첨부 가이드',
      'chatbot_files_guide',
      'BookOpen',
      13,
    );
    ensureChatbotChild(
      '지식 검색 가이드',
      'chatbot_knowledge_guide',
      'BookOpen',
      14,
    );
    ensureChatbotChild(
      '도구 호출 가이드',
      'chatbot_tools_guide',
      'BookOpen',
      15,
    );
    ensureChatbotChild(
      '실시간 음성 가이드',
      'chatbot_realtime_guide',
      'BookOpen',
      16,
    );

    // 지식 채널을 챗봇 드롭다운의 2차 메뉴로 이동 (하위 4개는 3차 플라이아웃)
    if (parentId) {
      this.sqlite
        .prepare(
          `UPDATE menus SET name='지식 채널', icon='BookOpen', parent_id=?, display_order=7, is_visible=1, updated_at=? WHERE section_id='knowledge_channel'`,
        )
        .run(parentId, now);
    }

    let existingDevManagement = this.sqlite
      .prepare(
        "SELECT id FROM menus WHERE section_id = 'dev_management' AND parent_id IS NULL LIMIT 1",
      )
      .get() as { id: string } | undefined;

    if (!existingDevManagement) {
      const devManagementId = randomUUID();
      this.db
        .insert(menusTable)
        .values({
          id: devManagementId,
          name: '개발 도구',
          sectionId: 'dev_management',
          icon: 'Wrench',
          displayOrder: 2,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      existingDevManagement = { id: devManagementId };
    } else {
      this.sqlite
        .prepare(
          `
            UPDATE menus
            SET name = '개발 도구',
                icon = 'Wrench',
                is_visible = 1,
                required_role = NULL,
                updated_at = ?
            WHERE id = ?
          `,
        )
        .run(now, existingDevManagement.id);
    }

    this.upsertMenuBySectionId({
      sectionId: 'task_group',
      name: '업무 관리',
      icon: 'CheckSquare',
      displayOrder: 1,
      parentId: null,
      requiredRole: null,
      now,
    });
    this.upsertMenuBySectionId({
      sectionId: 'team_docs',
      name: '문서',
      icon: 'FileText',
      displayOrder: 2,
      parentId: null,
      requiredRole: null,
      now,
    });
    this.upsertMenuBySectionId({
      sectionId: 'api_doc',
      name: 'Postman',
      icon: 'Send',
      displayOrder: 4,
      parentId: existingDevManagement.id,
      requiredRole: null,
      now,
    });
    this.upsertMenuBySectionId({
      sectionId: 'prototype',
      name: 'Prototype',
      icon: 'GitBranch',
      displayOrder: 0,
      parentId: null,
      requiredRole: null,
      now,
    });
    this.sqlite
      .prepare(
        `
          UPDATE menus
          SET is_visible = 0,
              parent_id = NULL,
              updated_at = ?
          WHERE section_id = 'task'
        `,
      )
      .run(now);

    // 개발 도구에는 Postman(api_doc)만 남기고 나머지는 헤더에서 숨김
    // (라우트·데이터는 그대로, is_visible=0 으로 네비에서만 제외)
    this.sqlite
      .prepare(
        `
          UPDATE menus
          SET is_visible = 0,
              parent_id = NULL,
              updated_at = ?
          WHERE section_id IN (
            'dev_management_chat',
            'dev_meeting_minutes',
            'code_reviews',
            'feature_plans'
          )
        `,
      )
      .run(now);

    // 루트 메뉴 표시 순서 고정:
    // 0:업무관리, 1:개발도구(Postman+Prototype+개발채팅), 2:회의실,
    // 3:게시판, 4:Dev Study(Challenge+SQL+학습일지), 5:지식채널, 6:챗봇,
    // 7:AI 서비스 신청, 8:Admin
    const rootMenuOrder: Array<{
      sectionId: string | string[];
      displayOrder: number;
    }> = [
      { sectionId: 'prototype', displayOrder: 0 },
      { sectionId: ['task_group', 'task'], displayOrder: 1 },
      { sectionId: 'team_docs', displayOrder: 2 },
      { sectionId: 'dev_management', displayOrder: 3 },
      { sectionId: 'meeting', displayOrder: 4 },
      { sectionId: 'boards', displayOrder: 5 },
      { sectionId: 'dev_study', displayOrder: 6 },
      { sectionId: 'dev_market_group', displayOrder: 7 },
      { sectionId: 'dev_analysis_group', displayOrder: 8 },
      { sectionId: 'chatbot_pilot', displayOrder: 9 },
      { sectionId: 'english_group', displayOrder: 10 },
      { sectionId: 'usage_stats_group', displayOrder: 11 },
      { sectionId: 'admin_dropdown', displayOrder: 12 },
    ];
    for (const { sectionId, displayOrder } of rootMenuOrder) {
      const ids = Array.isArray(sectionId) ? sectionId : [sectionId];
      for (const id of ids) {
        this.sqlite
          .prepare(
            `UPDATE menus SET display_order = ?, parent_id = NULL, updated_at = ? WHERE section_id = ?`,
          )
          .run(displayOrder, now, id);
      }
    }

    // IT 개발사 기본 채널 세트 (미니멀 3개·실무 중심). 기존 id 재사용으로 orphan 최소화.
    // 잡담/자료 등은 필요해지면 ＋버튼으로 추가.
    const defaultMeetingRooms = [
      {
        id: 'meeting-notice',
        name: '공지',
        roomType: 'ANNOUNCE',
        description: '프로젝트 공지·배포·일정 안내',
        orderIdx: 0,
      },
      {
        id: 'meeting-internal',
        name: '개발',
        roomType: 'INTERNAL',
        description: '개발 논의와 진행 상황',
        orderIdx: 1,
      },
      {
        id: 'meeting-qna',
        name: '버그·이슈',
        roomType: 'ISSUE',
        description: '버그 리포트와 트러블슈팅',
        orderIdx: 2,
      },
    ];

    // 기본 세트에서 빠진 과거 시드 채널은 보관 처리(삭제 대신 archived)
    const retiredMeetingRoomIds = ['meeting-free', 'meeting-resource', 'meeting-decision'];

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

    // 세트에서 빠진 과거 채널 보관 처리
    const archiveRetiredRoom = this.sqlite.prepare(
      `UPDATE meeting_rooms SET archived = 1, updated_at = ? WHERE id = ? AND archived = 0`,
    );
    for (const roomId of retiredMeetingRoomIds) {
      archiveRetiredRoom.run(now, roomId);
    }

    // 채널 샘플 메시지 시드 — 처음 켰을 때 빈 화면 대신 맥락이 보이게.
    // id 고정 + ON CONFLICT DO NOTHING 이라 재부팅해도 중복 안 됨. 사용자가 지우면 다시 안 생김.
    const seedMeetingMessages: Array<{
      id: string;
      roomId: string;
      content: string;
      offsetMin: number; // now 기준 과거로 얼마나(분)
    }> = [
      {
        id: 'seed-msg-notice-1',
        roomId: 'meeting-notice',
        content:
          'Towercrane 메신저에 오신 걸 환영합니다 🎉 공지 채널에서는 배포·일정·서버 점검 안내를 공유합니다.',
        offsetMin: 180,
      },
      {
        id: 'seed-msg-notice-2',
        roomId: 'meeting-notice',
        content:
          '이번 주 스프린트 목표: 채팅 기능 1차 마감 + QA. 데일리 스크럼은 매일 오전 10시입니다.',
        offsetMin: 120,
      },
      {
        id: 'seed-msg-notice-3',
        roomId: 'meeting-notice',
        content: '운영 서버 정기 점검은 매주 금요일 자정에 진행됩니다. 배포는 점검 전까지 머지 부탁드려요.',
        offsetMin: 60,
      },
      {
        id: 'seed-msg-dev-1',
        roomId: 'meeting-internal',
        content:
          'PR 올리면 이 채널에 링크 공유 부탁드려요. 리뷰어 2명 승인 후 머지합니다. 🙌',
        offsetMin: 90,
      },
      {
        id: 'seed-msg-dev-2',
        roomId: 'meeting-internal',
        content:
          '로컬 개발은 서버 `npm run start:dev` + 앱 `npm run tauri dev` 로 띄우면 됩니다.',
        offsetMin: 30,
      },
    ];

    const insertSeedMessage = this.sqlite.prepare(`
      INSERT INTO meeting_messages (
        id, room_id, sender_id, sender_name, sender_role, content, message_type, payload, created_at
      ) VALUES (
        @id, @roomId, @senderId, @senderName, @senderRole, @content, 'TEXT', NULL, @createdAt
      )
      ON CONFLICT(id) DO NOTHING
    `);
    for (const msg of seedMeetingMessages) {
      insertSeedMessage.run({
        id: msg.id,
        roomId: msg.roomId,
        senderId: demoUser.id,
        senderName: demoUser.name,
        senderRole: demoUser.role,
        content: msg.content,
        createdAt: new Date(Date.now() - msg.offsetMin * 60 * 1000).toISOString(),
      });
    }

    const defaultDevManagementRooms = [
      {
        id: 'dev-management-general',
        name: '일반',
        roomType: 'GENERAL',
        description: '개발 논의와 진행 상황',
        orderIdx: 0,
      },
      {
        id: 'dev-management-prototype',
        name: '프로토타입',
        roomType: 'PROTOTYPE',
        description: '참고 화면과 구현 후보',
        orderIdx: 1,
      },
      {
        id: 'dev-management-issues',
        name: '이슈',
        roomType: 'ISSUE',
        description: '버그, 장애, 의사결정 필요 항목',
        orderIdx: 2,
      },
      {
        id: 'dev-management-decision',
        name: '결정사항',
        roomType: 'DECISION',
        description: '확정된 개발 방향과 스펙',
        orderIdx: 3,
      },
      {
        id: 'dev-management-tech-debt',
        name: '기술 부채',
        roomType: 'TECH_DEBT',
        description: '리팩토링과 구조 개선 후보',
        orderIdx: 4,
      },
      {
        id: 'dev-management-resources',
        name: '자료',
        roomType: 'RESOURCE',
        description: '문서, 링크, 운영 참고',
        orderIdx: 5,
      },
    ];

    const upsertDevManagementRoom = this.sqlite.prepare(`
      INSERT INTO dev_management_rooms (
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
      WHERE dev_management_rooms.name IS NOT excluded.name
        OR dev_management_rooms.room_type IS NOT excluded.room_type
        OR dev_management_rooms.description IS NOT excluded.description
        OR dev_management_rooms.order_idx IS NOT excluded.order_idx
        OR dev_management_rooms.archived IS NOT 0
    `);

    const upsertDevManagementBotSettings = this.sqlite.prepare(`
      INSERT INTO dev_management_bot_settings (
        room_id, enabled, response_mode, updated_by, updated_at
      ) VALUES (
        @roomId, 1, 'MENTION_ONLY', @updatedBy, @updatedAt
      )
      ON CONFLICT(room_id) DO NOTHING
    `);

    for (const room of defaultDevManagementRooms) {
      upsertDevManagementRoom.run({
        ...room,
        createdBy: demoUser.id,
        createdAt: now,
        updatedAt: now,
      });
      upsertDevManagementBotSettings.run({
        roomId: room.id,
        updatedBy: demoUser.id,
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
          workspaceId: this.getDevChallengeDefaultWorkspaceId(),
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
          workspaceId: this.getPrototypeDefaultWorkspaceId(),
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
      'users',
      'ai_access',
      `ALTER TABLE users ADD COLUMN ai_access INTEGER NOT NULL DEFAULT 0`,
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
      'categories',
      'workspace_id',
      'ALTER TABLE categories ADD COLUMN workspace_id TEXT',
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
      'meeting_rooms',
      'workspace_id',
      'ALTER TABLE meeting_rooms ADD COLUMN workspace_id TEXT',
    );
    this.ensureColumn(
      'meeting_messages',
      'payload',
      'ALTER TABLE meeting_messages ADD COLUMN payload TEXT',
    );
    this.ensureColumn(
      'meeting_messages',
      'pinned',
      'ALTER TABLE meeting_messages ADD COLUMN pinned INTEGER DEFAULT 0 NOT NULL',
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
      'acceptance_criteria',
      "ALTER TABLE tasks ADD COLUMN acceptance_criteria TEXT DEFAULT '' NOT NULL",
    );
    this.ensureColumn(
      'tasks',
      'mmd_content',
      "ALTER TABLE tasks ADD COLUMN mmd_content TEXT DEFAULT '' NOT NULL",
    );
    this.ensureColumn(
      'tasks',
      'plan',
      "ALTER TABLE tasks ADD COLUMN plan TEXT DEFAULT '' NOT NULL",
    );
    this.ensureColumn(
      'tasks',
      'folder_structure',
      "ALTER TABLE tasks ADD COLUMN folder_structure TEXT DEFAULT '' NOT NULL",
    );
    this.ensureColumn(
      'tasks',
      'workspace_id',
      'ALTER TABLE tasks ADD COLUMN workspace_id TEXT',
    );
    this.ensureColumn(
      'api_doc_categories',
      'team_id',
      'ALTER TABLE api_doc_categories ADD COLUMN team_id TEXT',
    );
    this.ensureColumn(
      'dev_challenge_categories',
      'workspace_id',
      'ALTER TABLE dev_challenge_categories ADD COLUMN workspace_id TEXT',
    );
    this.ensureColumn(
      'knowledge_documents',
      'content_json',
      'ALTER TABLE knowledge_documents ADD COLUMN content_json TEXT',
    );
    this.ensureColumn(
      'code_reviews',
      'task_id',
      'ALTER TABLE code_reviews ADD COLUMN task_id TEXT',
    );
    this.sqlite.exec(`
      DROP INDEX IF EXISTS idx_study_diaries_user;

      CREATE INDEX IF NOT EXISTS idx_study_diaries_user
        ON study_diaries(user_id, created_at);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_prototype_workspace_members_unique
        ON prototype_workspace_members(workspace_id, user_id);

      CREATE INDEX IF NOT EXISTS idx_categories_workspace_order
        ON categories(workspace_id, order_idx);

      CREATE INDEX IF NOT EXISTS idx_challenge_categories_diary
        ON challenge_categories(diary_id, order_idx);

      CREATE INDEX IF NOT EXISTS idx_sql_practice_notes_public_token
        ON sql_practice_notes(public_token);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_workspace_members_unique
        ON meeting_workspace_members(workspace_id, user_id);

      CREATE INDEX IF NOT EXISTS idx_meeting_rooms_workspace
        ON meeting_rooms(workspace_id);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_task_workspace_members_unique
        ON task_workspace_members(workspace_id, user_id);

      CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status
        ON tasks(workspace_id, status, archived);

      CREATE INDEX IF NOT EXISTS idx_tasks_workspace_order
        ON tasks(workspace_id, order_idx);

      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_scope
        ON tasks(assignee_id, scope, archived, status);

      CREATE INDEX IF NOT EXISTS idx_tasks_owner_scope
        ON tasks(owner_id, scope, archived, status);

      CREATE INDEX IF NOT EXISTS idx_tasks_visibility_updated
        ON tasks(visibility, archived, updated_at);

      CREATE INDEX IF NOT EXISTS idx_code_reviews_task_created
        ON code_reviews(task_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_api_doc_categories_team_order
        ON api_doc_categories(team_id, order_idx);

      CREATE INDEX IF NOT EXISTS idx_dev_challenge_workspaces_order
        ON dev_challenge_workspaces(archived, order_idx, created_at);

      CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_challenge_workspace_members_unique
        ON dev_challenge_workspace_members(workspace_id, user_id);

      CREATE INDEX IF NOT EXISTS idx_dev_challenge_workspace_members_user
        ON dev_challenge_workspace_members(user_id, workspace_id);

      CREATE INDEX IF NOT EXISTS idx_dev_challenge_categories_workspace_order
        ON dev_challenge_categories(workspace_id, order_idx);
    `);

    const now = new Date().toISOString();
    const demoUser = this.ensureDemoUser(now);
    this.ensureKnowledgeAiSamples(
      now,
      demoUser.id,
      demoUser.name || demoUser.email,
    );
    this.ensurePrototypeDefaultWorkspace(now, demoUser.id);
    this.ensureTaskDefaultWorkspace(now, demoUser.id);
    this.ensureMeetingDefaultWorkspace(now, demoUser.id);
    this.ensureDevChallengeDefaultWorkspace(now, demoUser.id);
    this.ensureApiDocDefaultTeam(now, demoUser.id);
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

    // 전자결재 분류별 구조화 데이터 컬럼(기존 DB 호환)
    this.ensureColumn(
      'approval_requests',
      'meta',
      'ALTER TABLE approval_requests ADD COLUMN meta TEXT',
    );
  }

  private ensureKnowledgeAiSamples(
    now: string,
    ownerId: string,
    ownerName: string,
  ) {
    const existing = this.sqlite
      .prepare(
        "SELECT COUNT(*) as count FROM knowledge_documents WHERE channel = 'ai'",
      )
      .get() as { count: number } | undefined;

    if (Number(existing?.count ?? 0) > 0) {
      return;
    }

    const samples = [
      {
        id: 'knowledge-ai-sample-meeting-summary',
        title: 'ChatGPT로 회의록 요약하기',
        summary:
          '회의 내용을 핵심 결정사항, 할 일, 리스크로 정리하는 AI 활용 가이드',
        tags: ['회의록', '요약', '프롬프트'],
        metadata: {
          aiDocType: 'usage_guide',
          aiDocTypeLabel: 'AI 활용 가이드',
          difficulty: 'basic',
          difficultyLabel: '기초',
          targetRole: '기획자, 운영자, 개발 리더',
          businessDomain: '회의 정리',
          toolNames: ['ChatGPT', 'Gemini', 'Claude'],
          hasPromptTemplate: true,
          hasExample: true,
          policyLevel: 'recommended',
          policyLevelLabel: '권장',
          ownerTeam: 'AX 운영팀',
        },
        contentMarkdown: [
          '# 활용 목적',
          '회의록 원문을 그대로 저장하기보다 핵심 결정사항, 담당자별 할 일, 일정 리스크를 빠르게 정리할 때 사용한다.',
          '',
          '# 추천 프롬프트',
          '아래 회의 내용을 결정사항, 할 일, 이슈, 다음 회의 안건으로 나눠 요약해줘. 할 일은 담당자와 마감일이 보이면 함께 적어줘.',
          '',
          '# 주의사항',
          '고객 개인정보, 계약 금액, 내부 보안 정보가 포함된 회의록은 사내 정책에 맞게 비식별 처리한 뒤 사용한다.',
        ].join('\n'),
      },
      {
        id: 'knowledge-ai-sample-code-review-prompt',
        title: '코드 리뷰 요청 프롬프트 템플릿',
        summary:
          'PR 리뷰 전에 변경 의도, 위험 지점, 테스트 관점을 정리하는 프롬프트 템플릿',
        tags: ['코드리뷰', '프롬프트', '개발'],
        metadata: {
          aiDocType: 'prompt_template',
          aiDocTypeLabel: '프롬프트 템플릿',
          difficulty: 'normal',
          difficultyLabel: '일반',
          targetRole: '개발자',
          businessDomain: '코드 리뷰',
          toolNames: ['ChatGPT', 'Claude', 'Copilot'],
          hasPromptTemplate: true,
          hasExample: true,
          policyLevel: 'recommended',
          policyLevelLabel: '권장',
          ownerTeam: '개발팀',
        },
        contentMarkdown: [
          '# 템플릿',
          '다음 변경사항을 코드 리뷰 관점에서 봐줘. 특히 런타임 오류 가능성, 권한/데이터 검증 누락, 기존 UX 회귀, 테스트 누락을 우선순위로 지적해줘.',
          '',
          '# 함께 넣을 정보',
          '- 변경 목적',
          '- 주요 파일',
          '- 재현 또는 검증 방법',
          '- 걱정되는 부분',
          '',
          '# 답변 형식',
          '중요도 순서로 문제를 먼저 정리하고, 파일과 라인 기준으로 설명하게 한다.',
        ].join('\n'),
      },
      {
        id: 'knowledge-ai-sample-privacy-policy',
        title: '개인정보를 AI에 입력하면 안 되는 이유',
        summary:
          'AI 도구 사용 시 개인정보와 민감정보를 입력하지 않아야 하는 기준',
        tags: ['보안', '개인정보', '정책'],
        metadata: {
          aiDocType: 'policy',
          aiDocTypeLabel: '보안/정책',
          difficulty: 'basic',
          difficultyLabel: '기초',
          targetRole: '전 직원',
          businessDomain: 'AI 보안',
          toolNames: ['ChatGPT', 'Gemini', 'Claude', 'Copilot'],
          hasPromptTemplate: false,
          hasExample: true,
          policyLevel: 'required',
          policyLevelLabel: '필수 준수',
          ownerTeam: '보안/AX 운영팀',
        },
        contentMarkdown: [
          '# 원칙',
          '이름, 전화번호, 이메일, 고객 식별자, 계정 정보, 계약 정보 같은 개인정보와 민감정보는 외부 AI 도구에 입력하지 않는다.',
          '',
          '# 허용되는 방식',
          '필요한 경우 홍길동, user@example.com, 고객 A처럼 예시 값으로 치환하거나 식별 가능한 정보를 제거한 뒤 질문한다.',
          '',
          '# 챗봇 답변 기준',
          '사용자가 개인정보 입력 가능 여부를 묻는 경우 가능하다고 답하지 말고, 비식별 처리 후 사용하라고 안내한다.',
        ].join('\n'),
      },
    ];

    const insertDocument = this.sqlite.prepare(`
      INSERT OR IGNORE INTO knowledge_documents (
        id,
        channel,
        title,
        summary,
        content_markdown,
        content_json,
        tags_json,
        status,
        visibility,
        owner_id,
        owner_name,
        effective_from,
        effective_to,
        metadata_json,
        created_at,
        updated_at,
        published_at
      )
      VALUES (?, 'ai', ?, ?, ?, NULL, ?, 'published', 'all', ?, ?, NULL, NULL, ?, ?, ?, ?)
    `);
    const insertChunk = this.sqlite.prepare(`
      INSERT OR IGNORE INTO knowledge_chunks (
        id,
        document_id,
        channel,
        chunk_index,
        heading_path,
        chunk_text,
        token_estimate,
        metadata_json,
        created_at
      )
      VALUES (?, ?, 'ai', 0, 'AI 자료', ?, ?, ?, ?)
    `);

    for (const sample of samples) {
      const tagsJson = JSON.stringify(sample.tags);
      const metadataJson = JSON.stringify(sample.metadata);
      const chunkText = [
        '[AI 자료]',
        `제목: ${sample.title}`,
        `요약: ${sample.summary}`,
        `자료 유형: ${sample.metadata.aiDocTypeLabel}`,
        `난이도: ${sample.metadata.difficultyLabel}`,
        `대상 역할: ${sample.metadata.targetRole}`,
        `업무 영역: ${sample.metadata.businessDomain}`,
        `사용 도구: ${sample.metadata.toolNames.join(', ')}`,
        `프롬프트 템플릿 포함: ${sample.metadata.hasPromptTemplate ? '예' : '아니오'}`,
        `예시 포함: ${sample.metadata.hasExample ? '예' : '아니오'}`,
        `정책 중요도: ${sample.metadata.policyLevelLabel}`,
        `담당: ${sample.metadata.ownerTeam}`,
        `태그: ${sample.tags.join(', ')}`,
        '',
        '내용:',
        sample.contentMarkdown,
      ].join('\n');

      insertDocument.run(
        sample.id,
        sample.title,
        sample.summary,
        sample.contentMarkdown,
        tagsJson,
        ownerId,
        ownerName,
        metadataJson,
        now,
        now,
        now,
      );
      insertChunk.run(
        `${sample.id}-chunk-0`,
        sample.id,
        chunkText,
        Math.ceil(chunkText.length / 4),
        metadataJson,
        now,
      );
    }
  }

  private ensureApiDocDefaultTeam(now: string, userId: string) {
    const defaultTeamId = 'api-team-prototype-console';
    const existing = this.sqlite
      .prepare('SELECT id FROM api_doc_teams WHERE id = ? LIMIT 1')
      .get(defaultTeamId) as { id: string } | undefined;

    if (!existing) {
      this.sqlite
        .prepare(
          `
            INSERT INTO api_doc_teams (
              id,
              name,
              description,
              icon,
              emoji,
              order_idx,
              created_by,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          defaultTeamId,
          'Prototype Console',
          '기존 Postman Lite 컬렉션을 담는 기본 워크스페이스',
          'FileJson',
          null,
          0,
          userId,
          now,
          now,
        );
    }

    this.sqlite
      .prepare(
        `
          UPDATE api_doc_categories
          SET team_id = ?, updated_at = ?
          WHERE team_id IS NULL OR team_id = ''
        `,
      )
      .run(defaultTeamId, now);
  }

  private ensurePrototypeDefaultWorkspace(now: string, userId: string) {
    const defaultWorkspaceId = 'prototype-workspace-console';
    const existing = this.sqlite
      .prepare('SELECT id FROM prototype_workspaces WHERE id = ? LIMIT 1')
      .get(defaultWorkspaceId) as { id: string } | undefined;

    if (!existing) {
      this.sqlite
        .prepare(
          `
            INSERT INTO prototype_workspaces (
              id,
              name,
              description,
              icon,
              color,
              order_idx,
              created_by,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          defaultWorkspaceId,
          'Prototype Console',
          '기존 프로토타입 카테고리를 담는 기본 워크스페이스',
          'GitBranch',
          null,
          0,
          userId,
          now,
          now,
        );
    }

    this.sqlite
      .prepare(
        `
          INSERT OR IGNORE INTO prototype_workspace_members (
            id,
            workspace_id,
            user_id,
            role,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        `prototype-member-${defaultWorkspaceId}-${userId}`,
        defaultWorkspaceId,
        userId,
        'owner',
        now,
        now,
      );

    this.sqlite
      .prepare(
        `
          UPDATE categories
          SET workspace_id = ?, updated_at = ?
          WHERE workspace_id IS NULL OR workspace_id = ''
        `,
      )
      .run(defaultWorkspaceId, now);
  }

  private getPrototypeDefaultWorkspaceId() {
    return 'prototype-workspace-console';
  }

  private ensureTaskDefaultWorkspace(now: string, userId: string) {
    const defaultWorkspaceId = 'task-workspace-default';
    const existing = this.sqlite
      .prepare('SELECT id FROM task_workspaces WHERE id = ? LIMIT 1')
      .get(defaultWorkspaceId) as { id: string } | undefined;

    if (!existing) {
      this.sqlite
        .prepare(
          `
            INSERT INTO task_workspaces (
              id,
              name,
              description,
              icon,
              color,
              order_idx,
              created_by,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          defaultWorkspaceId,
          '전체 업무',
          '기존 업무를 담는 기본 워크스페이스',
          'CheckSquare',
          null,
          0,
          userId,
          now,
          now,
        );
    }

    this.sqlite
      .prepare(
        `
          INSERT OR IGNORE INTO task_workspace_members (
            id,
            workspace_id,
            user_id,
            role,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        `task-member-${defaultWorkspaceId}-${userId}`,
        defaultWorkspaceId,
        userId,
        'owner',
        now,
        now,
      );

    this.sqlite
      .prepare(
        `
          UPDATE tasks
          SET workspace_id = ?, updated_at = ?
          WHERE workspace_id IS NULL OR workspace_id = ''
        `,
      )
      .run(defaultWorkspaceId, now);
  }

  getTaskDefaultWorkspaceId() {
    return 'task-workspace-default';
  }

  private ensureMeetingDefaultWorkspace(now: string, userId: string) {
    const defaultWorkspaceId = 'meeting-workspace-default';
    const existing = this.sqlite
      .prepare('SELECT id FROM meeting_workspaces WHERE id = ? LIMIT 1')
      .get(defaultWorkspaceId) as { id: string } | undefined;

    if (!existing) {
      this.sqlite
        .prepare(
          `
            INSERT INTO meeting_workspaces (
              id, name, description, icon, color,
              order_idx, created_by, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          defaultWorkspaceId,
          '공용 회의실',
          '전체 팀이 함께 사용하는 기본 채널 공간',
          'MessagesSquare',
          null,
          0,
          userId,
          now,
          now,
        );
    }

    this.sqlite
      .prepare(
        `
          INSERT OR IGNORE INTO meeting_workspace_members (
            id, workspace_id, user_id, role, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        `meeting-member-${defaultWorkspaceId}-${userId}`,
        defaultWorkspaceId,
        userId,
        'owner',
        now,
        now,
      );

    this.sqlite
      .prepare(
        `
          UPDATE meeting_rooms
          SET workspace_id = ?, updated_at = ?
          WHERE (workspace_id IS NULL OR workspace_id = '')
            AND room_type != 'DM'
        `,
      )
      .run(defaultWorkspaceId, now);
  }

  getMeetingDefaultWorkspaceId() {
    return 'meeting-workspace-default';
  }

  private ensureDevChallengeDefaultWorkspace(now: string, userId: string) {
    const defaultWorkspaceId = this.getDevChallengeDefaultWorkspaceId();
    const existing = this.sqlite
      .prepare('SELECT id FROM dev_challenge_workspaces WHERE id = ? LIMIT 1')
      .get(defaultWorkspaceId) as { id: string } | undefined;

    if (!existing) {
      this.sqlite
        .prepare(
          `
            INSERT INTO dev_challenge_workspaces (
              id, name, description, icon, color,
              order_idx, archived, created_by, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          defaultWorkspaceId,
          'Dev Challenge',
          '기존 개발 챌린지를 담는 기본 워크스페이스',
          'Trophy',
          null,
          0,
          0,
          userId,
          now,
          now,
        );
    }

    this.sqlite
      .prepare(
        `
          INSERT OR IGNORE INTO dev_challenge_workspace_members (
            id, workspace_id, user_id, role, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        `dev-challenge-member-${defaultWorkspaceId}-${userId}`,
        defaultWorkspaceId,
        userId,
        'owner',
        now,
        now,
      );

    this.sqlite
      .prepare(
        `
          UPDATE dev_challenge_categories
          SET workspace_id = ?, updated_at = ?
          WHERE workspace_id IS NULL OR workspace_id = ''
        `,
      )
      .run(defaultWorkspaceId, now);
  }

  getDevChallengeDefaultWorkspaceId() {
    return 'dev-challenge-workspace-default';
  }

  private reconcileAiNativeMenus(now: string) {
    // ── AI Native 그룹 + 구 하위 항목 숨김 (ai_service_request는 별도 루트 메뉴로 관리)
    this.sqlite
      .prepare(
        `UPDATE menus SET is_visible = 0, updated_at = ? WHERE section_id IN ('ai_native_group','ai_methodology','ai_evaluation','ai_service_group','ai_service_request','ai_service_my','ai_service_admin','ai_service_monitor')`,
      )
      .run(now);

    // ── 지식 채널: 중복 정리 후 단일 보장 (parent_id는 챗봇 블록에서 설정) ──
    // parent_id 조건 없이 전부 조회 — 챗봇 하위로 옮겨진 경우에도 중복 재생성 방지
    const knowledgeRows = this.sqlite
      .prepare(
        `SELECT id FROM menus WHERE section_id = 'knowledge_channel' ORDER BY created_at`,
      )
      .all() as Array<{ id: string }>;

    let knowledgeGroup: { id: string } | undefined = knowledgeRows[0];

    // 과거 버그로 누적된 중복 제거 — 자식은 남길 1개로 재연결 후 삭제
    for (const dup of knowledgeRows.slice(1)) {
      this.sqlite
        .prepare(`UPDATE menus SET parent_id = ? WHERE parent_id = ?`)
        .run(knowledgeGroup!.id, dup.id);
      this.sqlite.prepare(`DELETE FROM menus WHERE id = ?`).run(dup.id);
    }

    if (!knowledgeGroup) {
      const id = randomUUID();
      this.db
        .insert(menusTable)
        .values({
          id,
          name: '지식 채널',
          sectionId: 'knowledge_channel',
          icon: 'BookOpen',
          displayOrder: 7,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      knowledgeGroup = { id };
    } else {
      this.sqlite
        .prepare(
          `UPDATE menus SET name = '지식 채널', icon = 'BookOpen', is_visible = 1, updated_at = ? WHERE id = ?`,
        )
        .run(now, knowledgeGroup.id);
    }

    // ── 지식채널 하위 항목 보장 ──────────────────────────────────────────
    const ensureChild = (
      name: string,
      sectionId: string,
      icon: string,
      order: number,
    ) => {
      const exists = this.sqlite
        .prepare(`SELECT id FROM menus WHERE section_id = ?`)
        .get(sectionId) as { id: string } | undefined;
      if (!exists) {
        this.db
          .insert(menusTable)
          .values({
            id: randomUUID(),
            name,
            sectionId,
            icon,
            displayOrder: order,
            isVisible: true,
            requiredRole: null,
            parentId: knowledgeGroup!.id,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      } else {
        this.sqlite
          .prepare(
            `UPDATE menus SET name=?, icon=?, parent_id=?, display_order=?, is_visible=1, updated_at=? WHERE section_id=?`,
          )
          .run(name, icon, knowledgeGroup!.id, order, now, sectionId);
      }
    };

    ensureChild('공지사항', 'knowledge_notice', 'Bell', 0);
    ensureChild('FAQ', 'knowledge_faq', 'HelpCircle', 1);
    ensureChild('개발 자료', 'knowledge_dev', 'Code2', 2);
    ensureChild('AI 자료', 'knowledge_ai', 'Sparkles', 3);

    // ── AI 활용 능력 평가 → 업무 관리 하위 ──────────────────────────────
    const taskParent = this.sqlite
      .prepare(
        `SELECT id FROM menus WHERE section_id = 'task_group' AND parent_id IS NULL LIMIT 1`,
      )
      .get() as { id: string } | undefined;

    if (taskParent) {
      const eval_ = this.sqlite
        .prepare(
          `SELECT id FROM menus WHERE section_id = 'ai_evaluation' LIMIT 1`,
        )
        .get() as { id: string } | undefined;
      if (!eval_) {
        this.db
          .insert(menusTable)
          .values({
            id: randomUUID(),
            name: 'AI 활용 능력 평가',
            sectionId: 'ai_evaluation',
            icon: 'ClipboardCheck',
            displayOrder: 99,
            isVisible: true,
            requiredRole: null,
            parentId: taskParent.id,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      } else {
        this.sqlite
          .prepare(
            `UPDATE menus SET name='AI 활용 능력 평가', icon='ClipboardCheck', parent_id=?, display_order=99, is_visible=1, updated_at=? WHERE id=?`,
          )
          .run(taskParent.id, now, eval_.id);
      }

      // ── 결재 신청 → 업무 관리 하위 ────────────────────────────────
      const approval = this.sqlite
        .prepare(`SELECT id FROM menus WHERE section_id = 'approval' LIMIT 1`)
        .get() as { id: string } | undefined;
      if (!approval) {
        this.db
          .insert(menusTable)
          .values({
            id: randomUUID(),
            name: '결재 신청',
            sectionId: 'approval',
            icon: 'ClipboardList',
            displayOrder: 50,
            isVisible: true,
            requiredRole: null,
            parentId: taskParent.id,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      } else {
        this.sqlite
          .prepare(
            `UPDATE menus SET name='결재 신청', icon='ClipboardList', parent_id=?, display_order=50, is_visible=1, updated_at=? WHERE id=?`,
          )
          .run(taskParent.id, now, approval.id);
      }
    }
  }

  private seedEvalCategories() {
    const categories = [
      { id: 'cat_tech', name: '기술 역량', displayOrder: 0 },
      { id: 'cat_collab', name: '협업 역량', displayOrder: 1 },
      { id: 'cat_prod', name: '업무 생산성', displayOrder: 2 },
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
      displayOrder: 99,
      parentId: sqlGroupMenu.id,
      requiredRole: null,
      now,
    });

    this.sqlite
      .prepare(
        `
          UPDATE menus
          SET is_visible = 0,
              updated_at = ?
          WHERE section_id = 'sql_user'
        `,
      )
      .run(now);

    this.upsertMenuBySectionId({
      sectionId: 'sql_personal',
      name: 'SQL 연습장(개인)',
      icon: 'UserRound',
      displayOrder: 1,
      parentId: sqlGroupMenu.id,
      requiredRole: null,
      now,
    });

    this.upsertMenuBySectionId({
      sectionId: 'sql_team',
      name: 'SQL 연습장(팀)',
      icon: 'UsersRound',
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
          WHERE section_id IN ('sql_group', 'sql', 'sql_user', 'sql_personal', 'sql_team', 'sql_examples')
            AND rowid NOT IN (
              SELECT MIN(rowid)
              FROM menus
              WHERE section_id IN ('sql_group', 'sql', 'sql_user', 'sql_personal', 'sql_team', 'sql_examples')
              GROUP BY section_id
            )
        `,
      )
      .run();
  }

  private reconcileDevStudyMenu(now: string) {
    // ── Dev Study 루트 그룹 보장 ────────────────────────────────────────
    let devStudy = this.sqlite
      .prepare(`SELECT id FROM menus WHERE section_id = 'dev_study' LIMIT 1`)
      .get() as { id: string } | undefined;

    if (!devStudy) {
      const id = randomUUID();
      this.db
        .insert(menusTable)
        .values({
          id,
          name: 'Dev Study',
          sectionId: 'dev_study',
          icon: 'GraduationCap',
          displayOrder: 5,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      devStudy = { id };
    } else {
      this.sqlite
        .prepare(
          `UPDATE menus SET name='Dev Study', icon='GraduationCap', parent_id=NULL, is_visible=1, updated_at=? WHERE id=?`,
        )
        .run(now, devStudy.id);
    }

    // ── Challenge, 학습 일지, SQL 항목들을 Dev Study 하위로 이동 ────────
    // dev_challenge: displayOrder 0
    this.sqlite
      .prepare(
        `UPDATE menus SET parent_id=?, display_order=0, is_visible=1, updated_at=? WHERE section_id='dev_challenge'`,
      )
      .run(devStudy.id, now);

    // study_diary: displayOrder 1
    this.sqlite
      .prepare(
        `UPDATE menus SET parent_id=?, display_order=1, name='스터디 다이어리', is_visible=1, updated_at=? WHERE section_id='study_diary'`,
      )
      .run(devStudy.id, now);

    // SQL 항목들 직접 하위로 (3단계 중첩 방지)
    this.sqlite
      .prepare(
        `UPDATE menus SET parent_id=?, display_order=2, is_visible=1, updated_at=? WHERE section_id='sql'`,
      )
      .run(devStudy.id, now);
    this.sqlite
      .prepare(
        `UPDATE menus SET parent_id=?, display_order=3, is_visible=1, updated_at=? WHERE section_id='sql_personal'`,
      )
      .run(devStudy.id, now);
    this.sqlite
      .prepare(
        `UPDATE menus SET parent_id=?, display_order=4, is_visible=1, updated_at=? WHERE section_id='sql_team'`,
      )
      .run(devStudy.id, now);
    this.sqlite
      .prepare(
        `UPDATE menus SET parent_id=?, display_order=5, is_visible=1, updated_at=? WHERE section_id='sql_examples'`,
      )
      .run(devStudy.id, now);

    // sql_group은 이제 빈 껍데기 — 숨김
    this.sqlite
      .prepare(
        `UPDATE menus SET is_visible=0, parent_id=NULL, updated_at=? WHERE section_id='sql_group'`,
      )
      .run(now);
  }

  private reconcileUsageStatsMenu(now: string) {
    // ── 이용 통계 루트 그룹 보장 ────────────────────────────────────────
    let usageStats = this.sqlite
      .prepare(
        `SELECT id FROM menus WHERE section_id = 'usage_stats_group' LIMIT 1`,
      )
      .get() as { id: string } | undefined;

    if (!usageStats) {
      const id = randomUUID();
      this.db
        .insert(menusTable)
        .values({
          id,
          name: '이용 통계',
          sectionId: 'usage_stats_group',
          icon: 'BarChart3',
          displayOrder: 9,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      usageStats = { id };
    } else {
      this.sqlite
        .prepare(
          `UPDATE menus SET name='이용 통계', icon='BarChart3', parent_id=NULL, is_visible=1, updated_at=? WHERE id=?`,
        )
        .run(now, usageStats.id);
    }

    // ── 하위: 이용 통계(사용자), AI 통계 ───────────────────────────────
    this.upsertMenuBySectionId({
      sectionId: 'usage_stats',
      name: '이용 통계',
      icon: 'Users',
      displayOrder: 0,
      parentId: usageStats.id,
      requiredRole: null,
      now,
    });

    this.upsertMenuBySectionId({
      sectionId: 'ai_usage_stats',
      name: 'AI 통계',
      icon: 'Bot',
      displayOrder: 1,
      parentId: usageStats.id,
      requiredRole: null,
      now,
    });
  }

  private reconcileEnglishMenu(now: string) {
    // ── English 루트 그룹 보장 ──────────────────────────────────────────
    let english = this.sqlite
      .prepare(`SELECT id FROM menus WHERE section_id = 'english_group' LIMIT 1`)
      .get() as { id: string } | undefined;

    if (!english) {
      const id = randomUUID();
      this.db
        .insert(menusTable)
        .values({
          id,
          name: 'English',
          sectionId: 'english_group',
          icon: 'Languages',
          displayOrder: 10,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      english = { id };
    } else {
      this.sqlite
        .prepare(
          `UPDATE menus SET name='English', icon='Languages', parent_id=NULL, is_visible=1, updated_at=? WHERE id=?`,
        )
        .run(now, english.id);
    }

    // ── 하위 5개: 영어 학습 코너 ────────────────────────────────────────
    const children = [
      { sectionId: 'english_chat', name: '영어 챗봇 대화', icon: 'MessagesSquare' },
      { sectionId: 'english_diary', name: '영어 개발 일기', icon: 'BookOpen' },
      { sectionId: 'english_news', name: '영어 뉴스 보기', icon: 'Newspaper' },
      { sectionId: 'english_listening', name: '영어 듣기 연습', icon: 'Headphones' },
      { sectionId: 'english_character', name: '영어 챗봇 캐릭터 회화', icon: 'Smile' },
    ];
    children.forEach((child, index) => {
      this.upsertMenuBySectionId({
        sectionId: child.sectionId,
        name: child.name,
        icon: child.icon,
        displayOrder: index,
        parentId: english!.id,
        requiredRole: null,
        now,
      });
    });
  }

  private reconcileDevMarketMenus(now: string) {
    // ── 개발 마켓 루트 그룹 보장 ────────────────────────────────────────
    let market = this.sqlite
      .prepare(`SELECT id FROM menus WHERE section_id = 'dev_market_group' LIMIT 1`)
      .get() as { id: string } | undefined;

    if (!market) {
      const id = randomUUID();
      this.db
        .insert(menusTable)
        .values({
          id,
          name: '개발 마켓',
          sectionId: 'dev_market_group',
          icon: 'Store',
          displayOrder: 7,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      market = { id };
    } else {
      this.sqlite
        .prepare(
          `UPDATE menus SET name='개발 마켓', icon='Store', parent_id=NULL, is_visible=1, updated_at=? WHERE id=?`,
        )
        .run(now, market.id);
    }

    // ── 하위 3개: 유료 콘텐츠 ───────────────────────────────────────────
    const children = [
      { sectionId: 'market_lectures', name: '유료 강의', icon: 'GraduationCap' },
      { sectionId: 'market_recommend', name: '강의 추천', icon: 'Star' },
      { sectionId: 'market_notes', name: '유료 노트', icon: 'NotebookPen' },
      { sectionId: 'market_prototypes', name: '유료 프로토타입', icon: 'LayoutTemplate' },
    ];
    children.forEach((child, index) => {
      this.upsertMenuBySectionId({
        sectionId: child.sectionId,
        name: child.name,
        icon: child.icon,
        displayOrder: index,
        parentId: market!.id,
        requiredRole: null,
        now,
      });
    });
  }

  private reconcileDevAnalysisMenus(now: string) {
    // ── 개발 분석 루트 그룹 보장 ────────────────────────────────────────
    let analysis = this.sqlite
      .prepare(`SELECT id FROM menus WHERE section_id = 'dev_analysis_group' LIMIT 1`)
      .get() as { id: string } | undefined;

    if (!analysis) {
      const id = randomUUID();
      this.db
        .insert(menusTable)
        .values({
          id,
          name: '개발 분석',
          sectionId: 'dev_analysis_group',
          icon: 'LineChart',
          displayOrder: 7,
          isVisible: true,
          requiredRole: null,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      analysis = { id };
    } else {
      this.sqlite
        .prepare(
          `UPDATE menus SET name='개발 분석', icon='LineChart', parent_id=NULL, is_visible=1, updated_at=? WHERE id=?`,
        )
        .run(now, analysis.id);
    }

    // ── 하위 4개: 분석 코너 ─────────────────────────────────────────────
    const children = [
      { sectionId: 'analysis_tech_debt', name: '기술 부채 분석', icon: 'AlertTriangle' },
      { sectionId: 'analysis_trends', name: '최신 트렌드 분석', icon: 'TrendingUp' },
      { sectionId: 'analysis_hiring', name: '채용 트렌드 분석', icon: 'Briefcase' },
      { sectionId: 'analysis_domain', name: '전문 도메인 분석', icon: 'Target' },
      { sectionId: 'analysis_concepts', name: '개발 개념 분석', icon: 'Lightbulb' },
    ];
    children.forEach((child, index) => {
      this.upsertMenuBySectionId({
        sectionId: child.sectionId,
        name: child.name,
        icon: child.icon,
        displayOrder: index,
        parentId: analysis!.id,
        requiredRole: null,
        now,
      });
    });
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
          isVisible: false,
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
                is_visible = 0,
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

      this.upsertMenuBySectionId({
        sectionId: 'chatbot_monitoring',
        name: '챗봇 모니터링',
        icon: 'ChartColumnBig',
        displayOrder: 5,
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
            'admin_boards',
            'chatbot_monitoring'
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
                'admin_boards',
                'chatbot_monitoring'
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
    const existingRows = this.sqlite
      .prepare(
        `
          SELECT id, parent_id as parentId
          FROM menus
          WHERE section_id = ?
          ORDER BY rowid ASC
        `,
      )
      .all(input.sectionId) as Array<{ id: string; parentId: string | null }>;

    if (existingRows.length > 0) {
      const existing =
        existingRows.find((row) => row.parentId === input.parentId) ??
        existingRows[0];

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

      for (const duplicate of existingRows.filter(
        (row) => row.id !== existing.id,
      )) {
        this.sqlite
          .prepare(
            `UPDATE menus SET parent_id = ?, updated_at = ? WHERE parent_id = ?`,
          )
          .run(existing.id, input.now, duplicate.id);
        this.sqlite.prepare(`DELETE FROM menus WHERE id = ?`).run(duplicate.id);
      }
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
        name: '즐찾 관리',
        sectionId: 'task_favorites',
        icon: 'Star',
        displayOrder: 2,
      },
      {
        name: '프로젝트 이슈',
        sectionId: 'project_issues',
        icon: 'ShieldAlert',
        displayOrder: 3,
      },
      {
        name: '학습 일지',
        sectionId: 'study_diary',
        icon: 'BookOpen',
        displayOrder: 4,
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
          WHERE section_id IN ('task_issues', 'kanban')
        `,
      )
      .run(now);
  }

  private migrateChatSchema() {
    const hasUserIdCol = (
      this.sqlite.prepare(`PRAGMA table_info(chat_sessions)`).all() as Array<{
        name: string;
      }>
    ).some((col) => col.name === 'user_id');

    if (!hasUserIdCol) {
      // 기존 데이터는 user_id 없으므로 초기화 후 컬럼 추가
      this.sqlite.exec(`DELETE FROM chat_messages`);
      this.sqlite.exec(`DELETE FROM chat_sessions`);
      this.sqlite.exec(
        `ALTER TABLE chat_sessions ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`,
      );
    }

    this.ensureColumn(
      'chat_messages',
      'file_urls',
      `ALTER TABLE chat_messages ADD COLUMN file_urls TEXT`,
    );
    this.ensureColumn(
      'users',
      'ai_access',
      `ALTER TABLE users ADD COLUMN ai_access INTEGER NOT NULL DEFAULT 0`,
    );
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

  // 학습 노트 노트에 제목(title) 컬럼 추가 — 기존 DB 호환
  private migrateAiStudyNoteSchema() {
    this.ensureColumn(
      'ai_study_note_item_notes',
      'title',
      "ALTER TABLE ai_study_note_item_notes ADD COLUMN title TEXT NOT NULL DEFAULT ''",
    );
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

  private migrateOrgSchema() {
    this.ensureColumn(
      'users',
      'department_id',
      `ALTER TABLE users ADD COLUMN department_id TEXT REFERENCES departments(id)`,
    );
    this.ensureColumn(
      'users',
      'position',
      `ALTER TABLE users ADD COLUMN position TEXT`,
    );
  }

  /**
   * 조직도 시드: 부서 계층 + 부서별 데모 구성원.
   * 로그인 계정(terecal@daum.net)은 유지하고 부서/직급만 보강한다.
   * 멱등 — 부서는 고정 id로 upsert, 사용자는 email 기준 upsert.
   */
  private seedOrg() {
    const now = new Date().toISOString();

    // 1) 부서 계층 (id 고정 → 멱등). parentId null = 최상위(본부/팀)
    const departments: Array<{
      id: string;
      name: string;
      parentId: string | null;
      orderIdx: number;
    }> = [
      { id: 'dept-exec', name: '임원실', parentId: null, orderIdx: 0 },
      { id: 'dept-mgmt', name: '경영지원본부', parentId: null, orderIdx: 1 },
      { id: 'dept-hr', name: '인사팀', parentId: 'dept-mgmt', orderIdx: 0 },
      { id: 'dept-fin', name: '재무팀', parentId: 'dept-mgmt', orderIdx: 1 },
      { id: 'dept-dev', name: '개발본부', parentId: null, orderIdx: 2 },
      { id: 'dept-fe', name: '프론트엔드팀', parentId: 'dept-dev', orderIdx: 0 },
      { id: 'dept-be', name: '백엔드팀', parentId: 'dept-dev', orderIdx: 1 },
      { id: 'dept-qa', name: 'QA팀', parentId: 'dept-dev', orderIdx: 2 },
      { id: 'dept-design', name: '디자인팀', parentId: null, orderIdx: 3 },
      { id: 'dept-plan', name: '기획팀', parentId: null, orderIdx: 4 },
    ];

    const upsertDept = this.sqlite.prepare(
      `INSERT INTO departments (id, name, parent_id, order_idx, created_at, updated_at)
       VALUES (@id, @name, @parentId, @orderIdx, @now, @now)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         parent_id = excluded.parent_id,
         order_idx = excluded.order_idx,
         updated_at = excluded.updated_at`,
    );
    for (const d of departments) {
      upsertDept.run({ ...d, now });
    }

    // 2) 조직 구성원 (email 고정 → 멱등). terecal은 로그인 계정이라 비번/role 유지
    const members: Array<{
      email: string;
      name: string;
      departmentId: string;
      position: string;
      role: 'admin' | 'user';
    }> = [
      { email: 'terecal@daum.net', name: '오현석', departmentId: 'dept-exec', position: '대표이사', role: 'admin' },
      { email: 'mgmt.head@towercrane.dev', name: '김경영', departmentId: 'dept-mgmt', position: '본부장', role: 'user' },
      { email: 'hr.lead@towercrane.dev', name: '이인사', departmentId: 'dept-hr', position: '팀장', role: 'user' },
      { email: 'hr01@towercrane.dev', name: '박채용', departmentId: 'dept-hr', position: '사원', role: 'user' },
      { email: 'fin.lead@towercrane.dev', name: '최재무', departmentId: 'dept-fin', position: '팀장', role: 'user' },
      { email: 'dev.head@towercrane.dev', name: '정개발', departmentId: 'dept-dev', position: '본부장', role: 'admin' },
      { email: 'fe.lead@towercrane.dev', name: '강프론트', departmentId: 'dept-fe', position: '팀장', role: 'user' },
      { email: 'fe01@towercrane.dev', name: '윤리액트', departmentId: 'dept-fe', position: '시니어', role: 'user' },
      { email: 'fe02@towercrane.dev', name: '임타입', departmentId: 'dept-fe', position: '주니어', role: 'user' },
      { email: 'be.lead@towercrane.dev', name: '한백엔드', departmentId: 'dept-be', position: '팀장', role: 'user' },
      { email: 'be01@towercrane.dev', name: '서네스트', departmentId: 'dept-be', position: '시니어', role: 'user' },
      { email: 'qa.lead@towercrane.dev', name: '노품질', departmentId: 'dept-qa', position: '팀장', role: 'user' },
      { email: 'design.lead@towercrane.dev', name: '도디자인', departmentId: 'dept-design', position: '팀장', role: 'user' },
      { email: 'design01@towercrane.dev', name: '유피그마', departmentId: 'dept-design', position: '주니어', role: 'user' },
      { email: 'plan.lead@towercrane.dev', name: '백기획', departmentId: 'dept-plan', position: '팀장', role: 'user' },
    ];

    // 옛 시드(test%@hibot.dev) 및 목록에서 빠진 데모 계정 정리
    const keepEmails = members.map((m) => m.email);
    const stale = this.sqlite
      .prepare(
        `SELECT id, email FROM users
         WHERE email LIKE 'test%@hibot.dev' OR email LIKE '%@towercrane.dev'`,
      )
      .all() as { id: string; email: string }[];
    for (const u of stale) {
      if (keepEmails.includes(u.email)) continue;
      try {
        this.sqlite.prepare(`DELETE FROM users WHERE id = ?`).run(u.id);
      } catch {
        // 다른 데이터(작업/이슈 등)가 참조 중이면 삭제 불가 → 부서만 비워 조직도에서 제외
        this.sqlite
          .prepare(
            `UPDATE users SET department_id = NULL, position = NULL WHERE id = ?`,
          )
          .run(u.id);
      }
    }

    for (const m of members) {
      const existing = this.db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, m.email))
        .get();

      if (existing) {
        // 기존 계정: 부서/직급/이름만 보강 (비번·role은 건드리지 않음)
        this.sqlite
          .prepare(
            `UPDATE users SET name = ?, department_id = ?, position = ?, updated_at = ? WHERE id = ?`,
          )
          .run(m.name, m.departmentId, m.position, now, existing.id);
      } else {
        this.db
          .insert(usersTable)
          .values({
            id: randomUUID(),
            email: m.email,
            passwordHash: this.hashSeedPassword('password123'),
            name: m.name,
            role: m.role,
            departmentId: m.departmentId,
            position: m.position,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    }

    // 데모 환경: 모든 계정 비밀번호를 password123으로 통일 (재시작 시 매번 보정)
    this.sqlite
      .prepare(`UPDATE users SET password_hash = ?`)
      .run(this.hashSeedPassword('password123'));
  }

  private hashSeedPassword(password: string) {
    const salt = 'towercrane-seed-salt';
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }
}
