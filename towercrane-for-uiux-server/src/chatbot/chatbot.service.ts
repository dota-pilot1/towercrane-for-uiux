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
  type KnowledgeChannel,
} from '../database/schema';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

type ChatbotUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

type KnowledgeSource = {
  chunkId: string;
  documentId: string;
  channel: KnowledgeChannel;
  channelLabel: string;
  chunkIndex: number;
  headingPath: string | null;
  chunkText: string;
  title: string;
  summary: string | null;
  tags: string[];
  updatedAt: string;
  score: number;
  snippet: string;
  documentUrl: string;
};

type StreamOptions = {
  fileUrls?: string[];
  mode?: 'general' | 'knowledge';
  channels?: KnowledgeChannel[];
};

const CHATBOT_SYSTEM_PROMPT = `당신은 친절하고 실용적인 AI 어시스턴트입니다.

답변은 Markdown으로 작성합니다.
- 긴 답변은 2~4문장 단위의 짧은 문단으로 나눕니다.
- 비교, 절차, 요약은 목록이나 표를 사용합니다.
- 코드, 명령어, 파일명, API 이름은 backtick으로 감쌉니다.
- 코드 예시는 fenced code block을 사용하고 가능한 경우 언어명을 붙입니다.
- 불필요한 장문 서론은 피하고 바로 핵심부터 답합니다.

사용자가 HTML을 요청하지 않는 한 raw HTML은 출력하지 않습니다.`;

const KNOWLEDGE_SYSTEM_PROMPT = `${CHATBOT_SYSTEM_PROMPT}

당신은 농협 사내 AX 지식 검색 챗봇입니다.
- 제공된 사내 지식 문서만 근거로 답변합니다.
- 문서에 없는 정책, 날짜, 담당자, 비용, 절차는 만들지 않습니다.
- 근거가 부족하면 "제공된 문서에서 확인되지 않습니다"라고 명확히 말합니다.
- 공지사항은 적용일, 만료일, 중요도처럼 날짜와 상태를 분명히 표시합니다.
- FAQ는 사용자가 바로 실행할 수 있게 짧고 확정적으로 답합니다.
- 답변 마지막에는 "참고 문서" 섹션을 만들고 사용한 문서 제목을 나열합니다.`;

@Injectable()
export class ChatbotService {
  private openai: OpenAI | null;

  constructor(
    private configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly knowledgeBaseService: KnowledgeBaseService,
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

  private buildKnowledgeContext(sources: KnowledgeSource[]) {
    if (sources.length === 0) {
      return `검색된 사내 지식 문서가 없습니다.

이 경우 답변에는 "관련 지식 문서를 찾지 못했습니다. 질문을 더 구체적으로 입력하거나 검색 범위를 변경해보세요."라고 안내하세요.`;
    }

    return [
      '아래 사내 지식 문서만 근거로 답변하세요.',
      '문서에 없는 내용은 추측하지 마세요.',
      '',
      ...sources.map((source, index) =>
        [
          `[문서 ${index + 1}]`,
          `채널: ${source.channelLabel}`,
          `제목: ${source.title}`,
          source.summary ? `요약: ${source.summary}` : '',
          `원문: ${source.documentUrl}`,
          '내용:',
          source.chunkText,
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    ].join('\n\n');
  }

  private searchKnowledgeSources(
    query: string,
    user: ChatbotUser,
    channels?: KnowledgeChannel[],
  ): KnowledgeSource[] {
    if (!query.trim()) return [];
    const result = this.knowledgeBaseService.search(
      {
        query,
        channels: channels && channels.length > 0 ? channels : undefined,
        limit: 5,
      },
      user,
    );
    return result.items;
  }

  async streamGpt(
    sessionId: string,
    message: string,
    user: ChatbotUser,
    res: Response,
    options: StreamOptions = {},
  ) {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        'OpenAI API key is not configured.',
      );
    }

    const fileUrls = options.fileUrls ?? [];
    const isKnowledgeMode = options.mode === 'knowledge';

    this.assertOwnership(sessionId, user.id);
    const meta = this.touchSession(sessionId, message || '파일 첨부');
    const userMessage = this.insertMessage(sessionId, 'user', message, fileUrls);

    res.write(
      `data: ${JSON.stringify({ type: 'meta', userMessage, sessionTitle: meta.title })}\n\n`,
    );

    const knowledgeSources = isKnowledgeMode
      ? this.searchKnowledgeSources(message, user, options.channels)
      : [];

    if (isKnowledgeMode) {
      res.write(
        `data: ${JSON.stringify({ type: 'knowledge_sources', items: knowledgeSources })}\n\n`,
      );
    }

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
      {
        role: 'system',
        content: isKnowledgeMode ? KNOWLEDGE_SYSTEM_PROMPT : CHATBOT_SYSTEM_PROMPT,
      },
      ...(isKnowledgeMode
        ? [
            {
              role: 'system',
              content: this.buildKnowledgeContext(knowledgeSources),
            } as OpenAI.ChatCompletionMessageParam,
          ]
        : []),
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
      `data: ${JSON.stringify({ type: 'done', assistantMessage, knowledgeSources })}\n\n`,
    );
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
