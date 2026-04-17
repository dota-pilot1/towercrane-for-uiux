import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { categoriesTable, prototypesTable } from '../database/schema';
import {
  createCategorySchema,
  createPrototypeSchema,
  updateCategorySchema,
  updatePrototypeSchema,
} from './catalog.schemas';

@Injectable()
export class CatalogService {
  constructor(private readonly databaseService: DatabaseService) {}

  listCategories(userId: string, userRole: string) {
    const categoriesQuery = this.databaseService.db
      .select()
      .from(categoriesTable);

    const categories = (userRole === 'admin' 
      ? categoriesQuery 
      : categoriesQuery.where(eq(categoriesTable.userId, userId))
    ).all();
    const prototypes = this.databaseService.db
      .select()
      .from(prototypesTable)
      .all();

    return categories.map((category) => ({
      ...category,
      prototypes: prototypes.filter(
        (prototype) => prototype.categoryId === category.id,
      ),
    }));
  }

  getCategory(userId: string, userRole: string, categoryId: string) {
    const categoryQuery = this.databaseService.db
      .select()
      .from(categoriesTable);

    const category = (userRole === 'admin'
      ? categoryQuery.where(eq(categoriesTable.id, categoryId))
      : categoryQuery.where(
          and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)),
        )
    ).get();

    if (!category) {
      throw new NotFoundException(`Category not found: ${categoryId}`);
    }

    const prototypes = this.databaseService.db
      .select()
      .from(prototypesTable)
      .where(eq(prototypesTable.categoryId, categoryId))
      .all();

    return {
      ...category,
      prototypes,
    };
  }

  createCategory(userId: string, payload: unknown) {
    const input = createCategorySchema.parse(payload);
    const now = new Date().toISOString();
    const id = `${input.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-')}-${Date.now().toString().slice(-6)}`;

    this.databaseService.db
      .insert(categoriesTable)
      .values({
        id,
        userId,
        title: input.title,
        summary: input.summary,
        group: input.group,
        iconKey: input.iconKey,
        tags: input.tags,
        checklist:
          input.checklist.length > 0
            ? input.checklist
            : [
                '프로토타입 링크 추가',
                '구현 포인트 정리',
                '백엔드 연결 여부 판단',
              ],
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getCategory(userId, 'admin', id);
  }

  updateCategory(userId: string, userRole: string, categoryId: string, payload: unknown) {
    this.ensureCategory(userId, userRole, categoryId);
    const input = updateCategorySchema.parse(payload);

    this.databaseService.db
      .update(categoriesTable)
      .set({
        title: input.title,
        summary: input.summary,
        group: input.group,
        iconKey: input.iconKey,
        tags: input.tags,
        checklist: input.checklist,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)),
      )
      .run();

    return this.getCategory(userId, userRole, categoryId);
  }

  deleteCategory(userId: string, userRole: string, categoryId: string) {
    this.ensureCategory(userId, userRole, categoryId);

    this.databaseService.db
      .delete(categoriesTable)
      .where(
        and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)),
      )
      .run();

    return { success: true, categoryId };
  }

  createPrototype(userId: string, userRole: string, categoryId: string, payload: unknown) {
    this.ensureCategory(userId, userRole, categoryId);

    const input = createPrototypeSchema.parse(payload);
    const now = new Date().toISOString();
    const id = `prototype-${Date.now().toString().slice(-6)}`;

    this.databaseService.db
      .insert(prototypesTable)
      .values({
        id,
        categoryId,
        title: input.title,
        repoUrl: input.repoUrl,
        demoUrl: input.demoUrl || null,
        figmaUrl: input.figmaUrl || null,
        summary: input.summary,
        status: input.status,
        visibility: input.visibility,
        tags: input.tags,
        notes: input.notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getCategory(userId, userRole, categoryId);
  }

  updatePrototype(
    userId: string,
    userRole: string,
    categoryId: string,
    prototypeId: string,
    payload: unknown,
  ) {
    this.ensureCategory(userId, userRole, categoryId);
    this.ensurePrototype(userId, userRole, categoryId, prototypeId);
    const input = updatePrototypeSchema.parse(payload);

    this.databaseService.db
      .update(prototypesTable)
      .set({
        title: input.title,
        repoUrl: input.repoUrl,
        demoUrl: input.demoUrl === undefined ? undefined : input.demoUrl || null,
        figmaUrl: input.figmaUrl === undefined ? undefined : input.figmaUrl || null,
        summary: input.summary,
        status: input.status,
        visibility: input.visibility,
        tags: input.tags,
        notes: input.notes === undefined ? undefined : input.notes || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(prototypesTable.id, prototypeId))
      .run();

    return this.getCategory(userId, userRole, categoryId);
  }

  deletePrototype(userId: string, userRole: string, categoryId: string, prototypeId: string) {
    this.ensureCategory(userId, userRole, categoryId);
    this.ensurePrototype(userId, userRole, categoryId, prototypeId);

    this.databaseService.db
      .delete(prototypesTable)
      .where(eq(prototypesTable.id, prototypeId))
      .run();

    return this.getCategory(userId, userRole, categoryId);
  }

  private ensureCategory(userId: string, userRole: string, categoryId: string) {
    const categoryQuery = this.databaseService.db
      .select({ id: categoriesTable.id })
      .from(categoriesTable);

    const category = (userRole === 'admin'
      ? categoryQuery.where(eq(categoriesTable.id, categoryId))
      : categoryQuery.where(
          and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)),
        )
    ).get();

    if (!category) {
      throw new NotFoundException(`Category not found: ${categoryId}`);
    }

    return category;
  }

  private ensurePrototype(userId: string, userRole: string, categoryId: string, prototypeId: string) {
    const prototype = this.databaseService.db
      .select({ id: prototypesTable.id })
      .from(prototypesTable)
      .where(eq(prototypesTable.id, prototypeId))
      .get();

    if (!prototype) {
      throw new NotFoundException(`Prototype not found: ${prototypeId}`);
    }

    const linkedPrototypeQuery = this.databaseService.db
      .select({ id: prototypesTable.id })
      .from(categoriesTable)
      .innerJoin(
        prototypesTable,
        eq(prototypesTable.categoryId, categoriesTable.id),
      );

    const linkedPrototype = (userRole === 'admin'
      ? linkedPrototypeQuery.where(eq(categoriesTable.id, categoryId))
      : linkedPrototypeQuery.where(
          and(eq(categoriesTable.id, categoryId), eq(categoriesTable.userId, userId)),
        )
    ).all()
      .find((item) => item.id === prototypeId);

    if (!linkedPrototype) {
      throw new NotFoundException(
        `Prototype ${prototypeId} is not linked to category ${categoryId}`,
      );
    }

    return prototype;
  }
}
