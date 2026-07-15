import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { asc, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  chatMessagesTable,
  chatSessionsTable,
  usageLogsTable,
  tasksTable,
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

// prepareStream이 모아서 모드별 함수에 넘기는 것들
type StreamContext = {
  sessionId: string;
  user: ChatbotUser;
  sse: ReturnType<ChatbotService['sse']>;
  messages: OpenAI.ChatCompletionMessageParam[];
  knowledgeSources: KnowledgeSource[];
  model: string;
};

// 스트림으로 조각조각 오는 tool_call을 조립하는 중간 상태
type ToolCallDraft = { id: string; name: string; arguments: string };

type RealtimeSessionRequest = {
  model?: string;
  voice?: string;
  language?: string;
  turnMode?: 'server_vad' | 'push_to_talk';
  responseMode?: 'text_audio' | 'text_only' | 'audio_only';
  instructions?: string;
  enabledTools?: string[];
};

type RealtimeToolExecuteRequest = {
  callId?: string;
  name: string;
  source?: 'realtime' | 'manual_test';
  arguments?: Record<string, unknown>;
};

type RealtimeToolDefinition = {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
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

// get_my_tasks 툴 스키마 — 담당자 기준 업무 목록 조회
const GET_MY_TASKS_TOOL: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_my_tasks',
    description: '현재 로그인한 사용자가 담당자로 지정된 업무 목록을 조회할 때 사용한다. "내 업무", "내 할일", "담당 업무", "나한테 배정된 업무" 같은 요청에 발동한다.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

const REALTIME_MODEL_FALLBACK = 'gpt-realtime-2';
const ALLOWED_REALTIME_MODELS = new Set([
  'gpt-realtime-2',
  'gpt-realtime-1.5',
  'gpt-realtime',
  'gpt-realtime-mini',
]);

const ALLOWED_REALTIME_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'cedar',
  'coral',
  'echo',
  'marin',
  'sage',
  'shimmer',
  'verse',
]);

