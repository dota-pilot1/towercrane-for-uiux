import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  devManagementDmPairsTable,
  devManagementRoomsTable,
  devMeetingMinutesTable,
  type DevMeetingMinutesInsert,
  type DevMeetingMinutesRow,
} from '../database/schema';
import {
  createDevMeetingMinutesSchema,
  listDevMeetingMinutesQuerySchema,
  updateDevMeetingMinutesSchema,
} from './dev-meeting-minutes.schemas';

export type DevMeetingMinutesUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

@Injectable()
export class DevMeetingMinutesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  list(user: DevMeetingMinutesUser, rawQuery: unknown) {
    const query = listDevMeetingMinutesQuerySchema.parse(rawQuery ?? {});
    const accessibleRoomIds = query.roomId
      ? [this.ensureAccessibleRoom(query.roomId, user).id]
      : this.listAccessibleRoomIds(user);

    if (accessibleRoomIds.length === 0) {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        totalPages: 1,
      };
    }

    const conditions: SQL[] = [
      inArray(devMeetingMinutesTable.roomId, accessibleRoomIds),
    ];
    if (query.q) {
      const keyword = `%${query.q}%`;
      const keywordCondition = or(
        like(devMeetingMinutesTable.title, keyword),
        like(devMeetingMinutesTable.summary, keyword),
      );
      if (keywordCondition) conditions.push(keywordCondition);
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.pageSize;
    const rows = this.db
      .select()
      .from(devMeetingMinutesTable)
      .where(where)
      .orderBy(desc(devMeetingMinutesTable.createdAt))
      .limit(query.pageSize)
      .offset(offset)
      .all();

    const totalRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(devMeetingMinutesTable)
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

  create(user: DevMeetingMinutesUser, payload: unknown) {
    const input = createDevMeetingMinutesSchema.parse(payload);
    this.ensureAccessibleRoom(input.roomId, user);

    const now = new Date().toISOString();
    const row: DevMeetingMinutesInsert = {
      id: `dev-min-${randomUUID().slice(0, 12)}`,
      roomId: input.roomId,
      title: input.title,
      summary: input.summary,
      discussionPoints: input.discussionPoints,
      decisions: input.decisions,
      actionItems: input.actionItems,
      openQuestions: input.openQuestions,
      sourceMessageIds: input.sourceMessageIds,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(devMeetingMinutesTable).values(row).run();
    return this.detail(user, row.id);
  }

  detail(user: DevMeetingMinutesUser, minutesId: string) {
    const row = this.ensureMinutes(minutesId);
    this.ensureAccessibleRoom(row.roomId, user);
    return this.toDetailDto(row, user);
  }

  update(
    user: DevMeetingMinutesUser,
    minutesId: string,
    payload: unknown,
  ) {
    const row = this.ensureMinutes(minutesId);
    this.ensureAccessibleRoom(row.roomId, user);
    this.assertOwnerOrAdmin(row, user);

    const input = updateDevMeetingMinutesSchema.parse(payload);
    const changes: Partial<DevMeetingMinutesInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (input.title !== undefined) changes.title = input.title;
    if (input.summary !== undefined) changes.summary = input.summary;

    this.db
      .update(devMeetingMinutesTable)
      .set(changes)
      .where(eq(devMeetingMinutesTable.id, minutesId))
      .run();

    return this.detail(user, minutesId);
  }

  delete(user: DevMeetingMinutesUser, minutesId: string) {
    const row = this.ensureMinutes(minutesId);
    this.ensureAccessibleRoom(row.roomId, user);
    this.assertOwnerOrAdmin(row, user);

    this.db
      .delete(devMeetingMinutesTable)
      .where(eq(devMeetingMinutesTable.id, minutesId))
      .run();

    return { success: true, id: minutesId };
  }

  private ensureMinutes(minutesId: string) {
    const row = this.db
      .select()
      .from(devMeetingMinutesTable)
      .where(eq(devMeetingMinutesTable.id, minutesId))
      .get();

    if (!row) {
      throw new NotFoundException(`회의록을 찾을 수 없습니다: ${minutesId}`);
    }

    return row;
  }

  private ensureAccessibleRoom(roomId: string, user: DevMeetingMinutesUser) {
    const room = this.db
      .select()
      .from(devManagementRoomsTable)
      .where(
        and(
          eq(devManagementRoomsTable.id, roomId),
          eq(devManagementRoomsTable.archived, false),
        ),
      )
      .get();

    if (!room) {
      throw new NotFoundException(`개발 채팅방을 찾을 수 없습니다: ${roomId}`);
    }

    if (room.roomType === 'DM') {
      const pair = this.db
        .select()
        .from(devManagementDmPairsTable)
        .where(eq(devManagementDmPairsTable.roomId, room.id))
        .get();

      if (!pair || (pair.userAId !== user.id && pair.userBId !== user.id)) {
        throw new ForbiddenException('이 DM 회의록에 접근할 수 없습니다.');
      }
    }

    return room;
  }

  private listAccessibleRoomIds(user: DevMeetingMinutesUser) {
    const publicRooms = this.db
      .select({ id: devManagementRoomsTable.id })
      .from(devManagementRoomsTable)
      .where(
        and(
          eq(devManagementRoomsTable.archived, false),
          sql`${devManagementRoomsTable.roomType} != 'DM'`,
        ),
      )
      .all()
      .map((room) => room.id);

    const dmRooms = this.db
      .select({ id: devManagementDmPairsTable.roomId })
      .from(devManagementDmPairsTable)
      .innerJoin(
        devManagementRoomsTable,
        eq(devManagementRoomsTable.id, devManagementDmPairsTable.roomId),
      )
      .where(
        and(
          eq(devManagementRoomsTable.archived, false),
          or(
            eq(devManagementDmPairsTable.userAId, user.id),
            eq(devManagementDmPairsTable.userBId, user.id),
          ),
        ),
      )
      .all()
      .map((room) => room.id);

    return [...new Set([...publicRooms, ...dmRooms])];
  }

  private assertOwnerOrAdmin(
    row: DevMeetingMinutesRow,
    user: DevMeetingMinutesUser,
  ) {
    if (user.role === 'admin' || row.createdBy === user.id) return;
    throw new ForbiddenException('회의록 작성자 또는 관리자만 수정할 수 있습니다.');
  }

  private toSummaryDto(row: DevMeetingMinutesRow) {
    return {
      id: row.id,
      roomId: row.roomId,
      title: row.title,
      summary: row.summary,
      discussionPointCount: row.discussionPoints.length,
      decisionCount: row.decisions.length,
      actionItemCount: row.actionItems.length,
      openQuestionCount: row.openQuestions.length,
      sourceMessageCount: row.sourceMessageIds.length,
      createdBy: row.createdBy,
      createdByName: row.createdByName,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toDetailDto(
    row: DevMeetingMinutesRow,
    user: DevMeetingMinutesUser,
  ) {
    return {
      ...this.toSummaryDto(row),
      discussionPoints: row.discussionPoints,
      decisions: row.decisions,
      actionItems: row.actionItems,
      openQuestions: row.openQuestions,
      sourceMessageIds: row.sourceMessageIds,
      canEdit: user.role === 'admin' || row.createdBy === user.id,
      canDelete: user.role === 'admin' || row.createdBy === user.id,
    };
  }
}
