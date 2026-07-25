import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import { asc, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { chatMessagesTable, chatSessionsTable } from '../database/schema';

/**
 * 대화방(세션)과 메시지의 DB 접근을 담당한다.
 * 모드(기본/지식/도구)와 무관하게 셋 다 이 서비스를 쓴다.
 */
@Injectable()
export class ChatbotSessionService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * 이 대화방이 정말 이 사용자 것인지 확인한다.
   * sessionId는 요청 body로 오므로 사용자가 조작할 수 있다 —
   * 헤더 토큰에서 나온 userId로 대조해야 남의 대화를 못 읽는다.
   */
  assertOwnership(sessionId: string, userId: string) {
    const session = this.db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .get();
    if (!session) throw new NotFoundException('session not found');
    if (session.userId !== userId) throw new ForbiddenException();
    return session;
  }

  listSessions(userId: string) {
    return this.db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.userId, userId))
      .orderBy(desc(chatSessionsTable.updatedAt))
      .all();
  }

  createSession(userId: string, title?: string) {
    const now = new Date().toISOString();
    const session = {
      id: randomUUID(),
      userId,
      title: title?.trim() || '새 대화',
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(chatSessionsTable).values(session).run();
    return session;
  }

  renameSession(id: string, title: string, userId: string) {
    this.assertOwnership(id, userId);
    const trimmed = title.trim();
    if (!trimmed) {
      throw new NotFoundException('title is required');
    }
    const now = new Date().toISOString();
    this.db
      .update(chatSessionsTable)
      .set({ title: trimmed, updatedAt: now })
      .where(eq(chatSessionsTable.id, id))
      .run();
    return { id, title: trimmed, updatedAt: now };
  }

  deleteSession(id: string, userId: string) {
    this.assertOwnership(id, userId);
    this.db.delete(chatSessionsTable).where(eq(chatSessionsTable.id, id)).run();
    return { id };
  }

  /** 화면에 말풍선을 그리기 위한 조회 — GPT용 히스토리와는 다르다 */
  listMessages(sessionId: string, userId: string) {
    this.assertOwnership(sessionId, userId);
    const rows = this.db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, sessionId))
      .orderBy(asc(chatMessagesTable.createdAt))
      .all();
    return rows.map((r) => ({
      ...r,
      fileUrls: r.fileUrls ? (JSON.parse(r.fileUrls) as string[]) : [],
    }));
  }

  /** 갱신 시각을 찍고, 첫 질문이면 그걸로 대화방 제목을 자동 생성한다 */
  touchSession(sessionId: string, firstMessageText?: string) {
    const now = new Date().toISOString();
    const session = this.db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.id, sessionId))
      .get();
    if (!session) {
      throw new NotFoundException('session not found');
    }

    const messageCount = this.db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, sessionId))
      .all().length;

    const shouldUpdateTitle =
      messageCount === 0 && firstMessageText && session.title === '새 대화';
    const nextTitle = shouldUpdateTitle
      ? firstMessageText.slice(0, 20) +
        (firstMessageText.length > 20 ? '…' : '')
      : session.title;

    this.db
      .update(chatSessionsTable)
      .set({ title: nextTitle, updatedAt: now })
      .where(eq(chatSessionsTable.id, sessionId))
      .run();

    return { title: nextTitle, updatedAt: now };
  }

  /** DB에 넣고, 넣은 행을 그대로 돌려준다 (프론트가 임시 id를 교체하는 데 쓴다) */
  insertMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    fileUrls?: string[],
  ) {
    const message = {
      id: randomUUID(),
      sessionId,
      role,
      content,
      fileUrls:
        fileUrls && fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
      createdAt: new Date().toISOString(),
    };
    this.db.insert(chatMessagesTable).values(message).run();
    return { ...message, fileUrls: fileUrls ?? [] };
  }

  /** 이미지가 붙으면 문자열이 아니라 OpenAI의 멀티모달 파트 배열이 된다 */
  buildUserContent(
    message: string,
    fileUrls: string[],
  ): string | OpenAI.ChatCompletionContentPart[] {
    if (fileUrls.length === 0) return message;

    const parts: OpenAI.ChatCompletionContentPart[] = [];
    for (const url of fileUrls) {
      const cleanUrl = url.split('?')[0]; // 쿼리스트링 제거 후 확장자 체크
      if (/\.(jpg|jpeg|png|gif|webp)/i.test(cleanUrl)) {
        parts.push({ type: 'image_url', image_url: { url, detail: 'auto' } });
      }
    }
    if (message) parts.push({ type: 'text', text: message });

    return parts.length > 0 ? parts : message;
  }

  /**
   * GPT에게 먹일 대화 히스토리.
   * GPT는 이전 대화를 기억하지 못하므로 매 요청마다 DB에서 통째로 읽어 보낸다.
   */
  buildHistory(sessionId: string): OpenAI.ChatCompletionMessageParam[] {
    const rows = this.db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, sessionId))
      .orderBy(asc(chatMessagesTable.createdAt))
      .all();

    return rows.map((r) => {
      const fileUrls: string[] = r.fileUrls
        ? (JSON.parse(r.fileUrls) as string[])
        : [];
      const content = this.buildUserContent(r.content, fileUrls);
      return { role: r.role, content } as OpenAI.ChatCompletionMessageParam;
    });
  }
}
