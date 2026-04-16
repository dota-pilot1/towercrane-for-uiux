import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { categoriesTable, prototypesTable } from '../database/schema';
import { createCategorySchema, createPrototypeSchema } from './catalog.schemas';

@Injectable()
export class CatalogService {
  constructor(private readonly databaseService: DatabaseService) {}

  listCategories() {
    const categories = this.databaseService.db
      .select()
      .from(categoriesTable)
      .all();
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

  getCategory(categoryId: string) {
    const category = this.databaseService.db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .get();

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

  createCategory(payload: unknown) {
    const input = createCategorySchema.parse(payload);
    const id = `${input.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-')}-${Date.now().toString().slice(-6)}`;

    this.databaseService.db
      .insert(categoriesTable)
      .values({
        id,
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
        createdAt: new Date().toISOString(),
      })
      .run();

    return this.getCategory(id);
  }

  createPrototype(categoryId: string, payload: unknown) {
    const category = this.databaseService.db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .get();

    if (!category) {
      throw new NotFoundException(`Category not found: ${categoryId}`);
    }

    const input = createPrototypeSchema.parse(payload);
    const id = `prototype-${Date.now().toString().slice(-6)}`;

    this.databaseService.db
      .insert(prototypesTable)
      .values({
        id,
        categoryId,
        title: input.title,
        repoUrl: input.repoUrl,
        summary: input.summary,
        status: input.status,
        visibility: input.visibility,
        updatedAt: new Date().toISOString().slice(0, 10),
      })
      .run();

    return this.getCategory(categoryId);
  }
}
