import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  axPlaybookCategoriesTable,
  axPlaybookDocumentsTable,
  axPlaybookTopicsTable,
} from '../database/schema';
import type { DocumentInput, DocumentPatchInput, TitleInput } from './ax-playbook.schemas';

@Injectable()
export class AxPlaybookService {
  constructor(private readonly databaseService: DatabaseService) {}
  private get db() { return this.databaseService.db; }
  private now() { return new Date().toISOString(); }

  list(userId: string) {
    const categories = this.db.select().from(axPlaybookCategoriesTable)
      .where(eq(axPlaybookCategoriesTable.userId, userId))
      .orderBy(asc(axPlaybookCategoriesTable.orderIdx), asc(axPlaybookCategoriesTable.createdAt)).all();
    const topics = this.db.select().from(axPlaybookTopicsTable)
      .orderBy(asc(axPlaybookTopicsTable.orderIdx), asc(axPlaybookTopicsTable.createdAt)).all();
    const documents = this.db.select().from(axPlaybookDocumentsTable)
      .orderBy(asc(axPlaybookDocumentsTable.orderIdx), asc(axPlaybookDocumentsTable.createdAt)).all();
    return categories.map((category) => ({
      ...category,
      topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({
        ...topic,
        documents: documents.filter((document) => document.topicId === topic.id),
      })),
    }));
  }

  createCategory(userId: string, input: TitleInput) {
    const id = `axcat-${randomUUID().slice(0, 12)}`;
    const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${axPlaybookCategoriesTable.orderIdx}), -1)` }).from(axPlaybookCategoriesTable).where(eq(axPlaybookCategoriesTable.userId, userId)).get();
    this.db.insert(axPlaybookCategoriesTable).values({ id, userId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run();
    return this.list(userId).find((item) => item.id === id);
  }

  updateCategory(userId: string, id: string, input: TitleInput) {
    this.ensureCategory(userId, id);
    this.db.update(axPlaybookCategoriesTable).set({ title: input.title, updatedAt: this.now() }).where(eq(axPlaybookCategoriesTable.id, id)).run();
    return this.list(userId).find((item) => item.id === id);
  }

  deleteCategory(userId: string, id: string) {
    this.ensureCategory(userId, id);
    this.db.delete(axPlaybookCategoriesTable).where(eq(axPlaybookCategoriesTable.id, id)).run();
    return { success: true };
  }

  createTopic(userId: string, categoryId: string, input: TitleInput) {
    this.ensureCategory(userId, categoryId);
    const id = `axtop-${randomUUID().slice(0, 12)}`;
    const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${axPlaybookTopicsTable.orderIdx}), -1)` }).from(axPlaybookTopicsTable).where(eq(axPlaybookTopicsTable.categoryId, categoryId)).get();
    this.db.insert(axPlaybookTopicsTable).values({ id, categoryId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run();
    return this.list(userId).find((item) => item.id === categoryId);
  }

  updateTopic(userId: string, id: string, input: TitleInput) {
    const topic = this.ensureTopic(userId, id);
    this.db.update(axPlaybookTopicsTable).set({ title: input.title, updatedAt: this.now() }).where(eq(axPlaybookTopicsTable.id, id)).run();
    return this.list(userId).find((item) => item.id === topic.categoryId);
  }

  deleteTopic(userId: string, id: string) {
    this.ensureTopic(userId, id);
    this.db.delete(axPlaybookTopicsTable).where(eq(axPlaybookTopicsTable.id, id)).run();
    return { success: true };
  }

  createDocument(userId: string, topicId: string, input: DocumentInput) {
    const topic = this.ensureTopic(userId, topicId);
    const id = `axdoc-${randomUUID().slice(0, 12)}`;
    const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${axPlaybookDocumentsTable.orderIdx}), -1)` }).from(axPlaybookDocumentsTable).where(eq(axPlaybookDocumentsTable.topicId, topicId)).get();
    this.db.insert(axPlaybookDocumentsTable).values({ id, topicId, title: input.title, content: input.content, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run();
    return this.list(userId).find((item) => item.id === topic.categoryId);
  }

  updateDocument(userId: string, id: string, input: DocumentPatchInput) {
    const document = this.ensureDocument(userId, id);
    this.db.update(axPlaybookDocumentsTable).set({ ...(input.title !== undefined ? { title: input.title } : {}), ...(input.content !== undefined ? { content: input.content } : {}), updatedAt: this.now() }).where(eq(axPlaybookDocumentsTable.id, id)).run();
    return this.list(userId).find((item) => item.topics.some((topic) => topic.id === document.topicId));
  }

  deleteDocument(userId: string, id: string) {
    this.ensureDocument(userId, id);
    this.db.delete(axPlaybookDocumentsTable).where(eq(axPlaybookDocumentsTable.id, id)).run();
    return { success: true };
  }

  reorderDocument(userId: string, id: string, direction: 'up' | 'down') {
    const document = this.ensureDocument(userId, id);
    const siblings = this.db.select().from(axPlaybookDocumentsTable).where(eq(axPlaybookDocumentsTable.topicId, document.topicId)).orderBy(asc(axPlaybookDocumentsTable.orderIdx)).all();
    const index = siblings.findIndex((item) => item.id === id);
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    const adjacent = siblings[nextIndex];
    if (!adjacent) return this.list(userId);
    this.db.update(axPlaybookDocumentsTable).set({ orderIdx: adjacent.orderIdx, updatedAt: this.now() }).where(eq(axPlaybookDocumentsTable.id, document.id)).run();
    this.db.update(axPlaybookDocumentsTable).set({ orderIdx: document.orderIdx, updatedAt: this.now() }).where(eq(axPlaybookDocumentsTable.id, adjacent.id)).run();
    return this.list(userId);
  }

  private ensureCategory(userId: string, id: string) {
    const row = this.db.select().from(axPlaybookCategoriesTable).where(eq(axPlaybookCategoriesTable.id, id)).get();
    if (!row) throw new NotFoundException('AX 영역을 찾을 수 없습니다.');
    if (row.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.');
    return row;
  }
  private ensureTopic(userId: string, id: string) {
    const row = this.db.select().from(axPlaybookTopicsTable).where(eq(axPlaybookTopicsTable.id, id)).get();
    if (!row) throw new NotFoundException('AX 주제를 찾을 수 없습니다.');
    this.ensureCategory(userId, row.categoryId);
    return row;
  }
  private ensureDocument(userId: string, id: string) {
    const row = this.db.select().from(axPlaybookDocumentsTable).where(eq(axPlaybookDocumentsTable.id, id)).get();
    if (!row) throw new NotFoundException('AX 문서를 찾을 수 없습니다.');
    this.ensureTopic(userId, row.topicId);
    return row;
  }
}
