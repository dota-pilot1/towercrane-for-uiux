import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gte, isNull, lte, or, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  projectSchedulesTable,
  usersTable,
  type ProjectScheduleInsert,
  type ProjectScheduleRow,
} from '../database/schema';
import {
  createProjectScheduleSchema,
  listProjectSchedulesQuerySchema,
  reorderProjectSchedulesSchema,
  updateProjectScheduleSchema,
} from './dto/project-schedule.schema';

export type ProjectScheduleUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class ProjectScheduleService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  list(user: ProjectScheduleUser, rawQuery: unknown) {
    this.ensureSignedIn(user);
    const query = listProjectSchedulesQuerySchema.parse(rawQuery ?? {});
    const rangeCondition = or(
      and(
        isNull(projectSchedulesTable.endAt),
        gte(projectSchedulesTable.startAt, query.from),
      ),
      gte(projectSchedulesTable.endAt, query.from),
    );
    const conditions: SQL[] = [lte(projectSchedulesTable.startAt, query.to)];
    if (rangeCondition) conditions.push(rangeCondition);

    return this.db
      .select({
        schedule: projectSchedulesTable,
        createdByName: usersTable.name,
      })
      .from(projectSchedulesTable)
      .leftJoin(usersTable, eq(usersTable.id, projectSchedulesTable.createdBy))
      .where(and(...conditions))
      .orderBy(
        asc(projectSchedulesTable.orderIdx),
        asc(projectSchedulesTable.startAt),
        asc(projectSchedulesTable.createdAt),
      )
      .all()
      .map((row) =>
        this.toDto(row.schedule, user, row.createdByName ?? '알 수 없음'),
      );
  }

  create(user: ProjectScheduleUser, payload: unknown) {
    this.ensureSignedIn(user);
    const input = createProjectScheduleSchema.parse(payload);
    const now = new Date().toISOString();
    const orderIdx =
      this.db
        .select({ orderIdx: projectSchedulesTable.orderIdx })
        .from(projectSchedulesTable)
        .all()
        .reduce((max, item) => Math.max(max, item.orderIdx), -1) + 1;
    const row: ProjectScheduleInsert = {
      id: `project-schedule-${randomUUID().slice(0, 12)}`,
      ...input,
      orderIdx,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(projectSchedulesTable).values(row).run();
    return this.detail(user, row.id);
  }

  reorder(user: ProjectScheduleUser, payload: unknown) {
    this.ensureSignedIn(user);
    const { scheduleIds } = reorderProjectSchedulesSchema.parse(payload);
    const rows = scheduleIds.map((scheduleId) =>
      this.ensureSchedule(scheduleId),
    );
    rows.forEach((row) => this.ensureCanWrite(user, row));

    const orderSlots = rows.map((row) => row.orderIdx).sort((a, b) => a - b);
    const now = new Date().toISOString();

    this.db.transaction((tx) => {
      scheduleIds.forEach((scheduleId, index) => {
        tx.update(projectSchedulesTable)
          .set({ orderIdx: orderSlots[index], updatedAt: now })
          .where(eq(projectSchedulesTable.id, scheduleId))
          .run();
      });
    });

    return { success: true };
  }

  detail(user: ProjectScheduleUser, scheduleId: string) {
    this.ensureSignedIn(user);
    const row = this.ensureSchedule(scheduleId);
    return this.toDto(row, user, this.getUserName(row.createdBy));
  }

  update(user: ProjectScheduleUser, scheduleId: string, payload: unknown) {
    const row = this.ensureSchedule(scheduleId);
    this.ensureCanWrite(user, row);
    const input = updateProjectScheduleSchema.parse(payload);
    const startAt = input.startAt ?? row.startAt;
    const endAt = input.endAt === undefined ? row.endAt : input.endAt;
    if (endAt && Date.parse(startAt) > Date.parse(endAt)) {
      throw new BadRequestException('종료일은 시작일 이후여야 합니다.');
    }
    this.db
      .update(projectSchedulesTable)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(eq(projectSchedulesTable.id, scheduleId))
      .run();
    return this.detail(user, scheduleId);
  }

  delete(user: ProjectScheduleUser, scheduleId: string) {
    const row = this.ensureSchedule(scheduleId);
    this.ensureCanWrite(user, row);
    this.db
      .delete(projectSchedulesTable)
      .where(eq(projectSchedulesTable.id, scheduleId))
      .run();
    return { success: true, id: scheduleId };
  }

  private ensureSchedule(scheduleId: string) {
    const row = this.db
      .select()
      .from(projectSchedulesTable)
      .where(eq(projectSchedulesTable.id, scheduleId))
      .get();
    if (!row) {
      throw new NotFoundException(`일정을 찾을 수 없습니다: ${scheduleId}`);
    }
    return row;
  }

  private getUserName(userId: string) {
    const user = this.db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .get();
    return user?.name || user?.email || '알 수 없음';
  }

  private ensureCanWrite(user: ProjectScheduleUser, row: ProjectScheduleRow) {
    this.ensureSignedIn(user);
    if (user.role === 'admin' || row.createdBy === user.id) return;
    throw new ForbiddenException('이 일정을 수정할 권한이 없습니다.');
  }

  private ensureSignedIn(user: ProjectScheduleUser) {
    if (!user?.id) throw new ForbiddenException('로그인이 필요합니다.');
  }

  private toDto(
    row: ProjectScheduleRow,
    user: ProjectScheduleUser,
    createdByName: string,
  ) {
    const canWrite = user.role === 'admin' || row.createdBy === user.id;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      startAt: row.startAt,
      endAt: row.endAt,
      orderIdx: row.orderIdx,
      createdBy: row.createdBy,
      createdByName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      canEdit: canWrite,
      canDelete: canWrite,
    };
  }
}
