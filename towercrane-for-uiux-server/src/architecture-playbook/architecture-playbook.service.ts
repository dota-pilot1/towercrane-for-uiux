import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { architecturePlaybookCategoriesTable, architecturePlaybookDocumentsTable, architecturePlaybookTopicsTable } from '../database/schema';
import type { DocumentInput, DocumentPatchInput, TitleInput } from './architecture-playbook.schemas';

@Injectable()
export class ArchitecturePlaybookService {
  constructor(private readonly databaseService: DatabaseService) {}
  private get db() { return this.databaseService.db; }
  private now() { return new Date().toISOString(); }

  list(userId: string) {
    const categories = this.db.select().from(architecturePlaybookCategoriesTable).where(eq(architecturePlaybookCategoriesTable.userId, userId)).orderBy(asc(architecturePlaybookCategoriesTable.orderIdx), asc(architecturePlaybookCategoriesTable.createdAt)).all();
    const topics = this.db.select().from(architecturePlaybookTopicsTable).orderBy(asc(architecturePlaybookTopicsTable.orderIdx), asc(architecturePlaybookTopicsTable.createdAt)).all();
    const documents = this.db.select().from(architecturePlaybookDocumentsTable).orderBy(asc(architecturePlaybookDocumentsTable.orderIdx), asc(architecturePlaybookDocumentsTable.createdAt)).all();
    return categories.map((category) => ({ ...category, topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({ ...topic, documents: documents.filter((document) => document.topicId === topic.id) })) }));
  }

  createCategory(userId: string, input: TitleInput) {
    const id = `architecture-cat-${randomUUID().slice(0, 12)}`; const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${architecturePlaybookCategoriesTable.orderIdx}), -1)` }).from(architecturePlaybookCategoriesTable).where(eq(architecturePlaybookCategoriesTable.userId, userId)).get();
    this.db.insert(architecturePlaybookCategoriesTable).values({ id, userId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run();
    return this.list(userId).find((item) => item.id === id);
  }
  updateCategory(userId: string, id: string, input: TitleInput) { this.ensureCategory(userId, id); this.db.update(architecturePlaybookCategoriesTable).set({ title: input.title, updatedAt: this.now() }).where(eq(architecturePlaybookCategoriesTable.id, id)).run(); return this.list(userId).find((item) => item.id === id); }
  deleteCategory(userId: string, id: string) { this.ensureCategory(userId, id); this.db.delete(architecturePlaybookCategoriesTable).where(eq(architecturePlaybookCategoriesTable.id, id)).run(); return { success: true }; }
  createTopic(userId: string, categoryId: string, input: TitleInput) { this.ensureCategory(userId, categoryId); const id = `architecture-topic-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${architecturePlaybookTopicsTable.orderIdx}), -1)` }).from(architecturePlaybookTopicsTable).where(eq(architecturePlaybookTopicsTable.categoryId, categoryId)).get(); this.db.insert(architecturePlaybookTopicsTable).values({ id, categoryId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === categoryId); }
  updateTopic(userId: string, id: string, input: TitleInput) { const topic = this.ensureTopic(userId, id); this.db.update(architecturePlaybookTopicsTable).set({ title: input.title, updatedAt: this.now() }).where(eq(architecturePlaybookTopicsTable.id, id)).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  deleteTopic(userId: string, id: string) { this.ensureTopic(userId, id); this.db.delete(architecturePlaybookTopicsTable).where(eq(architecturePlaybookTopicsTable.id, id)).run(); return { success: true }; }
  createDocument(userId: string, topicId: string, input: DocumentInput) { const topic = this.ensureTopic(userId, topicId); const id = `architecture-doc-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${architecturePlaybookDocumentsTable.orderIdx}), -1)` }).from(architecturePlaybookDocumentsTable).where(eq(architecturePlaybookDocumentsTable.topicId, topicId)).get(); this.db.insert(architecturePlaybookDocumentsTable).values({ id, topicId, title: input.title, content: input.content, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  updateDocument(userId: string, id: string, input: DocumentPatchInput) { const document = this.ensureDocument(userId, id); this.db.update(architecturePlaybookDocumentsTable).set({ ...(input.title !== undefined ? { title: input.title } : {}), ...(input.content !== undefined ? { content: input.content } : {}), updatedAt: this.now() }).where(eq(architecturePlaybookDocumentsTable.id, id)).run(); return this.list(userId).find((item) => item.topics.some((topic) => topic.id === document.topicId)); }
  deleteDocument(userId: string, id: string) { this.ensureDocument(userId, id); this.db.delete(architecturePlaybookDocumentsTable).where(eq(architecturePlaybookDocumentsTable.id, id)).run(); return { success: true }; }
  reorderDocument(userId: string, id: string, direction: 'up' | 'down') { const document = this.ensureDocument(userId, id); const siblings = this.db.select().from(architecturePlaybookDocumentsTable).where(eq(architecturePlaybookDocumentsTable.topicId, document.topicId)).orderBy(asc(architecturePlaybookDocumentsTable.orderIdx)).all(); const index = siblings.findIndex((item) => item.id === id); const adjacent = siblings[direction === 'up' ? index - 1 : index + 1]; if (!adjacent) return this.list(userId); this.db.update(architecturePlaybookDocumentsTable).set({ orderIdx: adjacent.orderIdx, updatedAt: this.now() }).where(eq(architecturePlaybookDocumentsTable.id, document.id)).run(); this.db.update(architecturePlaybookDocumentsTable).set({ orderIdx: document.orderIdx, updatedAt: this.now() }).where(eq(architecturePlaybookDocumentsTable.id, adjacent.id)).run(); return this.list(userId); }

  private ensureCategory(userId: string, id: string) { const row = this.db.select().from(architecturePlaybookCategoriesTable).where(eq(architecturePlaybookCategoriesTable.id, id)).get(); if (!row) throw new NotFoundException('Architecture 영역을 찾을 수 없습니다.'); if (row.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.'); return row; }
  private ensureTopic(userId: string, id: string) { const row = this.db.select().from(architecturePlaybookTopicsTable).where(eq(architecturePlaybookTopicsTable.id, id)).get(); if (!row) throw new NotFoundException('Architecture 주제를 찾을 수 없습니다.'); this.ensureCategory(userId, row.categoryId); return row; }
  private ensureDocument(userId: string, id: string) { const row = this.db.select().from(architecturePlaybookDocumentsTable).where(eq(architecturePlaybookDocumentsTable.id, id)).get(); if (!row) throw new NotFoundException('Architecture 문서를 찾을 수 없습니다.'); this.ensureTopic(userId, row.topicId); return row; }
}

