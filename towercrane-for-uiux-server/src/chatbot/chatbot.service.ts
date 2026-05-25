import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { asc, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  chatMessagesTable,
  chatSessionsTable,
} from '../database/schema';

const CHATBOT_SYSTEM_PROMPT = `당신은 친절하고 실용적인 AI 어시스턴트입니다.

답변은 Markdown으로 작성합니다.
- 긴 답변은 2~4문장 단위의 짧은 문단으로 나눕니다.
- 비교, 절차, 요약은 목록이나 표를 사용합니다.
- 코드, 명령어, 파일명, API 이름은 backtick으로 감쌉니다.
- 코드 예시는 fenced code block을 사용하고 가능한 경우 언어명을 붙입니다.
- 불필요한 장문 서론은 피하고 바로 핵심부터 답합니다.

사용자가 HTML을 요청하지 않는 한 raw HTML은 출력하지 않습니다.`;

@Injectable()
export class ChatbotService {
  private openai: OpenAI | null;

  constructor(
    private configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  private get db() {
    return this.databaseService.db;
  }

  private assertOwnership(sessionId: string, userId: string) {
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
    this.db
      .delete(chatSessionsTable)
      .where(eq(chatSessionsTable.id, id))
      .run();
    return { id };
  }

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

  private touchSession(sessionId: string, firstMessageText?: string) {
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
      ? firstMessageText!.slice(0, 20) +
        (firstMessageText!.length > 20 ? '…' : '')
      : session.title;

    this.db
      .update(chatSessionsTable)
      .set({ title: nextTitle, updatedAt: now })
      .where(eq(chatSessionsTable.id, sessionId))
      .run();

    return { title: nextTitle, updatedAt: now };
  }

  private insertMessage(
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
      fileUrls: fileUrls && fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
      createdAt: new Date().toISOString(),
    };
    this.db.insert(chatMessagesTable).values(message).run();
    return { ...message, fileUrls: fileUrls ?? [] };
  }

  private buildUserContent(
    message: string,
    fileUrls: string[],
  ): string | OpenAI.ChatCompletionContentPart[] {
    if (fileUrls.length === 0) return message

    const parts: OpenAI.ChatCompletionContentPart[] = []

    for (const url of fileUrls) {
      // 쿼리스트링 제거 후 확장자 체크
      const cleanUrl = url.split('?')[0]
      if (/\.(jpg|jpeg|png|gif|webp)/i.test(cleanUrl)) {
        parts.push({ type: 'image_url', image_url: { url, detail: 'auto' } })
      }
    }

    if (message) parts.push({ type: 'text', text: message })

    return parts.length > 0 ? parts : message
  }

  private buildHistory(
    sessionId: string,
  ): OpenAI.ChatCompletionMessageParam[] {
    const rows = this.db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, sessionId))
      .orderBy(asc(chatMessagesTable.createdAt))
      .all()

    return rows.map((r) => {
      const fileUrls: string[] = r.fileUrls ? (JSON.parse(r.fileUrls) as string[]) : []
      const content = this.buildUserContent(r.content, fileUrls)
      return { role: r.role, content } as OpenAI.ChatCompletionMessageParam
    })
  }

  async streamGpt(sessionId: string, message: string, userId: string, res: Response, fileUrls: string[] = []) {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        'OpenAI API key is not configured.',
      );
    }

    this.assertOwnership(sessionId, userId);
    const meta = this.touchSession(sessionId, message || '파일 첨부');
    const userMessage = this.insertMessage(sessionId, 'user', message, fileUrls);

    res.write(
      `data: ${JSON.stringify({ type: 'meta', userMessage, sessionTitle: meta.title })}\n\n`,
    );

    const content = this.buildUserContent(message, fileUrls)

    const hasImage = fileUrls.some((url) =>
      /\.(jpg|jpeg|png|gif|webp)/i.test(url.split('?')[0]),
    )
    const defaultModel =
      this.configService.get<string>('OPENAI_DEFAULT_MODEL') ?? 'gpt-4o-mini'
    const model = hasImage ? 'gpt-4o-mini' : defaultModel

    // 이전 대화 히스토리 로드 (현재 메시지 제외 — insertMessage 이후라 이미 포함됨)
    const history = this.buildHistory(sessionId)
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
      ...history.slice(0, -1), // 마지막은 방금 insert한 현재 메시지 → content로 교체
      { role: 'user', content },
    ]

    const stream = await this.openai.chat.completions.create({
      model,
      stream: true,
      messages,
    });

    let assistantContent = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) {
        assistantContent += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    const assistantMessage = this.insertMessage(
      sessionId,
      'assistant',
      assistantContent,
    );
    res.write(
      `data: ${JSON.stringify({ type: 'done', assistantMessage })}\n\n`,
    );
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
