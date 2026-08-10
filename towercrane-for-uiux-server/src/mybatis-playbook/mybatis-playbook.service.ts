import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { UserAiKeysService } from '../ai-keys/user-ai-keys.service';
import {
  mybatisPlaybookCategoriesTable,
  mybatisPlaybookDocumentCommentsTable,
  mybatisPlaybookDocumentsTable,
  mybatisPlaybookTopicsTable,
  usersTable,
} from '../database/schema';
import type { CommentInput, CommentPatchInput, DocumentAiEditInput, DocumentInput, DocumentPatchInput, TitleInput } from './mybatis-playbook.schemas';

@Injectable()
export class MybatisPlaybookService {
  constructor(
    private readonly database: DatabaseService,
    private readonly configService: ConfigService,
    private readonly userAiKeys: UserAiKeysService,
  ) {}
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
  reorderCategories(userId: string, categoryIds: string[]) {
    const categories = this.db.select().from(mybatisPlaybookCategoriesTable).where(eq(mybatisPlaybookCategoriesTable.userId, userId)).all();
    this.ensureCompleteOrder(categories.map((category) => category.id), categoryIds);
    categoryIds.forEach((id, index) => this.db.update(mybatisPlaybookCategoriesTable).set({ orderIdx: index, updatedAt: this.now() }).where(eq(mybatisPlaybookCategoriesTable.id, id)).run());
    return this.list(userId);
  }
  createTopic(userId: string, categoryId: string, input: TitleInput) { this.ensureCategory(userId, categoryId); const id = `mybatis-topic-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${mybatisPlaybookTopicsTable.orderIdx}), -1)` }).from(mybatisPlaybookTopicsTable).where(eq(mybatisPlaybookTopicsTable.categoryId, categoryId)).get(); this.db.insert(mybatisPlaybookTopicsTable).values({ id, categoryId, title: input.title, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === categoryId); }
  updateTopic(userId: string, id: string, input: TitleInput) { const topic = this.ensureTopic(userId, id); this.db.update(mybatisPlaybookTopicsTable).set({ title: input.title, updatedAt: this.now() }).where(eq(mybatisPlaybookTopicsTable.id, id)).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  deleteTopic(userId: string, id: string) { this.ensureTopic(userId, id); this.db.delete(mybatisPlaybookTopicsTable).where(eq(mybatisPlaybookTopicsTable.id, id)).run(); return { success: true }; }
  reorderTopics(userId: string, categoryId: string, topicIds: string[]) {
    this.ensureCategory(userId, categoryId);
    const topics = this.db.select().from(mybatisPlaybookTopicsTable).where(eq(mybatisPlaybookTopicsTable.categoryId, categoryId)).all();
    this.ensureCompleteOrder(topics.map((topic) => topic.id), topicIds);
    topicIds.forEach((id, index) => this.db.update(mybatisPlaybookTopicsTable).set({ orderIdx: index, updatedAt: this.now() }).where(eq(mybatisPlaybookTopicsTable.id, id)).run());
    return this.list(userId).find((item) => item.id === categoryId);
  }
  createDocument(userId: string, topicId: string, input: DocumentInput) { const topic = this.ensureTopic(userId, topicId); const parentId = this.ensureParent(userId, topicId, input.parentId); const id = `mybatis-document-${randomUUID().slice(0, 12)}`; const now = this.now(); const max = this.db.select({ max: sql<number>`coalesce(max(${mybatisPlaybookDocumentsTable.orderIdx}), -1)` }).from(mybatisPlaybookDocumentsTable).where(and(eq(mybatisPlaybookDocumentsTable.topicId, topicId), parentId ? eq(mybatisPlaybookDocumentsTable.parentId, parentId) : isNull(mybatisPlaybookDocumentsTable.parentId))).get(); this.db.insert(mybatisPlaybookDocumentsTable).values({ id, topicId, parentId, title: input.title, content: input.content, orderIdx: Number(max?.max ?? -1) + 1, createdAt: now, updatedAt: now }).run(); return this.list(userId).find((item) => item.id === topic.categoryId); }
  updateDocument(userId: string, id: string, input: DocumentPatchInput) { const document = this.ensureDocument(userId, id); const parentId = input.parentId === undefined ? document.parentId : this.ensureParent(userId, document.topicId, input.parentId, id); this.db.update(mybatisPlaybookDocumentsTable).set({ ...(input.title !== undefined ? { title: input.title } : {}), ...(input.content !== undefined ? { content: input.content } : {}), ...(input.parentId !== undefined ? { parentId } : {}), updatedAt: this.now() }).where(eq(mybatisPlaybookDocumentsTable.id, id)).run(); return this.list(userId).find((item) => item.topics.some((topic) => topic.id === document.topicId)); }
  async aiEditDocument(userId: string, id: string, input: DocumentAiEditInput) {
    this.ensureDocument(userId, id);
    const openai = this.userAiKeys.getClient(userId, 'openai');
    if (!openai) {
      throw new ServiceUnavailableException('AI 편집을 사용할 수 없습니다. 서버 OpenAI 설정을 확인해 주세요.');
    }

    const model = this.configService.get<string>('OPENAI_DEFAULT_MODEL') ?? 'gpt-4o-mini';
    let response;
    try {
      response = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 12000,
        response_format: { type: 'json_object' },
        messages: [
        {
          role: 'system',
          content: [
            'You edit a Lexical editor document for a Korean developer playbook.',
            'Return only a valid Lexical serialized editor state JSON object with a root property.',
            'Preserve the existing meaning, useful technical details, code blocks, links, tables, images, Mermaid nodes, and formatting unless the instruction asks to change them.',
            'Use a Lexical CodeNode for multiline commands, source code, URLs, configuration, or other code-like blocks. A CodeNode is a root child with type "code" and code-highlight children; never represent a whole paragraph or section as inline code text formatting.',
            'Use inline code formatting only for short identifiers or words inside a normal sentence. Never apply inline code formatting to an entire document, paragraph, heading, URL, or specification section.',
            'When creating a CodeNode, preserve or set its language when it is known (for example java, bash, yaml, json, or plaintext), and keep each code block separate from its surrounding explanation.',
            'Correct existing formatting mistakes: lines such as Project, Language, Spring Boot, Packaging, Java, Group, Artifact, and similar specification fields are normal prose or a list, not inline code. Remove inline-code formatting from those full lines unless the user explicitly asks to keep it.',
            'Keep meaningful paragraph and section breaks. Do not merge separate explanations or specification lines into one paragraph, and leave a visible paragraph break between a heading, its code block, and the following section.',
            'Do not return Markdown, explanations, or code fences. Do not invent facts that are not supported by the document or instruction.',
          ].join(' '),
        },
        {
          role: 'user',
          content: `편집 요구사항:\n${input.instruction}\n\n현재 Lexical 문서 JSON:\n${input.content}`,
        },
        ],
      });
    } catch (error) {
      console.error('[mybatis-ai-edit] OpenAI request failed', error);
      throw new ServiceUnavailableException('AI 요청에 실패했습니다. OpenAI API 키와 모델 설정을 확인해 주세요.');
    }

    const text = response.choices[0]?.message.content?.trim();
    if (!text) throw new InternalServerErrorException('AI가 편집 결과를 반환하지 않았습니다.');
    try {
      const parsed = JSON.parse(text) as { root?: unknown };
      if (!parsed.root) throw new Error('Invalid Lexical state');
      return { content: JSON.stringify(parsed) };
    } catch {
      throw new InternalServerErrorException('AI 편집 결과가 올바른 Lexical 문서 형식이 아닙니다.');
    }
  }
  deleteDocument(userId: string, id: string) { this.ensureDocument(userId, id); this.db.delete(mybatisPlaybookDocumentsTable).where(eq(mybatisPlaybookDocumentsTable.id, id)).run(); return { success: true }; }
  reorderDocuments(userId: string, topicId: string, documentIds: string[], parentId: string | null) {
    const topic = this.ensureTopic(userId, topicId);
    const documents = this.db.select().from(mybatisPlaybookDocumentsTable).where(and(eq(mybatisPlaybookDocumentsTable.topicId, topicId), parentId ? eq(mybatisPlaybookDocumentsTable.parentId, parentId) : isNull(mybatisPlaybookDocumentsTable.parentId))).all();
    this.ensureCompleteOrder(documents.map((document) => document.id), documentIds);
    documentIds.forEach((id, index) => this.db.update(mybatisPlaybookDocumentsTable).set({ orderIdx: index, updatedAt: this.now() }).where(eq(mybatisPlaybookDocumentsTable.id, id)).run());
    return this.list(userId).find((item) => item.id === topic.categoryId);
  }
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
  private ensureCompleteOrder(currentIds: string[], nextIds: string[]) {
    if (currentIds.length !== nextIds.length || new Set(nextIds).size !== nextIds.length || nextIds.some((id) => !currentIds.includes(id))) {
      throw new BadRequestException('같은 목록의 항목만 순서를 변경할 수 있습니다.');
    }
  }
}
