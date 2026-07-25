import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  projectCodeReviewCategoriesTable,
  projectCodeReviewNotesTable,
  projectCodeReviewSectionsTable,
  projectCodeReviewWorkspacesTable,
  type ProjectCodeReviewCategoryRow,
  type ProjectCodeReviewSectionRow,
  type ProjectCodeReviewWorkspaceRow,
} from '../database/schema';
import type {
  CreateProjectCodeReviewCategoryInput,
  CreateProjectCodeReviewNoteInput,
  CreateProjectCodeReviewSectionInput,
  CreateProjectCodeReviewWorkspaceInput,
  UpdateProjectCodeReviewCategoryInput,
  UpdateProjectCodeReviewNoteInput,
  UpdateProjectCodeReviewSectionInput,
  UpdateProjectCodeReviewWorkspaceInput,
} from './dto/project-code-review.schema';

@Injectable()
export class ProjectCodeReviewService {
  constructor(private readonly db: DatabaseService) {}

  // ── 워크스페이스 ──────────────────────────────────────────
  listWorkspaces(userId: string) {
    return this.db.db
      .select()
      .from(projectCodeReviewWorkspacesTable)
      .where(eq(projectCodeReviewWorkspacesTable.userId, userId))
      .orderBy(asc(projectCodeReviewWorkspacesTable.orderIdx))
      .all();
  }

  createWorkspace(
    userId: string,
    input: CreateProjectCodeReviewWorkspaceInput,
  ) {
    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = this.nextWorkspaceOrderIdx(userId);

    this.db.db
      .insert(projectCodeReviewWorkspacesTable)
      .values({
        id,
        userId,
        title: input.title,
        description: input.description ?? null,
        icon: input.icon ?? 'GitPullRequest',
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
    input: UpdateProjectCodeReviewWorkspaceInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);

    this.db.db
      .update(projectCodeReviewWorkspacesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(projectCodeReviewWorkspacesTable.id, workspaceId))
      .run();

    return this.assertWorkspaceOwner(workspaceId, userId);
  }

  deleteWorkspace(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    this.db.db
      .delete(projectCodeReviewWorkspacesTable)
      .where(eq(projectCodeReviewWorkspacesTable.id, workspaceId))
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
        .update(projectCodeReviewWorkspacesTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(projectCodeReviewWorkspacesTable.id, workspaceIds[i]))
        .run();
    }
  }

  // ── 1차 주제 (카테고리) ───────────────────────────────────
  getCategories(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    return this.db.db
      .select()
      .from(projectCodeReviewCategoriesTable)
      .where(eq(projectCodeReviewCategoriesTable.workspaceId, workspaceId))
      .orderBy(asc(projectCodeReviewCategoriesTable.orderIdx))
      .all();
  }

  createCategory(
    userId: string,
    workspaceId: string,
    input: CreateProjectCodeReviewCategoryInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = this.nextCategoryOrderIdx(workspaceId);

    this.db.db
      .insert(projectCodeReviewCategoriesTable)
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
    input: UpdateProjectCodeReviewCategoryInput,
  ) {
    this.assertCategoryOwner(id, userId);
    this.db.db
      .update(projectCodeReviewCategoriesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(projectCodeReviewCategoriesTable.id, id))
      .run();
    return this.assertCategoryOwner(id, userId);
  }

  deleteCategory(userId: string, id: string) {
    this.assertCategoryOwner(id, userId);
    this.db.db
      .delete(projectCodeReviewCategoriesTable)
      .where(eq(projectCodeReviewCategoriesTable.id, id))
      .run();
  }

  reorderCategories(
    userId: string,
    workspaceId: string,
    categoryIds: string[],
  ) {
    const owned = new Set(
      this.getCategories(userId, workspaceId).map((c) => c.id),
    );
    if (categoryIds.some((id) => !owned.has(id))) {
      throw new ForbiddenException('Not authorized');
    }
    const now = new Date().toISOString();
    for (let i = 0; i < categoryIds.length; i++) {
      this.db.db
        .update(projectCodeReviewCategoriesTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(projectCodeReviewCategoriesTable.id, categoryIds[i]))
        .run();
    }
  }

  // ── 2차 주제 (섹션) ───────────────────────────────────────
  getSections(userId: string, categoryId: string) {
    this.assertCategoryOwner(categoryId, userId);
    return this.db.db
      .select()
      .from(projectCodeReviewSectionsTable)
      .where(eq(projectCodeReviewSectionsTable.categoryId, categoryId))
      .orderBy(asc(projectCodeReviewSectionsTable.orderIdx))
      .all();
  }

