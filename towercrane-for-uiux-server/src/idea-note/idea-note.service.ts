import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  ideaNoteCategoriesTable,
  ideaNoteDocumentsTable,
  ideaNoteSectionsTable,
  ideaNoteWorkspacesTable,
  type IdeaNoteCategoryRow,
  type IdeaNoteSectionRow,
  type IdeaNoteWorkspaceRow,
} from '../database/schema';
import type {
  CreateIdeaNoteCategoryInput,
  CreateIdeaNoteDocumentInput,
  CreateIdeaNoteSectionInput,
  CreateIdeaNoteWorkspaceInput,
  UpdateIdeaNoteCategoryInput,
  UpdateIdeaNoteDocumentInput,
  UpdateIdeaNoteSectionInput,
  UpdateIdeaNoteWorkspaceInput,
} from './dto/idea-note.schema';

@Injectable()
export class IdeaNoteService {
  constructor(private readonly db: DatabaseService) {}

  listWorkspaces(userId: string) {
    return this.db.db
      .select()
      .from(ideaNoteWorkspacesTable)
      .where(eq(ideaNoteWorkspacesTable.userId, userId))
      .orderBy(asc(ideaNoteWorkspacesTable.orderIdx))
      .all();
  }

  getWorkspaceSummary(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    const result = this.db.db
      .select({
        categoryCount: sql<number>`COUNT(DISTINCT ${ideaNoteCategoriesTable.id})`,
        sectionCount: sql<number>`COUNT(DISTINCT ${ideaNoteSectionsTable.id})`,
        itemCount: sql<number>`COUNT(DISTINCT ${ideaNoteDocumentsTable.id})`,
      })
      .from(ideaNoteWorkspacesTable)
      .leftJoin(
        ideaNoteCategoriesTable,
        eq(
          ideaNoteCategoriesTable.workspaceId,
          ideaNoteWorkspacesTable.id,
        ),
      )
      .leftJoin(
        ideaNoteSectionsTable,
        eq(
          ideaNoteSectionsTable.categoryId,
          ideaNoteCategoriesTable.id,
        ),
      )
      .leftJoin(
        ideaNoteDocumentsTable,
        and(
          eq(
            ideaNoteDocumentsTable.sectionId,
            ideaNoteSectionsTable.id,
          ),
          eq(ideaNoteDocumentsTable.userId, userId),
        ),
      )
      .where(
        and(
          eq(ideaNoteWorkspacesTable.id, workspaceId),
          eq(ideaNoteWorkspacesTable.userId, userId),
        ),
      )
      .get();

    return {
      categoryCount: Number(result?.categoryCount ?? 0),
      sectionCount: Number(result?.sectionCount ?? 0),
      itemCount: Number(result?.itemCount ?? 0),
    };
  }

