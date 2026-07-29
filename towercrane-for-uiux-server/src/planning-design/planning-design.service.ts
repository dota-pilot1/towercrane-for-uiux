import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  planningDesignCategoriesTable,
  planningDesignDocumentsTable,
  planningDesignSectionsTable,
  planningDesignWorkspacesTable,
  type PlanningDesignCategoryRow,
  type PlanningDesignSectionRow,
  type PlanningDesignWorkspaceRow,
} from '../database/schema';
import type {
  CreatePlanningDesignCategoryInput,
  CreatePlanningDesignDocumentInput,
  CreatePlanningDesignSectionInput,
  CreatePlanningDesignWorkspaceInput,
  UpdatePlanningDesignCategoryInput,
  UpdatePlanningDesignDocumentInput,
  UpdatePlanningDesignSectionInput,
  UpdatePlanningDesignWorkspaceInput,
} from './dto/planning-design.schema';

@Injectable()
export class PlanningDesignService {
  constructor(private readonly db: DatabaseService) {}

  listWorkspaces(userId: string) {
    return this.db.db
      .select()
      .from(planningDesignWorkspacesTable)
      .where(eq(planningDesignWorkspacesTable.userId, userId))
      .orderBy(asc(planningDesignWorkspacesTable.orderIdx))
      .all();
  }

  createWorkspace(userId: string, input: CreatePlanningDesignWorkspaceInput) {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(planningDesignWorkspacesTable)
      .values({
        id,
        userId,
        title: input.title,
        description: input.description ?? null,
        icon: input.icon ?? 'DraftingCompass',
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
    input: UpdatePlanningDesignWorkspaceInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);
    this.db.db
      .update(planningDesignWorkspacesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(planningDesignWorkspacesTable.id, workspaceId))
      .run();
    return this.assertWorkspaceOwner(workspaceId, userId);
  }

  deleteWorkspace(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    this.db.db
      .delete(planningDesignWorkspacesTable)
      .where(eq(planningDesignWorkspacesTable.id, workspaceId))
      .run();
  }

  reorderWorkspaces(userId: string, workspaceIds: string[]) {
    const owned = new Set(this.listWorkspaces(userId).map(({ id }) => id));
    this.assertReorderOwnership(workspaceIds, owned);
    const now = new Date().toISOString();
    workspaceIds.forEach((id, orderIdx) => {
      this.db.db
        .update(planningDesignWorkspacesTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(planningDesignWorkspacesTable.id, id))
        .run();
    });
  }

  getCategories(userId: string, workspaceId: string) {
    this.assertWorkspaceOwner(workspaceId, userId);
    return this.db.db
      .select()
      .from(planningDesignCategoriesTable)
      .where(eq(planningDesignCategoriesTable.workspaceId, workspaceId))
      .orderBy(asc(planningDesignCategoriesTable.orderIdx))
      .all();
  }

  createCategory(
    userId: string,
    workspaceId: string,
    input: CreatePlanningDesignCategoryInput,
  ) {
    this.assertWorkspaceOwner(workspaceId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(planningDesignCategoriesTable)
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
    input: UpdatePlanningDesignCategoryInput,
  ) {
    this.assertCategoryOwner(id, userId);
    this.db.db
      .update(planningDesignCategoriesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(planningDesignCategoriesTable.id, id))
      .run();
    return this.assertCategoryOwner(id, userId);
  }

  deleteCategory(userId: string, id: string) {
    this.assertCategoryOwner(id, userId);
    this.db.db
      .delete(planningDesignCategoriesTable)
      .where(eq(planningDesignCategoriesTable.id, id))
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
        .update(planningDesignCategoriesTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(planningDesignCategoriesTable.id, id))
        .run();
    });
  }

  getSections(userId: string, categoryId: string) {
    this.assertCategoryOwner(categoryId, userId);
    return this.db.db
      .select()
      .from(planningDesignSectionsTable)
      .where(eq(planningDesignSectionsTable.categoryId, categoryId))
      .orderBy(asc(planningDesignSectionsTable.orderIdx))
      .all();
  }

