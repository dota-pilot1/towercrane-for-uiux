import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { tasksTable } from '../database/schema';
import { OPENAI_CLIENT } from './lib/openai.provider';
import { ChatbotSessionService } from './chatbot-session.service';
import { ChatbotUsageService } from './chatbot-usage.service';
import type { ChatbotUser, StreamContext, ToolCallDraft } from './chatbot.types';

/**
 * GPT에게 건네는 "메뉴판". 실행 코드는 안 보내고 이름과 설명만 보낸다 —
 * GPT는 이걸 읽고 쓸지 말지만 정하고, 실제 실행은 서버가 한다.
 *
 * description이 곧 코드다. tool_choice: 'auto' 라서 판단 근거가 이 문장뿐이라,
 * "단순 인사에는 절대 사용하지 않는다" 같은 문구를 빼면 "안녕"에도 발동한다.
 */
const SELF_INTRODUCE_TOOL: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'self_introduce',
    description:
      '사용자가 명시적으로 자기소개를 요청할 때만 사용한다. "자기소개해줘", "넌 누구야", "너에 대해 알려줘", "who are you" 처럼 AI의 정체나 소개를 직접 물을 때만 발동한다. 단순 인사("안녕", "hello")에는 절대 사용하지 않는다.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
};

const GET_MY_TASKS_TOOL: OpenAI.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_my_tasks',
    description:
      '현재 로그인한 사용자가 담당자로 지정된 업무 목록을 조회할 때 사용한다. "내 업무", "내 할일", "담당 업무", "나한테 배정된 업무" 같은 요청에 발동한다.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
};

function executeSelfIntroduce() {
  return {
    model: 'GPT-4o',
    developer: 'OpenAI',
    released: '2024년 5월',
    contextWindow: '128,000 tokens',
    knowledgeCutoff: '2024년 4월',
    languages: '100개 이상',
    capabilities: [
      '텍스트 생성',
      '이미지 이해',
      '코드 작성',
      '수학·논리 추론',
      '다국어 번역',
      '문서 요약',
    ],
    description:
      '세계 최고 수준의 멀티모달 AI 모델. 텍스트와 이미지를 동시에 이해하고, 복잡한 추론과 창의적 작업 모두 수행합니다.',
  };
}

/**
 * 도구 호출(Function Calling) 모드 — 화면 메뉴의 "도구 호출".
 *
 * 기본 채팅과 다른 건 요청에 tools 목록을 얹는 것뿐이고, 나머지 복잡함은
 * 전부 그 뒷처리다. GPT가 툴을 부르기로 하면 인자를 JSON으로 만들어 보내는데,
 * 그게 스트림에서 조각조각 와서 조립이 필요하다.
 */
@Injectable()
export class ChatbotToolsService {
  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI | null,
    private readonly databaseService: DatabaseService,
    private readonly sessionService: ChatbotSessionService,
    private readonly usageService: ChatbotUsageService,
  ) {}

  async stream(ctx: StreamContext) {
    const { sessionId, user, sse, messages, model } = ctx;

    const stream = await this.openai!.chat.completions.create({
      model,
      stream: true,
      stream_options: { include_usage: true },
      messages,
      tools: [SELF_INTRODUCE_TOOL, GET_MY_TASKS_TOOL],
      tool_choice: 'auto', // 쓸지 말지 GPT가 스스로 판단
    });

    const drafts: ToolCallDraft[] = [];
    let directContent = '';
    let finishReason: string | null = null;
    let usage: OpenAI.CompletionUsage | null = null;

    // 텍스트는 즉시 흘려보내고 툴 조각은 모으기만 한다.
    // 어느 쪽인지는 스트림이 끝나고 finish_reason이 확정돼야 알 수 있다.
    for await (const chunk of stream) {
      if (chunk.usage) usage = chunk.usage;

      const choice = chunk.choices[0];
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;

      const text = choice.delta?.content ?? '';
      if (text) {
        directContent += text;
        sse.send({ text });
      }

      // 툴 인자는 JSON이라 완성 전엔 파싱할 수 없다 — index별로 이어붙인다
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

    // drafts는 index를 첨자로 쓰는 희소 배열이라 [0]이 비어 있을 수 있다
    const toolCall = drafts.find((draft) => draft?.name);

    if (finishReason === 'tool_calls' && toolCall) {
      const input = this.parseArguments(toolCall.arguments);
      const result = this.execute(toolCall.name, user);

      sse.send({ type: 'tool_call', name: toolCall.name, input, result });

      // 결과는 다이얼로그로만 보여주므로 채팅창엔 빈 메시지가 남는다
      // (프론트가 content === '' 인 assistant 메시지를 필터로 숨긴다)
      const assistantMessage = this.sessionService.insertMessage(
        sessionId,
        'assistant',
        '',
      );
      sse.finish(assistantMessage);
    } else {
      // 툴을 안 썼다 — 본문은 위 루프에서 이미 전송됐고 저장·종료만 남았다
      const assistantMessage = this.sessionService.insertMessage(
        sessionId,
        'assistant',
        directContent,
      );
      sse.finish(assistantMessage);
    }

    this.usageService.record(user, sessionId, model, usage);
  }

  /**
   * 툴 이름으로 실제 실행. GPT는 이름만 정하고 실행은 서버가 한다 —
   * user.id는 헤더 토큰에서만 나오는 값이라 GPT에게 맡길 수 없다.
   */
  private execute(name: string, user: ChatbotUser): Record<string, unknown> {
    if (name === 'get_my_tasks') {
      const tasks = this.databaseService.db
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

  /** 조립된 인자는 LLM이 만든 JSON 문자열 — 깨져 있어도 스트림을 죽이지 않는다 */
  private parseArguments(raw: string): Record<string, unknown> {
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