  createWorkspace(userId: string, input: CreateIdeaNoteWorkspaceInput) {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(ideaNoteWorkspacesTable)
      .values({
        id,
        userId,
        title: input.title,
        description: input.description ?? null,
        icon: input.icon ?? 'Lightbulb',
        orderIdx: this.nextWorkspaceOrderIdx(userId),
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.assertWorkspaceOwner(id, userId);
  }

  updateWorkspace(
    userId: string,
    workspaceId: string,
    input: UpdateIdeaNoteWorkspaceInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);
    this.db.db
      .update(ideaNoteWorkspacesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(ideaNoteWorkspacesTable.id, workspaceId))
      .run();
    return this.assertWorkspaceOwner(workspaceId, userId);
  }

  deleteWorkspace(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    this.db.db
      .delete(ideaNoteWorkspacesTable)
      .where(eq(ideaNoteWorkspacesTable.id, workspaceId))
      .run();
  }

  reorderWorkspaces(userId: string, workspaceIds: string[]) {
    const owned = new Set(this.listWorkspaces(userId).map(({ id }) => id));
    this.assertReorderOwnership(workspaceIds, owned);
    const now = new Date().toISOString();
    workspaceIds.forEach((id, orderIdx) => {
      this.db.db
        .update(ideaNoteWorkspacesTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(ideaNoteWorkspacesTable.id, id))
        .run();
    });
  }

  getCategories(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    return this.db.db
      .select()
      .from(ideaNoteCategoriesTable)
      .where(eq(ideaNoteCategoriesTable.workspaceId, workspaceId))
      .orderBy(asc(ideaNoteCategoriesTable.orderIdx))
      .all();
  }

  createCategory(
    userId: string,
    workspaceId: string,
    input: CreateIdeaNoteCategoryInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(ideaNoteCategoriesTable)
      .values({
        id,
        workspaceId,
        name: input.name,
        orderIdx: this.nextCategoryOrderIdx(workspaceId),
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
    input: UpdateIdeaNoteCategoryInput,
  ) {
    this.assertCategoryOwner(id, userId);
    this.db.db
      .update(ideaNoteCategoriesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(ideaNoteCategoriesTable.id, id))
      .run();
    return this.assertCategoryOwner(id, userId);
  }

  deleteCategory(userId: string, id: string) {
    this.assertCategoryOwner(id, userId);
    this.db.db
      .delete(ideaNoteCategoriesTable)
      .where(eq(ideaNoteCategoriesTable.id, id))
      .run();
  }

  reorderCategories(
    userId: string,
    workspaceId: string,
    categoryIds: string[],
  ) {
    const owned = new Set(
      this.getCategories(userId, workspaceId).map(({ id }) => id),
    );
    this.assertReorderOwnership(categoryIds, owned);
    const now = new Date().toISOString();
    categoryIds.forEach((id, orderIdx) => {
      this.db.db
        .update(ideaNoteCategoriesTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(ideaNoteCategoriesTable.id, id))
        .run();
    });
  }

  getSections(userId: string, categoryId: string) {
    this.assertCategoryOwner(categoryId, userId);
    return this.db.db
      .select()
      .from(ideaNoteSectionsTable)
      .where(eq(ideaNoteSectionsTable.categoryId, categoryId))
      .orderBy(asc(ideaNoteSectionsTable.orderIdx))
      .all();
  }

  createSection(userId: string, input: CreateIdeaNoteSectionInput) {
    this.assertCategoryOwner(input.categoryId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(ideaNoteSectionsTable)
      .values({
        id,
        categoryId: input.categoryId,
        title: input.title,
        orderIdx: this.nextSectionOrderIdx(input.categoryId),
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.assertSectionOwner(id, userId);
  }

  updateSection(
    userId: string,
    id: string,
    input: UpdateIdeaNoteSectionInput,
  ) {
    this.assertSectionOwner(id, userId);
    this.db.db
      .update(ideaNoteSectionsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(ideaNoteSectionsTable.id, id))
      .run();
    return this.assertSectionOwner(id, userId);
  }

  deleteSection(userId: string, id: string) {
    this.assertSectionOwner(id, userId);
    this.db.db
      .delete(ideaNoteSectionsTable)
      .where(eq(ideaNoteSectionsTable.id, id))
      .run();
  }

  reorderSections(userId: string, categoryId: string, sectionIds: string[]) {
    const owned = new Set(
      this.getSections(userId, categoryId).map(({ id }) => id),
    );
    this.assertReorderOwnership(sectionIds, owned);
    const now = new Date().toISOString();
    sectionIds.forEach((id, orderIdx) => {
      this.db.db
        .update(ideaNoteSectionsTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(ideaNoteSectionsTable.id, id))
        .run();
    });
  }

  getDocuments(userId: string, sectionId: string) {
    this.assertSectionOwner(sectionId, userId);
    return this.db.db
      .select()
      .from(ideaNoteDocumentsTable)
      .where(
        and(
          eq(ideaNoteDocumentsTable.sectionId, sectionId),
          eq(ideaNoteDocumentsTable.userId, userId),
        ),
      )
      .orderBy(asc(ideaNoteDocumentsTable.orderIdx))
      .all();
  }

  createDocument(userId: string, input: CreateIdeaNoteDocumentInput) {
    this.assertSectionOwner(input.sectionId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(ideaNoteDocumentsTable)
      .values({
        id,
        sectionId: input.sectionId,
        userId,
        title: input.title ?? '',
        content: input.content,
        orderIdx: this.nextDocumentOrderIdx(input.sectionId, userId),
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.getDocumentById(id, userId);
  }

  updateDocument(
    userId: string,
    id: string,
    input: UpdateIdeaNoteDocumentInput,
  ) {
    this.assertDocumentOwner(id, userId);
    this.db.db
      .update(ideaNoteDocumentsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(ideaNoteDocumentsTable.id, id))
      .run();
    return this.getDocumentById(id, userId);
  }

  deleteDocument(userId: string, id: string) {
    this.assertDocumentOwner(id, userId);
    this.db.db
      .delete(ideaNoteDocumentsTable)
      .where(eq(ideaNoteDocumentsTable.id, id))
      .run();
  }

  reorderDocuments(userId: string, sectionId: string, documentIds: string[]) {
    const owned = new Set(
      this.getDocuments(userId, sectionId).map(({ id }) => id),
    );
    this.assertReorderOwnership(documentIds, owned);
    const now = new Date().toISOString();
    documentIds.forEach((id, orderIdx) => {
      this.db.db
        .update(ideaNoteDocumentsTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(ideaNoteDocumentsTable.id, id))
        .run();
    });
  }

  private assertWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): IdeaNoteWorkspaceRow {
    const row = this.db.db
      .select()
      .from(ideaNoteWorkspacesTable)
      .where(
        and(
          eq(ideaNoteWorkspacesTable.id, workspaceId),
          eq(ideaNoteWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row;
  }

  private assertCategoryOwner(
    categoryId: string,
    userId: string,
  ): IdeaNoteCategoryRow {
    const row = this.db.db
      .select({ category: ideaNoteCategoriesTable })
      .from(ideaNoteCategoriesTable)
      .innerJoin(
        ideaNoteWorkspacesTable,
        eq(
          ideaNoteCategoriesTable.workspaceId,
          ideaNoteWorkspacesTable.id,
        ),
      )
      .where(
        and(
          eq(ideaNoteCategoriesTable.id, categoryId),
          eq(ideaNoteWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row.category;
  }

  private assertSectionOwner(
    sectionId: string,
    userId: string,
  ): IdeaNoteSectionRow {
    const row = this.db.db
      .select({ section: ideaNoteSectionsTable })
      .from(ideaNoteSectionsTable)
      .innerJoin(
        ideaNoteCategoriesTable,
        eq(
          ideaNoteSectionsTable.categoryId,
          ideaNoteCategoriesTable.id,
        ),
      )
      .innerJoin(
        ideaNoteWorkspacesTable,
        eq(
          ideaNoteCategoriesTable.workspaceId,
          ideaNoteWorkspacesTable.id,
        ),
      )
      .where(
        and(
          eq(ideaNoteSectionsTable.id, sectionId),
          eq(ideaNoteWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row.section;
  }

  private assertDocumentOwner(id: string, userId: string) {
    const document = this.getDocumentById(id, userId);
    if (!document) throw new NotFoundException('Document not found');
    this.assertSectionOwner(document.sectionId, userId);
    return document;
  }

  private getDocumentById(id: string, userId: string) {
    return this.db.db
      .select()
      .from(ideaNoteDocumentsTable)
      .where(
        and(
          eq(ideaNoteDocumentsTable.id, id),
          eq(ideaNoteDocumentsTable.userId, userId),
        ),
      )
      .get();
  }

  private assertReorderOwnership(ids: string[], owned: Set<string>) {
    const requested = new Set(ids);
    if (
      requested.size !== ids.length ||
      requested.size !== owned.size ||
      ids.some((id) => !owned.has(id))
    ) {
      throw new ForbiddenException('Not authorized');
    }
  }

  private nextWorkspaceOrderIdx(userId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${ideaNoteWorkspacesTable.orderIdx}), -1)`,
      })
      .from(ideaNoteWorkspacesTable)
      .where(eq(ideaNoteWorkspacesTable.userId, userId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextCategoryOrderIdx(workspaceId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${ideaNoteCategoriesTable.orderIdx}), -1)`,
      })
      .from(ideaNoteCategoriesTable)
      .where(eq(ideaNoteCategoriesTable.workspaceId, workspaceId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextSectionOrderIdx(categoryId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${ideaNoteSectionsTable.orderIdx}), -1)`,
      })
      .from(ideaNoteSectionsTable)
      .where(eq(ideaNoteSectionsTable.categoryId, categoryId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextDocumentOrderIdx(sectionId: string, userId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${ideaNoteDocumentsTable.orderIdx}), -1)`,
      })
      .from(ideaNoteDocumentsTable)
      .where(
        and(
          eq(ideaNoteDocumentsTable.sectionId, sectionId),
          eq(ideaNoteDocumentsTable.userId, userId),
        ),
      )
      .get();
    return (result?.max ?? -1) + 1;
  }
}