  createSection(userId: string, input: CreatePlanningDesignSectionInput) {
    this.assertCategoryOwner(input.categoryId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(planningDesignSectionsTable)
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
    input: UpdatePlanningDesignSectionInput,
  ) {
    this.assertSectionOwner(id, userId);
    this.db.db
      .update(planningDesignSectionsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(planningDesignSectionsTable.id, id))
      .run();
    return this.assertSectionOwner(id, userId);
  }

  deleteSection(userId: string, id: string) {
    this.assertSectionOwner(id, userId);
    this.db.db
      .delete(planningDesignSectionsTable)
      .where(eq(planningDesignSectionsTable.id, id))
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
        .update(planningDesignSectionsTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(planningDesignSectionsTable.id, id))
        .run();
    });
  }

  getDocuments(userId: string, sectionId: string) {
    this.assertSectionOwner(sectionId, userId);
    return this.db.db
      .select()
      .from(planningDesignDocumentsTable)
      .where(
        and(
          eq(planningDesignDocumentsTable.sectionId, sectionId),
          eq(planningDesignDocumentsTable.userId, userId),
        ),
      )
      .orderBy(asc(planningDesignDocumentsTable.orderIdx))
      .all();
  }

  createDocument(userId: string, input: CreatePlanningDesignDocumentInput) {
    this.assertSectionOwner(input.sectionId, userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.db
      .insert(planningDesignDocumentsTable)
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
    input: UpdatePlanningDesignDocumentInput,
  ) {
    this.assertDocumentOwner(id, userId);
    this.db.db
      .update(planningDesignDocumentsTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(planningDesignDocumentsTable.id, id))
      .run();
    return this.getDocumentById(id, userId);
  }

  deleteDocument(userId: string, id: string) {
    this.assertDocumentOwner(id, userId);
    this.db.db
      .delete(planningDesignDocumentsTable)
      .where(eq(planningDesignDocumentsTable.id, id))
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
        .update(planningDesignDocumentsTable)
        .set({ orderIdx, updatedAt: now })
        .where(eq(planningDesignDocumentsTable.id, id))
        .run();
    });
  }

  private assertWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): PlanningDesignWorkspaceRow {
    const row = this.db.db
      .select()
      .from(planningDesignWorkspacesTable)
      .where(
        and(
          eq(planningDesignWorkspacesTable.id, workspaceId),
          eq(planningDesignWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row;
  }

  private assertCategoryOwner(
    categoryId: string,
    userId: string,
  ): PlanningDesignCategoryRow {
    const row = this.db.db
      .select({ category: planningDesignCategoriesTable })
      .from(planningDesignCategoriesTable)
      .innerJoin(
        planningDesignWorkspacesTable,
        eq(
          planningDesignCategoriesTable.workspaceId,
          planningDesignWorkspacesTable.id,
        ),
      )
      .where(
        and(
          eq(planningDesignCategoriesTable.id, categoryId),
          eq(planningDesignWorkspacesTable.userId, userId),
        ),
      )
      .get();
    if (!row) throw new ForbiddenException('Not authorized');
    return row.category;
  }

  private assertSectionOwner(
    sectionId: string,
    userId: string,
  ): PlanningDesignSectionRow {
    const row = this.db.db
      .select({ section: planningDesignSectionsTable })
      .from(planningDesignSectionsTable)
      .innerJoin(
        planningDesignCategoriesTable,
        eq(
          planningDesignSectionsTable.categoryId,
          planningDesignCategoriesTable.id,
        ),
      )
      .innerJoin(
        planningDesignWorkspacesTable,
        eq(
          planningDesignCategoriesTable.workspaceId,
          planningDesignWorkspacesTable.id,
        ),
      )
      .where(
        and(
          eq(planningDesignSectionsTable.id, sectionId),
          eq(planningDesignWorkspacesTable.userId, userId),
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
      .from(planningDesignDocumentsTable)
      .where(
        and(
          eq(planningDesignDocumentsTable.id, id),
          eq(planningDesignDocumentsTable.userId, userId),
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
        max: sql<number>`COALESCE(MAX(${planningDesignWorkspacesTable.orderIdx}), -1)`,
      })
      .from(planningDesignWorkspacesTable)
      .where(eq(planningDesignWorkspacesTable.userId, userId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextCategoryOrderIdx(workspaceId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${planningDesignCategoriesTable.orderIdx}), -1)`,
      })
      .from(planningDesignCategoriesTable)
      .where(eq(planningDesignCategoriesTable.workspaceId, workspaceId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextSectionOrderIdx(categoryId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${planningDesignSectionsTable.orderIdx}), -1)`,
      })
      .from(planningDesignSectionsTable)
      .where(eq(planningDesignSectionsTable.categoryId, categoryId))
      .get();
    return (result?.max ?? -1) + 1;
  }

  private nextDocumentOrderIdx(sectionId: string, userId: string) {
    const result = this.db.db
      .select({
        max: sql<number>`COALESCE(MAX(${planningDesignDocumentsTable.orderIdx}), -1)`,
      })
      .from(planningDesignDocumentsTable)
      .where(
        and(
          eq(planningDesignDocumentsTable.sectionId, sectionId),
          eq(planningDesignDocumentsTable.userId, userId),
        ),
      )
      .get();
    return (result?.max ?? -1) + 1;
  }
}
