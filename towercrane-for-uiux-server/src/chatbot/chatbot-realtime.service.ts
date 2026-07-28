import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { tasksTable } from '../database/schema';
import type {
  ChatbotUser,
  RealtimeSessionRequest,
  RealtimeToolDefinition,
  RealtimeToolExecuteRequest,
} from './chatbot.types';

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
];

/**
 * 실시간 음성 모드 — 화면 메뉴의 "실시간 음성".
 *
 * 다른 모드와 달리 SSE를 쓰지 않는다. 브라우저가 OpenAI Realtime API에
 * 직접 WebRTC로 붙고, 서버는 그 연결에 쓸 단기 토큰(client secret)만 발급한다.
 * 그래서 streamGpt 계열과 코드를 공유하지 않는다.
 */
@Injectable()
export class ChatbotRealtimeService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  private get db() {
    return this.databaseService.db;
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
    return createHash('sha256').update(`towercrane:${userId}`).digest('hex');
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
      responseMode === 'text_only' ? ['text'] : ['audio'];

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

    throw new BadRequestException(`unsupported realtime tool: ${name}`);
  }
}
