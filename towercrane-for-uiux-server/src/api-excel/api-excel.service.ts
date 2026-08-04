import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  apiExcelCategoriesTable,
  apiExcelFilesTable,
  apiExcelProjectsTable,
} from '../database/schema';
import type { ApiDocUser } from '../api-doc/api-doc.service';
import type { CategoryInput, FileInput, TitleInput } from './api-excel.schemas';

@Injectable()
export class ApiExcelService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() { return this.databaseService.db; }
  private now() { return new Date().toISOString(); }
  private ensureAdmin(user: ApiDocUser) {
    if (user.role !== 'admin') throw new ForbiddenException('관리자만 Excel 문서를 관리할 수 있습니다.');
  }

  list() {
    const projects = this.db.select().from(apiExcelProjectsTable).orderBy(asc(apiExcelProjectsTable.orderIdx), asc(apiExcelProjectsTable.createdAt)).all();
    const categories = this.db.select().from(apiExcelCategoriesTable).orderBy(asc(apiExcelCategoriesTable.orderIdx), asc(apiExcelCategoriesTable.createdAt)).all();
    const files = this.db.select().from(apiExcelFilesTable).orderBy(asc(apiExcelFilesTable.orderIdx), asc(apiExcelFilesTable.createdAt)).all();
    return projects.map((project) => ({
      ...project,
      categories: categories
        .filter((category) => category.projectId === project.id)
        .map((category) => ({
          ...category,
          files: files.filter((file) => file.categoryId === category.id),
        })),
    }));
  }

  createProject(user: ApiDocUser, input: TitleInput) {
    this.ensureAdmin(user);
    const id = `api-excel-project-${randomUUID().slice(0, 12)}`;
    const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${apiExcelProjectsTable.orderIdx}), -1)` }).from(apiExcelProjectsTable).get();
    this.db.insert(apiExcelProjectsTable).values({ id, name: input.name, description: input.description ?? null, orderIdx: Number(max?.max ?? -1) + 1, createdBy: user.id, createdAt: now, updatedAt: now }).run();
    return this.list().find((item) => item.id === id);
  }

  updateProject(user: ApiDocUser, id: string, input: Partial<TitleInput>) {
    this.ensureAdmin(user); this.ensureProject(id);
    this.db.update(apiExcelProjectsTable).set({ ...(input.name !== undefined ? { name: input.name } : {}), ...(input.description !== undefined ? { description: input.description ?? null } : {}), updatedAt: this.now() }).where(eq(apiExcelProjectsTable.id, id)).run();
    return this.list().find((item) => item.id === id);
  }

  deleteProject(user: ApiDocUser, id: string) {
    this.ensureAdmin(user); this.ensureProject(id);
    this.db.delete(apiExcelProjectsTable).where(eq(apiExcelProjectsTable.id, id)).run();
    return { success: true };
  }

  createCategory(user: ApiDocUser, projectId: string, input: CategoryInput) {
    this.ensureAdmin(user); this.ensureProject(projectId);
    const id = `api-excel-category-${randomUUID().slice(0, 12)}`; const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${apiExcelCategoriesTable.orderIdx}), -1)` }).from(apiExcelCategoriesTable).where(eq(apiExcelCategoriesTable.projectId, projectId)).get();
    this.db.insert(apiExcelCategoriesTable).values({ id, projectId, name: input.name, orderIdx: Number(max?.max ?? -1) + 1, createdBy: user.id, createdAt: now, updatedAt: now }).run();
    return this.list().find((item) => item.id === projectId);
  }

  updateCategory(user: ApiDocUser, id: string, input: CategoryInput) {
    this.ensureAdmin(user); const row = this.ensureCategory(id);
    this.db.update(apiExcelCategoriesTable).set({ name: input.name, updatedAt: this.now() }).where(eq(apiExcelCategoriesTable.id, id)).run();
    return this.list().find((item) => item.id === row.projectId);
  }

  deleteCategory(user: ApiDocUser, id: string) {
    this.ensureAdmin(user); this.ensureCategory(id);
    this.db.delete(apiExcelCategoriesTable).where(eq(apiExcelCategoriesTable.id, id)).run();
    return { success: true };
  }

  createFile(user: ApiDocUser, categoryId: string, input: FileInput) {
    this.ensureAdmin(user); this.ensureCategory(categoryId);
    const id = `api-excel-file-${randomUUID().slice(0, 12)}`; const now = this.now();
    const siblings = this.db.select().from(apiExcelFilesTable).where(eq(apiExcelFilesTable.categoryId, categoryId)).all();
    const sameName = siblings.filter((file) => file.name === input.name);
    const maxOrder = siblings.reduce((max, file) => Math.max(max, file.orderIdx), -1);
    const version = sameName.reduce((max, file) => Math.max(max, file.version), 0) + 1;
    this.db.insert(apiExcelFilesTable).values({ id, categoryId, ...input, version, orderIdx: maxOrder + 1, createdBy: user.id, createdAt: now, updatedAt: now }).run();
    return this.list().find((item) => item.categories.some((category) => category.id === categoryId));
  }

  updateFile(user: ApiDocUser, id: string, input: Partial<FileInput>) {
    this.ensureAdmin(user); const row = this.ensureFile(id);
    this.db.update(apiExcelFilesTable).set({ ...input, updatedAt: this.now() }).where(eq(apiExcelFilesTable.id, id)).run();
    return this.list().find((item) => item.categories.some((category) => category.id === row.categoryId));
  }

  deleteFile(user: ApiDocUser, id: string) {
    this.ensureAdmin(user); this.ensureFile(id);
    this.db.delete(apiExcelFilesTable).where(eq(apiExcelFilesTable.id, id)).run();
    return { success: true };
  }

  reorderFile(user: ApiDocUser, id: string, direction: 'up' | 'down') {
    this.ensureAdmin(user); const file = this.ensureFile(id);
    const siblings = this.db.select().from(apiExcelFilesTable).where(eq(apiExcelFilesTable.categoryId, file.categoryId)).orderBy(asc(apiExcelFilesTable.orderIdx)).all();
    const index = siblings.findIndex((item) => item.id === id); const adjacent = siblings[direction === 'up' ? index - 1 : index + 1];
    if (!adjacent) return this.list();
    this.db.update(apiExcelFilesTable).set({ orderIdx: adjacent.orderIdx, updatedAt: this.now() }).where(eq(apiExcelFilesTable.id, file.id)).run();
    this.db.update(apiExcelFilesTable).set({ orderIdx: file.orderIdx, updatedAt: this.now() }).where(eq(apiExcelFilesTable.id, adjacent.id)).run();
    return this.list();
  }

  private ensureProject(id: string) {
    const row = this.db.select().from(apiExcelProjectsTable).where(eq(apiExcelProjectsTable.id, id)).get();
    if (!row) throw new NotFoundException('Excel 프로젝트를 찾을 수 없습니다.');
    return row;
  }
  private ensureCategory(id: string) {
    const row = this.db.select().from(apiExcelCategoriesTable).where(eq(apiExcelCategoriesTable.id, id)).get();
    if (!row) throw new NotFoundException('Excel 분류를 찾을 수 없습니다.');
    return row;
  }
  private ensureFile(id: string) {
    const row = this.db.select().from(apiExcelFilesTable).where(eq(apiExcelFilesTable.id, id)).get();
    if (!row) throw new NotFoundException('Excel 파일을 찾을 수 없습니다.');
    return row;
  }
}
