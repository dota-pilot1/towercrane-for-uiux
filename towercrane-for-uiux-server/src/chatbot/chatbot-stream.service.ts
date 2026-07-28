import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { Response } from 'express';
import { OPENAI_CLIENT } from './lib/openai.provider';
import { createSse } from './lib/sse';
import { ChatbotSessionService } from './chatbot-session.service';
import { ChatbotToolsService } from './chatbot-tools.service';
import { ChatbotUsageService } from './chatbot-usage.service';
import type {
  ChatbotUser,
  StreamBase,
  StreamContext,
  StreamOptions,
} from './chatbot.types';

const CHATBOT_SYSTEM_PROMPT = `당신은 친절하고 실용적인 AI 어시스턴트입니다.

답변은 Markdown으로 작성합니다.
- 긴 답변은 2~4문장 단위의 짧은 문단으로 나눕니다.
- 비교, 절차, 요약은 목록이나 표를 사용합니다.
- 코드, 명령어, 파일명, API 이름은 backtick으로 감쌉니다.
- 코드 예시는 fenced code block을 사용하고 가능한 경우 언어명을 붙입니다.
- 불필요한 장문 서론은 피하고 바로 핵심부터 답합니다.

사용자가 HTML을 요청하지 않는 한 raw HTML은 출력하지 않습니다.`;

/**
 * 챗봇 응답의 진입점이자 조합 담당.
 *
 * URL → 메서드 → 처리:
 *   POST /chatbot/stream            streamPlain      기본 채팅 · 스트리밍 · 파일 첨부
 *   POST /chatbot/stream/tools      streamTools      도구 호출 → ChatbotToolsService
 *
 * 권한 검사·질문 저장·히스토리 조립은 셋이 100% 같아서 prepareStream이 한 번만
 * 하고, 시스템 프롬프트부터 각자 얹는다. prepareStream은 모드를 모른다.
 */
@Injectable()
export class ChatbotStreamService {
  constructor(
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI | null,
    private readonly configService: ConfigService,
    private readonly sessionService: ChatbotSessionService,
    private readonly toolsService: ChatbotToolsService,
    private readonly usageService: ChatbotUsageService,
  ) {}

  /** POST /chatbot/stream — 기본 채팅 · 스트리밍 응답 · 파일 첨부 */
  async streamPlain(
    sessionId: string,
    message: string,
    user: ChatbotUser,
    res: Response,
    options: StreamOptions = {},
  ) {
    this.assertOpenAi();
    const base = this.prepareStream(sessionId, message, user, res, options);
    return this.runPlain(this.withSystemPrompt(base));
  }

  /** POST /chatbot/stream/tools — 도구 호출(Function Calling) */
  async streamTools(
    sessionId: string,
    message: string,
    user: ChatbotUser,
    res: Response,
    options: StreamOptions = {},
  ) {
    this.assertOpenAi();
    const base = this.prepareStream(sessionId, message, user, res, options);
    return this.toolsService.stream(this.withSystemPrompt(base));
  }

  private withSystemPrompt(base: StreamBase): StreamContext {
    return {
      ...base,
      messages: [
        { role: 'system', content: CHATBOT_SYSTEM_PROMPT },
        ...base.conversation,
      ],
    };
  }

  private assertOpenAi() {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        'OpenAI API key is not configured.',
      );
    }
  }

  /**
   * 스트리밍 모드의 공통 준비 — 권한 검사 → 질문 저장 → meta 전송 → 대화 내역 조립.
   * 모드를 모른다. 시스템 프롬프트는 호출한 쪽이 알아서 앞에 붙인다.
   */
  private prepareStream(
    sessionId: string,
    message: string,
    user: ChatbotUser,
    res: Response,
    options: StreamOptions,
  ): StreamBase {
    const fileUrls = options.fileUrls ?? [];
    const sse = createSse(res);

    // body의 sessionId는 사용자가 조작할 수 있다 — 헤더 토큰의 user.id로 대조한다
    this.sessionService.assertOwnership(sessionId, user.id);
    const meta = this.sessionService.touchSession(
      sessionId,
      message || '파일 첨부',
    );
    const userMessage = this.sessionService.insertMessage(
      sessionId,
      'user',
      message,
      fileUrls,
    );

    // 프론트가 임시 id를 진짜 DB id로 바꿔치우게 해준다
    sse.send({ type: 'meta', userMessage, sessionTitle: meta.title });

    // GPT는 이전 대화를 기억하지 못한다 — 매번 DB에서 읽어 통째로 넣어준다
    const history = this.sessionService.buildHistory(sessionId);

    return {
      sessionId,
      user,
      sse,
      model: this.pickModel(fileUrls),
      conversation: [
        // 마지막은 방금 insert한 이번 질문 → 이미지가 붙은 content로 교체한다
        ...history.slice(0, -1),
        {
          role: 'user',
          content: this.sessionService.buildUserContent(message, fileUrls),
        },
      ],
    };
  }

  /** 기본 채팅 — 토큰을 도착하는 즉시 흘려보낸다 */
  private async runPlain(ctx: StreamContext) {
    const { sessionId, user, sse, messages, model } = ctx;

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
        sse.send({ type: 'text', text }); // 동시에 화면으로 흘려보낸다
      }
    }

    const assistantMessage = this.sessionService.insertMessage(
      sessionId,
      'assistant',
      assistantContent,
    );
    sse.finish(assistantMessage);
    this.usageService.record(user, sessionId, model, usage);
  }

  /** 이미지가 붙으면 vision 지원 모델로 강제한다 */
  private pickModel(fileUrls: string[]) {
    const hasImage = fileUrls.some((url) =>
      /\.(jpg|jpeg|png|gif|webp)/i.test(url.split('?')[0]),
    );
    if (hasImage) return 'gpt-4o-mini';
    return (
      this.configService.get<string>('OPENAI_DEFAULT_MODEL') ?? 'gpt-4o-mini'
    );
  }
}
