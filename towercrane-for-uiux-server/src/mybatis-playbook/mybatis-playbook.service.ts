import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { mybatisPlaybookCategoriesTable, mybatisPlaybookDocumentsTable, mybatisPlaybookTopicsTable } from '../database/schema';
import type { DocumentInput, DocumentPatchInput, TitleInput } from './mybatis-playbook.schemas';

@Injectable()
export class MybatisPlaybookService {
  constructor(private readonly database: DatabaseService) {}
  private get db() { return this.database.db; }
  private now() { return new Date().toISOString(); }

  list(userId: string) {
    const categories = this.db.select().from(mybatisPlaybookCategoriesTable).where(eq(mybatisPlaybookCategoriesTable.userId, userId)).orderBy(asc(mybatisPlaybookCategoriesTable.orderIdx), asc(mybatisPlaybookCategoriesTable.createdAt)).all();
    const topics = this.db.select().from(mybatisPlaybookTopicsTable).orderBy(asc(mybatisPlaybookTopicsTable.orderIdx), asc(mybatisPlaybookTopicsTable.createdAt)).all();
    const documents = this.db.select().from(mybatisPlaybookDocumentsTable).orderBy(asc(mybatisPlaybookDocumentsTable.orderIdx), asc(mybatisPlaybookDocumentsTable.createdAt)).all();
    return categories.map((category) => ({ ...category, topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({ ...topic, documents: documents.filter((document) => document.topicId === topic.id) })) }));
  }

  createCategory(userId: string, input: TitleInput) {
    const id = `mybatis-category-${randomUUID().slice(0, 12)}`; const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${mybatisPlaybookCategoriesTable.orderIdx}), -1)` }).from(mybatisPlaybookCategoriesTable).where(eq(mybatisPlaybookCategoriesTable.userId, userId)).get();
    this.db.insert(mybatisPlaybookCategoriesTable).values({ id, userId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run();
    return this.list(userId).find((item) => item.id === id);
  }
  updateCategory(userId: string, id: string, input: TitleInput) { this.ensureCategory(userId, id); this.db.update(mybatisPlaybookCategoriesTable).set({ title: input.title, updatedAt: this.now() }).where(eq(mybatisPlaybookCategoriesTable.id, id)).run(); return this.list(userId).find((item) => item.id === id); }
  deleteCategory(userId: string, id: string) { this.ensureCategory(userId, id); this.db.delete(mybatisPlaybookCategoriesTable).where(eq(mybatisPlaybookCategoriesTable.id, id)).run(); return { success: true }; }
  createTopic(userId: string, categoryId: string, input: TitleInput) { this.ensureCategory(userId, categoryId); const id = `mybatis-topic-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${mybatisPlaybookTopicsTable.orderIdx}), -1)` }).from(mybatisPlaybookTopicsTable).where(eq(mybatisPlaybookTopicsTable.categoryId, categoryId)).get(); this.db.insert(mybatisPlaybookTopicsTable).values({ id, categoryId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === categoryId); }
  updateTopic(userId: string, id: string, input: TitleInput) { const topic = this.ensureTopic(userId, id); this.db.update(mybatisPlaybookTopicsTable).set({ title: input.title, updatedAt: this.now() }).where(eq(mybatisPlaybookTopicsTable.id, id)).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  deleteTopic(userId: string, id: string) { this.ensureTopic(userId, id); this.db.delete(mybatisPlaybookTopicsTable).where(eq(mybatisPlaybookTopicsTable.id, id)).run(); return { success: true }; }
  createDocument(userId: string, topicId: string, input: DocumentInput) { const topic = this.ensureTopic(userId, topicId); const id = `mybatis-document-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${mybatisPlaybookDocumentsTable.orderIdx}), -1)` }).from(mybatisPlaybookDocumentsTable).where(eq(mybatisPlaybookDocumentsTable.topicId, topicId)).get(); this.db.insert(mybatisPlaybookDocumentsTable).values({ id, topicId, title: input.title, content: input.content, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  updateDocument(userId: string, id: string, input: DocumentPatchInput) { const document = this.ensureDocument(userId, id); this.db.update(mybatisPlaybookDocumentsTable).set({ ...(input.title !== undefined ? { title: input.title } : {}), ...(input.content !== undefined ? { content: input.content } : {}), updatedAt: this.now() }).where(eq(mybatisPlaybookDocumentsTable.id, id)).run(); return this.list(userId).find((item) => item.topics.some((topic) => topic.id === document.topicId)); }
  deleteDocument(userId: string, id: string) { this.ensureDocument(userId, id); this.db.delete(mybatisPlaybookDocumentsTable).where(eq(mybatisPlaybookDocumentsTable.id, id)).run(); return { success: true }; }
  reorderDocument(userId: string, id: string, direction: 'up' | 'down') { const document = this.ensureDocument(userId, id); const siblings = this.db.select().from(mybatisPlaybookDocumentsTable).where(eq(mybatisPlaybookDocumentsTable.topicId, document.topicId)).orderBy(asc(mybatisPlaybookDocumentsTable.orderIdx)).all(); const index = siblings.findIndex((item) => item.id === id); const adjacent = siblings[direction === 'up' ? index - 1 : index + 1]; if (!adjacent) return this.list(userId); this.db.update(mybatisPlaybookDocumentsTable).set({ orderIdx: adjacent.orderIdx, updatedAt: this.now() }).where(eq(mybatisPlaybookDocumentsTable.id, document.id)).run(); this.db.update(mybatisPlaybookDocumentsTable).set({ orderIdx: document.orderIdx, updatedAt: this.now() }).where(eq(mybatisPlaybookDocumentsTable.id, adjacent.id)).run(); return this.list(userId); }

  private ensureCategory(userId: string, id: string) { const row = this.db.select().from(mybatisPlaybookCategoriesTable).where(eq(mybatisPlaybookCategoriesTable.id, id)).get(); if (!row) throw new NotFoundException('MyBatis 영역을 찾을 수 없습니다.'); if (row.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.'); return row; }
  private ensureTopic(userId: string, id: string) { const row = this.db.select().from(mybatisPlaybookTopicsTable).where(eq(mybatisPlaybookTopicsTable.id, id)).get(); if (!row) throw new NotFoundException('MyBatis 주제를 찾을 수 없습니다.'); this.ensureCategory(userId, row.categoryId); return row; }
  private ensureDocument(userId: string, id: string) { const row = this.db.select().from(mybatisPlaybookDocumentsTable).where(eq(mybatisPlaybookDocumentsTable.id, id)).get(); if (!row) throw new NotFoundException('MyBatis 문서를 찾을 수 없습니다.'); this.ensureTopic(userId, row.topicId); return row; }
}
