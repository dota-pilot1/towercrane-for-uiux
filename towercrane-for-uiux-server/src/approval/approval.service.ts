import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DatabaseService } from '../database/database.service';
import {
  approvalRequestsTable,
  approvalStepsTable,
  usersTable,
  type ApprovalStatus,
} from '../database/schema';
import {
  createApprovalSchema,
  actApprovalSchema,
  type CreateApprovalInput,
  type ActApprovalInput,
  type ApprovalMeta,
} from './approval.schemas';

export type ApprovalUser = {
  id: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class ApprovalService {
  constructor(private readonly db: DatabaseService) {}

  private now() {
    return new Date().toISOString();
  }

  /** zod 검증 실패를 400(BadRequest)으로 변환 — 프론트에 읽을 수 있는 메시지 전달 */
  private parseOrThrow<T>(schema: z.ZodType<T>, body: unknown): T {
    const result = schema.safeParse(body);
    if (!result.success) {
      const msg = result.error.issues
        .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
        .join('\n');
      throw new BadRequestException(msg || '입력값이 올바르지 않습니다.');
    }
    return result.data;
  }

  /** 결재 요청에 steps를 붙여서 반환 */
  private async buildResponse(requestId: string) {
    const req = this.db.db
      .select()
      .from(approvalRequestsTable)
      .where(eq(approvalRequestsTable.id, requestId))
      .get();
    if (!req) throw new NotFoundException('결재 요청을 찾을 수 없습니다.');

    const submitter = this.db.db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, req.submitterId))
      .get();

    const steps = this.db.db
      .select()
      .from(approvalStepsTable)
      .where(eq(approvalStepsTable.requestId, requestId))
      .all()
      .sort((a, b) => a.order - b.order);

    const stepResults = await Promise.all(
      steps.map(async (step) => {
        const approver = this.db.db
          .select({ name: usersTable.name, position: usersTable.position })
          .from(usersTable)
          .where(eq(usersTable.id, step.approverId))
          .get();
        return {
          id: step.id,
          order: step.order,
          approverId: step.approverId,
          approverName: approver?.name ?? step.approverId,
          approverPosition: approver?.position ?? null,
          status: step.status,
          comment: step.comment ?? null,
          actedAt: step.actedAt ?? null,
        };
      }),
    );

    let meta: ApprovalMeta | null = null;
    if (req.meta) {
      try {
        meta = JSON.parse(req.meta) as ApprovalMeta;
      } catch {
        meta = null;
      }
    }

    return {
      id: req.id,
      title: req.title,
      content: req.content,
      category: req.category,
      status: req.status,
      meta,
      submitterId: req.submitterId,
      submitterName: submitter?.name ?? req.submitterId,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      steps: stepResults,
    };
  }

  /** 결재 상신 */
  async submit(user: ApprovalUser, body: unknown) {
    const input: CreateApprovalInput = this.parseOrThrow(createApprovalSchema, body);
    const now = this.now();
    const requestId = randomUUID();

    this.db.db.insert(approvalRequestsTable).values({
      id: requestId,
      title: input.title,
      content: input.content,
      category: input.category,
      status: 'PENDING',
      meta: input.meta ? JSON.stringify(input.meta) : null,
      submitterId: user.id,
      createdAt: now,
      updatedAt: now,
    }).run();

    for (let i = 0; i < input.approverIds.length; i++) {
      const approverId = input.approverIds[i];
      const approver = this.db.db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, approverId))
        .get();
      if (!approver) {
        throw new BadRequestException(`결재자 ID "${approverId}"를 찾을 수 없습니다.`);
      }
      this.db.db.insert(approvalStepsTable).values({
        id: randomUUID(),
        requestId,
        order: i,
        approverId,
        status: i === 0 ? 'PENDING' : 'PENDING',
        createdAt: now,
      }).run();
    }

    return this.buildResponse(requestId);
  }

  /** 받은함 — 내가 결재해야 할 항목 (현재 단계가 나인 것) */
  async getInbox(user: ApprovalUser) {
    // 내가 결재자로 포함된 step 중 status=PENDING인 것
    const mySteps = this.db.db
      .select()
      .from(approvalStepsTable)
      .where(
        and(
          eq(approvalStepsTable.approverId, user.id),
          eq(approvalStepsTable.status, 'PENDING' as ApprovalStatus),
        ),
      )
      .all();

    const results: Awaited<ReturnType<typeof this.buildResponse>>[] = [];
    for (const step of mySteps) {
      // 요청 자체가 아직 PENDING이고, 이 step이 현재 순서인지 확인
      const req = this.db.db
        .select()
        .from(approvalRequestsTable)
        .where(
          and(
            eq(approvalRequestsTable.id, step.requestId),
            eq(approvalRequestsTable.status, 'PENDING' as ApprovalStatus),
          ),
        )
        .get();
      if (!req) continue;

      // 이 step 이전 단계가 모두 승인되었는지 확인
      const prevSteps = this.db.db
        .select()
        .from(approvalStepsTable)
        .where(eq(approvalStepsTable.requestId, step.requestId))
        .all()
        .filter((s) => s.order < step.order);

      const allPrevApproved = prevSteps.every((s) => s.status === 'APPROVED');
      if (!allPrevApproved) continue;

      results.push(await this.buildResponse(step.requestId));
    }

    // 이미 처리한 것들도 포함 (처리 완료 받은함)
    const processedSteps = this.db.db
      .select()
      .from(approvalStepsTable)
      .where(eq(approvalStepsTable.approverId, user.id))
      .all()
      .filter((s) => s.status === 'APPROVED' || s.status === 'REJECTED');

    for (const step of processedSteps) {
      const already = results.find((r) => r.id === step.requestId);
      if (already) continue;
      results.push(await this.buildResponse(step.requestId));
    }

    return results;
  }

  /** 보낸함 — 내가 상신한 항목 */
  async getSent(user: ApprovalUser) {
    const requests = this.db.db
      .select()
      .from(approvalRequestsTable)
      .where(eq(approvalRequestsTable.submitterId, user.id))
      .orderBy(desc(approvalRequestsTable.createdAt))
      .all();

    return Promise.all(requests.map((r) => this.buildResponse(r.id)));
  }

  /** 결재 처리 (승인 / 반려) */
  async act(user: ApprovalUser, requestId: string, body: unknown) {
    const input: ActApprovalInput = this.parseOrThrow(actApprovalSchema, body);
    const now = this.now();

    const req = this.db.db
      .select()
      .from(approvalRequestsTable)
      .where(eq(approvalRequestsTable.id, requestId))
      .get();
    if (!req) throw new NotFoundException('결재 요청을 찾을 수 없습니다.');
    if (req.status !== 'PENDING') {
      throw new BadRequestException('이미 처리된 결재 요청입니다.');
    }

    // 현재 내가 처리해야 할 step 찾기
    const steps = this.db.db
      .select()
      .from(approvalStepsTable)
      .where(eq(approvalStepsTable.requestId, requestId))
      .all()
      .sort((a, b) => a.order - b.order);

    const myStep = steps.find(
      (s) => s.approverId === user.id && s.status === 'PENDING',
    );
    if (!myStep) throw new ForbiddenException('처리할 결재 단계가 없습니다.');

    // 이전 단계 모두 승인 확인
    const prevApproved = steps
      .filter((s) => s.order < myStep.order)
      .every((s) => s.status === 'APPROVED');
    if (!prevApproved) {
      throw new BadRequestException('이전 결재자가 아직 처리하지 않았습니다.');
    }

    // step 처리
    this.db.db
      .update(approvalStepsTable)
      .set({ status: input.action, comment: input.comment || null, actedAt: now })
      .where(eq(approvalStepsTable.id, myStep.id))
      .run();

    // 반려면 전체 요청도 REJECTED
    if (input.action === 'REJECTED') {
      this.db.db
        .update(approvalRequestsTable)
        .set({ status: 'REJECTED', updatedAt: now })
        .where(eq(approvalRequestsTable.id, requestId))
        .run();
    } else {
      // 승인 — 다음 step이 없으면 최종 APPROVED
      const nextStep = steps.find((s) => s.order === myStep.order + 1);
      if (!nextStep) {
        this.db.db
          .update(approvalRequestsTable)
          .set({ status: 'APPROVED', updatedAt: now })
          .where(eq(approvalRequestsTable.id, requestId))
          .run();
      } else {
        this.db.db
          .update(approvalRequestsTable)
          .set({ updatedAt: now })
          .where(eq(approvalRequestsTable.id, requestId))
          .run();
      }
    }

    return this.buildResponse(requestId);
  }
}
