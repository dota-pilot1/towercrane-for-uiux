import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  pointAccountsTable,
  pointTopupsTable,
  pointTransactionsTable,
} from '../database/schema';

const MAX_TOPUP = 1_000_000; // 모의 충전 한도
// PortOne 실결제 충전 한도 — 지인 소액 테스트 단계라 1,000원으로 제한
const MIN_TOPUP_KRW = 100;
const MAX_TOPUP_KRW = 1_000;
const PORTONE_API_BASE = 'https://api.portone.io';

type PortOnePayment = {
  status?: string;
  amount?: { total?: number };
  currency?: string;
};

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

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
    const topups = this.db
      .select()
      .from(pointTopupsTable)
      .where(eq(pointTopupsTable.userId, userId))
      .orderBy(desc(pointTopupsTable.createdAt))
      .limit(30)
      .all();
    return { balance, transactions, topups };
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

  // PortOne(카카오페이) 실결제 검증 후 적립.
  // 프론트가 보낸 paymentId를 신뢰하지 않고 서버가 PortOne API로 직접 조회한다.
  async confirmTopup(
    userId: string,
    payload: unknown,
  ): Promise<{
    balance: number;
    topupId: string;
    alreadyProcessed: boolean;
  }> {
    const paymentId = this.parsePaymentId(payload);

    // 1) 멱등: 이미 적립된 결제건이면 현재 잔액만 돌려준다.
    const existing = this.db
      .select()
      .from(pointTopupsTable)
      .where(
        and(
          eq(pointTopupsTable.provider, 'portone'),
          eq(pointTopupsTable.providerTxId, paymentId),
        ),
      )
      .get();
    if (existing) {
      const balance = this.ensureAccount(userId, new Date().toISOString());
      return { balance, topupId: existing.id, alreadyProcessed: true };
    }

    // 2) PortOne API로 실제 결제 상태/금액 조회
    const payment = await this.fetchPortOnePayment(paymentId);

    if (payment.status !== 'PAID') {
      throw new BadRequestException(
        `결제가 완료되지 않았습니다. (상태: ${payment.status ?? '알 수 없음'})`,
      );
    }
    if (payment.currency && payment.currency !== 'KRW') {
      throw new BadRequestException('원화(KRW) 결제만 지원합니다.');
    }

    const paidKrw = Number(payment.amount?.total);
    if (!Number.isInteger(paidKrw) || paidKrw <= 0) {
      throw new BadRequestException('결제 금액을 확인할 수 없습니다.');
    }
    if (paidKrw < MIN_TOPUP_KRW || paidKrw > MAX_TOPUP_KRW) {
      throw new BadRequestException(
        `충전 금액은 ${MIN_TOPUP_KRW.toLocaleString('ko-KR')}~${MAX_TOPUP_KRW.toLocaleString('ko-KR')}원 사이여야 합니다.`,
      );
    }

    // 3) 적립 (1원 = 1P). DB 검증 금액을 단일 진실 소스로 사용.
    const points = paidKrw;
    const now = new Date().toISOString();
    const current = this.ensureAccount(userId, now);
    const next = current + points;
    const topupId = randomUUID();

    try {
      this.db
        .insert(pointTopupsTable)
        .values({
          id: topupId,
          userId,
          amountKrw: paidKrw,
          points,
          status: 'paid',
          provider: 'portone',
          providerTxId: paymentId,
          createdAt: now,
          paidAt: now,
        })
        .run();
    } catch (error) {
      // unique 인덱스 충돌 = 동시 요청으로 이미 적립됨 → 멱등 처리
      if (this.isUniqueConflict(error)) {
        const balance = this.ensureAccount(userId, new Date().toISOString());
        return { balance, topupId, alreadyProcessed: true };
      }
      throw error;
    }

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
        amount: points,
        balanceAfter: next,
        refType: 'topup',
        refId: topupId,
        memo: `${points.toLocaleString('ko-KR')}P 충전 (카카오페이)`,
        createdAt: now,
      })
      .run();

    return { balance: next, topupId, alreadyProcessed: false };
  }

  // 충전 취소(환불) — 전액 환불만. 미사용분이 남아있어야(잔액 ≥ 충전 포인트) 가능.
  async refundTopup(
    userId: string,
    payload: unknown,
  ): Promise<{
    balance: number;
    refunded: number;
  }> {
    const topupId = this.parseTopupId(payload);

    const topup = this.db
      .select()
      .from(pointTopupsTable)
      .where(
        and(
          eq(pointTopupsTable.id, topupId),
          eq(pointTopupsTable.userId, userId),
        ),
      )
      .get();

    if (!topup) {
      throw new BadRequestException('충전 내역을 찾을 수 없습니다.');
    }
    if (topup.provider !== 'portone' || !topup.providerTxId) {
      throw new BadRequestException('실결제 충전 건만 취소할 수 있습니다.');
    }
    if (topup.status !== 'paid') {
      throw new BadRequestException(
        '이미 취소되었거나 취소할 수 없는 결제입니다.',
      );
    }

    const now = new Date().toISOString();
    const current = this.ensureAccount(userId, now);
    if (current < topup.points) {
      throw new BadRequestException(
        '이미 사용한 포인트가 있어 전액 환불할 수 없습니다.',
      );
    }

    // 동시 요청/더블클릭 방지: PortOne 호출 전에 상태를 선점한다.
    const claimed = this.db
      .update(pointTopupsTable)
      .set({ status: 'cancelling' })
      .where(
        and(
          eq(pointTopupsTable.id, topupId),
          eq(pointTopupsTable.status, 'paid'),
        ),
      )
      .run();
    if (claimed.changes === 0) {
      throw new BadRequestException('이미 취소 처리 중인 결제입니다.');
    }

    try {
      await this.cancelPortOnePayment(topup.providerTxId, '사용자 충전 취소');
    } catch (error) {
      // PortOne 취소 실패 → 상태 원복
      this.db
        .update(pointTopupsTable)
        .set({ status: 'paid' })
        .where(eq(pointTopupsTable.id, topupId))
        .run();
      throw error;
    }

    const next = current - topup.points;
    this.db
      .update(pointTopupsTable)
      .set({ status: 'cancelled' })
      .where(eq(pointTopupsTable.id, topupId))
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
        type: 'refund',
        amount: -topup.points,
        balanceAfter: next,
        refType: 'topup',
        refId: topupId,
        memo: `${topup.points.toLocaleString('ko-KR')}P 충전 취소 (카카오페이 환불)`,
        createdAt: now,
      })
      .run();

    return { balance: next, refunded: topup.points };
  }

  private async cancelPortOnePayment(
    paymentId: string,
    reason: string,
  ): Promise<void> {
    const apiSecret = this.configService.get<string>('PORTONE_API_SECRET');
    if (!apiSecret) {
      this.logger.error('PORTONE_API_SECRET 가 설정되지 않았습니다.');
      throw new BadRequestException('결제 취소 설정이 누락되었습니다.');
    }

    let response: Response;
    try {
      response = await fetch(
        `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `PortOne ${apiSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        },
      );
    } catch (error) {
      this.logger.error(`PortOne 결제 취소 실패: ${String(error)}`);
      throw new BadRequestException('결제 취소 중 오류가 발생했습니다.');
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(
        `PortOne 결제 취소 응답 오류 ${response.status}: ${text}`,
      );
      throw new BadRequestException('결제 취소에 실패했습니다.');
    }
  }

  private parseTopupId(payload: unknown): string {
    const raw = (payload as { topupId?: unknown })?.topupId;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      throw new BadRequestException('충전 식별자(topupId)가 필요합니다.');
    }
    return raw.trim();
  }

  private async fetchPortOnePayment(
    paymentId: string,
  ): Promise<PortOnePayment> {
    const apiSecret = this.configService.get<string>('PORTONE_API_SECRET');
    if (!apiSecret) {
      this.logger.error('PORTONE_API_SECRET 가 설정되지 않았습니다.');
      throw new BadRequestException('결제 검증 설정이 누락되었습니다.');
    }

    let response: Response;
    try {
      response = await fetch(
        `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`,
        { headers: { Authorization: `PortOne ${apiSecret}` } },
      );
    } catch (error) {
      this.logger.error(`PortOne 결제 조회 실패: ${String(error)}`);
      throw new BadRequestException('결제 검증 중 오류가 발생했습니다.');
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(
        `PortOne 결제 조회 응답 오류 ${response.status}: ${text}`,
      );
      throw new BadRequestException('결제 정보를 확인할 수 없습니다.');
    }

    return (await response.json()) as PortOnePayment;
  }

  private parsePaymentId(payload: unknown): string {
    const raw = (payload as { paymentId?: unknown })?.paymentId;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      throw new BadRequestException('결제 식별자(paymentId)가 필요합니다.');
    }
    return raw.trim();
  }

  private isUniqueConflict(error: unknown): boolean {
    const message = (error as { message?: string })?.message ?? '';
    return message.includes('UNIQUE');
  }

  private parseAmount(payload: unknown): number {
    const raw = (payload as { amount?: unknown })?.amount;
    const amount = Number(raw);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('충전 금액이 올바르지 않습니다.');
    }
    if (amount > MAX_TOPUP) {
      throw new BadRequestException(
        '1회 충전 한도(1,000,000P)를 초과했습니다.',
      );
    }
    return amount;
  }
}
