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
  apiDocTeamsTable,
  type ApiDocBlockInsert,
  type ApiDocCategoryInsert,
  type ApiDocEndpointInsert,
  type ApiDocTeamInsert,
} from '../database/schema';
import {
  createCategorySchema,
  createEndpointSchema,
  createTeamSchema,
  reorderSchema,
  replaceBlocksSchema,
  updateCategorySchema,
  updateEndpointSchema,
  updateTeamSchema,
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

  listTeams() {
    const teams = this.db
      .select()
      .from(apiDocTeamsTable)
      .orderBy(asc(apiDocTeamsTable.orderIdx), asc(apiDocTeamsTable.createdAt))
      .all();
    const categories = this.db.select().from(apiDocCategoriesTable).all();
    const endpoints = this.db.select().from(apiDocEndpointsTable).all();

    return teams.map((team) => {
      const teamCategories = categories.filter(
        (category) => category.teamId === team.id,
      );
      const categoryIds = new Set(
        teamCategories.map((category) => category.id),
      );
      return {
        ...team,
        categoryCount: teamCategories.length,
        endpointCount: endpoints.filter((endpoint) =>
          categoryIds.has(endpoint.categoryId),
        ).length,
      };
    });
  }

  createTeam(user: ApiDocUser, payload: unknown) {
    this.ensureAdmin(user);
    const input = createTeamSchema.parse(payload);
    const now = new Date().toISOString();
    const id = `api-team-${randomUUID().slice(0, 12)}`;
    const maxOrder = this.db
      .select({ orderIdx: apiDocTeamsTable.orderIdx })
      .from(apiDocTeamsTable)
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const row: ApiDocTeamInsert = {
      id,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? 'FileJson',
      emoji: input.emoji ?? null,
      orderIdx: maxOrder + 1,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(apiDocTeamsTable).values(row).run();
    return this.ensureTeam(id);
  }

  updateTeam(user: ApiDocUser, teamId: string, payload: unknown) {
    this.ensureAdmin(user);
    this.ensureTeam(teamId);
    const input = updateTeamSchema.parse(payload);

    this.db
      .update(apiDocTeamsTable)
      .set({
        ...input,
        description:
          input.description === undefined
            ? undefined
            : (input.description ?? null),
        icon: input.icon === undefined ? undefined : (input.icon ?? null),
        emoji: input.emoji === undefined ? undefined : (input.emoji ?? null),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(apiDocTeamsTable.id, teamId))
      .run();

    return this.ensureTeam(teamId);
  }

  deleteTeam(user: ApiDocUser, teamId: string) {
    this.ensureAdmin(user);
    this.ensureTeam(teamId);
    this.db
      .delete(apiDocCategoriesTable)
      .where(eq(apiDocCategoriesTable.teamId, teamId))
      .run();
    this.db
      .delete(apiDocTeamsTable)
      .where(eq(apiDocTeamsTable.id, teamId))
      .run();
    return { success: true };
  }

  reorderTeams(user: ApiDocUser, payload: unknown) {
    this.ensureAdmin(user);
    const input = reorderSchema.parse(payload);
    const now = new Date().toISOString();

    for (const item of input.items) {
      this.db
        .update(apiDocTeamsTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(eq(apiDocTeamsTable.id, item.id))
        .run();
    }

    return { success: true };
  }

  listCategories() {
    return this.db
      .select()
      .from(apiDocCategoriesTable)
      .orderBy(
        asc(apiDocCategoriesTable.orderIdx),
        asc(apiDocCategoriesTable.createdAt),
      )
      .all();
  }

  listTeamCategories(teamId: string) {
    this.ensureTeam(teamId);
    return this.db
      .select()
      .from(apiDocCategoriesTable)
      .where(eq(apiDocCategoriesTable.teamId, teamId))
      .orderBy(
        asc(apiDocCategoriesTable.orderIdx),
        asc(apiDocCategoriesTable.createdAt),
      )
      .all();
  }

  createCategory(user: ApiDocUser, payload: unknown) {
    this.ensureAdmin(user);
    const input = createCategorySchema.parse(payload);
    const teamId = input.teamId ?? this.getDefaultTeamId();
    this.ensureTeam(teamId);
    const now = new Date().toISOString();
    const id = `api-cat-${randomUUID().slice(0, 12)}`;
    const maxOrder = this.db
      .select({
        teamId: apiDocCategoriesTable.teamId,
        orderIdx: apiDocCategoriesTable.orderIdx,
      })
      .from(apiDocCategoriesTable)
      .all()
      .filter((row) => row.teamId === teamId)
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const row: ApiDocCategoryInsert = {
      id,
      teamId,
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

    if (input.teamId) {
      this.ensureTeam(input.teamId);
    }

    this.db
      .update(apiDocCategoriesTable)
      .set({
        ...input,
        teamId:
          input.teamId === undefined
            ? undefined
            : (input.teamId ?? this.getDefaultTeamId()),
        icon: input.icon === undefined ? undefined : (input.icon ?? null),
        emoji: input.emoji === undefined ? undefined : (input.emoji ?? null),
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
      .orderBy(
        asc(apiDocEndpointsTable.orderIdx),
        asc(apiDocEndpointsTable.createdAt),
      )
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
      .orderBy(
        asc(apiDocBlocksTable.orderIdx),
        asc(apiDocBlocksTable.createdAt),
      )
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
      .orderBy(
        asc(apiDocCategoriesTable.orderIdx),
        asc(apiDocCategoriesTable.createdAt),
      )
      .all();
    const endpoints = this.db
      .select()
      .from(apiDocEndpointsTable)
      .orderBy(
        asc(apiDocEndpointsTable.orderIdx),
        asc(apiDocEndpointsTable.createdAt),
      )
      .all();
    const blocks = this.db
      .select()
      .from(apiDocBlocksTable)
      .orderBy(
        asc(apiDocBlocksTable.orderIdx),
        asc(apiDocBlocksTable.createdAt),
      )
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
              (item) =>
                item.endpointId === endpoint.id && item.blockType === 'API',
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
      this.db
        .select({ name: apiDocCategoriesTable.name })
        .from(apiDocCategoriesTable)
        .all()
        .map((row) => row.name),
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
        const categoryName = this.getUniqueCategoryName(
          collection.name,
          existingNames,
        );
        existingNames.add(categoryName);
        importedCategoryIds.push(categoryId);

        tx.insert(apiDocCategoriesTable)
          .values({
            id: categoryId,
            teamId: this.getDefaultTeamId(),
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

  private ensureTeam(teamId: string) {
    const team = this.db
      .select()
      .from(apiDocTeamsTable)
      .where(eq(apiDocTeamsTable.id, teamId))
      .get();

    if (!team) {
      throw new NotFoundException('API workspace not found');
    }

    return team;
  }

  private getDefaultTeamId() {
    const preferred = this.db
      .select({ id: apiDocTeamsTable.id })
      .from(apiDocTeamsTable)
      .where(eq(apiDocTeamsTable.id, 'api-team-prototype-console'))
      .get();

    if (preferred) return preferred.id;

    const first = this.db
      .select({ id: apiDocTeamsTable.id })
      .from(apiDocTeamsTable)
      .orderBy(asc(apiDocTeamsTable.orderIdx), asc(apiDocTeamsTable.createdAt))
      .get();

    if (!first) {
      throw new NotFoundException('API workspace not found');
    }

    return first.id;
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
      headers: [
        { key: 'Content-Type', value: 'application/json', enabled: true },
      ],
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
