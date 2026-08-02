import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { dbPlaybookCategoriesTable, dbPlaybookDocumentsTable, dbPlaybookTopicsTable } from '../database/schema';
import type { DocumentInput, DocumentPatchInput, TitleInput } from './db-playbook.schemas';

@Injectable()
export class DbPlaybookService {
  constructor(private readonly databaseService: DatabaseService) {}
  private get db() { return this.databaseService.db; }
  private now() { return new Date().toISOString(); }

  list(userId: string) {
    const categories = this.db.select().from(dbPlaybookCategoriesTable).where(eq(dbPlaybookCategoriesTable.userId, userId)).orderBy(asc(dbPlaybookCategoriesTable.orderIdx), asc(dbPlaybookCategoriesTable.createdAt)).all();
    const topics = this.db.select().from(dbPlaybookTopicsTable).orderBy(asc(dbPlaybookTopicsTable.orderIdx), asc(dbPlaybookTopicsTable.createdAt)).all();
    const documents = this.db.select().from(dbPlaybookDocumentsTable).orderBy(asc(dbPlaybookDocumentsTable.orderIdx), asc(dbPlaybookDocumentsTable.createdAt)).all();
    return categories.map((category) => ({ ...category, topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({ ...topic, documents: documents.filter((document) => document.topicId === topic.id) })) }));
  }

  createCategory(userId: string, input: TitleInput) {
    const id = `db-cat-${randomUUID().slice(0, 12)}`; const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${dbPlaybookCategoriesTable.orderIdx}), -1)` }).from(dbPlaybookCategoriesTable).where(eq(dbPlaybookCategoriesTable.userId, userId)).get();
    this.db.insert(dbPlaybookCategoriesTable).values({ id, userId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run();
    return this.list(userId).find((item) => item.id === id);
  }
  updateCategory(userId: string, id: string, input: TitleInput) { this.ensureCategory(userId, id); this.db.update(dbPlaybookCategoriesTable).set({ title: input.title, updatedAt: this.now() }).where(eq(dbPlaybookCategoriesTable.id, id)).run(); return this.list(userId).find((item) => item.id === id); }
  deleteCategory(userId: string, id: string) { this.ensureCategory(userId, id); this.db.delete(dbPlaybookCategoriesTable).where(eq(dbPlaybookCategoriesTable.id, id)).run(); return { success: true }; }
  createTopic(userId: string, categoryId: string, input: TitleInput) { this.ensureCategory(userId, categoryId); const id = `db-topic-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${dbPlaybookTopicsTable.orderIdx}), -1)` }).from(dbPlaybookTopicsTable).where(eq(dbPlaybookTopicsTable.categoryId, categoryId)).get(); this.db.insert(dbPlaybookTopicsTable).values({ id, categoryId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === categoryId); }
  updateTopic(userId: string, id: string, input: TitleInput) { const topic = this.ensureTopic(userId, id); this.db.update(dbPlaybookTopicsTable).set({ title: input.title, updatedAt: this.now() }).where(eq(dbPlaybookTopicsTable.id, id)).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  deleteTopic(userId: string, id: string) { this.ensureTopic(userId, id); this.db.delete(dbPlaybookTopicsTable).where(eq(dbPlaybookTopicsTable.id, id)).run(); return { success: true }; }
  createDocument(userId: string, topicId: string, input: DocumentInput) { const topic = this.ensureTopic(userId, topicId); const id = `db-doc-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${dbPlaybookDocumentsTable.orderIdx}), -1)` }).from(dbPlaybookDocumentsTable).where(eq(dbPlaybookDocumentsTable.topicId, topicId)).get(); this.db.insert(dbPlaybookDocumentsTable).values({ id, topicId, title: input.title, content: input.content, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  updateDocument(userId: string, id: string, input: DocumentPatchInput) { const document = this.ensureDocument(userId, id); this.db.update(dbPlaybookDocumentsTable).set({ ...(input.title !== undefined ? { title: input.title } : {}), ...(input.content !== undefined ? { content: input.content } : {}), updatedAt: this.now() }).where(eq(dbPlaybookDocumentsTable.id, id)).run(); return this.list(userId).find((item) => item.topics.some((topic) => topic.id === document.topicId)); }
  deleteDocument(userId: string, id: string) { this.ensureDocument(userId, id); this.db.delete(dbPlaybookDocumentsTable).where(eq(dbPlaybookDocumentsTable.id, id)).run(); return { success: true }; }
  reorderDocument(userId: string, id: string, direction: 'up' | 'down') { const document = this.ensureDocument(userId, id); const siblings = this.db.select().from(dbPlaybookDocumentsTable).where(eq(dbPlaybookDocumentsTable.topicId, document.topicId)).orderBy(asc(dbPlaybookDocumentsTable.orderIdx)).all(); const index = siblings.findIndex((item) => item.id === id); const adjacent = siblings[direction === 'up' ? index - 1 : index + 1]; if (!adjacent) return this.list(userId); this.db.update(dbPlaybookDocumentsTable).set({ orderIdx: adjacent.orderIdx, updatedAt: this.now() }).where(eq(dbPlaybookDocumentsTable.id, document.id)).run(); this.db.update(dbPlaybookDocumentsTable).set({ orderIdx: document.orderIdx, updatedAt: this.now() }).where(eq(dbPlaybookDocumentsTable.id, adjacent.id)).run(); return this.list(userId); }

  private ensureCategory(userId: string, id: string) { const row = this.db.select().from(dbPlaybookCategoriesTable).where(eq(dbPlaybookCategoriesTable.id, id)).get(); if (!row) throw new NotFoundException('DB 영역을 찾을 수 없습니다.'); if (row.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.'); return row; }
  private ensureTopic(userId: string, id: string) { const row = this.db.select().from(dbPlaybookTopicsTable).where(eq(dbPlaybookTopicsTable.id, id)).get(); if (!row) throw new NotFoundException('DB 주제를 찾을 수 없습니다.'); this.ensureCategory(userId, row.categoryId); return row; }
  private ensureDocument(userId: string, id: string) { const row = this.db.select().from(dbPlaybookDocumentsTable).where(eq(dbPlaybookDocumentsTable.id, id)).get(); if (!row) throw new NotFoundException('DB 문서를 찾을 수 없습니다.'); this.ensureTopic(userId, row.topicId); return row; }
}

