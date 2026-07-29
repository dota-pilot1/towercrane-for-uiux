import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  devHistoryCategoriesTable,
  devHistoryDocumentsTable,
  devHistorySectionsTable,
  devHistoryWorkspacesTable,
  type DevHistoryCategoryRow,
  type DevHistorySectionRow,
  type DevHistoryWorkspaceRow,
} from '../database/schema';
import type {
  CreateDevHistoryCategoryInput,
  CreateDevHistoryDocumentInput,
  CreateDevHistorySectionInput,
  CreateDevHistoryWorkspaceInput,
  UpdateDevHistoryCategoryInput,
  UpdateDevHistoryDocumentInput,
  UpdateDevHistorySectionInput,
  UpdateDevHistoryWorkspaceInput,
} from './dto/dev-history.schema';

@Injectable()
export class DevHistoryService {
  constructor(private readonly db: DatabaseService) {}

  listWorkspaces(userId: string) {
    return this.db.db
      .select()
      .from(devHistoryWorkspacesTable)
      .where(eq(devHistoryWorkspacesTable.userId, userId))
      .orderBy(asc(devHistoryWorkspacesTable.orderIdx))
      .all();
  }

  getWorkspaceSummary(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    const result = this.db.db
      .select({
        categoryCount: sql<number>`COUNT(DISTINCT ${devHistoryCategoriesTable.id})`,
        sectionCount: sql<number>`COUNT(DISTINCT ${devHistorySectionsTable.id})`,
        itemCount: sql<number>`COUNT(DISTINCT ${devHistoryDocumentsTable.id})`,
      })
      .from(devHistoryWorkspacesTable)
      .leftJoin(
        devHistoryCategoriesTable,
        eq(
          devHistoryCategoriesTable.workspaceId,
          devHistoryWorkspacesTable.id,
        ),
      )
      .leftJoin(
        devHistorySectionsTable,
        eq(
          devHistorySectionsTable.categoryId,
          devHistoryCategoriesTable.id,
        ),
      )
      .leftJoin(
        devHistoryDocumentsTable,
        and(
          eq(
            devHistoryDocumentsTable.sectionId,
            devHistorySectionsTable.id,
          ),
          eq(devHistoryDocumentsTable.userId, userId),
        ),
      )
      .where(
        and(
          eq(devHistoryWorkspacesTable.id, workspaceId),
          eq(devHistoryWorkspacesTable.userId, userId),
        ),
      )
      .get();

    return {
      categoryCount: Number(result?.categoryCount ?? 0),
      sectionCount: Number(result?.sectionCount ?? 0),
      itemCount: Number(result?.itemCount ?? 0),
    };
  }

