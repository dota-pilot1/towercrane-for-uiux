import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  featurePlansTable,
  type FeaturePlanInsert,
  type FeaturePlanRow,
} from '../database/schema';
import { TasksService } from '../tasks/tasks.service';
import {
  createFeaturePlanSchema,
  listFeaturePlansQuerySchema,
  updateFeaturePlanSchema,
} from './feature-plans.schemas';

export type FeaturePlanUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class FeaturePlansService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tasksService: TasksService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  list(user: FeaturePlanUser, rawQuery: unknown) {
    this.ensureSignedIn(user);
    const query = listFeaturePlansQuerySchema.parse(rawQuery ?? {});
    const conditions: SQL[] = [];

    if (query.q) {
      const keyword = `%${query.q}%`;
      const keywordCondition = or(
        like(featurePlansTable.title, keyword),
        like(featurePlansTable.summary, keyword),
        like(featurePlansTable.content, keyword),
        like(featurePlansTable.plan, keyword),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }

    if (query.taskId) {
      conditions.push(eq(featurePlansTable.linkedTaskId, query.taskId));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.pageSize;
    const rows = this.db
      .select()
      .from(featurePlansTable)
      .where(where)
      .orderBy(desc(featurePlansTable.createdAt))
      .limit(query.pageSize)
      .offset(offset)
      .all();
    const totalRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(featurePlansTable)
      .where(where)
      .get();

    const total = Number(totalRow?.count ?? 0);
    return {
      items: rows.map((row) => this.toSummaryDto(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  create(user: FeaturePlanUser, payload: unknown) {
    this.ensureSignedIn(user);
    const input = createFeaturePlanSchema.parse(payload);
    const now = new Date().toISOString();
    const row: FeaturePlanInsert = {
      id: `feature-plan-${randomUUID().slice(0, 12)}`,
      ...input,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(featurePlansTable).values(row).run();
    return this.detail(user, row.id);
  }

  detail(user: FeaturePlanUser, planId: string) {
    this.ensureSignedIn(user);
    return this.toDetailDto(this.ensurePlan(planId), user);
  }

  update(user: FeaturePlanUser, planId: string, payload: unknown) {
    const row = this.ensurePlan(planId);
    this.ensureCanWrite(user, row);
    const input = updateFeaturePlanSchema.parse(payload);
    this.db
      .update(featurePlansTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(featurePlansTable.id, planId))
      .run();
    return this.detail(user, planId);
  }

  delete(user: FeaturePlanUser, planId: string) {
    const row = this.ensurePlan(planId);
    this.ensureCanWrite(user, row);
    this.db
      .delete(featurePlansTable)
      .where(eq(featurePlansTable.id, planId))
      .run();
    return { success: true, id: planId };
  }

  registerTask(user: FeaturePlanUser, planId: string) {
    const row = this.ensurePlan(planId);
    this.ensureCanWrite(user, row);

    if (row.linkedTaskId) {
      return {
        ...this.toDetailDto(row, user),
        taskId: row.linkedTaskId,
        taskUrl: `/task/${row.linkedTaskId}`,
      };
    }

    const task = this.tasksService.createTask(user, {
      title: row.title,
      content: this.buildTaskContent(row),
      plan: row.plan,
      folderStructure: row.folderStructure,
      mmdContent: row.mmdContent,
      taskType: 'FEATURE',
      priority: 'MEDIUM',
      scope: 'TEAM',
      status: 'TODO',
    }) as { id: string };

    this.db
      .update(featurePlansTable)
      .set({ linkedTaskId: task.id, updatedAt: new Date().toISOString() })
      .where(eq(featurePlansTable.id, planId))
      .run();

    return {
      ...this.detail(user, planId),
      taskId: task.id,
      taskUrl: `/task/${task.id}`,
    };
  }

  private buildTaskContent(row: FeaturePlanRow) {
    return [
      row.content.trim(),
      row.acceptanceCriteria.trim()
        ? `완료 기준\n\n${row.acceptanceCriteria.trim()}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private ensurePlan(planId: string) {
    const row = this.db
      .select()
      .from(featurePlansTable)
      .where(eq(featurePlansTable.id, planId))
      .get();
    if (!row)
      throw new NotFoundException(
        `기능 개발 계획을 찾을 수 없습니다: ${planId}`,
      );
    return row;
  }

  private ensureCanWrite(user: FeaturePlanUser, row: FeaturePlanRow) {
    this.ensureSignedIn(user);
    if (user.role === 'admin' || row.createdBy === user.id) return;
    throw new ForbiddenException('이 기능 개발 계획을 수정할 권한이 없습니다.');
  }

  private ensureSignedIn(user: FeaturePlanUser) {
    if (!user?.id) throw new ForbiddenException('로그인이 필요합니다.');
  }

  private toSummaryDto(row: FeaturePlanRow) {
    return {
      id: row.id,
      linkedTaskId: row.linkedTaskId,
      title: row.title,
      summary: row.summary,
      checklistCount: row.checklist.length,
      sourceFileName: row.sourceFileName,
      createdBy: row.createdBy,
      createdByName: row.createdByName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toDetailDto(row: FeaturePlanRow, user: FeaturePlanUser) {
    return {
      ...this.toSummaryDto(row),
      content: row.content,
      acceptanceCriteria: row.acceptanceCriteria,
      plan: row.plan,
      folderStructure: row.folderStructure,
      checklist: row.checklist,
      mmdContent: row.mmdContent,
      canEdit: user.role === 'admin' || row.createdBy === user.id,
      canDelete: user.role === 'admin' || row.createdBy === user.id,
    };
  }
}
