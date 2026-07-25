import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  meetingDmPairsTable,
  meetingMessagesTable,
  meetingRoomsTable,
  meetingRoomReadsTable,
  meetingWorkspacesTable,
  meetingWorkspaceMembersTable,
  usersTable,
  type MeetingDmPairRow,
  type MeetingMessageInsert,
  type MeetingMessageRow,
  type MeetingRoomInsert,
  type MeetingRoomRow,
  type MeetingWorkspaceInsert,
} from '../database/schema';
import {
  createMeetingRoomSchema,
  createMeetingWorkspaceSchema,
  reorderMeetingWorkspacesSchema,
  sendMeetingMessageSchema,
  startMeetingDmSchema,
  toggleReactionSchema,
  updateMeetingWorkspaceSchema,
} from './meeting.schemas';

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

  listWorkspaces(user: MeetingUser) {
    const workspaces = this.db
      .select()
      .from(meetingWorkspacesTable)
      .orderBy(
        asc(meetingWorkspacesTable.orderIdx),
        asc(meetingWorkspacesTable.createdAt),
      )
      .all();
    const members = this.db.select().from(meetingWorkspaceMembersTable).all();
    const rooms = this.db
      .select()
      .from(meetingRoomsTable)
      .where(
        and(
          eq(meetingRoomsTable.archived, false),
          sql`${meetingRoomsTable.roomType} != 'DM'`,
        ),
      )
      .all();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    return workspaces.map((workspace) => {
      const wsRooms = rooms.filter((r) => r.workspaceId === workspace.id);
      const wsRoomIds = new Set(wsRooms.map((r) => r.id));
      const activeCount = wsRooms.filter(
        (r) => r.updatedAt >= oneDayAgo,
      ).length;
      const member = members.find(
        (m) => m.workspaceId === workspace.id && m.userId === user.id,
      );
      return {
        ...workspace,
        role: member?.role ?? null,
        channelCount: wsRooms.length,
        activeChannelCount: activeCount,
      };
    });
  }

  createWorkspace(user: MeetingUser, payload: unknown) {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can create workspaces');
    const input = createMeetingWorkspaceSchema.parse(payload);
    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ orderIdx: meetingWorkspacesTable.orderIdx })
      .from(meetingWorkspacesTable)
      .all()
      .reduce((max, r) => Math.max(max, r.orderIdx), -1);

    const workspace: MeetingWorkspaceInsert = {
      id: `meeting-workspace-${randomUUID().slice(0, 12)}`,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? 'MessagesSquare',
      color: null,
      orderIdx: maxOrder + 1,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(meetingWorkspacesTable).values(workspace).run();
    this.db
      .insert(meetingWorkspaceMembersTable)
      .values({
        id: `meeting-wm-${randomUUID().slice(0, 12)}`,
        workspaceId: workspace.id,
        userId: user.id,
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      })
      .run();
    return this.db
      .select()
      .from(meetingWorkspacesTable)
      .where(eq(meetingWorkspacesTable.id, workspace.id))
      .get();
  }

  updateWorkspace(user: MeetingUser, workspaceId: string, payload: unknown) {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can update workspaces');
    const input = updateMeetingWorkspaceSchema.parse(payload);
    const now = new Date().toISOString();
    this.db
      .update(meetingWorkspacesTable)
      .set({ ...input, updatedAt: now })
      .where(eq(meetingWorkspacesTable.id, workspaceId))
      .run();
    return this.db
      .select()
      .from(meetingWorkspacesTable)
      .where(eq(meetingWorkspacesTable.id, workspaceId))
      .get();
  }

  deleteWorkspace(user: MeetingUser, workspaceId: string) {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can delete workspaces');
    if (workspaceId === 'meeting-workspace-default') {
      throw new BadRequestException('기본 워크스페이스는 삭제할 수 없습니다');
    }
    const roomCount = this.db
      .select({ count: sql<number>`count(*)` })
      .from(meetingRoomsTable)
      .where(
        and(
          eq(meetingRoomsTable.workspaceId, workspaceId),
          eq(meetingRoomsTable.archived, false),
        ),
      )
      .get();
    if ((roomCount?.count ?? 0) > 0) {
      throw new BadRequestException(
        '채널이 있는 워크스페이스는 삭제할 수 없습니다',
      );
    }
    this.db
      .delete(meetingWorkspacesTable)
      .where(eq(meetingWorkspacesTable.id, workspaceId))
      .run();
    return { success: true, workspaceId };
  }

  reorderWorkspaces(user: MeetingUser, payload: unknown) {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can reorder workspaces');
    const { items } = reorderMeetingWorkspacesSchema.parse(payload);
    const now = new Date().toISOString();
    for (const item of items) {
      this.db
        .update(meetingWorkspacesTable)
        .set({ orderIdx: item.orderIdx, updatedAt: now })
        .where(eq(meetingWorkspacesTable.id, item.id))
        .run();
    }
    return { success: true };
  }

  listWorkspaceRooms(user: MeetingUser, workspaceId: string) {
    const publicRooms = this.db
      .select()
      .from(meetingRoomsTable)
      .where(
        and(
          eq(meetingRoomsTable.workspaceId, workspaceId),
          eq(meetingRoomsTable.archived, false),
          sql`${meetingRoomsTable.roomType} != 'DM'`,
        ),
      )
      .orderBy(
        asc(meetingRoomsTable.orderIdx),
        asc(meetingRoomsTable.createdAt),
      )
      .all();

    const dmRooms = this.db
      .select({ room: meetingRoomsTable, pair: meetingDmPairsTable })
      .from(meetingDmPairsTable)
      .innerJoin(
        meetingRoomsTable,
        eq(meetingRoomsTable.id, meetingDmPairsTable.roomId),
      )
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

  createWorkspaceRoom(
    user: MeetingUser,
    workspaceId: string,
    payload: unknown,
  ) {
    if (user.role !== 'admin')
      throw new ForbiddenException('Only admins can create channels');
    const input = createMeetingRoomSchema.parse(payload);
    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ orderIdx: meetingRoomsTable.orderIdx })
      .from(meetingRoomsTable)
      .where(
        and(
          eq(meetingRoomsTable.workspaceId, workspaceId),
          sql`${meetingRoomsTable.roomType} != 'DM'`,
        ),
      )
      .all()
      .reduce((max, r) => Math.max(max, r.orderIdx), -1);

    const room: MeetingRoomInsert = {
      id: `meeting-room-${randomUUID().slice(0, 12)}`,
      name: input.name,
      roomType: input.roomType,
      description: input.description ?? null,
      orderIdx: maxOrder + 1,
      workspaceId,
      archived: false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    this.db.insert(meetingRoomsTable).values(room).run();
    return this.toRoomDto(this.findRoom(room.id), user);
  }

  listRooms(user: MeetingUser) {
    const publicRooms = this.db
      .select()
      .from(meetingRoomsTable)
      .where(
        and(
          eq(meetingRoomsTable.archived, false),
          sql`${meetingRoomsTable.roomType} != 'DM'`,
        ),
      )
      .orderBy(
        asc(meetingRoomsTable.orderIdx),
        asc(meetingRoomsTable.createdAt),
      )
      .all();

    const dmRooms = this.db
      .select({
        room: meetingRoomsTable,
        pair: meetingDmPairsTable,
      })
      .from(meetingDmPairsTable)
      .innerJoin(
        meetingRoomsTable,
        eq(meetingRoomsTable.id, meetingDmPairsTable.roomId),
      )
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
    // 자기 자신과의 DM("나와의 채팅") 허용 — userAId === userBId === 본인으로 pair 생성됨

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
      .where(
        and(
          eq(meetingDmPairsTable.userAId, userAId),
          eq(meetingDmPairsTable.userBId, userBId),
        ),
      )
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

  createRoom(user: MeetingUser, payload: unknown) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can create channels');
    }
    const input = createMeetingRoomSchema.parse(payload);
    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ orderIdx: meetingRoomsTable.orderIdx })
      .from(meetingRoomsTable)
      .where(sql`${meetingRoomsTable.roomType} != 'DM'`)
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const room: MeetingRoomInsert = {
      id: `meeting-room-${randomUUID().slice(0, 12)}`,
      name: input.name,
      roomType: input.roomType,
      description: input.description ?? null,
      orderIdx: maxOrder + 1,
      archived: false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(meetingRoomsTable).values(room).run();
    return this.toRoomDto(this.findRoom(room.id), user);
  }

  deleteRoom(user: MeetingUser, roomId: string) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete channels');
    }
    const room = this.findRoom(roomId);
    if (room.roomType === 'ANNOUNCE') {
      throw new BadRequestException('공지 채널은 삭제할 수 없습니다');
    }
    if (room.roomType === 'DM') {
      throw new BadRequestException('DM 채널은 삭제할 수 없습니다');
    }
    this.db
      .update(meetingRoomsTable)
      .set({ archived: true, updatedAt: new Date().toISOString() })
      .where(eq(meetingRoomsTable.id, roomId))
      .run();
    return { success: true, roomId };
  }

  // DM 나가기: 참여자 누구나 가능. 방을 양쪽 모두에서 완전히 삭제(메시지 포함).
  // SQLite FK cascade(PRAGMA 의존)에 기대지 않고 메시지 → pair → 방 순서로 명시 삭제.
  leaveDm(user: MeetingUser, roomId: string) {
    const { room } = this.findAccessibleRoom(roomId, user);
    if (room.roomType !== 'DM') {
      throw new BadRequestException('DM만 나갈 수 있습니다');
    }
    this.db
      .delete(meetingMessagesTable)
      .where(eq(meetingMessagesTable.roomId, roomId))
      .run();
    this.db
      .delete(meetingDmPairsTable)
      .where(eq(meetingDmPairsTable.roomId, roomId))
      .run();
    this.db
      .delete(meetingRoomsTable)
      .where(eq(meetingRoomsTable.id, roomId))
      .run();
    return { success: true, roomId };
  }

  // 채널 메시지 전체 비우기: admin만. DM은 leaveDm으로 처리하므로 여기선 차단.
  clearRoomMessages(user: MeetingUser, roomId: string) {
    const room = this.findRoom(roomId);
    if (room.roomType === 'DM') {
      throw new BadRequestException('채널만 메시지를 비울 수 있습니다');
    }
    if (user.role !== 'admin') {
      throw new ForbiddenException('관리자만 채널 메시지를 비울 수 있습니다');
    }
    this.db
      .delete(meetingMessagesTable)
      .where(eq(meetingMessagesTable.roomId, roomId))
      .run();
    return { success: true, roomId };
  }

  // 메시지 고정/해제 — 방 접근 권한 있는 멤버 누구나(슬랙식). 갱신된 메시지 DTO 반환.
  setMessagePinned(
    user: MeetingUser,
    roomId: string,
    messageId: string,
    pinned: boolean,
  ) {
    this.findAccessibleRoom(roomId, user);
    const message = this.db
      .select()
      .from(meetingMessagesTable)
      .where(
        and(
          eq(meetingMessagesTable.id, messageId),
          eq(meetingMessagesTable.roomId, roomId),
        ),
      )
      .get();
    if (!message) {
      throw new NotFoundException(`Message not found: ${messageId}`);
    }
    this.db
      .update(meetingMessagesTable)
      .set({ pinned })
      .where(eq(meetingMessagesTable.id, messageId))
      .run();
    return this.toMessageDto({ ...message, pinned });
  }

  // 이모지 리액션 토글 — payload.reactions[emoji]에 사용자 id 추가/제거 (별도 테이블 없이 저장)
  toggleReaction(
    user: MeetingUser,
    roomId: string,
    messageId: string,
    body: unknown,
  ) {
    this.findAccessibleRoom(roomId, user);
    const { emoji } = toggleReactionSchema.parse(body);
    const message = this.db
      .select()
      .from(meetingMessagesTable)
      .where(
        and(
          eq(meetingMessagesTable.id, messageId),
          eq(meetingMessagesTable.roomId, roomId),
        ),
      )
      .get();
    if (!message) {
      throw new NotFoundException(`Message not found: ${messageId}`);
    }

    const currentPayload =
      message.payload && typeof message.payload === 'object'
        ? { ...message.payload }
        : {};
    const rawReactions = currentPayload.reactions;
    const reactions: Record<string, string[]> =
      rawReactions && typeof rawReactions === 'object'
        ? { ...(rawReactions as Record<string, string[]>) }
        : {};

    const users = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
    const idx = users.indexOf(user.id);
    if (idx >= 0) {
      users.splice(idx, 1);
    } else {
      users.push(user.id);
    }
    if (users.length > 0) {
      reactions[emoji] = users;
    } else {
      delete reactions[emoji];
    }

    const nextPayload = { ...currentPayload, reactions };
    this.db
      .update(meetingMessagesTable)
      .set({ payload: nextPayload })
      .where(eq(meetingMessagesTable.id, messageId))
      .run();

    return this.toMessageDto({ ...message, payload: nextPayload });
  }

  // ── 안읽음 / 검색 ─────────────────────────────────────

  // 인박스 브로드캐스트 대상 — 채널은 전체(null), DM은 참여자 2명
  getRoomAudience(roomId: string): {
    room: MeetingRoomRow;
    audience: string[] | null;
  } {
    const room = this.findRoom(roomId);
    if (room.roomType !== 'DM') return { room, audience: null };
    const pair = this.findDmPair(roomId);
    if (!pair) return { room, audience: [] };
    return { room, audience: [...new Set([pair.userAId, pair.userBId])] };
  }

  // 읽음 커서 upsert — 이 시점 이전 메시지는 모두 읽음 처리
  markRoomRead(user: MeetingUser, roomId: string) {
    this.findAccessibleRoom(roomId, user);
    const now = new Date().toISOString();
    this.db
      .insert(meetingRoomReadsTable)
      .values({
        id: `meeting-read-${randomUUID().slice(0, 12)}`,
        roomId,
        userId: user.id,
        lastReadAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [meetingRoomReadsTable.roomId, meetingRoomReadsTable.userId],
        set: { lastReadAt: now, updatedAt: now },
      })
      .run();
    return { roomId, lastReadAt: now };
  }

  // 접근 가능한 모든 방의 안읽음 수 + 내 멘션 수
  getUnreadCounts(user: MeetingUser) {
    const rooms = this.listRooms(user); // 채널 전체 + 내 DM
    const roomIds = new Set(rooms.map((r) => r.id));

    const rows = this.db
      .select({
        roomId: meetingMessagesTable.roomId,
        content: meetingMessagesTable.content,
        createdAt: meetingMessagesTable.createdAt,
      })
      .from(meetingMessagesTable)
      .leftJoin(
        meetingRoomReadsTable,
        and(
          eq(meetingRoomReadsTable.roomId, meetingMessagesTable.roomId),
          eq(meetingRoomReadsTable.userId, user.id),
        ),
      )
      .where(
        and(
          sql`${meetingMessagesTable.senderId} != ${user.id}`,
          sql`(${meetingRoomReadsTable.lastReadAt} IS NULL OR ${meetingMessagesTable.createdAt} > ${meetingRoomReadsTable.lastReadAt})`,
        ),
      )
      .all();

    const mentionToken = `@${user.name}`;
    const counts = new Map<string, { unread: number; mentions: number }>();
    for (const row of rows) {
      if (!roomIds.has(row.roomId)) continue;
      const entry = counts.get(row.roomId) ?? { unread: 0, mentions: 0 };
      entry.unread += 1;
      if (row.content.includes(mentionToken)) entry.mentions += 1;
      counts.set(row.roomId, entry);
    }

    return rooms
      .filter((r) => counts.has(r.id))
      .map((r) => ({
        roomId: r.id,
        roomType: r.roomType,
        unread: counts.get(r.id)!.unread,
        mentions: counts.get(r.id)!.mentions,
      }));
  }

  // 접근 가능한 방에서 메시지 내용 검색 (LIKE, 최신순)
  searchMessages(
    user: MeetingUser,
    query: string,
    roomId?: string,
    limit = 30,
  ) {
    const q = query.trim();
    if (q.length < 1) return [];
    const normalizedLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);

    const rooms = this.listRooms(user);
    const accessible = new Map(rooms.map((r) => [r.id, r]));
    if (roomId && !accessible.has(roomId)) return [];

    // LIKE 특수문자 이스케이프 (\, %, _)
    const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    const pattern = `%${escaped}%`;

    const conditions = [
      sql`${meetingMessagesTable.content} LIKE ${pattern} ESCAPE '\\'`,
    ];
    if (roomId) conditions.push(eq(meetingMessagesTable.roomId, roomId));

    const rows = this.db
      .select()
      .from(meetingMessagesTable)
      .where(and(...conditions))
      .orderBy(desc(meetingMessagesTable.createdAt))
      .limit(normalizedLimit * 3) // 접근 불가 방 필터링 여유분
      .all();

    return rows
      .filter((row) => accessible.has(row.roomId))
      .slice(0, normalizedLimit)
      .map((row) => {
        const room = accessible.get(row.roomId)!;
        return {
          ...this.toMessageDto(row),
          roomName: room.name,
          roomType: room.roomType,
        };
      });
  }

  // 채널의 고정 메시지 목록 (최신 고정이 위로)
  listPinnedMessages(roomId: string, user: MeetingUser) {
    this.findAccessibleRoom(roomId, user);
    const rows = this.db
      .select()
      .from(meetingMessagesTable)
      .where(
        and(
          eq(meetingMessagesTable.roomId, roomId),
          eq(meetingMessagesTable.pinned, true),
        ),
      )
      .orderBy(desc(meetingMessagesTable.createdAt))
      .all();
    return rows.map((row) => this.toMessageDto(row));
  }

  private findRoom(roomId: string) {
    const room = this.db
      .select()
      .from(meetingRoomsTable)
      .where(
        and(
          eq(meetingRoomsTable.id, roomId),
          eq(meetingRoomsTable.archived, false),
        ),
      )
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

  private toRoomDto(
    room: MeetingRoomRow,
    user?: MeetingUser,
    pair?: MeetingDmPairRow,
  ) {
    const countRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(meetingMessagesTable)
      .where(eq(meetingMessagesTable.roomId, room.id))
      .get();
    const dmCounterpart =
      room.roomType === 'DM' && user && pair
        ? this.getDmCounterpart(pair, user.id)
        : null;
    const isSelfDm =
      room.roomType === 'DM' && !!pair && pair.userAId === pair.userBId;

    return {
      id: room.id,
      name: isSelfDm ? '나와의 채팅' : (dmCounterpart?.name ?? room.name),
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
      pinned: row.pinned ?? false,
      createdAt: row.createdAt,
    };
  }

  private isVisibleMeetingMember(email: string) {
    if (email === 'seed@towercrane.local') return false;
    if (email === 'codex-upload-test@example.com') return false;
    if (email.startsWith('test-agent-') && email.endsWith('@example.com'))
      return false;
    if (email.startsWith('meeting-') && email.endsWith('@towercrane.local'))
      return false;
    return true;
  }

  private getDmCounterpart(pair: MeetingDmPairRow, currentUserId: string) {
    const otherUserId =
      pair.userAId === currentUserId ? pair.userBId : pair.userAId;
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
