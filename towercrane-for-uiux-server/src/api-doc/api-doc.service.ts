import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  apiDocBlocksTable,
  apiDocCategoriesTable,
  apiDocEndpointsTable,
  type ApiDocBlockInsert,
  type ApiDocCategoryInsert,
  type ApiDocEndpointInsert,
} from '../database/schema';
import {
  createCategorySchema,
  createEndpointSchema,
  reorderSchema,
  replaceBlocksSchema,
  updateCategorySchema,
  updateEndpointSchema,
} from './api-doc.schemas';
import {
  apiBlockContentImportSchema,
  apiDocImportExportFileSchema,
  type ApiBlockContentImport,
  type ApiDocImportExportFile,
} from './api-doc.import-export.schemas';

export type ApiDocUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class ApiDocService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  listCategories() {
    return this.db
      .select()
      .from(apiDocCategoriesTable)
      .orderBy(asc(apiDocCategoriesTable.orderIdx), asc(apiDocCategoriesTable.createdAt))
      .all();
  }

  createCategory(user: ApiDocUser, payload: unknown) {
    this.ensureAdmin(user);
    const input = createCategorySchema.parse(payload);
    const now = new Date().toISOString();
    const id = `api-cat-${randomUUID().slice(0, 12)}`;
    const maxOrder = this.db
      .select({ orderIdx: apiDocCategoriesTable.orderIdx })
      .from(apiDocCategoriesTable)
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const row: ApiDocCategoryInsert = {
      id,
      name: input.name,
      icon: input.icon ?? 'Folder',
      emoji: input.emoji ?? null,
      orderIdx: maxOrder + 1,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(apiDocCategoriesTable).values(row).run();
    return this.ensureCategory(id);
  }

  updateCategory(user: ApiDocUser, categoryId: string, payload: unknown) {
    this.ensureAdmin(user);
    this.ensureCategory(categoryId);
    const input = updateCategorySchema.parse(payload);

    this.db
      .update(apiDocCategoriesTable)
      .set({
        ...input,
        icon: input.icon === undefined ? undefined : input.icon ?? null,
        emoji: input.emoji === undefined ? undefined : input.emoji ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(apiDocCategoriesTable.id, categoryId))
      .run();

    return this.ensureCategory(categoryId);
  }

  deleteCategory(user: ApiDocUser, categoryId: string) {
    this.ensureAdmin(user);
    this.ensureCategory(categoryId);
    this.db
      .delete(apiDocCategoriesTable)
      .where(eq(apiDocCategoriesTable.id, categoryId))
      .run();
    return { success: true };
  }

  reorderCategories(user: ApiDocUser, payload: unknown) {
    this.ensureAdmin(user);
    const input = reorderSchema.parse(payload);
    const now = new Date().toISOString();

    for (const item of input.items) {
      this.db
        .update(apiDocCategoriesTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(eq(apiDocCategoriesTable.id, item.id))
        .run();
    }

    return { success: true };
  }

  listEndpoints(categoryId: string) {
    this.ensureCategory(categoryId);
    return this.db
      .select()
      .from(apiDocEndpointsTable)
      .where(eq(apiDocEndpointsTable.categoryId, categoryId))
      .orderBy(asc(apiDocEndpointsTable.orderIdx), asc(apiDocEndpointsTable.createdAt))
      .all();
  }

  createEndpoint(user: ApiDocUser, payload: unknown) {
    this.ensureAdmin(user);
    const input = createEndpointSchema.parse(payload);
    this.ensureCategory(input.categoryId);
    const now = new Date().toISOString();
    const id = `api-end-${randomUUID().slice(0, 12)}`;
    const maxOrder = this.db
      .select({ orderIdx: apiDocEndpointsTable.orderIdx })
      .from(apiDocEndpointsTable)
      .where(eq(apiDocEndpointsTable.categoryId, input.categoryId))
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const row: ApiDocEndpointInsert = {
      id,
      categoryId: input.categoryId,
      title: input.title,
      method: input.method,
      path: input.path,
      orderIdx: maxOrder + 1,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(apiDocEndpointsTable).values(row).run();
    return this.ensureEndpoint(id);
  }

  updateEndpoint(user: ApiDocUser, endpointId: string, payload: unknown) {
    this.ensureAdmin(user);
    this.ensureEndpoint(endpointId);
    const input = updateEndpointSchema.parse(payload);

    if (input.categoryId) {
      this.ensureCategory(input.categoryId);
    }

    this.db
      .update(apiDocEndpointsTable)
      .set({
        ...input,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(apiDocEndpointsTable.id, endpointId))
      .run();

    return this.ensureEndpoint(endpointId);
  }

  deleteEndpoint(user: ApiDocUser, endpointId: string) {
    this.ensureAdmin(user);
    this.ensureEndpoint(endpointId);
    this.db
      .delete(apiDocEndpointsTable)
      .where(eq(apiDocEndpointsTable.id, endpointId))
      .run();
    return { success: true };
  }

  reorderEndpoints(user: ApiDocUser, payload: unknown) {
    this.ensureAdmin(user);
    const input = reorderSchema.parse(payload);
    const now = new Date().toISOString();

    for (const item of input.items) {
      this.db
        .update(apiDocEndpointsTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(eq(apiDocEndpointsTable.id, item.id))
        .run();
    }

    return { success: true };
  }

  listBlocks(endpointId: string) {
    this.ensureEndpoint(endpointId);
    return this.db
      .select()
      .from(apiDocBlocksTable)
      .where(eq(apiDocBlocksTable.endpointId, endpointId))
      .orderBy(asc(apiDocBlocksTable.orderIdx), asc(apiDocBlocksTable.createdAt))
      .all();
  }

  replaceBlocks(user: ApiDocUser, endpointId: string, payload: unknown) {
    this.ensureAdmin(user);
    this.ensureEndpoint(endpointId);
    const input = replaceBlocksSchema.parse(payload);
    const now = new Date().toISOString();

    this.db
      .delete(apiDocBlocksTable)
      .where(eq(apiDocBlocksTable.endpointId, endpointId))
      .run();

    if (input.blocks.length > 0) {
      const rows: ApiDocBlockInsert[] = input.blocks.map((block, index) => ({
        id: `api-block-${randomUUID().slice(0, 12)}`,
        endpointId,
        blockType: block.blockType,
        content: block.content,
        orderIdx: index,
        createdAt: now,
        updatedAt: now,
      }));
      this.db.insert(apiDocBlocksTable).values(rows).run();
    }

    return this.listBlocks(endpointId);
  }

  exportAll(): ApiDocImportExportFile {
    const categories = this.db
      .select()
      .from(apiDocCategoriesTable)
      .orderBy(asc(apiDocCategoriesTable.orderIdx), asc(apiDocCategoriesTable.createdAt))
      .all();
    const endpoints = this.db
      .select()
      .from(apiDocEndpointsTable)
      .orderBy(asc(apiDocEndpointsTable.orderIdx), asc(apiDocEndpointsTable.createdAt))
      .all();
    const blocks = this.db
      .select()
      .from(apiDocBlocksTable)
      .orderBy(asc(apiDocBlocksTable.orderIdx), asc(apiDocBlocksTable.createdAt))
      .all();

    return {
      version: 1,
      source: 'towercrane-postman-lite',
      exportedAt: new Date().toISOString(),
      collections: categories.map((category) => ({
        name: category.name,
        icon: category.icon,
        emoji: category.emoji,
        endpoints: endpoints
          .filter((endpoint) => endpoint.categoryId === category.id)
          .map((endpoint) => {
            const block = blocks.find(
              (item) => item.endpointId === endpoint.id && item.blockType === 'API',
            );
            return {
              title: endpoint.title,
              method: endpoint.method,
              path: endpoint.path,
              request: this.normalizeRequestContent(
                endpoint.method,
                endpoint.path,
                block?.content,
              ),
            };
          }),
      })),
    };
  }

  importAll(user: ApiDocUser, payload: unknown) {
    this.ensureAdmin(user);
    const parsed = apiDocImportExportFileSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? 'Invalid API import file.',
      );
    }

    const input = parsed.data;
    this.validateJsonBodies(input);

    const now = new Date().toISOString();
    const existingNames = new Set(
      this.db.select({ name: apiDocCategoriesTable.name }).from(apiDocCategoriesTable).all().map(
        (row) => row.name,
      ),
    );
    const maxCategoryOrder = this.db
      .select({ orderIdx: apiDocCategoriesTable.orderIdx })
      .from(apiDocCategoriesTable)
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    let importedCollections = 0;
    let importedEndpoints = 0;
    let importedBlocks = 0;
    const importedCategoryIds: string[] = [];

    this.db.transaction((tx) => {
      input.collections.forEach((collection, collectionIndex) => {
        const categoryId = `api-cat-${randomUUID().slice(0, 12)}`;
        const categoryName = this.getUniqueCategoryName(collection.name, existingNames);
        existingNames.add(categoryName);
        importedCategoryIds.push(categoryId);

        tx.insert(apiDocCategoriesTable)
          .values({
            id: categoryId,
            name: categoryName,
            icon: collection.icon ?? 'Folder',
            emoji: collection.emoji ?? null,
            orderIdx: maxCategoryOrder + collectionIndex + 1,
            createdBy: user.id,
            createdAt: now,
            updatedAt: now,
          })
          .run();
        importedCollections += 1;

        collection.endpoints.forEach((endpoint, endpointIndex) => {
          const endpointId = `api-end-${randomUUID().slice(0, 12)}`;
          tx.insert(apiDocEndpointsTable)
            .values({
              id: endpointId,
              categoryId,
              title: endpoint.title,
              method: endpoint.method,
              path: endpoint.path,
              orderIdx: endpointIndex,
              createdBy: user.id,
              createdAt: now,
              updatedAt: now,
            })
            .run();
          importedEndpoints += 1;

          tx.insert(apiDocBlocksTable)
            .values({
              id: `api-block-${randomUUID().slice(0, 12)}`,
              endpointId,
              blockType: 'API',
              content: JSON.stringify({
                ...endpoint.request,
                method: endpoint.method,
                lastResponse: null,
              }),
              orderIdx: 0,
              createdAt: now,
              updatedAt: now,
            })
            .run();
          importedBlocks += 1;
        });
      });
    });

    return {
      success: true,
      importedCollections,
      importedEndpoints,
      importedBlocks,
      importedCategoryIds,
    };
  }

  private ensureCategory(categoryId: string) {
    const category = this.db
      .select()
      .from(apiDocCategoriesTable)
      .where(eq(apiDocCategoriesTable.id, categoryId))
      .get();

    if (!category) {
      throw new NotFoundException('API category not found');
    }

    return category;
  }

  private ensureEndpoint(endpointId: string) {
    const endpoint = this.db
      .select()
      .from(apiDocEndpointsTable)
      .where(eq(apiDocEndpointsTable.id, endpointId))
      .get();

    if (!endpoint) {
      throw new NotFoundException('API endpoint not found');
    }

    return endpoint;
  }

  private ensureAdmin(user: ApiDocUser) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin role is required');
    }
  }

  private normalizeRequestContent(
    method: ApiBlockContentImport['method'],
    path: string,
    content?: string,
  ): ApiBlockContentImport {
    const fallback = this.createDefaultRequestContent(method, path);
    if (!content) return fallback;

    try {
      const parsed = apiBlockContentImportSchema.parse(JSON.parse(content));
      return {
        ...fallback,
        ...parsed,
        body: {
          ...fallback.body,
          ...parsed.body,
        },
      };
    } catch {
      return fallback;
    }
  }

  private createDefaultRequestContent(
    method: ApiBlockContentImport['method'],
    path: string,
  ): ApiBlockContentImport {
    const trimmedPath = path.trim();
    return {
      method,
      url: trimmedPath
        ? trimmedPath.startsWith('http') || trimmedPath.startsWith('{{')
          ? trimmedPath
          : `{{API_BASE}}${trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`}`
        : '{{API_BASE}}/endpoint',
      authEnabled: true,
      headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
      params: [],
      body: { type: 'none', content: '' },
      description: '',
    };
  }

  private validateJsonBodies(input: ApiDocImportExportFile) {
    for (const collection of input.collections) {
      for (const endpoint of collection.endpoints) {
        const body = endpoint.request.body;
        if (body.type !== 'json' || !body.content.trim()) continue;
        try {
          JSON.parse(body.content);
        } catch {
          throw new BadRequestException(
            `${collection.name} > ${endpoint.title} body.content must be valid JSON.`,
          );
        }
      }
    }
  }

  private getUniqueCategoryName(name: string, existingNames: Set<string>) {
    if (!existingNames.has(name)) return name;
    const suffix = new Date().toISOString().slice(0, 16).replace('T', ' ');
    let candidate = `${name} (import ${suffix})`;
    let index = 2;
    while (existingNames.has(candidate)) {
      candidate = `${name} (import ${suffix} ${index})`;
      index += 1;
    }
    return candidate;
  }
}
