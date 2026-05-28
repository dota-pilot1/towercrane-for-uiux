import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import {
  taskAiReviewsTable,
  taskChecklistsTable,
  taskWorkspacesTable,
  tasksTable,
  usersTable,
  type TaskChecklistInsert,
  type TaskInsert,
} from '../database/schema';
import {
  publicTaskIngestSchema,
  publicTaskReviewIngestSchema,
} from './task-ingest.schemas';

@Injectable()
export class TaskIngestService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  ingestTask(rawPayload: unknown, ingestKey?: string) {
    this.assertIngestKey(ingestKey);
    const input = publicTaskIngestSchema.parse(rawPayload);
    const reporter = this.resolveReporter();
    const assignee = input.assigneeEmail
      ? this.db
          .select()
          .from(usersTable)
          .where(eq(usersTable.email, input.assigneeEmail))
          .get()
      : null;

    if (input.assigneeEmail && !assignee) {
      throw new NotFoundException(`Assignee not found: ${input.assigneeEmail}`);
    }

    if (input.workspaceId) {
      const workspace = this.db
        .select({ id: taskWorkspacesTable.id })
        .from(taskWorkspacesTable)
        .where(eq(taskWorkspacesTable.id, input.workspaceId))
        .get();
      if (!workspace) {
        throw new NotFoundException(
          `Task workspace not found: ${input.workspaceId}`,
        );
      }
    }

    const now = new Date().toISOString();
    const orderRows = input.workspaceId
      ? this.db
          .select({ orderIdx: tasksTable.orderIdx })
          .from(tasksTable)
          .where(eq(tasksTable.workspaceId, input.workspaceId))
          .all()
      : this.db
          .select({ orderIdx: tasksTable.orderIdx })
          .from(tasksTable)
          .all();
    const maxOrder = orderRows.reduce(
      (max, row) => Math.max(max, row.orderIdx),
      -1,
    );

    const taskId = `task-${randomUUID().slice(0, 12)}`;
    const row: TaskInsert = {
      id: taskId,
      workspaceId: input.workspaceId ?? null,
      title: input.title,
      content: input.content,
      plan: input.plan,
      folderStructure: input.folderStructure,
      mmdContent: '',
      taskType: input.taskType,
      status: input.status,
      priority: input.priority,
      scope: 'TEAM',
      ownerId: null,
      visibility: 'TEAM',
      reporterId: reporter.id,
      assigneeId: assignee?.id ?? null,
      dueDate: input.dueDate ?? null,
      orderIdx: maxOrder + 1,
      archived: false,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(tasksTable).values(row).run();

    if (input.checklists.length > 0) {
      const checklistRows: TaskChecklistInsert[] = input.checklists.map(
        (content, index) => ({
          id: `task-chk-${randomUUID().slice(0, 12)}`,
          taskId,
          content,
          completed: false,
          orderIdx: index,
          createdAt: now,
          updatedAt: now,
        }),
      );
      this.db.insert(taskChecklistsTable).values(checklistRows).run();
    }

    return {
      taskId,
      title: row.title,
      url: this.buildTaskUrl(taskId),
      implementationPrompt: this.buildImplementationPrompt(taskId),
      reviewPrompt: this.buildReviewPrompt(taskId),
    };
  }

  ingestReview(taskId: string, rawPayload: unknown, ingestKey?: string) {
    this.assertIngestKey(ingestKey);
    const input = publicTaskReviewIngestSchema.parse(rawPayload);
    const task = this.db
      .select({ id: tasksTable.id, title: tasksTable.title })
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .get();

    if (!task) {
      throw new NotFoundException(`Task not found: ${taskId}`);
    }

    const now = new Date().toISOString();
    const reviewId = `task-review-${randomUUID().slice(0, 12)}`;

    this.db
      .insert(taskAiReviewsTable)
      .values({
        id: reviewId,
        taskId,
        format: input.format,
        title: input.title ?? `Codex 코드 리뷰 - ${task.title}`,
        content: input.content,
        source: 'CODEX',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return {
      reviewId,
      taskId,
      url: this.buildTaskUrl(taskId),
    };
  }

  private assertIngestKey(inputKey?: string) {
    const expectedKey = this.configService.get<string>('TASK_INGEST_KEY');
    if (!expectedKey) {
      throw new ServiceUnavailableException(
        'TASK_INGEST_KEY is not configured',
      );
    }

    if (!inputKey || inputKey !== expectedKey) {
      throw new UnauthorizedException('Invalid task ingest key');
    }
  }

  private resolveReporter() {
    const reporterEmail = this.configService.get<string>(
      'TASK_INGEST_REPORTER_EMAIL',
    );

    if (reporterEmail) {
      const reporter = this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, reporterEmail))
        .get();
      if (reporter) return reporter;
    }

    const admin = this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, 'admin'))
      .orderBy(asc(usersTable.createdAt))
      .get();
    if (admin) return admin;

    const firstUser = this.db
      .select()
      .from(usersTable)
      .orderBy(asc(usersTable.createdAt))
      .get();
    if (firstUser) return firstUser;

    throw new ServiceUnavailableException('No user exists for task ingest');
  }

  private buildTaskUrl(taskId: string) {
    const frontendUrl =
      this.configService.get<string>('TASK_INGEST_FRONTEND_URL') ??
      'https://hibot-docu.com';
    return `${frontendUrl.replace(/\/$/, '')}/task/${taskId}`;
  }

  private buildImplementationPrompt(taskId: string) {
    return `이 업무(${taskId})를 구현해줘. 업무 상세, 단계별 계획, 예상 파일 구조를 참고해서 작업하고, 완료 후 변경 요약과 검증 결과를 남겨줘.`;
  }

  private buildReviewPrompt(taskId: string) {
    return `이 업무(${taskId})에 대한 구현 결과를 코드 리뷰로 등록해줘. 변경 파일, 주요 결정, 테스트 결과, 남은 리스크를 markdown으로 정리해줘.`;
  }
}
