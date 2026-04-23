import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { categoriesTable, prototypeImagesTable, prototypesTable } from '../database/schema';
import { ReviewService } from '../review/review.service';
import {
  createCategorySchema,
  createPrototypeSchema,
  listPrototypesQuerySchema,
  updateCategorySchema,
  updatePrototypeSchema,
} from './catalog.schemas';

@Injectable()
export class CatalogService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly reviewService: ReviewService,
  ) {}

  listCategories(userId: string, userRole: string) {
    const query = this.databaseService.db
      .select()
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.orderIdx));

    const categories = (userRole === 'admin' || userRole === 'guest'
      ? query
      : query.where(eq(categoriesTable.userId, userId))
    ).all();

    const prototypes = this.databaseService.db
      .select()
      .from(prototypesTable)
      .all();

    const allImages = this.databaseService.db
      .select()
      .from(prototypeImagesTable)
      .orderBy(asc(prototypeImagesTable.orderIdx))
      .all();

    return categories.map((category) => ({
      ...category,
      prototypes: prototypes
        .filter((prototype) => prototype.categoryId === category.id)
        .map((p) => ({
          ...p,
          images: allImages
            .filter((img) => img.prototypeId === p.id)
            .map((img) => img.imageUrl),
        })),
    }));
  }

  getCategory(userId: string, userRole: string, categoryId: string) {
    const categoryQuery = this.databaseService.db
      .select()
      .from(categoriesTable);

    const category = (userRole === 'admin' || userRole === 'guest'
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

    const prototypeIds = prototypes.map((p) => p.id);
    const allImages = prototypeIds.length > 0
      ? this.databaseService.db
          .select()
          .from(prototypeImagesTable)
          .where(sql`${prototypeImagesTable.prototypeId} IN ${prototypeIds}`)
          .orderBy(asc(prototypeImagesTable.orderIdx))
          .all()
      : [];

    return {
      ...category,
      prototypes: prototypes.map((p) => ({
        ...p,
        images: allImages
          .filter((img) => img.prototypeId === p.id)
          .map((img) => img.imageUrl),
      })),
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
        orderIdx: this.getNextCategoryOrderIdx(userId),
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
        repoUrl: input.repoUrl || '',
        demoUrl: input.demoUrl || null,
        figmaUrl: input.figmaUrl || null,
        summary: input.summary || '',
        status: input.status,
        visibility: input.visibility,
        tags: input.tags,
        checklist: input.checklist,
        notes: input.notes || null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    if (input.images && input.images.length > 0) {
      this.databaseService.db
        .insert(prototypeImagesTable)
        .values(
          input.images.map((url, idx) => ({
            id: `img-${Date.now().toString().slice(-4)}-${idx}`,
            prototypeId: id,
            imageUrl: url,
            orderIdx: idx,
            createdAt: now,
          })),
        )
        .run();
    }

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
        repoUrl: input.repoUrl === undefined ? undefined : input.repoUrl || '',
        demoUrl: input.demoUrl === undefined ? undefined : input.demoUrl || null,
        figmaUrl: input.figmaUrl === undefined ? undefined : input.figmaUrl || null,
        summary: input.summary,
        status: input.status,
        visibility: input.visibility,
        tags: input.tags,
        checklist: input.checklist,
        notes: input.notes === undefined ? undefined : input.notes || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(prototypesTable.id, prototypeId))
      .run();

    if (input.images !== undefined) {
      // Simple sync: delete all and re-insert
      this.databaseService.db
        .delete(prototypeImagesTable)
        .where(eq(prototypeImagesTable.prototypeId, prototypeId))
        .run();

      if (input.images.length > 0) {
        this.databaseService.db
          .insert(prototypeImagesTable)
          .values(
            input.images.map((url, idx) => ({
              id: `img-${Date.now().toString().slice(-4)}-${idx}`,
              prototypeId: prototypeId,
              imageUrl: url,
              orderIdx: idx,
              createdAt: new Date().toISOString(),
            })),
          )
          .run();
      }
    }

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

  listCategoryPrototypes(
    userId: string,
    userRole: string,
    categoryId: string,
    rawQuery: unknown,
  ) {
    this.ensureCategory(userId, userRole, categoryId);
    const query = listPrototypesQuerySchema.parse(rawQuery ?? {});
    const { page, pageSize, q, sort } = query;
    const offset = (page - 1) * pageSize;

    const whereConditions = [eq(prototypesTable.categoryId, categoryId)];
    if (q) {
      const pattern = `%${q}%`;
      const searchCondition = or(
        like(prototypesTable.title, pattern),
        like(prototypesTable.summary, pattern),
      );
      if (searchCondition) whereConditions.push(searchCondition);
    }
    const whereClause =
      whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0];

    const orderBy =
      sort === 'oldest'
        ? [asc(prototypesTable.updatedAt)]
        : sort === 'title'
          ? [asc(prototypesTable.title)]
          : [desc(prototypesTable.updatedAt)];

    const items = this.databaseService.db
      .select()
      .from(prototypesTable)
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset)
      .all();

    const totalRow = this.databaseService.db
      .select({ count: sql<number>`count(*)` })
      .from(prototypesTable)
      .where(whereClause)
      .get();

    const total = Number(totalRow?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const prototypeIds = items.map((i) => i.id);
    const aggregates = this.reviewService.getAggregatesForPrototypes(prototypeIds);
    
    const allImages = prototypeIds.length > 0 
      ? this.databaseService.db
          .select()
          .from(prototypeImagesTable)
          .where(sql`${prototypeImagesTable.prototypeId} IN ${prototypeIds}`)
          .orderBy(asc(prototypeImagesTable.orderIdx))
          .all()
      : [];

    return {
      items: items.map((item) => {
        const agg = aggregates.get(item.id);
        const images = allImages.filter(img => img.prototypeId === item.id).map(img => img.imageUrl);
        return {
          ...item,
          images,
          avgRating: agg?.avgRating ?? 0,
          reviewCount: agg?.count ?? 0,
        };
      }),
      total,
      page,
      pageSize,
      totalPages,
      query: { q, sort },
    };
  }

  reorderCategories(userId: string, categoryIds: string[]) {
    this.databaseService.db.transaction((tx) => {
      categoryIds.forEach((id, idx) => {
        tx.update(categoriesTable)
          .set({ orderIdx: idx })
          .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
          .run();
      });
    });
    return { success: true };
  }

  private getNextCategoryOrderIdx(userId: string): number {
    const row = this.databaseService.db
      .select({ maxIdx: sql<number>`max(${categoriesTable.orderIdx})` })
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId))
      .get();
    return (row?.maxIdx ?? -1) + 1;
  }

  private ensureCategory(userId: string, userRole: string, categoryId: string) {
    const categoryQuery = this.databaseService.db
      .select({ id: categoriesTable.id })
      .from(categoriesTable);

    const category = (userRole === 'admin' || userRole === 'guest'
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

    const linkedPrototype = (userRole === 'admin' || userRole === 'guest'
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
