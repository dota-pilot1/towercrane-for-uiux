import { Injectable } from '@nestjs/common';
import type OpenAI from 'openai';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';
import type { KnowledgeChannel } from '../database/schema';
import type { ChatbotUser, KnowledgeSource } from './chatbot.types';
import type { createSse } from './lib/sse';

const KNOWLEDGE_SYSTEM_PROMPT_HEADER = `당신은 농협 사내 AX 지식 검색 챗봇입니다.
- 제공된 사내 지식 문서만 근거로 답변합니다.
- 문서에 없는 정책, 날짜, 담당자, 비용, 절차는 만들지 않습니다.
- 근거가 부족하면 "제공된 문서에서 확인되지 않습니다"라고 명확히 말합니다.
- 공지사항은 적용일, 만료일, 중요도처럼 날짜와 상태를 분명히 표시합니다.
- FAQ는 사용자가 바로 실행할 수 있게 짧고 확정적으로 답합니다.
- 답변 마지막에는 "참고 문서" 섹션을 만들고 사용한 문서 제목을 나열합니다.`;

/**
 * 지식 검색(RAG) 모드 — 화면 메뉴의 "지식 검색".
 *
 * 일반 챗봇은 GPT가 학습한 지식으로 답하지만, 이 모드는 사내 문서를 검색해
 * 프롬프트에 통째로 넣고 "이것만 근거로 답하라"고 지시한다. GPT가 사내 규정을
 * 지어내는 걸 막는 게 목적이다.
 */
@Injectable()
export class ChatbotKnowledgeService {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  /**
   * 문서를 찾아 프론트에 알리고, 그 문서를 근거로만 답하도록 시스템 프롬프트를 짠다.
   * 반환값은 prepareStream이 messages 앞에 그대로 펼쳐 넣는다.
   */
  prepare(
    message: string,
    user: ChatbotUser,
    channels: KnowledgeChannel[] | undefined,
    sse: ReturnType<typeof createSse>,
    baseSystemPrompt: string,
  ) {
    const sources = this.search(message, user, channels);

    // 화면 오른쪽 "참고 문서" 패널용 — 답변보다 먼저 보낸다
    sse.send({ type: 'knowledge_sources', items: sources });

    return {
      sources,
      systemPrompts: [
        {
          role: 'system',
          content: `${baseSystemPrompt}\n\n${KNOWLEDGE_SYSTEM_PROMPT_HEADER}`,
        },
        { role: 'system', content: this.buildContext(sources) },
      ] as OpenAI.ChatCompletionMessageParam[],
    };
  }

  search(
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

  /** 검색된 문서를 GPT가 읽을 수 있는 한 덩어리 텍스트로 만든다 */
  private buildContext(sources: KnowledgeSource[]) {
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
}
