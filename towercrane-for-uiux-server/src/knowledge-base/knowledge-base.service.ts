import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  knowledgeChunksTable,
  knowledgeDocumentsTable,
  type KnowledgeChannel,
  type KnowledgeChunkInsert,
  type KnowledgeChunkRow,
  type KnowledgeDocumentInsert,
  type KnowledgeDocumentRow,
} from '../database/schema';
import {
  createKnowledgeDocumentSchema,
  listKnowledgeDocumentsQuerySchema,
  searchKnowledgeSchema,
  updateKnowledgeDocumentSchema,
} from './knowledge-base.schemas';

export type KnowledgeBaseUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

const CHANNEL_LABELS: Record<KnowledgeChannel, string> = {
  notice: '공지사항',
  faq: 'FAQ',
  ai: 'AI 자료',
  dev: '개발 자료',
};

const SEARCH_STOP_WORDS = new Set([
  '관련',
  '대해',
  '대한',
  '어떻게',
  '알려줘',
  '알려',
  '뭐야',
  '무엇',
  '가능',
  '되나',
  '되나요',
  '되냐',
  '하나요',
  '해줘',
  '해',
  '좀',
  '방법',
]);

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  listDocuments(rawQuery: unknown, user: KnowledgeBaseUser) {
    const query = listKnowledgeDocumentsQuerySchema.parse(rawQuery ?? {});
    const offset = (query.page - 1) * query.pageSize;
    const conditions = this.buildDocumentConditions(query);

    const rows = this.db
      .select()
      .from(knowledgeDocumentsTable)
      .where(and(...conditions))
      .orderBy(desc(knowledgeDocumentsTable.updatedAt))
      .limit(query.pageSize)
      .offset(offset)
      .all()
      .filter((row) => this.canRead(row, user));

    const totalRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(knowledgeDocumentsTable)
      .where(and(...conditions))
      .get();

    return {
      items: rows.map((row) => this.toDocumentSummaryDto(row)),
      total: Number(totalRow?.count ?? rows.length),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  getDocument(id: string, user: KnowledgeBaseUser) {
    const row = this.ensureDocument(id);
    if (!this.canRead(row, user)) {
      throw new NotFoundException('지식 문서를 찾을 수 없습니다.');
    }

    const chunks = this.db
      .select()
      .from(knowledgeChunksTable)
      .where(eq(knowledgeChunksTable.documentId, id))
      .orderBy(knowledgeChunksTable.chunkIndex)
      .all();

    return this.toDocumentDetailDto(row, chunks, user);
  }

  createDocument(payload: unknown, user: KnowledgeBaseUser) {
    const input = createKnowledgeDocumentSchema.parse(payload);
    const now = new Date().toISOString();
    const row: KnowledgeDocumentInsert = {
      id: `knowledge-doc-${randomUUID().slice(0, 12)}`,
      channel: input.channel,
      title: input.title,
      summary: input.summary || null,
      contentMarkdown: input.contentMarkdown,
      contentJson: input.contentJson || null,
      tagsJson: JSON.stringify(this.normalizeTags(input.tags)),
      status: input.status,
      visibility: input.visibility,
      ownerId: user.id,
      ownerName: user.name || user.email,
      effectiveFrom: input.effectiveFrom || null,
      effectiveTo: input.effectiveTo || null,
      metadataJson: JSON.stringify(input.metadata ?? {}),
      createdAt: now,
      updatedAt: now,
      publishedAt: input.status === 'published' ? now : null,
    };

    this.db.insert(knowledgeDocumentsTable).values(row).run();
    this.rebuildChunks(this.ensureDocument(row.id));
    return this.getDocument(row.id, user);
  }

  updateDocument(id: string, payload: unknown, user: KnowledgeBaseUser) {
    const row = this.ensureDocument(id);
    this.assertCanEdit(row, user);
    const input = updateKnowledgeDocumentSchema.parse(payload);
    const now = new Date().toISOString();
    const nextStatus = input.status ?? row.status;
    const changes: Partial<KnowledgeDocumentInsert> = {
      updatedAt: now,
    };

    if (input.channel !== undefined) changes.channel = input.channel;
    if (input.title !== undefined) changes.title = input.title;
    if (input.summary !== undefined) changes.summary = input.summary || null;
    if (input.contentMarkdown !== undefined) {
      changes.contentMarkdown = input.contentMarkdown;
    }
    if (input.contentJson !== undefined) {
      changes.contentJson = input.contentJson || null;
    }
    if (input.tags !== undefined) {
      changes.tagsJson = JSON.stringify(this.normalizeTags(input.tags));
    }
    if (input.status !== undefined) {
      changes.status = input.status;
      if (input.status === 'published' && !row.publishedAt) {
        changes.publishedAt = now;
      }
    }
    if (input.visibility !== undefined) changes.visibility = input.visibility;
    if (input.effectiveFrom !== undefined) {
      changes.effectiveFrom = input.effectiveFrom || null;
    }
    if (input.effectiveTo !== undefined) {
      changes.effectiveTo = input.effectiveTo || null;
    }
    if (input.metadata !== undefined) {
      changes.metadataJson = JSON.stringify(input.metadata ?? {});
    }

    this.db
      .update(knowledgeDocumentsTable)
      .set(changes)
      .where(eq(knowledgeDocumentsTable.id, id))
      .run();

    const updated = this.ensureDocument(id);
    if (nextStatus !== 'archived') this.rebuildChunks(updated);
    return this.getDocument(id, user);
  }

  deleteDocument(id: string, user: KnowledgeBaseUser) {
    const row = this.ensureDocument(id);
    this.assertCanEdit(row, user);
    this.db
      .delete(knowledgeDocumentsTable)
      .where(eq(knowledgeDocumentsTable.id, id))
      .run();
    return { success: true };
  }

  search(payload: unknown, user: KnowledgeBaseUser) {
    const input = searchKnowledgeSchema.parse(payload);
    const tokens = this.extractTokens(input.query);
    const conditions: SQL[] = [eq(knowledgeDocumentsTable.status, 'published')];

    if (input.channels?.length) {
      conditions.push(
        or(
          ...input.channels.map((channel) =>
            eq(knowledgeChunksTable.channel, channel),
          ),
        ) as SQL,
      );
    }

    if (tokens.length > 0) {
      conditions.push(
        or(
          ...tokens.flatMap((token) => [
            like(knowledgeChunksTable.chunkText, `%${token}%`),
            like(knowledgeDocumentsTable.title, `%${token}%`),
            like(knowledgeDocumentsTable.tagsJson, `%${token}%`),
          ]),
        ) as SQL,
      );
    }

    const rows = this.db
      .select({
        chunkId: knowledgeChunksTable.id,
        documentId: knowledgeChunksTable.documentId,
        channel: knowledgeChunksTable.channel,
        chunkIndex: knowledgeChunksTable.chunkIndex,
        headingPath: knowledgeChunksTable.headingPath,
        chunkText: knowledgeChunksTable.chunkText,
        title: knowledgeDocumentsTable.title,
        summary: knowledgeDocumentsTable.summary,
        tagsJson: knowledgeDocumentsTable.tagsJson,
        updatedAt: knowledgeDocumentsTable.updatedAt,
        ownerId: knowledgeDocumentsTable.ownerId,
        visibility: knowledgeDocumentsTable.visibility,
      })
      .from(knowledgeChunksTable)
      .innerJoin(
        knowledgeDocumentsTable,
        eq(knowledgeChunksTable.documentId, knowledgeDocumentsTable.id),
      )
      .where(and(...conditions))
      .limit(100)
      .all()
      .filter((row) => row.visibility === 'all' || row.ownerId === user.id);

    return {
      items: rows
        .map((row) => {
          const relevance = this.scoreSearchRow(input.query, {
            title: row.title,
            summary: row.summary,
            chunkText: row.chunkText,
            tags: this.parseTags(row.tagsJson),
          });
          return {
            chunkId: row.chunkId,
            documentId: row.documentId,
            channel: row.channel,
            channelLabel: CHANNEL_LABELS[row.channel],
            chunkIndex: row.chunkIndex,
            headingPath: row.headingPath,
            chunkText: row.chunkText,
            title: row.title,
            summary: row.summary,
            tags: relevance.tags,
            updatedAt: row.updatedAt,
            score: relevance.score,
            matchedTokenCount: relevance.matchedTokenCount,
            queryTokenCount: relevance.queryTokenCount,
            snippet: row.chunkText.slice(0, 260),
            documentUrl: this.buildDocumentUrl(row.channel, row.documentId),
          };
        })
        .filter((item) =>
          this.isRelevantResult({
            score: item.score,
            matchedTokenCount: item.matchedTokenCount,
            queryTokenCount: item.queryTokenCount,
          }),
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, input.limit)
        .map(({ matchedTokenCount, queryTokenCount, ...item }) => item),
    };
  }

  private buildDocumentUrl(channel: KnowledgeChannel, documentId: string) {
    return `/chatbot/knowledge/${channel}?documentId=${encodeURIComponent(documentId)}`;
  }

  private buildDocumentConditions(
    query: ReturnType<typeof listKnowledgeDocumentsQuerySchema.parse>,
  ) {
    const conditions: SQL[] = [];
    if (query.channel) {
      conditions.push(eq(knowledgeDocumentsTable.channel, query.channel));
    }
    if (query.status) {
      conditions.push(eq(knowledgeDocumentsTable.status, query.status));
    }
    if (query.q) {
      const tokens = this.extractTokens(query.q);
      if (tokens.length > 0) {
        conditions.push(
          or(
            ...tokens.flatMap((token) => [
              like(knowledgeDocumentsTable.title, `%${token}%`),
              like(knowledgeDocumentsTable.summary, `%${token}%`),
              like(knowledgeDocumentsTable.contentMarkdown, `%${token}%`),
              like(knowledgeDocumentsTable.tagsJson, `%${token}%`),
            ]),
          ) as SQL,
        );
      }
    }
    return conditions.length > 0 ? conditions : [sql`1 = 1`];
  }

  private rebuildChunks(document: KnowledgeDocumentRow) {
    this.db
      .delete(knowledgeChunksTable)
      .where(eq(knowledgeChunksTable.documentId, document.id))
      .run();

    if (document.status === 'archived') return;

    const chunks = this.buildChunks(document);
    if (chunks.length > 0) {
      this.db.insert(knowledgeChunksTable).values(chunks).run();
    }
  }

  private buildChunks(document: KnowledgeDocumentRow): KnowledgeChunkInsert[] {
    if (document.channel === 'notice') {
      return [this.buildNoticeChunk(document, 0)];
    }
    if (document.channel === 'faq') {
      return [this.buildFaqChunk(document, 0)];
    }
    return [this.buildGenericChunk(document, 0)];
  }

  private buildNoticeChunk(
    document: KnowledgeDocumentRow,
    index: number,
  ): KnowledgeChunkInsert {
    const metadata = this.parseMetadata(document.metadataJson);
    const tags = this.parseTags(document.tagsJson);
    const lines = [
      '[공지사항]',
      `제목: ${document.title}`,
      document.summary ? `요약: ${document.summary}` : '',
      metadata.noticeType ? `공지 유형: ${metadata.noticeType}` : '',
      metadata.priority ? `중요도: ${metadata.priority}` : '',
      document.effectiveFrom ? `적용일: ${document.effectiveFrom}` : '',
      document.effectiveTo ? `만료일: ${document.effectiveTo}` : '만료일: 없음',
      metadata.target ? `대상: ${metadata.target}` : '',
      tags.length > 0 ? `태그: ${tags.join(', ')}` : '',
      '',
      '내용:',
      document.contentMarkdown,
    ].filter(Boolean);

    return {
      id: `knowledge-chunk-${randomUUID().slice(0, 12)}`,
      documentId: document.id,
      channel: document.channel,
      chunkIndex: index,
      headingPath: '공지사항',
      chunkText: lines.join('\n'),
      tokenEstimate: Math.ceil(lines.join('\n').length / 3),
      metadataJson: JSON.stringify({ source: 'notice-single-chunk' }),
      createdAt: new Date().toISOString(),
    };
  }

  private buildGenericChunk(
    document: KnowledgeDocumentRow,
    index: number,
  ): KnowledgeChunkInsert {
    const tags = this.parseTags(document.tagsJson);
    const lines = [
      `[${CHANNEL_LABELS[document.channel]}]`,
      `제목: ${document.title}`,
      document.summary ? `요약: ${document.summary}` : '',
      tags.length > 0 ? `태그: ${tags.join(', ')}` : '',
      '',
      '내용:',
      document.contentMarkdown,
    ].filter(Boolean);
    return {
      id: `knowledge-chunk-${randomUUID().slice(0, 12)}`,
      documentId: document.id,
      channel: document.channel,
      chunkIndex: index,
      headingPath: CHANNEL_LABELS[document.channel],
      chunkText: lines.join('\n'),
      tokenEstimate: Math.ceil(lines.join('\n').length / 3),
      metadataJson: JSON.stringify({ source: 'generic-single-chunk' }),
      createdAt: new Date().toISOString(),
    };
  }

  private buildFaqChunk(
    document: KnowledgeDocumentRow,
    index: number,
  ): KnowledgeChunkInsert {
    const metadata = this.parseMetadata(document.metadataJson);
    const tags = this.parseTags(document.tagsJson);
    const category =
      typeof metadata.category === 'string' ? metadata.category : '';
    const ownerTeam =
      typeof metadata.ownerTeam === 'string' ? metadata.ownerTeam : '';
    const relatedKeywords =
      typeof metadata.relatedKeywords === 'string'
        ? metadata.relatedKeywords
        : '';
    const lines = [
      '[FAQ]',
      `질문: ${document.title}`,
      document.summary ? `요약: ${document.summary}` : '',
      category ? `카테고리: ${category}` : '',
      ownerTeam ? `담당: ${ownerTeam}` : '',
      relatedKeywords ? `관련 키워드: ${relatedKeywords}` : '',
      tags.length > 0 ? `태그: ${tags.join(', ')}` : '',
      '',
      '답변:',
      document.contentMarkdown,
    ].filter(Boolean);

    return {
      id: `knowledge-chunk-${randomUUID().slice(0, 12)}`,
      documentId: document.id,
      channel: document.channel,
      chunkIndex: index,
      headingPath: category ? `FAQ > ${category}` : 'FAQ',
      chunkText: lines.join('\n'),
      tokenEstimate: Math.ceil(lines.join('\n').length / 3),
      metadataJson: JSON.stringify({ source: 'faq-single-chunk', category }),
      createdAt: new Date().toISOString(),
    };
  }

  private ensureDocument(id: string) {
    const row = this.db
      .select()
      .from(knowledgeDocumentsTable)
      .where(eq(knowledgeDocumentsTable.id, id))
      .get();
    if (!row) throw new NotFoundException('지식 문서를 찾을 수 없습니다.');
    return row;
  }

  private canRead(document: KnowledgeDocumentRow, user: KnowledgeBaseUser) {
    return (
      document.status === 'published' ||
      document.ownerId === user.id ||
      user.role === 'admin'
    );
  }

  private assertCanEdit(
    document: KnowledgeDocumentRow,
    user: KnowledgeBaseUser,
  ) {
    if (document.ownerId === user.id || user.role === 'admin') return;
    throw new ForbiddenException('지식 문서를 수정할 권한이 없습니다.');
  }

  private toDocumentSummaryDto(document: KnowledgeDocumentRow) {
    return {
      id: document.id,
      channel: document.channel,
      channelLabel: CHANNEL_LABELS[document.channel],
      title: document.title,
      summary: document.summary,
      tags: this.parseTags(document.tagsJson),
      status: document.status,
      visibility: document.visibility,
      ownerId: document.ownerId,
      ownerName: document.ownerName,
      effectiveFrom: document.effectiveFrom,
      effectiveTo: document.effectiveTo,
      metadata: this.parseMetadata(document.metadataJson),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      publishedAt: document.publishedAt,
    };
  }

  private toDocumentDetailDto(
    document: KnowledgeDocumentRow,
    chunks: KnowledgeChunkRow[],
    user: KnowledgeBaseUser,
  ) {
    return {
      ...this.toDocumentSummaryDto(document),
      contentMarkdown: document.contentMarkdown,
      contentJson: document.contentJson,
      chunks: chunks.map((chunk) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        channel: chunk.channel,
        chunkIndex: chunk.chunkIndex,
        headingPath: chunk.headingPath,
        chunkText: chunk.chunkText,
        tokenEstimate: chunk.tokenEstimate,
        metadata: this.parseMetadata(chunk.metadataJson),
        createdAt: chunk.createdAt,
      })),
      canEdit: document.ownerId === user.id || user.role === 'admin',
    };
  }

  private parseTags(value: string | null) {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private parseMetadata(value: string | null) {
    try {
      const parsed = JSON.parse(value || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private normalizeTags(tags: string[]) {
    return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
  }

  private extractTokens(query: string) {
    return Array.from(
      new Set(
        query
          .toLowerCase()
          .replace(/[^0-9a-z가-힣]+/g, ' ')
          .split(/\s+/)
          .map((token) => this.normalizeSearchToken(token))
          .filter((token) => token.length > 1)
          .filter((token) => !SEARCH_STOP_WORDS.has(token)),
      ),
    );
  }

  private normalizeSearchToken(token: string) {
    const trimmed = token.trim();
    if (trimmed.length <= 2) return trimmed;
    return trimmed.replace(
      /(으로|에서|에게|부터|까지|처럼|보다|하고|이며|이고|은|는|이|가|을|를|에|의|도|만|로|과|와|요)$/u,
      '',
    );
  }

  private scoreSearchRow(
    query: string,
    row: {
      title: string;
      summary: string | null;
      chunkText: string;
      tags: string[];
    },
  ) {
    const tokens = this.extractTokens(query);
    const title = row.title.toLowerCase();
    const summary = (row.summary ?? '').toLowerCase();
    const text = row.chunkText.toLowerCase();
    const tagsText = row.tags.join(' ').toLowerCase();
    const matchedTokens = new Set<string>();
    const score = tokens.reduce((currentScore, token) => {
      const titleMatch = title.includes(token);
      const tagMatch = tagsText.includes(token);
      const summaryMatch = summary.includes(token);
      const textMatch = text.includes(token);
      if (titleMatch || tagMatch || summaryMatch || textMatch) {
        matchedTokens.add(token);
      }
      return (
        currentScore +
        (titleMatch ? 6 : 0) +
        (tagMatch ? 5 : 0) +
        (summaryMatch ? 3 : 0) +
        (textMatch ? 2 : 0)
      );
    }, 0);

    return {
      score,
      tags: row.tags,
      matchedTokenCount: matchedTokens.size,
      queryTokenCount: tokens.length,
    };
  }

  private isRelevantResult(result: {
    score: number;
    matchedTokenCount: number;
    queryTokenCount: number;
  }) {
    if (result.queryTokenCount === 0) return false;
    if (result.queryTokenCount === 1) return result.score >= 5;
    if (result.queryTokenCount === 2) {
      return result.matchedTokenCount >= 2 || result.score >= 10;
    }
    return result.matchedTokenCount >= 2 && result.score >= 10;
  }
}