  createSection(userId: string, input: CreateProjectCodeReviewSectionInput) {
    this.assertCategoryOwner(input.categoryId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = this.nextSectionOrderIdx(input.categoryId);

    this.db.db
      .insert(projectCodeReviewSectionsTable)
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

  updateSection(
    userId: string,
    id: string,
    input: UpdateProjectCodeReviewSectionInput,
  ) {
    this.assertSectionOwner(id, userId);
    this.db.db
      .update(projectCodeReviewSectionsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(projectCodeReviewSectionsTable.id, id))
      .run();
    return this.assertSectionOwner(id, userId);
  }

  deleteSection(userId: string, id: string) {
    this.assertSectionOwner(id, userId);
    this.db.db
      .delete(projectCodeReviewSectionsTable)
      .where(eq(projectCodeReviewSectionsTable.id, id))
      .run();
  }

  reorderSections(userId: string, categoryId: string, sectionIds: string[]) {
    const owned = new Set(
      this.getSections(userId, categoryId).map((s) => s.id),
    );
    if (sectionIds.some((id) => !owned.has(id))) {
      throw new ForbiddenException('Not authorized');
    }
    const now = new Date().toISOString();
    for (let i = 0; i < sectionIds.length; i++) {
      this.db.db
        .update(projectCodeReviewSectionsTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(projectCodeReviewSectionsTable.id, sectionIds[i]))
        .run();
    }
  }

  // ── 노트 ──────────────────────────────────────────────────
  getNotes(userId: string, sectionId: string) {
    this.assertSectionOwner(sectionId, userId);
    return this.db.db
      .select()
      .from(projectCodeReviewNotesTable)
      .where(
        and(
          eq(projectCodeReviewNotesTable.sectionId, sectionId),
          eq(projectCodeReviewNotesTable.userId, userId),
        ),
      )
      .orderBy(asc(projectCodeReviewNotesTable.orderIdx))
      .all();
  }

  createNote(userId: string, input: CreateProjectCodeReviewNoteInput) {
    this.assertSectionOwner(input.sectionId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const orderIdx = this.nextNoteOrderIdx(input.sectionId, userId);

    this.db.db
      .insert(projectCodeReviewNotesTable)
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

  updateNote(
    userId: string,
    id: string,
    input: UpdateProjectCodeReviewNoteInput,
  ) {
    const note = this.getNoteById(id, userId);
    if (!note) throw new NotFoundException('Note not found');

    this.db.db
      .update(projectCodeReviewNotesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(projectCodeReviewNotesTable.id, id))
      .run();

    return this.getNoteById(id, userId);
  }

  deleteNote(userId: string, id: string) {
    const note = this.getNoteById(id, userId);
    if (!note) throw new NotFoundException('Note not found');
    this.db.db
      .delete(projectCodeReviewNotesTable)
      .where(eq(projectCodeReviewNotesTable.id, id))
      .run();
  }

  reorderNotes(userId: string, sectionId: string, noteIds: string[]) {
    const owned = new Set(this.getNotes(userId, sectionId).map((n) => n.id));
    if (noteIds.some((id) => !owned.has(id))) {
      throw new ForbiddenException('Not authorized');
    }
    const now = new Date().toISOString();
    for (let i = 0; i < noteIds.length; i++) {
      this.db.db
        .update(projectCodeReviewNotesTable)
        .set({ orderIdx: i, updatedAt: now })
        .where(eq(projectCodeReviewNotesTable.id, noteIds[i]))
        .run();
    }
  }

  // ── 소유권 검증 헬퍼 ──────────────────────────────────────
  private assertWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): ProjectCodeReviewWorkspaceRow {
    const row = this.db.db
      .select()
      .from(projectCodeReviewWorkspacesTable)
      .where(
        and(
          eq(projectCodeReviewWorkspacesTable.id, workspaceId),
          eq(projectCodeReviewWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row;
  }

  private assertCategoryOwner(
    categoryId: string,
    userId: string,
  ): ProjectCodeReviewCategoryRow {
    const row = this.db.db
      .select({ category: projectCodeReviewCategoriesTable })
      .from(projectCodeReviewCategoriesTable)
      .innerJoin(
        projectCodeReviewWorkspacesTable,
        eq(
          projectCodeReviewCategoriesTable.workspaceId,
          projectCodeReviewWorkspacesTable.id,
        ),
      )
      .where(
        and(
          eq(projectCodeReviewCategoriesTable.id, categoryId),
          eq(projectCodeReviewWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row.category;
  }

  private assertSectionOwner(
    sectionId: string,
    userId: string,
  ): ProjectCodeReviewSectionRow {
    const row = this.db.db
      .select({ section: projectCodeReviewSectionsTable })
      .from(projectCodeReviewSectionsTable)
      .innerJoin(
        projectCodeReviewCategoriesTable,
        eq(
          projectCodeReviewSectionsTable.categoryId,
          projectCodeReviewCategoriesTable.id,
        ),
      )
      .innerJoin(
        projectCodeReviewWorkspacesTable,
        eq(
          projectCodeReviewCategoriesTable.workspaceId,
          projectCodeReviewWorkspacesTable.id,
        ),
      )
      .where(
        and(
          eq(projectCodeReviewSectionsTable.id, sectionId),
          eq(projectCodeReviewWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row.section;
  }

  private getNoteById(id: string, userId: string) {
    return this.db.db
      .select()
      .from(projectCodeReviewNotesTable)
      .where(
        and(
          eq(projectCodeReviewNotesTable.id, id),
          eq(projectCodeReviewNotesTable.userId, userId),
        ),
      )
      .get();
  }

  private nextWorkspaceOrderIdx(userId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${projectCodeReviewWorkspacesTable.orderIdx}), -1)`,
      })
      .from(projectCodeReviewWorkspacesTable)
      .where(eq(projectCodeReviewWorkspacesTable.userId, userId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextCategoryOrderIdx(workspaceId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${projectCodeReviewCategoriesTable.orderIdx}), -1)`,
      })
      .from(projectCodeReviewCategoriesTable)
      .where(eq(projectCodeReviewCategoriesTable.workspaceId, workspaceId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextSectionOrderIdx(categoryId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${projectCodeReviewSectionsTable.orderIdx}), -1)`,
      })
      .from(projectCodeReviewSectionsTable)
      .where(eq(projectCodeReviewSectionsTable.categoryId, categoryId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextNoteOrderIdx(sectionId: string, userId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${projectCodeReviewNotesTable.orderIdx}), -1)`,
      })
      .from(projectCodeReviewNotesTable)
      .where(
        and(
          eq(projectCodeReviewNotesTable.sectionId, sectionId),
          eq(projectCodeReviewNotesTable.userId, userId),
        ),
      )
      .get();
    return (result?.max ?? -1) + 1;
  }
}
