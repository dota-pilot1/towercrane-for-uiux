import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { cicdPlaybookCategoriesTable, cicdPlaybookDocumentsTable, cicdPlaybookTopicsTable } from '../database/schema';
import type { DocumentInput, DocumentPatchInput, TitleInput } from './cicd-playbook.schemas';

@Injectable()
export class CicdPlaybookService {
  constructor(private readonly databaseService: DatabaseService) {}
  private get db() { return this.databaseService.db; }
  private now() { return new Date().toISOString(); }

  list(userId: string) {
    const categories = this.db.select().from(cicdPlaybookCategoriesTable).where(eq(cicdPlaybookCategoriesTable.userId, userId)).orderBy(asc(cicdPlaybookCategoriesTable.orderIdx), asc(cicdPlaybookCategoriesTable.createdAt)).all();
    const topics = this.db.select().from(cicdPlaybookTopicsTable).orderBy(asc(cicdPlaybookTopicsTable.orderIdx), asc(cicdPlaybookTopicsTable.createdAt)).all();
    const documents = this.db.select().from(cicdPlaybookDocumentsTable).orderBy(asc(cicdPlaybookDocumentsTable.orderIdx), asc(cicdPlaybookDocumentsTable.createdAt)).all();
    return categories.map((category) => ({ ...category, topics: topics.filter((topic) => topic.categoryId === category.id).map((topic) => ({ ...topic, documents: documents.filter((document) => document.topicId === topic.id) })) }));
  }

  createCategory(userId: string, input: TitleInput) {
    const id = `cicd-cat-${randomUUID().slice(0, 12)}`; const now = this.now();
    const max = this.db.select({ max: sql<number>`coalesce(max(${cicdPlaybookCategoriesTable.orderIdx}), -1)` }).from(cicdPlaybookCategoriesTable).where(eq(cicdPlaybookCategoriesTable.userId, userId)).get();
    this.db.insert(cicdPlaybookCategoriesTable).values({ id, userId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run();
    return this.list(userId).find((item) => item.id === id);
  }
  updateCategory(userId: string, id: string, input: TitleInput) { this.ensureCategory(userId, id); this.db.update(cicdPlaybookCategoriesTable).set({ title: input.title, updatedAt: this.now() }).where(eq(cicdPlaybookCategoriesTable.id, id)).run(); return this.list(userId).find((item) => item.id === id); }
  deleteCategory(userId: string, id: string) { this.ensureCategory(userId, id); this.db.delete(cicdPlaybookCategoriesTable).where(eq(cicdPlaybookCategoriesTable.id, id)).run(); return { success: true }; }
  createTopic(userId: string, categoryId: string, input: TitleInput) { this.ensureCategory(userId, categoryId); const id = `cicd-topic-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${cicdPlaybookTopicsTable.orderIdx}), -1)` }).from(cicdPlaybookTopicsTable).where(eq(cicdPlaybookTopicsTable.categoryId, categoryId)).get(); this.db.insert(cicdPlaybookTopicsTable).values({ id, categoryId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === categoryId); }
  updateTopic(userId: string, id: string, input: TitleInput) { const topic = this.ensureTopic(userId, id); this.db.update(cicdPlaybookTopicsTable).set({ title: input.title, updatedAt: this.now() }).where(eq(cicdPlaybookTopicsTable.id, id)).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  deleteTopic(userId: string, id: string) { this.ensureTopic(userId, id); this.db.delete(cicdPlaybookTopicsTable).where(eq(cicdPlaybookTopicsTable.id, id)).run(); return { success: true }; }
  createDocument(userId: string, topicId: string, input: DocumentInput) { const topic = this.ensureTopic(userId, topicId); const id = `cicd-doc-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${cicdPlaybookDocumentsTable.orderIdx}), -1)` }).from(cicdPlaybookDocumentsTable).where(eq(cicdPlaybookDocumentsTable.topicId, topicId)).get(); this.db.insert(cicdPlaybookDocumentsTable).values({ id, topicId, title: input.title, content: input.content, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  updateDocument(userId: string, id: string, input: DocumentPatchInput) { const document = this.ensureDocument(userId, id); this.db.update(cicdPlaybookDocumentsTable).set({ ...(input.title !== undefined ? { title: input.title } : {}), ...(input.content !== undefined ? { content: input.content } : {}), updatedAt: this.now() }).where(eq(cicdPlaybookDocumentsTable.id, id)).run(); return this.list(userId).find((item) => item.topics.some((topic) => topic.id === document.topicId)); }
  deleteDocument(userId: string, id: string) { this.ensureDocument(userId, id); this.db.delete(cicdPlaybookDocumentsTable).where(eq(cicdPlaybookDocumentsTable.id, id)).run(); return { success: true }; }
  reorderDocument(userId: string, id: string, direction: 'up' | 'down') { const document = this.ensureDocument(userId, id); const siblings = this.db.select().from(cicdPlaybookDocumentsTable).where(eq(cicdPlaybookDocumentsTable.topicId, document.topicId)).orderBy(asc(cicdPlaybookDocumentsTable.orderIdx)).all(); const index = siblings.findIndex((item) => item.id === id); const adjacent = siblings[direction === 'up' ? index - 1 : index + 1]; if (!adjacent) return this.list(userId); this.db.update(cicdPlaybookDocumentsTable).set({ orderIdx: adjacent.orderIdx, updatedAt: this.now() }).where(eq(cicdPlaybookDocumentsTable.id, document.id)).run(); this.db.update(cicdPlaybookDocumentsTable).set({ orderIdx: document.orderIdx, updatedAt: this.now() }).where(eq(cicdPlaybookDocumentsTable.id, adjacent.id)).run(); return this.list(userId); }

  private ensureCategory(userId: string, id: string) { const row = this.db.select().from(cicdPlaybookCategoriesTable).where(eq(cicdPlaybookCategoriesTable.id, id)).get(); if (!row) throw new NotFoundException('CI/CD 영역을 찾을 수 없습니다.'); if (row.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.'); return row; }
  private ensureTopic(userId: string, id: string) { const row = this.db.select().from(cicdPlaybookTopicsTable).where(eq(cicdPlaybookTopicsTable.id, id)).get(); if (!row) throw new NotFoundException('CI/CD 주제를 찾을 수 없습니다.'); this.ensureCategory(userId, row.categoryId); return row; }
  private ensureDocument(userId: string, id: string) { const row = this.db.select().from(cicdPlaybookDocumentsTable).where(eq(cicdPlaybookDocumentsTable.id, id)).get(); if (!row) throw new NotFoundException('CI/CD 문서를 찾을 수 없습니다.'); this.ensureTopic(userId, row.topicId); return row; }
}
