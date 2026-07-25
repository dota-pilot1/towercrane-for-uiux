import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  axStudyNotesTable,
  axStudyWorkspacesTable,
  usersTable,
  type AxStudyNoteRow,
  type AxStudyWorkspaceRow,
} from '../database/schema';
import type {
  CreateAxStudyNoteInput,
  CreateAxStudyWorkspaceInput,
  UpdateAxStudyNoteInput,
  UpdateAxStudyWorkspaceInput,
} from './dto/ax-study.schema';

@Injectable()
export class AxStudyService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  private now() {
    return new Date().toISOString();
  }

  // 내 워크스페이스 + 공유/공개 워크스페이스 (작성자 이름 포함, 노트 수 집계)
  listWorkspaces(userId: string) {
    const rows = this.db
      .select({
        id: axStudyWorkspacesTable.id,
        userId: axStudyWorkspacesTable.userId,
        title: axStudyWorkspacesTable.title,
        description: axStudyWorkspacesTable.description,
        visibility: axStudyWorkspacesTable.visibility,
        createdAt: axStudyWorkspacesTable.createdAt,
        updatedAt: axStudyWorkspacesTable.updatedAt,
        ownerName: usersTable.name,
      })
      .from(axStudyWorkspacesTable)
      .innerJoin(usersTable, eq(axStudyWorkspacesTable.userId, usersTable.id))
      .where(
        or(
          eq(axStudyWorkspacesTable.userId, userId),
          inArray(axStudyWorkspacesTable.visibility, ['shared', 'public']),
        ),
      )
      .orderBy(desc(axStudyWorkspacesTable.createdAt))
      .all();

    const counts = this.db
      .select({
        workspaceId: axStudyNotesTable.workspaceId,
        count: sql<number>`count(*)`,
      })
      .from(axStudyNotesTable)
      .groupBy(axStudyNotesTable.workspaceId)
      .all();
    const countMap = new Map(
      counts.map((c) => [c.workspaceId, Number(c.count)]),
    );

    return rows.map((w) => ({
      ...w,
      isMine: w.userId === userId,
      noteCount: countMap.get(w.id) ?? 0,
    }));
  }

  createWorkspace(userId: string, input: CreateAxStudyWorkspaceInput) {
    const now = this.now();
    const id = `axws-${randomUUID().slice(0, 12)}`;
    this.db
      .insert(axStudyWorkspacesTable)
      .values({
        id,
        userId,
        title: input.title,
        description: input.description ?? null,
        visibility: input.visibility,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.getWorkspace(userId, id);
  }

  getWorkspace(userId: string, workspaceId: string) {
    const workspace = this.ensureReadable(userId, workspaceId);
    const notes = this.db
      .select()
      .from(axStudyNotesTable)
      .where(eq(axStudyNotesTable.workspaceId, workspaceId))
      .orderBy(
        asc(axStudyNotesTable.orderIdx),
        desc(axStudyNotesTable.createdAt),
      )
      .all();
    return { ...workspace, isMine: workspace.userId === userId, notes };
  }

  updateWorkspace(
    userId: string,
    workspaceId: string,
    input: UpdateAxStudyWorkspaceInput,
  ) {
    this.ensureOwner(userId, workspaceId);
    this.db
      .update(axStudyWorkspacesTable)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.visibility !== undefined
          ? { visibility: input.visibility }
          : {}),
        updatedAt: this.now(),
      })
      .where(eq(axStudyWorkspacesTable.id, workspaceId))
      .run();
    return this.getWorkspace(userId, workspaceId);
  }

  deleteWorkspace(userId: string, workspaceId: string) {
    this.ensureOwner(userId, workspaceId);
    this.db
      .delete(axStudyWorkspacesTable)
      .where(eq(axStudyWorkspacesTable.id, workspaceId))
      .run();
    return { success: true };
  }

  createNote(
    userId: string,
    workspaceId: string,
    input: CreateAxStudyNoteInput,
  ) {
    this.ensureOwner(userId, workspaceId);
    const now = this.now();
    const id = `axnote-${randomUUID().slice(0, 12)}`;
    const maxOrder = this.db
      .select({
        max: sql<number>`coalesce(max(${axStudyNotesTable.orderIdx}), -1)`,
      })
      .from(axStudyNotesTable)
      .where(eq(axStudyNotesTable.workspaceId, workspaceId))
      .get();
    this.db
      .insert(axStudyNotesTable)
      .values({
        id,
        workspaceId,
        userId,
        title: input.title,
        content: input.content,
        tags: input.tags,
        orderIdx: Number(maxOrder?.max ?? -1) + 1,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.db
      .select()
      .from(axStudyNotesTable)
      .where(eq(axStudyNotesTable.id, id))
      .get();
  }

  updateNote(userId: string, noteId: string, input: UpdateAxStudyNoteInput) {
    const note = this.ensureNoteOwner(userId, noteId);
    this.db
      .update(axStudyNotesTable)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        updatedAt: this.now(),
      })
      .where(eq(axStudyNotesTable.id, note.id))
      .run();
    return this.db
      .select()
      .from(axStudyNotesTable)
      .where(eq(axStudyNotesTable.id, note.id))
      .get();
  }

  deleteNote(userId: string, noteId: string) {
    const note = this.ensureNoteOwner(userId, noteId);
    this.db
      .delete(axStudyNotesTable)
      .where(eq(axStudyNotesTable.id, note.id))
      .run();
    return { success: true };
  }

  // ── 접근 제어 헬퍼 ──────────────────────────────────────────────
  private getWorkspaceRow(workspaceId: string): AxStudyWorkspaceRow {
    const row = this.db
      .select()
      .from(axStudyWorkspacesTable)
      .where(eq(axStudyWorkspacesTable.id, workspaceId))
      .get();
    if (!row) throw new NotFoundException('워크스페이스를 찾을 수 없습니다.');
    return row;
  }

  private ensureReadable(userId: string, workspaceId: string) {
    const row = this.getWorkspaceRow(workspaceId);
    if (row.userId !== userId && row.visibility === 'private') {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }
    return row;
  }

  private ensureOwner(userId: string, workspaceId: string) {
    const row = this.getWorkspaceRow(workspaceId);
    if (row.userId !== userId) {
      throw new ForbiddenException('작성자만 수정할 수 있습니다.');
    }
    return row;
  }

  private ensureNoteOwner(userId: string, noteId: string): AxStudyNoteRow {
    const note = this.db
      .select()
      .from(axStudyNotesTable)
      .where(eq(axStudyNotesTable.id, noteId))
      .get();
    if (!note) throw new NotFoundException('노트를 찾을 수 없습니다.');
    if (note.userId !== userId) {
      throw new ForbiddenException('작성자만 수정할 수 있습니다.');
    }
    return note;
  }
}
