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
  usageLogsTable,
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
  // STEP 1-A: mode에 'tools' 추가 — tools 모드일 때 Function Calling 흐름 사용
  mode?: 'general' | 'knowledge' | 'tools';
  channels?: KnowledgeChannel[];
};

// STEP 1-B: self_introduce 툴 스키마 정의
// "넌 누구야", "자기소개해줘" 같은 질문에 발동 — 파라미터 없음
const SELF_INTRODUCE_TOOL: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'self_introduce',
    description: '사용자가 명시적으로 자기소개를 요청할 때만 사용한다. "자기소개해줘", "넌 누구야", "너에 대해 알려줘", "who are you" 처럼 AI의 정체나 소개를 직접 물을 때만 발동한다. 단순 인사("안녕", "hello")에는 절대 사용하지 않는다.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

// STEP 1-C: 툴 실행 함수 — 실제 GPT 모델 정보를 구조화해서 반환
function executeSelfIntroduce() {
  return {
    model: 'GPT-4o',
    developer: 'OpenAI',
    released: '2024년 5월',
    contextWindow: '128,000 tokens',
    knowledgeCutoff: '2024년 4월',
    languages: '100개 이상',
    capabilities: ['텍스트 생성', '이미지 이해', '코드 작성', '수학·논리 추론', '다국어 번역', '문서 요약'],
    description: '세계 최고 수준의 멀티모달 AI 모델. 텍스트와 이미지를 동시에 이해하고, 복잡한 추론과 창의적 작업 모두 수행합니다.',
  };
}

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
    // STEP 2: tools 모드 여부 판단
    const isToolsMode = options.mode === 'tools';

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

    // STEP 3: tools 모드 분기 — 기존 스트리밍 흐름과 완전히 분리
    if (isToolsMode) {
      // STEP 3-A: 1차 요청 — stream: false (tool_calls JSON 완성본이 필요하므로)
      // stream: true 로 하면 tool_calls 인자가 청크로 쪼개져서 파싱이 복잡해짐
      const firstResponse = await this.openai.chat.completions.create({
        model,
        stream: false,
        messages,
        tools: [SELF_INTRODUCE_TOOL],
        tool_choice: 'auto', // AI가 툴 쓸지 말지 스스로 판단
      });

      const choice = firstResponse.choices[0];

      // STEP 3-B: AI가 tool_calls를 반환했는지 확인
      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
        const toolCall = choice.message.tool_calls[0] as OpenAI.ChatCompletionMessageFunctionToolCall;
        const toolName = toolCall.function.name;
        const toolInput = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;

        // STEP 3-C: 실제 함수 실행 (Hello World — 파라미터 없는 고정 자기소개)
        const toolResult = executeSelfIntroduce();

        // STEP 3-D: 프론트 오른쪽 패널용 SSE 이벤트 전송
        // 프론트에서 type === 'tool_call' 로 파싱해서 도구 호출 로그에 표시
        res.write(
          `data: ${JSON.stringify({
            type: 'tool_call',
            name: toolName,
            input: toolInput,
            result: toolResult,
          })}\n\n`,
        );

        // STEP 3-E: 다이얼로그 전용 툴은 채팅창 응답 없이 바로 종료
        // 결과가 다이얼로그로 표시되므로 2차 GPT 스트림 불필요 — 빈 메시지로 done 이벤트만 전송
        const assistantMessage = this.insertMessage(sessionId, 'assistant', '');
        res.write(`data: ${JSON.stringify({ type: 'done', assistantMessage, knowledgeSources: [] })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // STEP 3-H: tool_calls 없이 일반 답변으로 판단된 경우 — 텍스트 그대로 반환
      const directContent = choice.message.content ?? '';
      const assistantMessage = this.insertMessage(sessionId, 'assistant', directContent);
      res.write(`data: ${JSON.stringify({ text: directContent })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', assistantMessage, knowledgeSources: [] })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // STEP 4: 기존 general / knowledge 흐름 — 변경 없음
    const stream = await this.openai.chat.completions.create({
      model,
      stream: true,
      stream_options: { include_usage: true },
      messages,
    });

    let assistantContent = '';
    let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) {
        assistantContent += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
      if (chunk.usage) usage = chunk.usage;
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

    // usage 기록 (비동기 — 응답 후 처리)
    if (usage) {
      const COST_PER_1K: Record<string, { prompt: number; completion: number }> = {
        'gpt-4o':           { prompt: 0.005,   completion: 0.015 },
        'gpt-4o-mini':      { prompt: 0.00015, completion: 0.0006 },
        'gpt-4.1':          { prompt: 0.002,   completion: 0.008 },
        'gpt-4.1-mini':     { prompt: 0.0004,  completion: 0.0016 },
        'gpt-4.1-nano':     { prompt: 0.0001,  completion: 0.0004 },
      };
      const rate = COST_PER_1K[model] ?? { prompt: 0.00015, completion: 0.0006 };
      const estimatedCostUsd =
        (usage.prompt_tokens / 1000) * rate.prompt +
        (usage.completion_tokens / 1000) * rate.completion;

      this.db.insert(usageLogsTable).values({
        id: randomUUID(),
        userId: user.id,
        userName: user.name,
        sessionId,
        model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimatedCostUsd,
        isError: 0,
        createdAt: new Date().toISOString(),
      }).run();
    }
  }
}