const REALTIME_TOOL_DEFINITIONS: RealtimeToolDefinition[] = [
  {
    type: 'function',
    name: 'get_my_tasks',
    description:
      '현재 로그인한 사용자가 담당자로 지정된 업무 목록을 조회한다. 사용자가 명시적으로 "내 업무", "내 할일", "담당 업무", "업무 목록", "업무 조회", "어떤 일 있어?" 처럼 본인의 업무를 직접 물어볼 때만 사용한다. 일반 대화나 다른 주제의 질문에는 절대 사용하지 않는다.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'HOLD'],
          description: '선택 사항. 특정 업무 상태만 보고 싶을 때 사용한다.',
        },
      },
      required: [],
    },
  },
  {
    type: 'function',
    name: 'search_knowledge',
    description:
      '사내 지식 문서에서 사용자의 질문과 관련된 문서를 검색한다. 정책, FAQ, 공지, 개발 지식 확인 요청에 사용한다.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '검색할 질문 또는 키워드',
        },
      },
      required: ['query'],
    },
  },
];

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

  private normalizeRealtimeModel(model?: string) {
    const configured =
      this.configService.get<string>('OPENAI_REALTIME_MODEL') ??
      REALTIME_MODEL_FALLBACK;
    const requested = model?.trim() || configured;
    return ALLOWED_REALTIME_MODELS.has(requested)
      ? requested
      : REALTIME_MODEL_FALLBACK;
  }

  private normalizeRealtimeVoice(voice?: string) {
    const requested = voice?.trim().toLowerCase() || 'marin';
    return ALLOWED_REALTIME_VOICES.has(requested) ? requested : 'marin';
  }

  private buildRealtimeInstructions(extra?: string) {
    return [
      '당신은 Towercrane Prototype Console의 실시간 음성 업무 도우미입니다.',
      '한국어로 짧고 명확하게 답하세요.',
      '업무 데이터, 담당 업무처럼 현재 시스템 정보가 필요한 경우 등록된 도구를 호출하세요.',
      '도구 호출 결과에 근거해 답하고, 확인되지 않은 내용은 추측하지 마세요.',
      '민감한 정보는 사용자가 권한을 가진 범위에서만 답하세요.',
      extra?.trim() ? `추가 지시: ${extra.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private getRealtimeTools(enabledTools?: string[]) {
    if (!enabledTools || enabledTools.length === 0) {
      return REALTIME_TOOL_DEFINITIONS;
    }

    const enabled = new Set(enabledTools);
    return REALTIME_TOOL_DEFINITIONS.filter((tool) => enabled.has(tool.name));
  }

  private buildSafetyIdentifier(userId: string) {
    return createHash('sha256')
      .update(`towercrane:${userId}`)
      .digest('hex');
  }

  async createRealtimeClientSecret(
    user: ChatbotUser,
    request: RealtimeSessionRequest,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OpenAI API key is not configured.',
      );
    }

    const model = this.normalizeRealtimeModel(request.model);
    const voice = this.normalizeRealtimeVoice(request.voice);
    const language =
      request.language && request.language !== 'auto'
        ? request.language
        : undefined;
    const responseMode = request.responseMode ?? 'text_audio';
    const turnMode = request.turnMode ?? 'server_vad';
    const tools = this.getRealtimeTools(request.enabledTools);
    const outputModalities =
      responseMode === 'text_only'
        ? ['text']
        : ['audio'];

    const session: Record<string, unknown> = {
      type: 'realtime',
      model,
      output_modalities: outputModalities,
      instructions: this.buildRealtimeInstructions(request.instructions),
      audio: {
        input: {
          turn_detection:
            turnMode === 'server_vad' ? { type: 'server_vad' } : null,
          transcription: {
            model: 'gpt-4o-transcribe',
            ...(language ? { language } : {}),
          },
        },
        output: {
          voice,
        },
      },
      tools,
      tool_choice: tools.length > 0 ? 'auto' : 'none',
    };

    const response = await fetch(
      'https://api.openai.com/v1/realtime/client_secrets',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Safety-Identifier': this.buildSafetyIdentifier(user.id),
        },
        body: JSON.stringify({
          expires_after: { anchor: 'created_at', seconds: 600 },
          session,
        }),
      },
    );

    const rawBody = await response.text();
    let data: Record<string, any> = {};
    try {
      data = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new ServiceUnavailableException({
        message: 'OpenAI Realtime client secret 생성에 실패했습니다.',
        status: response.status,
        details: data.error?.message ?? rawBody,
      });
    }

    const token = data.value ?? data.client_secret?.value;
    const expiresAt = data.expires_at ?? data.client_secret?.expires_at;
    if (!token || typeof token !== 'string') {
      throw new ServiceUnavailableException(
        'OpenAI Realtime client secret 응답에 token이 없습니다.',
      );
    }

    return {
      type: 'client_secret',
      token,
      model,
      voice,
      expiresAt,
      tools: tools.map((tool) => tool.name),
    };
  }

  executeRealtimeTool(user: ChatbotUser, request: RealtimeToolExecuteRequest) {
    const name = request.name?.trim();
    const args = request.arguments ?? {};
    const callId = request.callId?.trim() || `manual_${randomUUID()}`;

    if (!name) {
      throw new BadRequestException('tool name is required');
    }

    if (name === 'get_my_tasks') {
      const status =
        typeof args.status === 'string' && args.status.trim()
          ? args.status.trim()
          : undefined;
      const tasks = this.db
        .select({
          id: tasksTable.id,
          title: tasksTable.title,
          status: tasksTable.status,
          priority: tasksTable.priority,
          taskType: tasksTable.taskType,
          dueDate: tasksTable.dueDate,
        })
        .from(tasksTable)
        .where(eq(tasksTable.assigneeId, user.id))
        .all()
        .filter((task) => !status || task.status === status);

      return {
        callId,
        name,
        result: {
          count: tasks.length,
          items: tasks.slice(0, 10),
        },
        summary: `담당 업무 ${tasks.length}건을 조회했습니다.`,
      };
    }

    if (name === 'search_knowledge') {
      const query = typeof args.query === 'string' ? args.query.trim() : '';
      if (!query) {
        throw new BadRequestException('search_knowledge query is required');
      }

      const sources = this.searchKnowledgeSources(query, user).map((source) => ({
        documentId: source.documentId,
        channel: source.channel,
        title: source.title,
        headingPath: source.headingPath,
        snippet: source.snippet,
        documentUrl: source.documentUrl,
        score: source.score,
      }));

      return {
        callId,
        name,
        result: {
          count: sources.length,
          items: sources,
        },
        summary: `사내 지식 문서 ${sources.length}건을 검색했습니다.`,
      };
    }

    throw new BadRequestException(`unsupported realtime tool: ${name}`);
  }

  // SSE 프레임 쓰기 — 'data: …\n\n' 규약을 한 곳에 가둔다
  private sse(res: Response) {
    return {
      send: (payload: unknown) =>
        res.write(`data: ${JSON.stringify(payload)}\n\n`),
      // 스트림 종료 3종 세트 — done 프레임 + [DONE] 표식 + 연결 닫기
      finish: (
        assistantMessage: unknown,
        knowledgeSources: KnowledgeSource[] = [],
      ) => {
        res.write(
          `data: ${JSON.stringify({ type: 'done', assistantMessage, knowledgeSources })}\n\n`,
        );
        res.write('data: [DONE]\n\n');
        res.end();
      },
    };
  }

  // 툴 인자 조립 결과는 LLM이 만든 JSON 문자열 — 깨져 있어도 스트림을 죽이지 않는다
  private parseToolArguments(raw: string): Record<string, unknown> {
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private recordUsage(
    user: ChatbotUser,
    sessionId: string,
    model: string,
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    } | null,
  ) {
    if (!usage) return;

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

  /**
   * 챗봇 응답 진입점. 기본 채팅 / 지식 검색 / 도구 호출 세 모드가 공유한다.
   * 준비(권한·저장·프롬프트 조립)까지는 같고, OpenAI 호출부터 모드별로 갈린다.
   */
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

    const ctx = this.prepareStream(sessionId, message, user, res, options);

    if (options.mode === 'tools') return this.streamToolsMode(ctx);
    return this.streamPlainMode(ctx);
  }

  /**
   * 모든 모드의 공통 준비 단계.
   * 권한 검사 → 질문 저장 → meta 프레임 전송 → 모델·프롬프트 조립까지.
   */
  private prepareStream(
    sessionId: string,
    message: string,
    user: ChatbotUser,
    res: Response,
    options: StreamOptions,
  ): StreamContext {
    const fileUrls = options.fileUrls ?? [];
    const sse = this.sse(res);

    // body의 sessionId는 사용자가 조작할 수 있다 — 헤더 토큰의 user.id로 대조한다
    this.assertOwnership(sessionId, user.id);
    const meta = this.touchSession(sessionId, message || '파일 첨부');
    const userMessage = this.insertMessage(sessionId, 'user', message, fileUrls);

    // 프론트의 임시 id를 진짜 DB id로 바꿔치우게 해준다
    sse.send({ type: 'meta', userMessage, sessionTitle: meta.title });

    // 지식 모드만 사내 문서를 찾아 프롬프트에 얹는다 — 나머지 모드는 빈손
    const knowledge =
      options.mode === 'knowledge'
        ? this.prepareKnowledge(message, user, options.channels, sse)
        : {
            sources: [],
            systemPrompts: [
              { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
            ] as OpenAI.ChatCompletionMessageParam[],
          };

    // GPT는 이전 대화를 기억하지 못한다 — 매번 DB에서 읽어 통째로 넣어준다
    const history = this.buildHistory(sessionId);
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      ...knowledge.systemPrompts,
      // 마지막은 방금 insert한 이번 질문 → 이미지가 붙은 content로 교체한다
      ...history.slice(0, -1),
      { role: 'user', content: this.buildUserContent(message, fileUrls) },
    ];

    return {
      sessionId,
      user,
      sse,
      messages,
      knowledgeSources: knowledge.sources,
      model: this.pickModel(fileUrls),
    };
  }

  /**
   * 지식 검색(RAG) 전용 준비. 사내 문서를 찾아 프론트에 알리고,
   * 그 문서를 근거로만 답하도록 시스템 프롬프트를 짠다.
   */
  private prepareKnowledge(
    message: string,
    user: ChatbotUser,
    channels: KnowledgeChannel[] | undefined,
    sse: ReturnType<ChatbotService['sse']>,
  ) {
    const sources = this.searchKnowledgeSources(message, user, channels);

    // 화면 오른쪽 "참고 문서" 패널용 — 답변보다 먼저 보낸다
    sse.send({ type: 'knowledge_sources', items: sources });

    return {
      sources,
      systemPrompts: [
        { role: 'system', content: KNOWLEDGE_SYSTEM_PROMPT },
        { role: 'system', content: this.buildKnowledgeContext(sources) },
      ] as OpenAI.ChatCompletionMessageParam[],
    };
  }

  // 이미지가 붙으면 vision 지원 모델로 강제한다
  private pickModel(fileUrls: string[]) {
    const hasImage = fileUrls.some((url) =>
      /\.(jpg|jpeg|png|gif|webp)/i.test(url.split('?')[0]),
    );
    if (hasImage) return 'gpt-4o-mini';
    return (
      this.configService.get<string>('OPENAI_DEFAULT_MODEL') ?? 'gpt-4o-mini'
    );
  }

  /**
   * 기본 채팅 / 지식 검색 — 토큰을 도착하는 즉시 흘려보낸다.
   */
  private async streamPlainMode(ctx: StreamContext) {
    const { sessionId, user, sse, messages, model, knowledgeSources } = ctx;

    const stream = await this.openai!.chat.completions.create({
      model,
      stream: true,
      stream_options: { include_usage: true },
      messages,
    });

    let assistantContent = '';
    let usage: OpenAI.CompletionUsage | null = null;
    for await (const chunk of stream) {
      if (chunk.usage) usage = chunk.usage;
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) {
        assistantContent += text; // DB 저장용으로 모으고
        sse.send({ text }); // 동시에 화면으로 흘려보낸다
      }
    }

    const assistantMessage = this.insertMessage(
      sessionId,
      'assistant',
      assistantContent,
    );
    sse.finish(assistantMessage, knowledgeSources);
    this.recordUsage(user, sessionId, model, usage);
  }

  /**
   * 도구 호출 — tools 목록을 함께 보내고 GPT가 쓸지 말지 스스로 판단한다.
   * 텍스트는 즉시 흘려보내되 tool_calls 조각은 모아만 둔다. 어느 쪽인지는
   * 스트림이 끝나고 finish_reason이 확정돼야 알 수 있기 때문이다.
   */
  private async streamToolsMode(ctx: StreamContext) {
    const { sessionId, user, sse, messages, model } = ctx;

    const stream = await this.openai!.chat.completions.create({
      model,
      stream: true,
      stream_options: { include_usage: true },
      messages,
      tools: [SELF_INTRODUCE_TOOL, GET_MY_TASKS_TOOL],
      tool_choice: 'auto',
    });

    const drafts: ToolCallDraft[] = [];
    let directContent = '';
    let finishReason: string | null = null;
    let usage: OpenAI.CompletionUsage | null = null;

    for await (const chunk of stream) {
      if (chunk.usage) usage = chunk.usage;

      const choice = chunk.choices[0];
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;

      // 툴을 안 쓰는 답변이면 여기로 토큰이 흘러나온다
      const text = choice.delta?.content ?? '';
      if (text) {
        directContent += text;
        sse.send({ text });
      }

      // 툴 인자는 JSON이라 완성 전엔 쓸 수 없다 — index별로 조각을 이어붙인다
      for (const fragment of choice.delta?.tool_calls ?? []) {
        const draft = (drafts[fragment.index] ??= {
          id: '',
          name: '',
          arguments: '',
        });
        if (fragment.id) draft.id = fragment.id;
        if (fragment.function?.name) draft.name += fragment.function.name;
        if (fragment.function?.arguments) {
          draft.arguments += fragment.function.arguments;
        }
      }
    }

    // drafts는 index를 첨자로 쓰는 희소 배열이라 [0]이 빌 수 있다
    const toolCall = drafts.find((draft) => draft?.name);

    if (finishReason === 'tool_calls' && toolCall) {
      const input = this.parseToolArguments(toolCall.arguments);
      const result = this.executeTool(toolCall.name, user);

      sse.send({ type: 'tool_call', name: toolCall.name, input, result });

      // 다이얼로그 전용 툴이라 채팅창엔 빈 메시지가 남는다 (프론트가 필터로 숨김)
      const assistantMessage = this.insertMessage(sessionId, 'assistant', '');
      sse.finish(assistantMessage);
    } else {
      // 본문은 위 루프에서 이미 전송됨 — 저장·종료만 한다
      const assistantMessage = this.insertMessage(
        sessionId,
        'assistant',
        directContent,
      );
      sse.finish(assistantMessage);
    }

    this.recordUsage(user, sessionId, model, usage);
  }

  /**
   * 툴 이름으로 실제 실행. GPT는 이름만 정하고 실행은 서버가 한다 —
   * user.id는 헤더 토큰에서만 나오는 값이라 GPT에게 맡길 수 없다.
   */
  private executeTool(name: string, user: ChatbotUser): Record<string, unknown> {
    if (name === 'get_my_tasks') {
      const tasks = this.db
        .select({
          id: tasksTable.id,
          title: tasksTable.title,
          status: tasksTable.status,
          priority: tasksTable.priority,
          taskType: tasksTable.taskType,
          dueDate: tasksTable.dueDate,
        })
        .from(tasksTable)
        .where(eq(tasksTable.assigneeId, user.id))
        .all();
      return { tasks };
    }
    return executeSelfIntroduce();
  }
}
