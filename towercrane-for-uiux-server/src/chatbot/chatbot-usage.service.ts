import { Injectable } from '@nestjs/common';
import type OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { usageLogsTable } from '../database/schema';
import type { ChatbotUser } from './chatbot.types';

const COST_PER_1K: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o': { prompt: 0.005, completion: 0.015 },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'gpt-4.1': { prompt: 0.002, completion: 0.008 },
  'gpt-4.1-mini': { prompt: 0.0004, completion: 0.0016 },
  'gpt-4.1-nano': { prompt: 0.0001, completion: 0.0004 },
};

const FALLBACK_RATE = COST_PER_1K['gpt-4o-mini'];

/** 누가 토큰을 얼마나 썼는지 기록한다. */
@Injectable()
export class ChatbotUsageService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * 스트리밍 응답에는 usage 객체가 없다. 마지막 청크에 따로 실려오는데
   * 그것도 stream_options: { include_usage: true } 를 보내야만 온다 —
   * 안 보내면 예외 없이 조용히 null이라 비용 로그가 통째로 사라진다.
   */
  record(
    user: ChatbotUser,
    sessionId: string,
    model: string,
    usage: OpenAI.CompletionUsage | null,
  ) {
    if (!usage) return;

    const rate = COST_PER_1K[model] ?? FALLBACK_RATE;
    const estimatedCostUsd =
      (usage.prompt_tokens / 1000) * rate.prompt +
      (usage.completion_tokens / 1000) * rate.completion;

    this.databaseService.db
      .insert(usageLogsTable)
      .values({
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
      })
      .run();
  }
}
