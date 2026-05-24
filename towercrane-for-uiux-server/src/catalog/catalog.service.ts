import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, like, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  categoriesTable,
  prototypeImagesTable,
  prototypesTable,
  prototypeWorkspaceMembersTable,
  prototypeWorkspacesTable,
  type PrototypeWorkspaceInsert,
  type PrototypeWorkspaceMemberInsert,
} from '../database/schema';
import { ReviewService } from '../review/review.service';
import {
  createCategorySchema,
  createPrototypeSchema,
  createWorkspaceSchema,
  listPrototypesQuerySchema,
  reorderSchema,
  updateCategorySchema,
  updatePrototypeSchema,
  updateWorkspaceSchema,
} from './catalog.schemas';

@Injectable()
export class CatalogService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly reviewService: ReviewService,
  ) {}

  listWorkspaces(userId: string, userRole: string) {
    const workspaces = this.databaseService.db
      .select()
      .from(prototypeWorkspacesTable)
      .orderBy(
        asc(prototypeWorkspacesTable.orderIdx),
        asc(prototypeWorkspacesTable.createdAt),
      )
      .all();
    const members = this.databaseService.db
      .select()
      .from(prototypeWorkspaceMembersTable)
      .all();
    const categories = this.databaseService.db.select().from(categoriesTable).all();
    const prototypes = this.databaseService.db.select().from(prototypesTable).all();

    return workspaces.map((workspace) => {
      const workspaceCategories = categories.filter(
        (category) => category.workspaceId === workspace.id,
      );
      const categoryIds = new Set(
        workspaceCategories.map((category) => category.id),
      );
      const member = members.find(
        (item) => item.workspaceId === workspace.id && item.userId === userId,
      );

      return {
        ...workspace,
        role: this.resolveWorkspaceRole(
          userId,
          userRole,
          workspace.id,
          workspace.createdBy,
          workspaceCategories,
          member?.role,
        ),
        categoryCount: workspaceCategories.length,
        prototypeCount: prototypes.filter((prototype) =>
          categoryIds.has(prototype.categoryId),
        ).length,
      };
    });
  }

  createWorkspace(userId: string, userRole: string, payload: unknown) {
    this.ensureAuthenticatedUser(userId, userRole);
    const input = createWorkspaceSchema.parse(payload);
    const now = new Date().toISOString();
    const id = `prototype-workspace-${randomUUID().slice(0, 12)}`;
    const maxOrder = this.databaseService.db
      .select({ orderIdx: prototypeWorkspacesTable.orderIdx })
      .from(prototypeWorkspacesTable)
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const workspace: PrototypeWorkspaceInsert = {
      id,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? 'GitBranch',
      color: input.color ?? null,
      orderIdx: maxOrder + 1,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    };
    const member: PrototypeWorkspaceMemberInsert = {
      id: `prototype-member-${randomUUID().slice(0, 12)}`,
      workspaceId: id,
      userId,
      role: 'owner',
      createdAt: now,
      updatedAt: now,
    };

    this.databaseService.db.transaction((tx) => {
      tx.insert(prototypeWorkspacesTable).values(workspace).run();
      tx.insert(prototypeWorkspaceMembersTable).values(member).run();
    });

    return this.ensureWorkspace(id);
  }

  updateWorkspace(
    userId: string,
    userRole: string,
    workspaceId: string,
    payload: unknown,
  ) {
    this.ensureCanManageWorkspace(userId, userRole, workspaceId);
    const input = updateWorkspaceSchema.parse(payload);

    this.databaseService.db
      .update(prototypeWorkspacesTable)
      .set({
        name: input.name,
        description:
          input.description === undefined
            ? undefined
            : (input.description ?? null),
        icon: input.icon === undefined ? undefined : (input.icon ?? null),
        color: input.color === undefined ? undefined : (input.color ?? null),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(prototypeWorkspacesTable.id, workspaceId))
      .run();

    return this.ensureWorkspace(workspaceId);
  }

  deleteWorkspace(userId: string, userRole: string, workspaceId: string) {
    this.ensureCanManageWorkspace(userId, userRole, workspaceId);
    const categoryCount = this.databaseService.db
      .select({ count: sql<number>`count(*)` })
      .from(categoriesTable)
      .where(eq(categoriesTable.workspaceId, workspaceId))
      .get();

    if (Number(categoryCount?.count ?? 0) > 0) {
      throw new BadRequestException(
        '카테고리가 있는 워크스페이스는 먼저 비워야 삭제할 수 있습니다.',
      );
    }

    this.databaseService.db
      .delete(prototypeWorkspacesTable)
      .where(eq(prototypeWorkspacesTable.id, workspaceId))
      .run();

    return { success: true };
  }

  reorderWorkspaces(userId: string, userRole: string, payload: unknown) {
    this.ensureAuthenticatedUser(userId, userRole);
    const input = reorderSchema.parse(payload);
    const now = new Date().toISOString();

    for (const item of input.items) {
      this.ensureCanManageWorkspace(userId, userRole, item.id);
      this.databaseService.db
        .update(prototypeWorkspacesTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(eq(prototypeWorkspacesTable.id, item.id))
        .run();
    }

    return { success: true };
  }

  listWorkspaceCategories(userId: string, userRole: string, workspaceId: string) {
    this.ensureCanReadWorkspace(userId, userRole, workspaceId);
    return this.listCategoriesByWorkspace(workspaceId);
  }

  createWorkspaceCategory(
    userId: string,
    userRole: string,
    workspaceId: string,
    payload: unknown,
  ) {
    this.ensureCanEditWorkspace(userId, userRole, workspaceId);
    return this.createCategoryInWorkspace(userId, userRole, workspaceId, payload);
  }

  reorderWorkspaceCategories(
    userId: string,
    userRole: string,
    workspaceId: string,
    payload: unknown,
  ) {
    this.ensureCanEditWorkspace(userId, userRole, workspaceId);
    const input = reorderSchema.parse(payload);
    const now = new Date().toISOString();

    for (const item of input.items) {
      this.databaseService.db
        .update(categoriesTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(
          and(
            eq(categoriesTable.id, item.id),
            eq(categoriesTable.workspaceId, workspaceId),
          ),
        )
        .run();
    }

    return { success: true };
  }

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

  createCategory(userId: string, userRole: string, payload: unknown) {
    return this.createCategoryInWorkspace(
      userId,
      userRole === 'guest' ? 'guest' : 'admin',
      this.getDefaultWorkspaceId(),
      payload,
    );
  }

  private createCategoryInWorkspace(
    userId: string,
    userRole: string,
    workspaceId: string,
    payload: unknown,
  ) {
    this.ensureCanEditWorkspace(userId, userRole, workspaceId);
    const input = createCategorySchema.parse(payload);
    const resolvedWorkspaceId = input.workspaceId ?? workspaceId;
    this.ensureCanEditWorkspace(userId, userRole, resolvedWorkspaceId);
    const now = new Date().toISOString();
    const id = `${input.title.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-')}-${Date.now().toString().slice(-6)}`;

    this.databaseService.db
      .insert(categoriesTable)
      .values({
        id,
        workspaceId: resolvedWorkspaceId,
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
        orderIdx: this.getNextCategoryOrderIdx(userId, resolvedWorkspaceId),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.getCategory(userId, 'admin', id);
  }

  updateCategory(userId: string, userRole: string, categoryId: string, payload: unknown) {
    const category = this.ensureCategory(userId, userRole, categoryId);
    if (category.userId !== userId) {
      this.ensureCanEditWorkspace(
        userId,
        userRole,
        category.workspaceId ?? this.getDefaultWorkspaceId(),
      );
    }
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
      .where(eq(categoriesTable.id, categoryId))
      .run();

    return this.getCategory(userId, userRole, categoryId);
  }

  deleteCategory(userId: string, userRole: string, categoryId: string) {
    const category = this.ensureCategory(userId, userRole, categoryId);
    if (category.userId !== userId) {
      this.ensureCanEditWorkspace(
        userId,
        userRole,
        category.workspaceId ?? this.getDefaultWorkspaceId(),
      );
    }

    this.databaseService.db
      .delete(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .run();

    return { success: true, categoryId };
  }

  createPrototype(userId: string, userRole: string, categoryId: string, payload: unknown) {
    const category = this.ensureCategory(userId, userRole, categoryId);
    if (category.userId !== userId) {
      this.ensureCanEditWorkspace(
        userId,
        userRole,
        category.workspaceId ?? this.getDefaultWorkspaceId(),
      );
    }

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
    const category = this.ensureCategory(userId, userRole, categoryId);
    if (category.userId !== userId) {
      this.ensureCanEditWorkspace(
        userId,
        userRole,
        category.workspaceId ?? this.getDefaultWorkspaceId(),
      );
    }
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
    const category = this.ensureCategory(userId, userRole, categoryId);
    if (category.userId !== userId) {
      this.ensureCanEditWorkspace(
        userId,
        userRole,
        category.workspaceId ?? this.getDefaultWorkspaceId(),
      );
    }
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

  private getNextCategoryOrderIdx(userId: string, workspaceId?: string): number {
    const baseQuery = this.databaseService.db
      .select({ maxIdx: sql<number>`max(${categoriesTable.orderIdx})` })
      .from(categoriesTable);
    const row = workspaceId
      ? baseQuery.where(eq(categoriesTable.workspaceId, workspaceId)).get()
      : baseQuery.where(eq(categoriesTable.userId, userId)).get();
    return (row?.maxIdx ?? -1) + 1;
  }

  private listCategoriesByWorkspace(workspaceId: string) {
    const categoryQuery = this.databaseService.db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.workspaceId, workspaceId))
      .orderBy(asc(categoriesTable.orderIdx));

    const categories = categoryQuery.all();

    const categoryIds = categories.map((category) => category.id);
    const prototypes =
      categoryIds.length > 0
        ? this.databaseService.db
            .select()
            .from(prototypesTable)
            .where(sql`${prototypesTable.categoryId} IN ${categoryIds}`)
            .all()
        : [];
    const prototypeIds = prototypes.map((prototype) => prototype.id);
    const allImages =
      prototypeIds.length > 0
        ? this.databaseService.db
            .select()
            .from(prototypeImagesTable)
            .where(sql`${prototypeImagesTable.prototypeId} IN ${prototypeIds}`)
            .orderBy(asc(prototypeImagesTable.orderIdx))
            .all()
        : [];

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

  private ensureWorkspace(workspaceId: string) {
    const workspace = this.databaseService.db
      .select()
      .from(prototypeWorkspacesTable)
      .where(eq(prototypeWorkspacesTable.id, workspaceId))
      .get();

    if (!workspace) {
      throw new NotFoundException(`Prototype workspace not found: ${workspaceId}`);
    }

    return workspace;
  }

  private getDefaultWorkspaceId() {
    const preferred = this.databaseService.db
      .select({ id: prototypeWorkspacesTable.id })
      .from(prototypeWorkspacesTable)
      .where(eq(prototypeWorkspacesTable.id, 'prototype-workspace-console'))
      .get();

    if (preferred) return preferred.id;

    const first = this.databaseService.db
      .select({ id: prototypeWorkspacesTable.id })
      .from(prototypeWorkspacesTable)
      .orderBy(
        asc(prototypeWorkspacesTable.orderIdx),
        asc(prototypeWorkspacesTable.createdAt),
      )
      .get();

    if (!first) {
      throw new NotFoundException('Prototype workspace not found');
    }

    return first.id;
  }

  private getWorkspaceRole(userId: string, userRole: string, workspaceId: string) {
    if (userRole === 'admin') return 'owner';
    if (userRole === 'guest') return 'viewer';

    const member = this.databaseService.db
      .select()
      .from(prototypeWorkspaceMembersTable)
      .where(
        and(
          eq(prototypeWorkspaceMembersTable.workspaceId, workspaceId),
          eq(prototypeWorkspaceMembersTable.userId, userId),
        ),
      )
      .get();

    if (member) return member.role;

    const workspace = this.ensureWorkspace(workspaceId);
    const ownsWorkspaceCategory = this.databaseService.db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.workspaceId, workspaceId),
          eq(categoriesTable.userId, userId),
        ),
      )
      .get();

    if (workspace.createdBy === userId) return 'owner';
    if (ownsWorkspaceCategory) return 'editor';
    if (workspaceId === this.getDefaultWorkspaceId() && userId) return 'editor';
    if (userId) return 'viewer';

    return null;
  }

  private resolveWorkspaceRole(
    userId: string,
    userRole: string,
    workspaceId: string,
    createdBy: string | null,
    workspaceCategories: Array<{ userId: string }>,
    memberRole?: 'owner' | 'editor' | 'member' | 'viewer',
  ) {
    if (userRole === 'admin') return 'owner';
    if (userRole === 'guest') return 'viewer';
    if (memberRole) return memberRole;
    if (createdBy === userId) return 'owner';
    if (workspaceCategories.some((category) => category.userId === userId)) {
      return 'editor';
    }
    if (workspaceId === this.getDefaultWorkspaceId() && userId) return 'editor';
    if (workspaceId && userId) return 'viewer';
    return null;
  }

  private ensureCanReadWorkspace(
    userId: string,
    userRole: string,
    workspaceId: string,
  ) {
    this.ensureWorkspace(workspaceId);
    const role = this.getWorkspaceRole(userId, userRole, workspaceId);
    if (!role) {
      throw new ForbiddenException('워크스페이스 접근 권한이 없습니다.');
    }
    return role;
  }

  private ensureCanEditWorkspace(
    userId: string,
    userRole: string,
    workspaceId: string,
  ) {
    const role = this.ensureCanReadWorkspace(userId, userRole, workspaceId);
    if (role !== 'owner' && role !== 'editor') {
      throw new ForbiddenException('워크스페이스 편집 권한이 없습니다.');
    }
    return role;
  }

  private ensureCanManageWorkspace(
    userId: string,
    userRole: string,
    workspaceId: string,
  ) {
    const role = this.ensureCanReadWorkspace(userId, userRole, workspaceId);
    if (role !== 'owner') {
      throw new ForbiddenException('워크스페이스 관리 권한이 없습니다.');
    }
    return role;
  }

  private ensureAuthenticatedUser(userId: string, userRole: string) {
    if (!userId || userRole === 'guest') {
      throw new ForbiddenException('로그인이 필요합니다.');
    }
  }

  private ensureCategory(userId: string, userRole: string, categoryId: string) {
    const category = this.databaseService.db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .get();

    if (!category) {
      throw new NotFoundException(`Category not found: ${categoryId}`);
    }

    if (
      userRole === 'admin' ||
      userRole === 'guest' ||
      category.userId === userId
    ) {
      return category;
    }

    const workspaceId = category.workspaceId ?? this.getDefaultWorkspaceId();
    if (this.getWorkspaceRole(userId, userRole, workspaceId)) {
      return category;
    }

    throw new NotFoundException(`Category not found: ${categoryId}`);
  }

  private ensurePrototype(
    userId: string,
    userRole: string,
    categoryId: string,
    prototypeId: string,
  ) {
    this.ensureCategory(userId, userRole, categoryId);
    const prototype = this.databaseService.db
      .select()
      .from(prototypesTable)
      .where(eq(prototypesTable.id, prototypeId))
      .get();

    if (!prototype) {
      throw new NotFoundException(`Prototype not found: ${prototypeId}`);
    }

    if (prototype.categoryId !== categoryId) {
      throw new NotFoundException(
        `Prototype ${prototypeId} is not linked to category ${categoryId}`,
      );
    }

    return prototype;
  }
}
