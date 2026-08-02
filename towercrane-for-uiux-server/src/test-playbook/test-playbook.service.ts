import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { testPlaybookCategoriesTable, testPlaybookContentsTable, testPlaybookDocumentsTable } from '../database/schema';
import { createCategorySchema, createContentSchema, createDocumentSchema, updateCategorySchema, updateContentSchema, updateDocumentSchema } from './test-playbook.schemas';

type Step = { id: string; title: string; description: string; command: string; artifact: string; result: string; done: boolean };

@Injectable()
export class TestPlaybookService {
  constructor(private readonly database: DatabaseService) {}

  list(userId: string) {
    this.ensureDefaults(userId);
    const categories = this.database.db.select().from(testPlaybookCategoriesTable).where(eq(testPlaybookCategoriesTable.userId, userId)).orderBy(asc(testPlaybookCategoriesTable.orderIdx)).all();
    const documents = this.database.db.select().from(testPlaybookDocumentsTable).orderBy(asc(testPlaybookDocumentsTable.orderIdx)).all();
    this.backfillLegacyContents(documents);
    const contents = this.database.db.select().from(testPlaybookContentsTable).orderBy(asc(testPlaybookContentsTable.orderIdx)).all();
    return categories.map((category) => ({ ...category, documents: documents.filter((document) => document.categoryId === category.id).map((document) => ({ ...document, steps: this.parseSteps(document.stepsJson), contents: contents.filter((content) => content.documentId === document.id) })) }));
  }

  createCategory(userId: string, payload: unknown) {
    const input = createCategorySchema.parse(payload);
    const now = new Date().toISOString();
    const row = { id: `test-category-${randomUUID().slice(0, 12)}`, userId, title: input.title, orderIdx: this.nextCategoryOrder(userId), createdAt: now, updatedAt: now };
    this.database.db.insert(testPlaybookCategoriesTable).values(row).run();
    return this.list(userId).find((item) => item.id === row.id);
  }

  updateCategory(userId: string, id: string, payload: unknown) {
    this.ensureCategory(userId, id);
    const input = updateCategorySchema.parse(payload);
    this.database.db.update(testPlaybookCategoriesTable).set({ ...input, updatedAt: new Date().toISOString() }).where(eq(testPlaybookCategoriesTable.id, id)).run();
    return this.list(userId).find((item) => item.id === id);
  }

  deleteCategory(userId: string, id: string) {
    this.ensureCategory(userId, id);
    this.database.db.delete(testPlaybookCategoriesTable).where(eq(testPlaybookCategoriesTable.id, id)).run();
    return { success: true };
  }

  createDocument(userId: string, categoryId: string, payload: unknown) {
    this.ensureCategory(userId, categoryId);
    const input = createDocumentSchema.parse(payload);
    const now = new Date().toISOString();
    const row = { id: `test-document-${randomUUID().slice(0, 12)}`, categoryId, title: input.title, summary: input.summary, content: input.content, stepsJson: JSON.stringify(input.steps), githubUrl: input.githubUrl, reviewNotes: input.reviewNotes, status: input.status, orderIdx: this.nextDocumentOrder(categoryId), createdAt: now, updatedAt: now };
    this.database.db.insert(testPlaybookDocumentsTable).values(row).run();
    return this.list(userId).find((item) => item.id === categoryId);
  }

  updateDocument(userId: string, id: string, payload: unknown) {
    const document = this.ensureDocument(userId, id);
    const input = updateDocumentSchema.parse(payload);
    const next = { ...input, ...(input.steps ? { stepsJson: JSON.stringify(input.steps) } : {}), updatedAt: new Date().toISOString() };
    delete (next as Partial<typeof next>).steps;
    this.database.db.update(testPlaybookDocumentsTable).set(next).where(eq(testPlaybookDocumentsTable.id, id)).run();
    return this.list(userId).find((item) => item.id === document.categoryId);
  }

  deleteDocument(userId: string, id: string) {
    this.ensureDocument(userId, id);
    this.database.db.delete(testPlaybookDocumentsTable).where(eq(testPlaybookDocumentsTable.id, id)).run();
    return { success: true };
  }

  createContent(userId: string, documentId: string, payload: unknown) {
    this.ensureDocument(userId, documentId);
    const input = createContentSchema.parse(payload);
    const now = new Date().toISOString();
    const row = { id: `test-content-${randomUUID().slice(0, 12)}`, documentId, title: input.title, content: input.content, orderIdx: this.nextContentOrder(documentId), createdAt: now, updatedAt: now };
    this.database.db.insert(testPlaybookContentsTable).values(row).run();
    return this.list(userId).find((category) => category.documents.some((document) => document.id === documentId));
  }

  updateContent(userId: string, id: string, payload: unknown) {
    const content = this.ensureContent(userId, id);
    const input = updateContentSchema.parse(payload);
    this.database.db.update(testPlaybookContentsTable).set({ ...input, updatedAt: new Date().toISOString() }).where(eq(testPlaybookContentsTable.id, id)).run();
    return this.list(userId).find((category) => category.documents.some((document) => document.id === content.documentId));
  }

  deleteContent(userId: string, id: string) {
    this.ensureContent(userId, id);
    this.database.db.delete(testPlaybookContentsTable).where(eq(testPlaybookContentsTable.id, id)).run();
    return { success: true };
  }

