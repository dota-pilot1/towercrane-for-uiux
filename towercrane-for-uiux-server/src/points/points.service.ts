import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  pointAccountsTable,
  pointTopupsTable,
  pointTransactionsTable,
} from '../database/schema';

const MAX_TOPUP = 1_000_000; // 1회 충전 한도

@Injectable()
export class PointsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  private ensureAccount(userId: string, now: string): number {
    const account = this.db
      .select()
      .from(pointAccountsTable)
      .where(eq(pointAccountsTable.userId, userId))
      .get();

    if (!account) {
      this.db
        .insert(pointAccountsTable)
        .values({ userId, balance: 0, updatedAt: now })
        .run();
      return 0;
    }
    return account.balance;
  }

  getWallet(userId: string) {
    const now = new Date().toISOString();
    const balance = this.ensureAccount(userId, now);
    const transactions = this.db
      .select()
      .from(pointTransactionsTable)
      .where(eq(pointTransactionsTable.userId, userId))
      .orderBy(desc(pointTransactionsTable.createdAt))
      .limit(30)
      .all();
    return { balance, transactions };
  }

  // 모의 충전 — 외부 PG 없이 즉시 적립 (1포인트 = 1원)
  topup(userId: string, payload: unknown) {
    const amount = this.parseAmount(payload);
    const now = new Date().toISOString();
    const current = this.ensureAccount(userId, now);
    const next = current + amount;

    const topupId = randomUUID();
    this.db
      .insert(pointTopupsTable)
      .values({
        id: topupId,
        userId,
        amountKrw: amount,
        points: amount,
        status: 'paid',
        provider: 'mock',
        providerTxId: `mock_${topupId}`,
        createdAt: now,
        paidAt: now,
      })
      .run();

    this.db
      .update(pointAccountsTable)
      .set({ balance: next, updatedAt: now })
      .where(eq(pointAccountsTable.userId, userId))
      .run();

    this.db
      .insert(pointTransactionsTable)
      .values({
        id: randomUUID(),
        userId,
        type: 'topup',
        amount,
        balanceAfter: next,
        refType: 'topup',
        refId: topupId,
        memo: `${amount.toLocaleString('ko-KR')}P 충전 (모의 결제)`,
        createdAt: now,
      })
      .run();

    return { balance: next, topupId };
  }

  private parseAmount(payload: unknown): number {
    const raw = (payload as { amount?: unknown })?.amount;
    const amount = Number(raw);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('충전 금액이 올바르지 않습니다.');
    }
    if (amount > MAX_TOPUP) {
      throw new BadRequestException('1회 충전 한도(1,000,000P)를 초과했습니다.');
    }
    return amount;
  }
}