  createWorkspace(userId: string, input: CreateDevHistoryWorkspaceInput) {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(devHistoryWorkspacesTable)
      .values({
        id,
        userId,
        title: input.title,
        description: input.description ?? null,
        icon: input.icon ?? 'NotebookPen',
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
    input: UpdateDevHistoryWorkspaceInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);
    this.db.db
      .update(devHistoryWorkspacesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(devHistoryWorkspacesTable.id, workspaceId))
      .run();
    return this.assertWorkspaceOwner(workspaceId, userId);
  }

  deleteWorkspace(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    this.db.db
      .delete(devHistoryWorkspacesTable)
      .where(eq(devHistoryWorkspacesTable.id, workspaceId))
      .run();
  }

  reorderWorkspaces(userId: string, workspaceIds: string[]) {
    const owned = new Set(this.listWorkspaces(userId).map(({ id }) => id));
    this.assertReorderOwnership(workspaceIds, owned);
    const now = new Date().toISOString();
    workspaceIds.forEach((id, orderIdx) => {
      this.db.db
        .update(devHistoryWorkspacesTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(devHistoryWorkspacesTable.id, id))
        .run();
    });
  }

  getCategories(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    return this.db.db
      .select()
      .from(devHistoryCategoriesTable)
      .where(eq(devHistoryCategoriesTable.workspaceId, workspaceId))
      .orderBy(asc(devHistoryCategoriesTable.orderIdx))
      .all();
  }

  createCategory(
    userId: string,
    workspaceId: string,
    input: CreateDevHistoryCategoryInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(devHistoryCategoriesTable)
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
    input: UpdateDevHistoryCategoryInput,
  ) {
    this.assertCategoryOwner(id, userId);
    this.db.db
      .update(devHistoryCategoriesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(devHistoryCategoriesTable.id, id))
      .run();
    return this.assertCategoryOwner(id, userId);
  }

  deleteCategory(userId: string, id: string) {
    this.assertCategoryOwner(id, userId);
    this.db.db
      .delete(devHistoryCategoriesTable)
      .where(eq(devHistoryCategoriesTable.id, id))
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
        .update(devHistoryCategoriesTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(devHistoryCategoriesTable.id, id))
        .run();
    });
  }

  getSections(userId: string, categoryId: string) {
    this.assertCategoryOwner(categoryId, userId);
    return this.db.db
      .select()
      .from(devHistorySectionsTable)
      .where(eq(devHistorySectionsTable.categoryId, categoryId))
      .orderBy(asc(devHistorySectionsTable.orderIdx))
      .all();
  }

  createSection(userId: string, input: CreateDevHistorySectionInput) {
    this.assertCategoryOwner(input.categoryId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(devHistorySectionsTable)
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
    input: UpdateDevHistorySectionInput,
  ) {
    this.assertSectionOwner(id, userId);
    this.db.db
      .update(devHistorySectionsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(devHistorySectionsTable.id, id))
      .run();
    return this.assertSectionOwner(id, userId);
  }

  deleteSection(userId: string, id: string) {
    this.assertSectionOwner(id, userId);
    this.db.db
      .delete(devHistorySectionsTable)
      .where(eq(devHistorySectionsTable.id, id))
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
        .update(devHistorySectionsTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(devHistorySectionsTable.id, id))
        .run();
    });
  }

  getDocuments(userId: string, sectionId: string) {
    this.assertSectionOwner(sectionId, userId);
    return this.db.db
      .select()
      .from(devHistoryDocumentsTable)
      .where(
        and(
          eq(devHistoryDocumentsTable.sectionId, sectionId),
          eq(devHistoryDocumentsTable.userId, userId),
        ),
      )
      .orderBy(asc(devHistoryDocumentsTable.orderIdx))
      .all();
  }

  createDocument(userId: string, input: CreateDevHistoryDocumentInput) {
    this.assertSectionOwner(input.sectionId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(devHistoryDocumentsTable)
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
    input: UpdateDevHistoryDocumentInput,
  ) {
    this.assertDocumentOwner(id, userId);
    this.db.db
      .update(devHistoryDocumentsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(devHistoryDocumentsTable.id, id))
      .run();
    return this.getDocumentById(id, userId);
  }

  deleteDocument(userId: string, id: string) {
    this.assertDocumentOwner(id, userId);
    this.db.db
      .delete(devHistoryDocumentsTable)
      .where(eq(devHistoryDocumentsTable.id, id))
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
        .update(devHistoryDocumentsTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(devHistoryDocumentsTable.id, id))
        .run();
    });
  }

  private assertWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): DevHistoryWorkspaceRow {
    const row = this.db.db
      .select()
      .from(devHistoryWorkspacesTable)
      .where(
        and(
          eq(devHistoryWorkspacesTable.id, workspaceId),
          eq(devHistoryWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row;
  }

  private assertCategoryOwner(
    categoryId: string,
    userId: string,
  ): DevHistoryCategoryRow {
    const row = this.db.db
      .select({ category: devHistoryCategoriesTable })
      .from(devHistoryCategoriesTable)
      .innerJoin(
        devHistoryWorkspacesTable,
        eq(
          devHistoryCategoriesTable.workspaceId,
          devHistoryWorkspacesTable.id,
        ),
      )
      .where(
        and(
          eq(devHistoryCategoriesTable.id, categoryId),
          eq(devHistoryWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row.category;
  }

  private assertSectionOwner(
    sectionId: string,
    userId: string,
  ): DevHistorySectionRow {
    const row = this.db.db
      .select({ section: devHistorySectionsTable })
      .from(devHistorySectionsTable)
      .innerJoin(
        devHistoryCategoriesTable,
        eq(
          devHistorySectionsTable.categoryId,
          devHistoryCategoriesTable.id,
        ),
      )
      .innerJoin(
        devHistoryWorkspacesTable,
        eq(
          devHistoryCategoriesTable.workspaceId,
          devHistoryWorkspacesTable.id,
        ),
      )
      .where(
        and(
          eq(devHistorySectionsTable.id, sectionId),
          eq(devHistoryWorkspacesTable.userId, userId),
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
      .from(devHistoryDocumentsTable)
      .where(
        and(
          eq(devHistoryDocumentsTable.id, id),
          eq(devHistoryDocumentsTable.userId, userId),
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
        max: sql<number>`COALESCE(MAX(${devHistoryWorkspacesTable.orderIdx}), -1)`,
      })
      .from(devHistoryWorkspacesTable)
      .where(eq(devHistoryWorkspacesTable.userId, userId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextCategoryOrderIdx(workspaceId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${devHistoryCategoriesTable.orderIdx}), -1)`,
      })
      .from(devHistoryCategoriesTable)
      .where(eq(devHistoryCategoriesTable.workspaceId, workspaceId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextSectionOrderIdx(categoryId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${devHistorySectionsTable.orderIdx}), -1)`,
      })
      .from(devHistorySectionsTable)
      .where(eq(devHistorySectionsTable.categoryId, categoryId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextDocumentOrderIdx(sectionId: string, userId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${devHistoryDocumentsTable.orderIdx}), -1)`,
      })
      .from(devHistoryDocumentsTable)
      .where(
        and(
          eq(devHistoryDocumentsTable.sectionId, sectionId),
          eq(devHistoryDocumentsTable.userId, userId),
        ),
      )
      .get();
    return (result?.max ?? -1) + 1;
  }
}
