import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { sqlPlaybookCategoriesTable, sqlPlaybookDocumentsTable, sqlPlaybookTopicsTable } from '../database/schema';
import type { DocumentInput, DocumentPatchInput, TitleInput } from './sql-playbook.schemas';

@Injectable()
export class SqlPlaybookService {
  constructor(private readonly databaseService: DatabaseService) {}
  private get db() { return this.databaseService.db; }
  private now() { return new Date().toISOString(); }

  list(userId: string) {
    const categories = this.db.select().from(sqlPlaybookCategoriesTable).where(eq(sqlPlaybookCategoriesTable.userId, userId)).orderBy(asc(sqlPlaybookCategoriesTable.orderIdx), asc(sqlPlaybookCategoriesTable.createdAt)).all();
    const topics = this.db.select().from(sqlPlaybookTopicsTable).orderBy(asc(sqlPlaybookTopicsTable.orderIdx), asc(sqlPlaybookTopicsTable.createdAt)).all();
    const documents = this.db.select().from(sqlPlaybookDocumentsTable).orderBy(asc(sqlPlaybookDocumentsTable.orderIdx), asc(sqlPlaybookDocumentsTable.createdAt)).all();
    return categories.map((category) => ({ ...category, topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({ ...topic, documents: documents.filter((document) => document.topicId === topic.id) })) }));
  }

  createCategory(userId: string, input: TitleInput) { const id = `sql-cat-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${sqlPlaybookCategoriesTable.orderIdx}), -1)` }).from(sqlPlaybookCategoriesTable).where(eq(sqlPlaybookCategoriesTable.userId, userId)).get(); this.db.insert(sqlPlaybookCategoriesTable).values({ id, userId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === id); }
  updateCategory(userId: string, id: string, input: TitleInput) { this.ensureCategory(userId, id); this.db.update(sqlPlaybookCategoriesTable).set({ title: input.title, updatedAt: this.now() }).where(eq(sqlPlaybookCategoriesTable.id, id)).run(); return this.list(userId).find((item) => item.id === id); }
  deleteCategory(userId: string, id: string) { this.ensureCategory(userId, id); this.db.delete(sqlPlaybookCategoriesTable).where(eq(sqlPlaybookCategoriesTable.id, id)).run(); return { success: true }; }
  createTopic(userId: string, categoryId: string, input: TitleInput) { this.ensureCategory(userId, categoryId); const id = `sql-topic-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${sqlPlaybookTopicsTable.orderIdx}), -1)` }).from(sqlPlaybookTopicsTable).where(eq(sqlPlaybookTopicsTable.categoryId, categoryId)).get(); this.db.insert(sqlPlaybookTopicsTable).values({ id, categoryId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === categoryId); }
  updateTopic(userId: string, id: string, input: TitleInput) { const topic = this.ensureTopic(userId, id); this.db.update(sqlPlaybookTopicsTable).set({ title: input.title, updatedAt: this.now() }).where(eq(sqlPlaybookTopicsTable.id, id)).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  deleteTopic(userId: string, id: string) { this.ensureTopic(userId, id); this.db.delete(sqlPlaybookTopicsTable).where(eq(sqlPlaybookTopicsTable.id, id)).run(); return { success: true }; }
  createDocument(userId: string, topicId: string, input: DocumentInput) { const topic = this.ensureTopic(userId, topicId); const id = `sql-doc-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${sqlPlaybookDocumentsTable.orderIdx}), -1)` }).from(sqlPlaybookDocumentsTable).where(eq(sqlPlaybookDocumentsTable.topicId, topicId)).get(); this.db.insert(sqlPlaybookDocumentsTable).values({ id, topicId, title: input.title, content: input.content, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  updateDocument(userId: string, id: string, input: DocumentPatchInput) { const document = this.ensureDocument(userId, id); this.db.update(sqlPlaybookDocumentsTable).set({ ...(input.title !== undefined ? { title: input.title } : {}), ...(input.content !== undefined ? { content: input.content } : {}), updatedAt: this.now() }).where(eq(sqlPlaybookDocumentsTable.id, id)).run(); return this.list(userId).find((item) => item.topics.some((topic) => topic.id === document.topicId)); }
  deleteDocument(userId: string, id: string) { this.ensureDocument(userId, id); this.db.delete(sqlPlaybookDocumentsTable).where(eq(sqlPlaybookDocumentsTable.id, id)).run(); return { success: true }; }
  reorderDocument(userId: string, id: string, direction: 'up' | 'down') { const document = this.ensureDocument(userId, id); const siblings = this.db.select().from(sqlPlaybookDocumentsTable).where(eq(sqlPlaybookDocumentsTable.topicId, document.topicId)).orderBy(asc(sqlPlaybookDocumentsTable.orderIdx)).all(); const index = siblings.findIndex((item) => item.id === id); const adjacent = siblings[direction === 'up' ? index - 1 : index + 1]; if (!adjacent) return this.list(userId); this.db.update(sqlPlaybookDocumentsTable).set({ orderIdx: adjacent.orderIdx, updatedAt: this.now() }).where(eq(sqlPlaybookDocumentsTable.id, document.id)).run(); this.db.update(sqlPlaybookDocumentsTable).set({ orderIdx: document.orderIdx, updatedAt: this.now() }).where(eq(sqlPlaybookDocumentsTable.id, adjacent.id)).run(); return this.list(userId); }

  private ensureCategory(userId: string, id: string) { const row = this.db.select().from(sqlPlaybookCategoriesTable).where(eq(sqlPlaybookCategoriesTable.id, id)).get(); if (!row) throw new NotFoundException('SQL 영역을 찾을 수 없습니다.'); if (row.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.'); return row; }
  private ensureTopic(userId: string, id: string) { const row = this.db.select().from(sqlPlaybookTopicsTable).where(eq(sqlPlaybookTopicsTable.id, id)).get(); if (!row) throw new NotFoundException('SQL 주제를 찾을 수 없습니다.'); this.ensureCategory(userId, row.categoryId); return row; }
  private ensureDocument(userId: string, id: string) { const row = this.db.select().from(sqlPlaybookDocumentsTable).where(eq(sqlPlaybookDocumentsTable.id, id)).get(); if (!row) throw new NotFoundException('SQL 문서를 찾을 수 없습니다.'); this.ensureTopic(userId, row.topicId); return row; }
}
