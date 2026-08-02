import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { devopsPlaybookCategoriesTable, devopsPlaybookDocumentsTable, devopsPlaybookTopicsTable } from '../database/schema';
import type { DocumentInput, DocumentPatchInput, TitleInput } from './devops-playbook.schemas';

@Injectable()
export class DevopsPlaybookService {
  constructor(private readonly databaseService: DatabaseService) {}
  private get db() { return this.databaseService.db; }
  private now() { return new Date().toISOString(); }

  list(userId: string) {
    const categories = this.db.select().from(devopsPlaybookCategoriesTable).where(eq(devopsPlaybookCategoriesTable.userId, userId)).orderBy(asc(devopsPlaybookCategoriesTable.orderIdx), asc(devopsPlaybookCategoriesTable.createdAt)).all();
    const topics = this.db.select().from(devopsPlaybookTopicsTable).orderBy(asc(devopsPlaybookTopicsTable.orderIdx), asc(devopsPlaybookTopicsTable.createdAt)).all();
    const documents = this.db.select().from(devopsPlaybookDocumentsTable).orderBy(asc(devopsPlaybookDocumentsTable.orderIdx), asc(devopsPlaybookDocumentsTable.createdAt)).all();
    return categories.map((category) => ({ ...category, topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({ ...topic, documents: documents.filter((document) => document.topicId === topic.id) })) }));
  }

  createCategory(userId: string, input: TitleInput) {
    const id = `devops-cat-${randomUUID().slice(0, 12)}`; const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${devopsPlaybookCategoriesTable.orderIdx}), -1)` }).from(devopsPlaybookCategoriesTable).where(eq(devopsPlaybookCategoriesTable.userId, userId)).get();
    this.db.insert(devopsPlaybookCategoriesTable).values({ id, userId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run();
    return this.list(userId).find((item) => item.id === id);
  }
  updateCategory(userId: string, id: string, input: TitleInput) { this.ensureCategory(userId, id); this.db.update(devopsPlaybookCategoriesTable).set({ title: input.title, updatedAt: this.now() }).where(eq(devopsPlaybookCategoriesTable.id, id)).run(); return this.list(userId).find((item) => item.id === id); }
  deleteCategory(userId: string, id: string) { this.ensureCategory(userId, id); this.db.delete(devopsPlaybookCategoriesTable).where(eq(devopsPlaybookCategoriesTable.id, id)).run(); return { success: true }; }
  createTopic(userId: string, categoryId: string, input: TitleInput) { this.ensureCategory(userId, categoryId); const id = `devops-topic-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${devopsPlaybookTopicsTable.orderIdx}), -1)` }).from(devopsPlaybookTopicsTable).where(eq(devopsPlaybookTopicsTable.categoryId, categoryId)).get(); this.db.insert(devopsPlaybookTopicsTable).values({ id, categoryId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === categoryId); }
  updateTopic(userId: string, id: string, input: TitleInput) { const topic = this.ensureTopic(userId, id); this.db.update(devopsPlaybookTopicsTable).set({ title: input.title, updatedAt: this.now() }).where(eq(devopsPlaybookTopicsTable.id, id)).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  deleteTopic(userId: string, id: string) { this.ensureTopic(userId, id); this.db.delete(devopsPlaybookTopicsTable).where(eq(devopsPlaybookTopicsTable.id, id)).run(); return { success: true }; }
  createDocument(userId: string, topicId: string, input: DocumentInput) { const topic = this.ensureTopic(userId, topicId); const id = `devops-doc-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${devopsPlaybookDocumentsTable.orderIdx}), -1)` }).from(devopsPlaybookDocumentsTable).where(eq(devopsPlaybookDocumentsTable.topicId, topicId)).get(); this.db.insert(devopsPlaybookDocumentsTable).values({ id, topicId, title: input.title, content: input.content, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  updateDocument(userId: string, id: string, input: DocumentPatchInput) { const document = this.ensureDocument(userId, id); this.db.update(devopsPlaybookDocumentsTable).set({ ...(input.title !== undefined ? { title: input.title } : {}), ...(input.content !== undefined ? { content: input.content } : {}), updatedAt: this.now() }).where(eq(devopsPlaybookDocumentsTable.id, id)).run(); return this.list(userId).find((item) => item.topics.some((topic) => topic.id === document.topicId)); }
  deleteDocument(userId: string, id: string) { this.ensureDocument(userId, id); this.db.delete(devopsPlaybookDocumentsTable).where(eq(devopsPlaybookDocumentsTable.id, id)).run(); return { success: true }; }
  reorderDocument(userId: string, id: string, direction: 'up' | 'down') { const document = this.ensureDocument(userId, id); const siblings = this.db.select().from(devopsPlaybookDocumentsTable).where(eq(devopsPlaybookDocumentsTable.topicId, document.topicId)).orderBy(asc(devopsPlaybookDocumentsTable.orderIdx)).all(); const index = siblings.findIndex((item) => item.id === id); const adjacent = siblings[direction === 'up' ? index - 1 : index + 1]; if (!adjacent) return this.list(userId); this.db.update(devopsPlaybookDocumentsTable).set({ orderIdx: adjacent.orderIdx, updatedAt: this.now() }).where(eq(devopsPlaybookDocumentsTable.id, document.id)).run(); this.db.update(devopsPlaybookDocumentsTable).set({ orderIdx: document.orderIdx, updatedAt: this.now() }).where(eq(devopsPlaybookDocumentsTable.id, adjacent.id)).run(); return this.list(userId); }

  private ensureCategory(userId: string, id: string) { const row = this.db.select().from(devopsPlaybookCategoriesTable).where(eq(devopsPlaybookCategoriesTable.id, id)).get(); if (!row) throw new NotFoundException('DevOps 영역을 찾을 수 없습니다.'); if (row.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.'); return row; }
  private ensureTopic(userId: string, id: string) { const row = this.db.select().from(devopsPlaybookTopicsTable).where(eq(devopsPlaybookTopicsTable.id, id)).get(); if (!row) throw new NotFoundException('DevOps 주제를 찾을 수 없습니다.'); this.ensureCategory(userId, row.categoryId); return row; }
  private ensureDocument(userId: string, id: string) { const row = this.db.select().from(devopsPlaybookDocumentsTable).where(eq(devopsPlaybookDocumentsTable.id, id)).get(); if (!row) throw new NotFoundException('DevOps 문서를 찾을 수 없습니다.'); this.ensureTopic(userId, row.topicId); return row; }
}
