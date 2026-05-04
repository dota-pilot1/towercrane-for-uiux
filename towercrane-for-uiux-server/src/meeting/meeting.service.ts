import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  meetingDmPairsTable,
  meetingMessagesTable,
  meetingRoomsTable,
  usersTable,
  type MeetingDmPairRow,
  type MeetingMessageInsert,
  type MeetingMessageRow,
  type MeetingRoomInsert,
  type MeetingRoomRow,
} from '../database/schema';
import { sendMeetingMessageSchema, startMeetingDmSchema } from './meeting.schemas';

export type MeetingUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
};

@Injectable()
export class MeetingService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db;
  }

  listRooms(user: MeetingUser) {
    const publicRooms = this.db
      .select()
      .from(meetingRoomsTable)
      .where(and(eq(meetingRoomsTable.archived, false), sql`${meetingRoomsTable.roomType} != 'DM'`))
      .orderBy(asc(meetingRoomsTable.orderIdx), asc(meetingRoomsTable.createdAt))
      .all();

    const dmRooms = this.db
      .select({
        room: meetingRoomsTable,
        pair: meetingDmPairsTable,
      })
      .from(meetingDmPairsTable)
      .innerJoin(meetingRoomsTable, eq(meetingRoomsTable.id, meetingDmPairsTable.roomId))
      .where(
        and(
          eq(meetingRoomsTable.archived, false),
          sql`(${meetingDmPairsTable.userAId} = ${user.id} OR ${meetingDmPairsTable.userBId} = ${user.id})`,
        ),
      )
      .orderBy(desc(meetingRoomsTable.updatedAt))
      .all();

    return [
      ...publicRooms.map((room) => this.toRoomDto(room, user)),
      ...dmRooms.map(({ room, pair }) => this.toRoomDto(room, user, pair)),
    ];
  }

  getRoom(roomId: string, user: MeetingUser) {
    const { room, pair } = this.findAccessibleRoom(roomId, user);
    return this.toRoomDto(room, user, pair);
  }

  listMessages(roomId: string, user: MeetingUser, limit = 100) {
    this.findAccessibleRoom(roomId, user);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

    const rows = this.db
      .select()
      .from(meetingMessagesTable)
      .where(eq(meetingMessagesTable.roomId, roomId))
      .orderBy(desc(meetingMessagesTable.createdAt))
      .limit(normalizedLimit)
      .all()
      .reverse();

    return rows.map((row) => this.toMessageDto(row));
  }

  sendMessage(roomId: string, user: MeetingUser, payload: unknown) {
    const { room } = this.findAccessibleRoom(roomId, user);
    const input = sendMeetingMessageSchema.parse(payload);
    const now = new Date().toISOString();

    const row: MeetingMessageInsert = {
      id: `meeting-msg-${randomUUID().slice(0, 12)}`,
      roomId,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      content: input.content,
      messageType: input.messageType,
      payload: input.payload ?? null,
      createdAt: now,
    };

    this.db.insert(meetingMessagesTable).values(row).run();
    this.db
      .update(meetingRoomsTable)
      .set({ updatedAt: now })
      .where(eq(meetingRoomsTable.id, room.id))
      .run();

    const saved = this.db
      .select()
      .from(meetingMessagesTable)
      .where(eq(meetingMessagesTable.id, row.id))
      .get();

    return this.toMessageDto(saved ?? row);
  }

  listMembers(roomId: string, user: MeetingUser) {
    const { room, pair } = this.findAccessibleRoom(roomId, user);

    if (room.roomType === 'DM' && pair) {
      const rows = this.db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
        })
        .from(usersTable)
        .where(sql`${usersTable.id} IN (${pair.userAId}, ${pair.userBId})`)
        .orderBy(asc(usersTable.name))
        .all();

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        online: false,
      }));
    }

    const rows = this.db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .orderBy(asc(usersTable.name))
      .all();

    return rows
      .filter((row) => this.isVisibleMeetingMember(row.email))
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        online: false,
      }));
  }

  startDm(user: MeetingUser, payload: unknown) {
    const input = startMeetingDmSchema.parse(payload);
    if (input.otherUserId === user.id) {
      throw new BadRequestException('Cannot open DM with yourself');
    }

    const otherUser = this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.otherUserId))
      .get();

    if (!otherUser || !this.isVisibleMeetingMember(otherUser.email)) {
      throw new NotFoundException(`User not found: ${input.otherUserId}`);
    }

    const [userAId, userBId] = [user.id, otherUser.id].sort();
    const existingPair = this.db
      .select()
      .from(meetingDmPairsTable)
      .where(and(eq(meetingDmPairsTable.userAId, userAId), eq(meetingDmPairsTable.userBId, userBId)))
      .get();

    if (existingPair) {
      const room = this.findRoom(existingPair.roomId);
      return this.toRoomDto(room, user, existingPair);
    }

    const now = new Date().toISOString();
    const room: MeetingRoomInsert = {
      id: `meeting-dm-${randomUUID().slice(0, 12)}`,
      name: 'DM',
      roomType: 'DM',
      description: null,
      orderIdx: 1000,
      archived: false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    const pair = {
      id: `meeting-dm-pair-${randomUUID().slice(0, 12)}`,
      roomId: room.id,
      userAId,
      userBId,
      createdAt: now,
    };

    this.db.insert(meetingRoomsTable).values(room).run();
    this.db.insert(meetingDmPairsTable).values(pair).run();

    return this.toRoomDto(this.findRoom(room.id), user, pair);
  }

  private findRoom(roomId: string) {
    const room = this.db
      .select()
      .from(meetingRoomsTable)
      .where(and(eq(meetingRoomsTable.id, roomId), eq(meetingRoomsTable.archived, false)))
      .get();

    if (!room) {
      throw new NotFoundException(`Meeting room not found: ${roomId}`);
    }

    return room;
  }

  private findAccessibleRoom(roomId: string, user: MeetingUser) {
    const room = this.findRoom(roomId);
    const pair = this.findDmPair(room.id);

    if (room.roomType === 'DM') {
      if (!pair) {
        throw new NotFoundException(`DM pair not found: ${roomId}`);
      }
      if (pair.userAId !== user.id && pair.userBId !== user.id) {
        throw new ForbiddenException('You are not a member of this DM room');
      }
    }

    return { room, pair };
  }

  private findDmPair(roomId: string) {
    return this.db
      .select()
      .from(meetingDmPairsTable)
      .where(eq(meetingDmPairsTable.roomId, roomId))
      .get();
  }

  private toRoomDto(room: MeetingRoomRow, user?: MeetingUser, pair?: MeetingDmPairRow) {
    const countRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(meetingMessagesTable)
      .where(eq(meetingMessagesTable.roomId, room.id))
      .get();
    const dmCounterpart = room.roomType === 'DM' && user && pair
      ? this.getDmCounterpart(pair, user.id)
      : null;

    return {
      id: room.id,
      name: dmCounterpart?.name ?? room.name,
      roomType: room.roomType,
      description: dmCounterpart ? '1:1 DM' : room.description,
      orderIdx: room.orderIdx,
      messageCount: Number(countRow?.count ?? 0),
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      dmCounterpart,
    };
  }

  private toMessageDto(row: MeetingMessageRow | MeetingMessageInsert) {
    return {
      id: row.id,
      roomId: row.roomId,
      senderId: row.senderId,
      senderName: row.senderName,
      senderRole: row.senderRole,
      content: row.content,
      messageType: row.messageType,
      payload: row.payload ?? null,
      createdAt: row.createdAt,
    };
  }

  private isVisibleMeetingMember(email: string) {
    if (email === 'seed@towercrane.local') return false;
    if (email === 'codex-upload-test@example.com') return false;
    if (email.startsWith('test-agent-') && email.endsWith('@example.com')) return false;
    if (email.startsWith('meeting-') && email.endsWith('@towercrane.local')) return false;
    return true;
  }

  private getDmCounterpart(pair: MeetingDmPairRow, currentUserId: string) {
    const otherUserId = pair.userAId === currentUserId ? pair.userBId : pair.userAId;
    const other = this.db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
      })
      .from(usersTable)
      .where(eq(usersTable.id, otherUserId))
      .get();

    if (!other) return null;

    return {
      id: other.id,
      name: other.name,
      email: other.email,
      role: other.role,
    };
  }
}
