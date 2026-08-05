import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  mybatisPlaybookCategoriesTable,
  mybatisPlaybookDocumentCommentsTable,
  mybatisPlaybookDocumentsTable,
  mybatisPlaybookTopicsTable,
  usersTable,
} from '../database/schema';
import type { CommentInput, CommentPatchInput, DocumentInput, DocumentPatchInput, TitleInput } from './mybatis-playbook.schemas';

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
  createDocument(userId: string, topicId: string, input: DocumentInput) { const topic = this.ensureTopic(userId, topicId); const parentId = this.ensureParent(userId, topicId, input.parentId); const id = `mybatis-document-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${mybatisPlaybookDocumentsTable.orderIdx}), -1)` }).from(mybatisPlaybookDocumentsTable).where(and(eq(mybatisPlaybookDocumentsTable.topicId, topicId), parentId ? eq(mybatisPlaybookDocumentsTable.parentId, parentId) : isNull(mybatisPlaybookDocumentsTable.parentId))).get(); this.db.insert(mybatisPlaybookDocumentsTable).values({ id, topicId, parentId, title: input.title, content: input.content, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  updateDocument(userId: string, id: string, input: DocumentPatchInput) { const document = this.ensureDocument(userId, id); const parentId = input.parentId === undefined ? document.parentId : this.ensureParent(userId, document.topicId, input.parentId, id); this.db.update(mybatisPlaybookDocumentsTable).set({ ...(input.title !== undefined ? { title: input.title } : {}), ...(input.content !== undefined ? { content: input.content } : {}), ...(input.parentId !== undefined ? { parentId } : {}), updatedAt: this.now() }).where(eq(mybatisPlaybookDocumentsTable.id, id)).run(); return this.list(userId).find((item) => item.topics.some((topic) => topic.id === document.topicId)); }
  deleteDocument(userId: string, id: string) { this.ensureDocument(userId, id); this.db.delete(mybatisPlaybookDocumentsTable).where(eq(mybatisPlaybookDocumentsTable.id, id)).run(); return { success: true }; }
  reorderDocument(userId: string, id: string, direction: 'up' | 'down') { const document = this.ensureDocument(userId, id); const siblings = this.db.select().from(mybatisPlaybookDocumentsTable).where(and(eq(mybatisPlaybookDocumentsTable.topicId, document.topicId), document.parentId ? eq(mybatisPlaybookDocumentsTable.parentId, document.parentId) : isNull(mybatisPlaybookDocumentsTable.parentId))).orderBy(asc(mybatisPlaybookDocumentsTable.orderIdx)).all(); const index = siblings.findIndex((item) => item.id === id); const adjacent = siblings[direction === 'up' ? index - 1 : index + 1]; if (!adjacent) return this.list(userId); this.db.update(mybatisPlaybookDocumentsTable).set({ orderIdx: adjacent.orderIdx, updatedAt: this.now() }).where(eq(mybatisPlaybookDocumentsTable.id, document.id)).run(); this.db.update(mybatisPlaybookDocumentsTable).set({ orderIdx: document.orderIdx, updatedAt: this.now() }).where(eq(mybatisPlaybookDocumentsTable.id, adjacent.id)).run(); return this.list(userId); }

  listComments(userId: string, documentId: string) {
    this.ensureDocument(userId, documentId);
    return this.db
      .select({
        id: mybatisPlaybookDocumentCommentsTable.id,
        documentId: mybatisPlaybookDocumentCommentsTable.documentId,
        userId: mybatisPlaybookDocumentCommentsTable.userId,
        parentId: mybatisPlaybookDocumentCommentsTable.parentId,
        title: mybatisPlaybookDocumentCommentsTable.title,
        content: mybatisPlaybookDocumentCommentsTable.content,
        createdAt: mybatisPlaybookDocumentCommentsTable.createdAt,
        updatedAt: mybatisPlaybookDocumentCommentsTable.updatedAt,
        authorName: usersTable.name,
      })
      .from(mybatisPlaybookDocumentCommentsTable)
      .innerJoin(usersTable, eq(mybatisPlaybookDocumentCommentsTable.userId, usersTable.id))
      .where(eq(mybatisPlaybookDocumentCommentsTable.documentId, documentId))
      .orderBy(asc(mybatisPlaybookDocumentCommentsTable.createdAt))
      .all()
      .map((comment) => ({ ...comment, isMine: comment.userId === userId }));
  }

  createComment(userId: string, documentId: string, input: CommentInput) {
    this.ensureDocument(userId, documentId);
    if (input.parentId) {
      const parent = this.db
        .select()
        .from(mybatisPlaybookDocumentCommentsTable)
        .where(eq(mybatisPlaybookDocumentCommentsTable.id, input.parentId))
        .get();
      if (!parent || parent.documentId !== documentId) {
        throw new NotFoundException('답글의 원댓글을 찾을 수 없습니다.');
      }
    }
    const now = this.now();
    this.db.insert(mybatisPlaybookDocumentCommentsTable).values({
      id: `mybatis-comment-${randomUUID().slice(0, 12)}`,
      documentId,
      userId,
      parentId: input.parentId ?? null,
      title: input.title,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    }).run();
    return this.listComments(userId, documentId);
  }

  updateComment(userId: string, id: string, input: CommentPatchInput) {
    const comment = this.db
      .select()
      .from(mybatisPlaybookDocumentCommentsTable)
      .where(eq(mybatisPlaybookDocumentCommentsTable.id, id))
      .get();
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    this.ensureDocument(userId, comment.documentId);
    if (comment.userId !== userId) throw new ForbiddenException('작성자만 댓글을 수정할 수 있습니다.');
    this.db.update(mybatisPlaybookDocumentCommentsTable)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        content: input.content,
        updatedAt: this.now(),
      })
      .where(eq(mybatisPlaybookDocumentCommentsTable.id, id))
      .run();
    return this.listComments(userId, comment.documentId);
  }

  deleteComment(userId: string, id: string) {
    const comment = this.db
      .select()
      .from(mybatisPlaybookDocumentCommentsTable)
      .where(eq(mybatisPlaybookDocumentCommentsTable.id, id))
      .get();
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    this.ensureDocument(userId, comment.documentId);
    if (comment.userId !== userId) throw new ForbiddenException('작성자만 댓글을 삭제할 수 있습니다.');
    this.db.delete(mybatisPlaybookDocumentCommentsTable).where(eq(mybatisPlaybookDocumentCommentsTable.id, id)).run();
    return { success: true };
  }

  private ensureParent(userId: string, topicId: string, parentId?: string | null, documentId?: string) {
    if (!parentId) return null;
    if (parentId === documentId) throw new BadRequestException('문서 자신을 상위 문서로 지정할 수 없습니다.');
    let parent = this.ensureDocument(userId, parentId);
    if (parent.topicId !== topicId) throw new BadRequestException('같은 주제의 문서만 하위 문서로 연결할 수 있습니다.');
    if (parent.parentId) throw new BadRequestException('하위 문서 아래에는 추가 하위 문서를 만들 수 없습니다.');
    while (parent.parentId) {
      if (parent.parentId === documentId) throw new BadRequestException('하위 문서를 자신의 상위 문서로 지정할 수 없습니다.');
      const ancestor = this.db.select().from(mybatisPlaybookDocumentsTable).where(eq(mybatisPlaybookDocumentsTable.id, parent.parentId)).get();
      if (!ancestor) break;
      parent = ancestor;
    }
    return parentId;
  }

  private ensureCategory(userId: string, id: string) { const row = this.db.select().from(mybatisPlaybookCategoriesTable).where(eq(mybatisPlaybookCategoriesTable.id, id)).get(); if (!row) throw new NotFoundException('MyBatis 영역을 찾을 수 없습니다.'); if (row.userId !== userId) throw new ForbiddenException('접근 권한이 없습니다.'); return row; }
  private ensureTopic(userId: string, id: string) { const row = this.db.select().from(mybatisPlaybookTopicsTable).where(eq(mybatisPlaybookTopicsTable.id, id)).get(); if (!row) throw new NotFoundException('MyBatis 주제를 찾을 수 없습니다.'); this.ensureCategory(userId, row.categoryId); return row; }
  private ensureDocument(userId: string, id: string) { const row = this.db.select().from(mybatisPlaybookDocumentsTable).where(eq(mybatisPlaybookDocumentsTable.id, id)).get(); if (!row) throw new NotFoundException('MyBatis 문서를 찾을 수 없습니다.'); this.ensureTopic(userId, row.topicId); return row; }
}
