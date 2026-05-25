import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AiMonitoringService {
  private openai: OpenAI | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  getSummary() {
    const sqlite = this.db['sqlite'] as import('better-sqlite3').Database;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthIso = monthStart.toISOString();

    const today = sqlite
      .prepare(
        `SELECT COUNT(*) as calls, COALESCE(SUM(total_tokens),0) as tokens, COALESCE(SUM(estimated_cost_usd),0) as cost
         FROM usage_logs WHERE created_at >= ?`,
      )
      .get(todayIso) as { calls: number; tokens: number; cost: number };

    const month = sqlite
      .prepare(
        `SELECT COUNT(*) as calls, COALESCE(SUM(total_tokens),0) as tokens, COALESCE(SUM(estimated_cost_usd),0) as cost
         FROM usage_logs WHERE created_at >= ?`,
      )
      .get(monthIso) as { calls: number; tokens: number; cost: number };

    const total = sqlite
      .prepare(
        `SELECT COUNT(*) as calls, COALESCE(SUM(total_tokens),0) as tokens, COALESCE(SUM(estimated_cost_usd),0) as cost
         FROM usage_logs`,
      )
      .get() as { calls: number; tokens: number; cost: number };

    return { today, month, total };
  }

  getByUser() {
    const sqlite = this.db['sqlite'] as import('better-sqlite3').Database;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthIso = monthStart.toISOString();

    const rows = sqlite
      .prepare(
        `SELECT
           user_id as userId,
           user_name as userName,
           COUNT(*) as calls,
           COALESCE(SUM(prompt_tokens), 0) as promptTokens,
           COALESCE(SUM(completion_tokens), 0) as completionTokens,
           COALESCE(SUM(total_tokens), 0) as totalTokens,
           COALESCE(SUM(estimated_cost_usd), 0) as estimatedCostUsd,
           MAX(created_at) as lastUsedAt
         FROM usage_logs
         WHERE created_at >= ?
         GROUP BY user_id
         ORDER BY totalTokens DESC`,
      )
      .all(monthIso) as {
      userId: string;
      userName: string;
      calls: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      lastUsedAt: string;
    }[];

    return rows;
  }

  getByDay(days = 30) {
    const sqlite = this.db['sqlite'] as import('better-sqlite3').Database;

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    const rows = sqlite
      .prepare(
        `SELECT
           substr(created_at, 1, 10) as date,
           COUNT(*) as calls,
           COALESCE(SUM(total_tokens), 0) as totalTokens,
           COALESCE(SUM(estimated_cost_usd), 0) as estimatedCostUsd
         FROM usage_logs
         WHERE created_at >= ?
         GROUP BY date
         ORDER BY date ASC`,
      )
      .all(sinceIso) as {
      date: string;
      calls: number;
      totalTokens: number;
      estimatedCostUsd: number;
    }[];

    return rows;
  }

  async getModels() {
    if (!this.openai) return { models: [], error: 'API key not configured' };
    try {
      const list = await this.openai.models.list();
      const gptModels = list.data
        .filter((m) => m.id.startsWith('gpt') || m.id.startsWith('o1') || m.id.startsWith('o3') || m.id.startsWith('o4'))
        .sort((a, b) => b.created - a.created)
        .slice(0, 20)
        .map((m) => ({ id: m.id, created: m.created, ownedBy: m.owned_by }));
      return { models: gptModels };
    } catch (e) {
      return { models: [], error: String(e) };
    }
  }
}
