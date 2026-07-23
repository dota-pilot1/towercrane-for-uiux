import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  archNoteCategoriesTable,
  archNoteNotesTable,
  archNoteSectionsTable,
  archNoteWorkspacesTable,
  type ArchNoteCategoryRow,
  type ArchNoteSectionRow,
  type ArchNoteWorkspaceRow,
} from '../database/schema';
import type {
  CreateArchNoteCategoryInput,
  CreateArchNoteNoteInput,
  CreateArchNoteSectionInput,
  CreateArchNoteWorkspaceInput,
  UpdateArchNoteCategoryInput,
  UpdateArchNoteNoteInput,
  UpdateArchNoteSectionInput,
  UpdateArchNoteWorkspaceInput,
} from './dto/arch-note.schema';

@Injectable()
export class ArchNoteService {
  constructor(private readonly db: DatabaseService) {}

  // ── 워크스페이스 ──────────────────────────────────────────
  listWorkspaces(userId: string) {
    return this.db.db
      .select()
      .from(archNoteWorkspacesTable)
      .where(eq(archNoteWorkspacesTable.userId, userId))
      .orderBy(asc(archNoteWorkspacesTable.orderIdx))
      .all();
  }

  createWorkspace(userId: string, input: CreateArchNoteWorkspaceInput) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = this.nextWorkspaceOrderIdx(userId);

    this.db.db
      .insert(archNoteWorkspacesTable)
      .values({
        id,
        userId,
        title: input.title,
        description: input.description ?? null,
        icon: input.icon ?? 'Layers',
        orderIdx,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.assertWorkspaceOwner(id, userId);
  }

  updateWorkspace(
    userId: string,
    workspaceId: string,
    input: UpdateArchNoteWorkspaceInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);

    this.db.db
      .update(archNoteWorkspacesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(archNoteWorkspacesTable.id, workspaceId))
      .run();

    return this.assertWorkspaceOwner(workspaceId, userId);
  }

  deleteWorkspace(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    this.db.db
      .delete(archNoteWorkspacesTable)
      .where(eq(archNoteWorkspacesTable.id, workspaceId))
      .run();
  }

  reorderWorkspaces(userId: string, workspaceIds: string[]) {
    const owned = new Set(this.listWorkspaces(userId).map((w) => w.id));
    if (workspaceIds.some((id) => !owned.has(id))) {
      throw new ForbiddenException('Not authorized');
    }
    const now = new Date().toISOString();
    for (let i = 0; i < workspaceIds.length; i++) {
      this.db.db
        .update(archNoteWorkspacesTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(archNoteWorkspacesTable.id, workspaceIds[i]))
        .run();
    }
  }

  // ── 1차 주제 (카테고리) ───────────────────────────────────
  getCategories(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    return this.db.db
      .select()
      .from(archNoteCategoriesTable)
      .where(eq(archNoteCategoriesTable.workspaceId, workspaceId))
      .orderBy(asc(archNoteCategoriesTable.orderIdx))
      .all();
  }

