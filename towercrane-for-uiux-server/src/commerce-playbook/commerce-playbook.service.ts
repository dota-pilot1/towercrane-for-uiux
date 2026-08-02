import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { commercePlaybookCategoriesTable, commercePlaybookDocumentsTable, commercePlaybookTopicsTable } from '../database/schema';
import type { DocumentInput, DocumentPatchInput, TitleInput } from './commerce-playbook.schemas';

@Injectable()
export class CommercePlaybookService {
  constructor(private readonly databaseService: DatabaseService) {}
  private get db() { return this.databaseService.db; }
  private now() { return new Date().toISOString(); }

  list(userId: string) {
    const categories = this.db.select().from(commercePlaybookCategoriesTable).where(eq(commercePlaybookCategoriesTable.userId, userId)).orderBy(asc(commercePlaybookCategoriesTable.orderIdx), asc(commercePlaybookCategoriesTable.createdAt)).all();
    const topics = this.db.select().from(commercePlaybookTopicsTable).orderBy(asc(commercePlaybookTopicsTable.orderIdx), asc(commercePlaybookTopicsTable.createdAt)).all();
    const documents = this.db.select().from(commercePlaybookDocumentsTable).orderBy(asc(commercePlaybookDocumentsTable.orderIdx), asc(commercePlaybookDocumentsTable.createdAt)).all();
    return categories.map((category) => ({ ...category, topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({ ...topic, documents: documents.filter((document) => document.topicId === topic.id) })) }));
  }

  createCategory(userId: string, input: TitleInput) {
    const id = `commerce-cat-${randomUUID().slice(0, 12)}`; const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${commercePlaybookCategoriesTable.orderIdx}), -1)` }).from(commercePlaybookCategoriesTable).where(eq(commercePlaybookCategoriesTable.userId, userId)).get();
    this.db.insert(commercePlaybookCategoriesTable).values({ id, userId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run();
    return this.list(userId).find((item) => item.id === id);
  }
  updateCategory(userId: string, id: string, input: TitleInput) { this.ensureCategory(userId, id); this.db.update(commercePlaybookCategoriesTable).set({ title: input.title, updatedAt: this.now() }).where(eq(commercePlaybookCategoriesTable.id, id)).run(); return this.list(userId).find((item) => item.id === id); }
  deleteCategory(userId: string, id: string) { this.ensureCategory(userId, id); this.db.delete(commercePlaybookCategoriesTable).where(eq(commercePlaybookCategoriesTable.id, id)).run(); return { success: true }; }
  createTopic(userId: string, categoryId: string, input: TitleInput) { this.ensureCategory(userId, categoryId); const id = `commerce-topic-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${commercePlaybookTopicsTable.orderIdx}), -1)` }).from(commercePlaybookTopicsTable).where(eq(commercePlaybookTopicsTable.categoryId, categoryId)).get(); this.db.insert(commercePlaybookTopicsTable).values({ id, categoryId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === categoryId); }
  updateTopic(userId: string, id: string, input: TitleInput) { const topic = this.ensureTopic(userId, id); this.db.update(commercePlaybookTopicsTable).set({ title: input.title, updatedAt: this.now() }).where(eq(commercePlaybookTopicsTable.id, id)).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  deleteTopic(userId: string, id: string) { this.ensureTopic(userId, id); this.db.delete(commercePlaybookTopicsTable).where(eq(commercePlaybookTopicsTable.id, id)).run(); return { success: true }; }
  createDocument(userId: string, topicId: string, input: DocumentInput) { const topic = this.ensureTopic(userId, topicId); const id = `commerce-doc-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${commercePlaybookDocumentsTable.orderIdx}), -1)` }).from(commercePlaybookDocumentsTable).where(eq(commercePlaybookDocumentsTable.topicId, topicId)).get(); this.db.insert(commercePlaybookDocumentsTable).values({ id, topicId, title: input.title, content: input.content, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  updateDocument(userId: string, id: string, input: DocumentPatchInput) { const document = this.ensureDocument(userId, id); this.db.update(commercePlaybookDocumentsTable).set({ ...(input.title !== undefined ? { title: input.title } : {}), ...(input.content !== undefined ? { content: input.content } : {}), updatedAt: this.now() }).where(eq(commercePlaybookDocumentsTable.id, id)).run(); return this.list(userId).find((item) => item.topics.some((topic) => topic.id === document.topicId)); }
  deleteDocument(userId: string, id: string) { this.ensureDocument(userId, id); this.db.delete(commercePlaybookDocumentsTable).where(eq(commercePlaybookDocumentsTable.id, id)).run(); return { success: true }; }
  reorderDocument(userId: string, id: string, direction: 'up' | 'down') { const document = this.ensureDocument(userId, id); const siblings = this.db.select().from(commercePlaybookDocumentsTable).where(eq(commercePlaybookDocumentsTable.topicId, document.topicId)).orderBy(asc(commercePlaybookDocumentsTable.orderIdx)).all(); const index = siblings.findIndex((item) => item.id === id); const adjacent = siblings[direction === 'up' ? index - 1 : index + 1]; if (!adjacent) return this.list(userId); this.db.update(commercePlaybookDocumentsTable).set({ orderIdx: adjacent.orderIdx, updatedAt: this.now() }).where(eq(commercePlaybookDocumentsTable.id, document.id)).run(); this.db.update(commercePlaybookDocumentsTable).set({ orderIdx: document.orderIdx, updatedAt: this.now() }).where(eq(commercePlaybookDocumentsTable.id, adjacent.id)).run(); return this.list(userId); }

  private ensureCategory(userId: string, id: string) { const row = this.db.select().from(commercePlaybookCategoriesTable).where(eq(commercePlaybookCategoriesTable.id, id)).get(); if (!row) throw new NotFoundException('Commerce 영역을 찾을 수 없습니다.'); if (row.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.'); return row; }
  private ensureTopic(userId: string, id: string) { const row = this.db.select().from(commercePlaybookTopicsTable).where(eq(commercePlaybookTopicsTable.id, id)).get(); if (!row) throw new NotFoundException('Commerce 주제를 찾을 수 없습니다.'); this.ensureCategory(userId, row.categoryId); return row; }
  private ensureDocument(userId: string, id: string) { const row = this.db.select().from(commercePlaybookDocumentsTable).where(eq(commercePlaybookDocumentsTable.id, id)).get(); if (!row) throw new NotFoundException('Commerce 문서를 찾을 수 없습니다.'); this.ensureTopic(userId, row.topicId); return row; }
}