  moveContent(userId: string, id: string, direction: 'up' | 'down') {
    const content = this.ensureContent(userId, id);
    const siblings = this.database.db.select().from(testPlaybookContentsTable).where(eq(testPlaybookContentsTable.documentId, content.documentId)).orderBy(asc(testPlaybookContentsTable.orderIdx)).all();
    const index = siblings.findIndex((item) => item.id === id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const target = siblings[targetIndex];
    if (!target) return this.list(userId).find((category) => category.documents.some((document) => document.id === content.documentId));
    this.database.db.update(testPlaybookContentsTable).set({ orderIdx: target.orderIdx, updatedAt: new Date().toISOString() }).where(eq(testPlaybookContentsTable.id, content.id)).run();
    this.database.db.update(testPlaybookContentsTable).set({ orderIdx: content.orderIdx, updatedAt: new Date().toISOString() }).where(eq(testPlaybookContentsTable.id, target.id)).run();
    return this.list(userId).find((category) => category.documents.some((document) => document.id === content.documentId));
  }

  private ensureDefaults(userId: string) {
    const exists = this.database.db.select({ id: testPlaybookCategoriesTable.id }).from(testPlaybookCategoriesTable).where(eq(testPlaybookCategoriesTable.userId, userId)).get();
    if (exists) return;
    const now = new Date().toISOString();
    const defaults = [
      { id: `test-category-${randomUUID().slice(0, 12)}`, userId, title: 'Backend API', orderIdx: 0, createdAt: now, updatedAt: now },
      { id: `test-category-${randomUUID().slice(0, 12)}`, userId, title: 'Frontend Playwright', orderIdx: 1, createdAt: now, updatedAt: now },
      { id: `test-category-${randomUUID().slice(0, 12)}`, userId, title: '보안·권한', orderIdx: 2, createdAt: now, updatedAt: now },
    ];
    this.database.db.insert(testPlaybookCategoriesTable).values(defaults).run();
    const sample = { id: `test-document-${randomUUID().slice(0, 12)}`, categoryId: defaults[0].id, title: '주문 생성 API 테스트 따라하기', summary: '', content: '<p>개발 환경 설정부터 테스트 실행과 결과까지 실제 과정을 자유롭게 기록합니다.</p>', stepsJson: JSON.stringify([]), githubUrl: '', reviewNotes: '', status: 'draft' as const, orderIdx: 0, createdAt: now, updatedAt: now };
    this.database.db.insert(testPlaybookDocumentsTable).values(sample).run();
    this.database.db.insert(testPlaybookContentsTable).values({ id: `test-content-${randomUUID().slice(0, 12)}`, documentId: sample.id, title: sample.title, content: sample.content, orderIdx: 0, createdAt: now, updatedAt: now }).run();
  }

  private backfillLegacyContents(documents: Array<{ id: string; title: string; content: string }>) {
    const now = new Date().toISOString();
    for (const document of documents) {
      if (!document.content.trim()) continue;
      const existing = this.database.db.select({ id: testPlaybookContentsTable.id }).from(testPlaybookContentsTable).where(eq(testPlaybookContentsTable.documentId, document.id)).get();
      if (!existing) this.database.db.insert(testPlaybookContentsTable).values({ id: `test-content-${randomUUID().slice(0, 12)}`, documentId: document.id, title: document.title, content: document.content, orderIdx: 0, createdAt: now, updatedAt: now }).run();
    }
  }

  private parseSteps(value: string): Step[] { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
  private nextCategoryOrder(userId: string) { return (this.database.db.select({ max: sql<number>`max(${testPlaybookCategoriesTable.orderIdx})` }).from(testPlaybookCategoriesTable).where(eq(testPlaybookCategoriesTable.userId, userId)).get()?.max ?? -1) + 1; }
  private nextDocumentOrder(categoryId: string) { return (this.database.db.select({ max: sql<number>`max(${testPlaybookDocumentsTable.orderIdx})` }).from(testPlaybookDocumentsTable).where(eq(testPlaybookDocumentsTable.categoryId, categoryId)).get()?.max ?? -1) + 1; }
  private nextContentOrder(documentId: string) { return (this.database.db.select({ max: sql<number>`max(${testPlaybookContentsTable.orderIdx})` }).from(testPlaybookContentsTable).where(eq(testPlaybookContentsTable.documentId, documentId)).get()?.max ?? -1) + 1; }
  private ensureCategory(userId: string, id: string) { const row = this.database.db.select().from(testPlaybookCategoriesTable).where(and(eq(testPlaybookCategoriesTable.id, id), eq(testPlaybookCategoriesTable.userId, userId))).get(); if (!row) throw new NotFoundException(`Test playbook category not found: ${id}`); return row; }
  private ensureDocument(userId: string, id: string) { const row = this.database.db.select().from(testPlaybookDocumentsTable).where(eq(testPlaybookDocumentsTable.id, id)).get(); if (!row) throw new NotFoundException(`Test playbook document not found: ${id}`); this.ensureCategory(userId, row.categoryId); return row; }
  private ensureContent(userId: string, id: string) { const row = this.database.db.select().from(testPlaybookContentsTable).where(eq(testPlaybookContentsTable.id, id)).get(); if (!row) throw new NotFoundException(`Test playbook content not found: ${id}`); this.ensureDocument(userId, row.documentId); return row; }
}
