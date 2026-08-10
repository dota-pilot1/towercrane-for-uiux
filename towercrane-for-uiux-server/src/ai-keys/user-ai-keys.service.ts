import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { userAiKeysTable } from '../database/schema';
import { decryptAiKey, encryptAiKey } from './ai-key-crypto';
import type { AiProvider, SaveAiKeyInput } from './user-ai-keys.schemas';

@Injectable()
export class UserAiKeysService {
  constructor(
    private readonly database: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  list(userId: string) {
    return this.database.db
      .select({ provider: userAiKeysTable.provider, keyHint: userAiKeysTable.keyHint, updatedAt: userAiKeysTable.updatedAt })
      .from(userAiKeysTable)
      .where(eq(userAiKeysTable.userId, userId))
      .all()
      .map((row) => ({ ...row, configured: true }));
  }

  save(userId: string, provider: AiProvider, input: SaveAiKeyInput) {
    const now = new Date().toISOString();
    const encrypted = encryptAiKey(input.apiKey);
    const keyHint = this.makeKeyHint(input.apiKey);
    const existing = this.database.db
      .select({ id: userAiKeysTable.id })
      .from(userAiKeysTable)
      .where(and(eq(userAiKeysTable.userId, userId), eq(userAiKeysTable.provider, provider)))
      .get();

    if (existing) {
      this.database.db.update(userAiKeysTable).set({ ...encrypted, keyHint, updatedAt: now }).where(eq(userAiKeysTable.id, existing.id)).run();
    } else {
      this.database.db.insert(userAiKeysTable).values({ id: `user-ai-key-${randomUUID().slice(0, 12)}`, userId, provider, ...encrypted, keyHint, createdAt: now, updatedAt: now }).run();
    }
    return { provider, configured: true, keyHint, updatedAt: now };
  }

  remove(userId: string, provider: AiProvider) {
    this.database.db.delete(userAiKeysTable).where(and(eq(userAiKeysTable.userId, userId), eq(userAiKeysTable.provider, provider))).run();
    return { success: true };
  }

  async test(userId: string, provider: AiProvider) {
    const client = this.getClient(userId, provider);
    if (!client) throw new ServiceUnavailableException('등록된 API 키가 없습니다.');
    await client.models.list();
    return { success: true, provider };
  }

  getClient(userId: string, provider: AiProvider) {
    const row = this.database.db
      .select()
      .from(userAiKeysTable)
      .where(and(eq(userAiKeysTable.userId, userId), eq(userAiKeysTable.provider, provider)))
      .get();
    if (row) {
      try {
        return new OpenAI({ apiKey: decryptAiKey(row), timeout: 60_000 });
      } catch {
        throw new ServiceUnavailableException('사용자 API 키를 복호화할 수 없습니다. 서버 암호화 설정을 확인해 주세요.');
      }
    }
    const fallback = provider === 'openai' ? this.configService.get<string>('OPENAI_API_KEY') : undefined;
    return fallback ? new OpenAI({ apiKey: fallback, timeout: 60_000 }) : null;
  }

  private makeKeyHint(value: string) {
    return value.length > 8 ? `${value.slice(0, 4)}...${value.slice(-4)}` : '등록된 키';
  }
}