  createCategory(
    userId: string,
    workspaceId: string,
    input: CreateArchNoteCategoryInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = this.nextCategoryOrderIdx(workspaceId);

    this.db.db
      .insert(archNoteCategoriesTable)
      .values({
        id,
        workspaceId,
        name: input.name,
        orderIdx,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.assertCategoryOwner(id, userId);
  }

  updateCategory(
    userId: string,
    id: string,
    input: UpdateArchNoteCategoryInput,
  ) {
    this.assertCategoryOwner(id, userId);
    this.db.db
      .update(archNoteCategoriesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(archNoteCategoriesTable.id, id))
      .run();
    return this.assertCategoryOwner(id, userId);
  }

  deleteCategory(userId: string, id: string) {
    this.assertCategoryOwner(id, userId);
    this.db.db
      .delete(archNoteCategoriesTable)
      .where(eq(archNoteCategoriesTable.id, id))
      .run();
  }

  reorderCategories(userId: string, workspaceId: string, categoryIds: string[]) {
    const owned = new Set(
      this.getCategories(userId, workspaceId).map((c) => c.id),
    );
    if (categoryIds.some((id) => !owned.has(id))) {
      throw new ForbiddenException('Not authorized');
    }
    const now = new Date().toISOString();
    for (let i = 0; i < categoryIds.length; i++) {
      this.db.db
        .update(archNoteCategoriesTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(archNoteCategoriesTable.id, categoryIds[i]))
        .run();
    }
  }

  // ── 2차 주제 (섹션) ───────────────────────────────────────
  getSections(userId: string, categoryId: string) {
    this.assertCategoryOwner(categoryId, userId);
    return this.db.db
      .select()
      .from(archNoteSectionsTable)
      .where(eq(archNoteSectionsTable.categoryId, categoryId))
      .orderBy(asc(archNoteSectionsTable.orderIdx))
      .all();
  }

  createSection(userId: string, input: CreateArchNoteSectionInput) {
    this.assertCategoryOwner(input.categoryId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = this.nextSectionOrderIdx(input.categoryId);

    this.db.db
      .insert(archNoteSectionsTable)
      .values({
        id,
        categoryId: input.categoryId,
        title: input.title,
        orderIdx,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.assertSectionOwner(id, userId);
  }

  updateSection(userId: string, id: string, input: UpdateArchNoteSectionInput) {
    this.assertSectionOwner(id, userId);
    this.db.db
      .update(archNoteSectionsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(archNoteSectionsTable.id, id))
      .run();
    return this.assertSectionOwner(id, userId);
  }

  deleteSection(userId: string, id: string) {
    this.assertSectionOwner(id, userId);
    this.db.db
      .delete(archNoteSectionsTable)
      .where(eq(archNoteSectionsTable.id, id))
      .run();
  }

  reorderSections(userId: string, categoryId: string, sectionIds: string[]) {
    const owned = new Set(this.getSections(userId, categoryId).map((s) => s.id));
    if (sectionIds.some((id) => !owned.has(id))) {
      throw new ForbiddenException('Not authorized');
    }
    const now = new Date().toISOString();
    for (let i = 0; i < sectionIds.length; i++) {
      this.db.db
        .update(archNoteSectionsTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(archNoteSectionsTable.id, sectionIds[i]))
        .run();
    }
  }

  // ── 노트 ──────────────────────────────────────────────────
  getNotes(userId: string, sectionId: string) {
    this.assertSectionOwner(sectionId, userId);
    return this.db.db
      .select()
      .from(archNoteNotesTable)
      .where(
        and(
          eq(archNoteNotesTable.sectionId, sectionId),
          eq(archNoteNotesTable.userId, userId),
        ),
      )
      .orderBy(asc(archNoteNotesTable.orderIdx))
      .all();
  }

  createNote(userId: string, input: CreateArchNoteNoteInput) {
    this.assertSectionOwner(input.sectionId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = this.nextNoteOrderIdx(input.sectionId, userId);

    this.db.db
      .insert(archNoteNotesTable)
      .values({
        id,
        sectionId: input.sectionId,
        userId,
        title: input.title ?? '',
        content: input.content,
        orderIdx,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getNoteById(id, userId);
  }

  updateNote(userId: string, id: string, input: UpdateArchNoteNoteInput) {
    const note = this.getNoteById(id, userId);
    if (!note) throw new NotFoundException('Note not found');

    this.db.db
      .update(archNoteNotesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(archNoteNotesTable.id, id))
      .run();

    return this.getNoteById(id, userId);
  }

  deleteNote(userId: string, id: string) {
    const note = this.getNoteById(id, userId);
    if (!note) throw new NotFoundException('Note not found');
    this.db.db
      .delete(archNoteNotesTable)
      .where(eq(archNoteNotesTable.id, id))
      .run();
  }

  // ── 소유권 검증 헬퍼 ──────────────────────────────────────
  private assertWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): ArchNoteWorkspaceRow {
    const row = this.db.db
      .select()
      .from(archNoteWorkspacesTable)
      .where(
        and(
          eq(archNoteWorkspacesTable.id, workspaceId),
          eq(archNoteWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row;
  }

  private assertCategoryOwner(
    categoryId: string,
    userId: string,
  ): ArchNoteCategoryRow {
    const row = this.db.db
      .select({ category: archNoteCategoriesTable })
      .from(archNoteCategoriesTable)
      .innerJoin(
        archNoteWorkspacesTable,
        eq(archNoteCategoriesTable.workspaceId, archNoteWorkspacesTable.id),
      )
      .where(
        and(
          eq(archNoteCategoriesTable.id, categoryId),
          eq(archNoteWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row.category;
  }

  private assertSectionOwner(
    sectionId: string,
    userId: string,
  ): ArchNoteSectionRow {
    const row = this.db.db
      .select({ section: archNoteSectionsTable })
      .from(archNoteSectionsTable)
      .innerJoin(
        archNoteCategoriesTable,
        eq(archNoteSectionsTable.categoryId, archNoteCategoriesTable.id),
      )
      .innerJoin(
        archNoteWorkspacesTable,
        eq(archNoteCategoriesTable.workspaceId, archNoteWorkspacesTable.id),
      )
      .where(
        and(
          eq(archNoteSectionsTable.id, sectionId),
          eq(archNoteWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row.section;
  }

  private getNoteById(id: string, userId: string) {
    return this.db.db
      .select()
      .from(archNoteNotesTable)
      .where(
        and(
          eq(archNoteNotesTable.id, id),
          eq(archNoteNotesTable.userId, userId),
        ),
      )
      .get();
  }

  private nextWorkspaceOrderIdx(userId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${archNoteWorkspacesTable.orderIdx}), -1)`,
      })
      .from(archNoteWorkspacesTable)
      .where(eq(archNoteWorkspacesTable.userId, userId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextCategoryOrderIdx(workspaceId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${archNoteCategoriesTable.orderIdx}), -1)`,
      })
      .from(archNoteCategoriesTable)
      .where(eq(archNoteCategoriesTable.workspaceId, workspaceId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextSectionOrderIdx(categoryId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${archNoteSectionsTable.orderIdx}), -1)`,
      })
      .from(archNoteSectionsTable)
      .where(eq(archNoteSectionsTable.categoryId, categoryId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextNoteOrderIdx(sectionId: string, userId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${archNoteNotesTable.orderIdx}), -1)`,
      })
      .from(archNoteNotesTable)
      .where(
        and(
          eq(archNoteNotesTable.sectionId, sectionId),
          eq(archNoteNotesTable.userId, userId),
        ),
      )
      .get();
    return (result?.max ?? -1) + 1;
  }
}
