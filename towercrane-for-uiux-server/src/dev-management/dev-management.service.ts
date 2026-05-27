import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import { CodeReviewsService } from '../code-reviews/code-reviews.service';
import { DatabaseService } from '../database/database.service';
import {
  devManagementBotSettingsTable,
  devManagementDmPairsTable,
  devManagementMessagesTable,
  devManagementRoomsTable,
  devMeetingMinutesTable,
  projectIssuesTable,
  prototypesTable,
  type DevMeetingMinutesInsert,
  tasksTable,
  usersTable,
  type DevManagementBotSettingsRow,
  type DevManagementDmPairRow,
  type DevManagementMessageInsert,
  type DevManagementMessageRow,
  type DevManagementMessageType,
  type DevManagementRoomInsert,
  type DevManagementRoomRow,
} from '../database/schema';
import {
  createDevManagementRoomSchema,
  sendDevManagementMessageSchema,
  startDevManagementDmSchema,
  updateDevManagementBotSettingsSchema,
} from './dev-management.schemas';

export type DevManagementUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
};

type DevMeetingMinutesStructure = {
  title: string;
  summary: string;
  discussionPoints: Array<{ text: string; sourceMessageIds: string[] }>;
  decisions: Array<{ text: string; sourceMessageIds: string[] }>;
  actionItems: Array<{
    text: string;
    assigneeName: string | null;
    dueDate: string | null;
    sourceMessageIds: string[];
  }>;
  openQuestions: Array<{ text: string; sourceMessageIds: string[] }>;
  sourceMessageIds: string[];
};

@Injectable()
export class DevManagementService {
  private readonly openai: OpenAI | null;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly codeReviewsService: CodeReviewsService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  private get db() {
    return this.databaseService.db;
  }

  listRooms(user: DevManagementUser) {
    const publicRooms = this.db
      .select()
      .from(devManagementRoomsTable)
      .where(
        and(
          eq(devManagementRoomsTable.archived, false),
          sql`${devManagementRoomsTable.roomType} != 'DM'`,
        ),
      )
      .orderBy(
        asc(devManagementRoomsTable.orderIdx),
        asc(devManagementRoomsTable.createdAt),
      )
      .all();

    const dmRooms = this.db
      .select({
        room: devManagementRoomsTable,
        pair: devManagementDmPairsTable,
      })
      .from(devManagementDmPairsTable)
      .innerJoin(
        devManagementRoomsTable,
        eq(devManagementRoomsTable.id, devManagementDmPairsTable.roomId),
      )
      .where(
        and(
          eq(devManagementRoomsTable.archived, false),
          sql`(${devManagementDmPairsTable.userAId} = ${user.id} OR ${devManagementDmPairsTable.userBId} = ${user.id})`,
        ),
      )
      .orderBy(desc(devManagementRoomsTable.updatedAt))
      .all();

    return [
      ...publicRooms.map((room) => this.toRoomDto(room, user)),
      ...dmRooms.map(({ room, pair }) => this.toRoomDto(room, user, pair)),
    ];
  }

  getRoom(roomId: string, user: DevManagementUser) {
    const { room, pair } = this.findAccessibleRoom(roomId, user);
    return this.toRoomDto(room, user, pair);
  }

  createRoom(user: DevManagementUser, payload: unknown) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can create dev channels');
    }
    const input = createDevManagementRoomSchema.parse(payload);
    if (input.roomType === 'DM') {
      throw new BadRequestException('Use DM endpoint to create DM rooms');
    }

    const now = new Date().toISOString();
    const maxOrder = this.db
      .select({ orderIdx: devManagementRoomsTable.orderIdx })
      .from(devManagementRoomsTable)
      .where(sql`${devManagementRoomsTable.roomType} != 'DM'`)
      .all()
      .reduce((max, row) => Math.max(max, row.orderIdx), -1);

    const room: DevManagementRoomInsert = {
      id: `dev-room-${randomUUID().slice(0, 12)}`,
      name: input.name,
      roomType: input.roomType,
      description: input.description ?? null,
      orderIdx: maxOrder + 1,
      archived: false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(devManagementRoomsTable).values(room).run();
    this.ensureBotSettings(room.id, user.id, now);
    return this.toRoomDto(this.findRoom(room.id), user);
  }

  deleteRoom(user: DevManagementUser, roomId: string) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete dev channels');
    }
    const room = this.findRoom(roomId);
    if (room.roomType === 'DM') {
      throw new BadRequestException('DM 채널은 삭제할 수 없습니다');
    }
    this.db
      .update(devManagementRoomsTable)
      .set({ archived: true, updatedAt: new Date().toISOString() })
      .where(eq(devManagementRoomsTable.id, roomId))
      .run();
    return { success: true, roomId };
  }

  listMessages(roomId: string, user: DevManagementUser, limit = 100) {
    this.findAccessibleRoom(roomId, user);
    const normalizedLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

    const rows = this.db
      .select()
      .from(devManagementMessagesTable)
      .where(eq(devManagementMessagesTable.roomId, roomId))
      .orderBy(desc(devManagementMessagesTable.createdAt))
      .limit(normalizedLimit)
      .all()
      .reverse();

    return rows.map((row) => this.toMessageDto(row));
  }

  clearMessages(roomId: string, user: DevManagementUser) {
    const { room } = this.findAccessibleRoom(roomId, user);
    if (room.roomType !== 'DM' && user.role !== 'admin') {
      throw new ForbiddenException('Only admins can clear dev channel messages');
    }

    const countRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(devManagementMessagesTable)
      .where(eq(devManagementMessagesTable.roomId, roomId))
      .get();
    const deletedCount = Number(countRow?.count ?? 0);
    const now = new Date().toISOString();

    this.db
      .delete(devManagementMessagesTable)
      .where(eq(devManagementMessagesTable.roomId, roomId))
      .run();
    this.db
      .update(devManagementRoomsTable)
      .set({ updatedAt: now })
      .where(eq(devManagementRoomsTable.id, roomId))
      .run();

    return { success: true, roomId, deletedCount };
  }

  async sendMessage(roomId: string, user: DevManagementUser, payload: unknown) {
    const { room } = this.findAccessibleRoom(roomId, user);
    const input = sendDevManagementMessageSchema.parse(payload);
    const now = new Date().toISOString();

    const userMessage: DevManagementMessageInsert = {
      id: `dev-msg-${randomUUID().slice(0, 12)}`,
      roomId,
      senderId: user.id,
      senderType: 'USER',
      senderName: user.name,
      senderRole: user.role,
      content: input.content,
      messageType: input.messageType,
      payload: input.payload ?? null,
      createdAt: now,
    };

    this.db.insert(devManagementMessagesTable).values(userMessage).run();
    this.db
      .update(devManagementRoomsTable)
      .set({ updatedAt: now })
      .where(eq(devManagementRoomsTable.id, room.id))
      .run();

    const savedUserMessage = this.db
      .select()
      .from(devManagementMessagesTable)
      .where(eq(devManagementMessagesTable.id, userMessage.id))
      .get();

    const messages = [this.toMessageDto(savedUserMessage ?? userMessage)];
    const botSettings = this.getBotSettings(roomId, user);

    if (this.shouldBotReply(input.content, botSettings, input.target)) {
      const botMessage = await this.createBotReply(
        roomId,
        input.content,
        now,
        user,
        input.payload ?? null,
      );
      messages.push(this.toMessageDto(botMessage));
    }

    return { messages };
  }

  listMembers(roomId: string, user: DevManagementUser) {
    this.findAccessibleRoom(roomId, user);

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

    const users = rows
      .filter((row) => this.isVisibleDevMember(row.email))
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        memberType: 'USER' as const,
        online: false,
      }));

    return [
      ...users,
      {
        id: 'dev-management-bot',
        name: '개발 관리 봇',
        email: 'dev-management-bot@towercrane.local',
        role: 'bot' as const,
        memberType: 'BOT' as const,
        online: true,
      },
    ];
  }

  getBotSettings(roomId: string, user: DevManagementUser) {
    this.findAccessibleRoom(roomId, user);
    return this.getOrCreateBotSettings(roomId, user.id);
  }

  updateBotSettings(roomId: string, user: DevManagementUser, payload: unknown) {
    this.findAccessibleRoom(roomId, user);
    const input = updateDevManagementBotSettingsSchema.parse(payload);
    const current = this.getOrCreateBotSettings(roomId, user.id);
    const next = {
      enabled: input.enabled ?? current.enabled,
      responseMode: input.responseMode ?? current.responseMode,
      updatedBy: user.id,
      updatedAt: new Date().toISOString(),
    };

    this.db
      .update(devManagementBotSettingsTable)
      .set(next)
      .where(eq(devManagementBotSettingsTable.roomId, roomId))
      .run();

    return this.getOrCreateBotSettings(roomId, user.id);
  }

  startDm(user: DevManagementUser, payload: unknown) {
    const input = startDevManagementDmSchema.parse(payload);
    if (input.otherUserId === user.id) {
      throw new BadRequestException('Cannot open DM with yourself');
    }

    const otherUser = this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.otherUserId))
      .get();

    if (!otherUser || !this.isVisibleDevMember(otherUser.email)) {
      throw new NotFoundException(`User not found: ${input.otherUserId}`);
    }

    const [userAId, userBId] = [user.id, otherUser.id].sort();
    const existingPair = this.db
      .select()
      .from(devManagementDmPairsTable)
      .where(
        and(
          eq(devManagementDmPairsTable.userAId, userAId),
          eq(devManagementDmPairsTable.userBId, userBId),
        ),
      )
      .get();

    if (existingPair) {
      const room = this.findRoom(existingPair.roomId);
      return this.toRoomDto(room, user, existingPair);
    }

    const now = new Date().toISOString();
    const room: DevManagementRoomInsert = {
      id: `dev-dm-${randomUUID().slice(0, 12)}`,
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
      id: `dev-dm-pair-${randomUUID().slice(0, 12)}`,
      roomId: room.id,
      userAId,
      userBId,
      createdAt: now,
    };

    this.db.insert(devManagementRoomsTable).values(room).run();
    this.db.insert(devManagementDmPairsTable).values(pair).run();
    this.ensureBotSettings(room.id, user.id, now);

    return this.toRoomDto(this.findRoom(room.id), user, pair);
  }

  private findRoom(roomId: string) {
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
      throw new NotFoundException(`Dev management room not found: ${roomId}`);
    }

    return room;
  }

  private findAccessibleRoom(roomId: string, user: DevManagementUser) {
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
      .from(devManagementDmPairsTable)
      .where(eq(devManagementDmPairsTable.roomId, roomId))
      .get();
  }

  private getOrCreateBotSettings(roomId: string, updatedBy: string) {
    const existing = this.db
      .select()
      .from(devManagementBotSettingsTable)
      .where(eq(devManagementBotSettingsTable.roomId, roomId))
      .get();

    if (existing) return this.toBotSettingsDto(existing);

    const now = new Date().toISOString();
    this.ensureBotSettings(roomId, updatedBy, now);
    const created = this.db
      .select()
      .from(devManagementBotSettingsTable)
      .where(eq(devManagementBotSettingsTable.roomId, roomId))
      .get();

    if (!created) {
      throw new NotFoundException(`Bot settings not found: ${roomId}`);
    }

    return this.toBotSettingsDto(created);
  }

  private ensureBotSettings(roomId: string, updatedBy: string, now: string) {
    this.db
      .insert(devManagementBotSettingsTable)
      .values({
        roomId,
        enabled: true,
        responseMode: 'MENTION_ONLY',
        updatedBy,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .run();
  }

  private shouldBotReply(
    content: string,
    settings: ReturnType<DevManagementService['toBotSettingsDto']>,
    target: 'ROOM' | 'BOT' = 'ROOM',
  ) {
    if (!settings.enabled) return false;
    if (target === 'BOT') return true;
    if (settings.responseMode === 'DIRECT_ONLY') return false;
    return this.isBotMentioned(content);
  }

  private isBotMentioned(content: string) {
    return content.includes('@개발관리봇') || content.includes('@개발 관리 봇');
  }

  private async createBotReply(
    roomId: string,
    userContent: string,
    now: string,
    user: DevManagementUser,
    payload: Record<string, unknown> | null,
  ) {
    const reply = await this.buildBotReply(roomId, userContent, user, payload);
    const botMessage: DevManagementMessageInsert = {
      id: `dev-bot-${randomUUID().slice(0, 12)}`,
      roomId,
      senderId: null,
      senderType: 'BOT',
      senderName: '개발 관리 봇',
      senderRole: 'bot',
      content: reply.content,
      messageType: reply.messageType,
      payload: reply.payload,
      createdAt: now,
    };

    this.db.insert(devManagementMessagesTable).values(botMessage).run();
    return (
      this.db
        .select()
        .from(devManagementMessagesTable)
        .where(eq(devManagementMessagesTable.id, botMessage.id))
        .get() ?? botMessage
    );
  }

  private async buildBotReply(
    roomId: string,
    userContent: string,
    user: DevManagementUser,
    payload: Record<string, unknown> | null,
  ): Promise<{
    content: string;
    messageType: DevManagementMessageType;
    payload: Record<string, unknown>;
  }> {
    if (this.isMeetingMinutesSaveRequest(userContent)) {
      return this.buildMeetingMinutesSavedReply(roomId, user, payload);
    }
    if (this.isCodeReviewRequest(userContent)) {
      return this.buildCodeReviewSavedReply(userContent, user);
    }
    if (this.isSummaryRequest(userContent)) {
      return this.buildMeetingSummaryReply(roomId);
    }
    if (this.isPrototypeSearchRequest(userContent)) {
      return this.buildPrototypeSearchReply(userContent);
    }
    if (this.isTechDebtRequest(userContent)) {
      return this.buildTechDebtReply(roomId);
    }
    return this.buildGeneralQuestionReply(userContent);
  }

  private isSummaryRequest(content: string) {
    return (
      content.includes('회의') ||
      content.includes('요약') ||
      content.includes('정리')
    );
  }

  private isMeetingMinutesSaveRequest(content: string) {
    const normalized = content.replace(/\s+/g, '');
    return (
      normalized.includes('회의록저장') ||
      normalized.includes('회의요약저장') ||
      normalized.includes('회의록으로저장') ||
      normalized.includes('요약해서저장') ||
      normalized.includes('최근대화회의록') ||
      normalized.includes('오늘대화회의록') ||
      normalized.includes('회의록만들어') ||
      normalized.includes('회의록으로남겨')
    );
  }

  private isCodeReviewRequest(content: string) {
    return (
      /https?:\/\/github\.com\/[^\s<>)\]]+/i.test(content) &&
      /코드\s?리뷰|리뷰|검토|분석|저장|diff/i.test(content)
    );
  }

  private isPrototypeSearchRequest(content: string) {
    const normalized = content.replace(/\s+/g, '').toLowerCase();
    return (
      normalized.includes('프로토타입') ||
      normalized.includes('prototype') ||
      (content.includes('프로토') &&
        /관련|있어|있나|찾|검색|추천|참고/.test(content)) ||
      content.includes('참고')
    );
  }

  private isTechDebtRequest(content: string) {
    return (
      content.includes('부채') ||
      content.includes('리팩토링') ||
      content.includes('히스토리') ||
      content.includes('개선')
    );
  }

  private async buildGeneralQuestionReply(userContent: string): Promise<{
    content: string;
    messageType: DevManagementMessageType;
    payload: Record<string, unknown>;
  }> {
    const question = this.stripBotMention(userContent);
    const localAnswer = this.answerLocalGeneralQuestion(question);
    if (localAnswer) {
      return {
        content: localAnswer,
        messageType: 'BOT_REPLY',
        payload: {
          toolName: 'general_question',
          responseMode: 'local_fallback',
          sourceCount: 0,
        },
      };
    }

    if (this.openai) {
      try {
        const model =
          this.configService.get<string>('OPENAI_DEFAULT_MODEL') ??
          'gpt-4o-mini';
        const response = await this.openai.chat.completions.create({
          model,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content:
                '너는 개발 채팅방에 참여한 개발 관리 봇이다. 사용자의 일반 질문에는 간결하고 정확하게 한국어로 답한다. 프로젝트 내부 데이터가 필요한 질문은 추측하지 말고 현재 연결된 자료가 부족하다고 말한다.',
            },
            { role: 'user', content: question },
          ],
        });
        const content = response.choices[0]?.message.content?.trim();
        if (content) {
          return {
            content,
            messageType: 'BOT_REPLY',
            payload: {
              toolName: 'general_question',
              responseMode: 'llm',
              model,
              sourceCount: 0,
            },
          };
        }
      } catch {
        // 일반 질의는 채팅 흐름을 막지 않도록 로컬 fallback으로 내려간다.
      }
    }

    return {
      content:
        '일반 질문으로 이해했습니다. 현재 로컬 테스트 환경에서는 LLM 연결이 없어서 정확한 답변을 생성하지 못했습니다. OPENAI_API_KEY가 설정되면 이 경로에서 단순 질의도 바로 답변합니다.',
      messageType: 'BOT_REPLY',
      payload: {
        toolName: 'general_question',
        responseMode: 'llm_unavailable',
        sourceCount: 0,
      },
    };
  }

  private stripBotMention(content: string) {
    return content.replace(/@개발\s?관리봇/g, '').trim();
  }

  private answerLocalGeneralQuestion(question: string) {
    const normalized = question.replace(/\s+/g, '');
    if (
      normalized.includes('제주도') &&
      normalized.includes('높은') &&
      normalized.includes('산')
    ) {
      return '제주도에서 제일 높은 산은 한라산입니다. 해발 높이는 약 1,947m입니다.';
    }
    return null;
  }

  private buildMeetingSummaryReply(roomId: string) {
    const minutes = this.summarizeDevMeeting(roomId, 30);
    const sourceCount = minutes.sourceMessageIds.length;

    const content = [
      '회의 요약 초안입니다.',
      '',
      `- 대화 범위: 최근 ${sourceCount}개 사용자 메시지`,
      `- 핵심 논의: ${minutes.discussionPoints.map((item) => item.text).join(' / ') || '아직 요약할 대화가 부족합니다.'}`,
      `- 결정 후보: ${minutes.decisions.map((item) => item.text).join(' / ') || '명시적인 결정 후보가 없습니다.'}`,
      `- 액션 아이템 후보: ${minutes.actionItems.map((item) => item.text).join(' / ') || '명시적인 액션 후보가 없습니다.'}`,
      '',
      '저장하려면 "최근 대화 회의록으로 저장해줘"처럼 요청하세요.',
    ].join('\n');

    return {
      content,
      messageType: 'SUMMARY' as const,
      payload: {
        toolName: 'summarize_dev_meeting',
        sourceCount,
        minutes,
      },
    };
  }

  private buildMeetingMinutesSavedReply(
    roomId: string,
    user: DevManagementUser,
    payload: Record<string, unknown> | null,
  ) {
    const selectedSourceMessageIds = this.getSelectedSourceMessageIds(payload);
    const minutes = this.summarizeDevMeeting(
      roomId,
      80,
      selectedSourceMessageIds,
    );

    if (minutes.sourceMessageIds.length < 2) {
      return {
        content:
          '회의록 저장에 실패했습니다.\n\n사유: 최근 사용자 메시지가 2개 미만이라 회의록으로 저장할 대화가 부족합니다.',
        messageType: 'TOOL_RESULT' as const,
        payload: {
          toolName: 'save_dev_meeting_minutes',
          status: 'failed',
          reason: 'INSUFFICIENT_MESSAGES',
          sourceCount: minutes.sourceMessageIds.length,
          selectedSourceMessageIds,
        },
      };
    }

    const duplicate = this.findDuplicateMeetingMinutes(
      roomId,
      minutes.sourceMessageIds,
    );

    if (duplicate) {
      const url = `/dev-meeting-minutes/${duplicate.id}`;
      return {
        content: [
          '이미 같은 대화 범위로 저장된 회의록이 있습니다.',
          '',
          `제목: ${duplicate.title}`,
          `열기: ${url}`,
        ].join('\n'),
        messageType: 'MEETING_MINUTES_SAVED' as const,
        payload: {
          toolName: 'save_dev_meeting_minutes',
          status: 'duplicate',
          minutes: {
            id: duplicate.id,
            url,
            title: duplicate.title,
            summary: duplicate.summary,
            decisionCount: duplicate.decisions.length,
          actionItemCount: duplicate.actionItems.length,
          },
          sourceCount: minutes.sourceMessageIds.length,
          selectedSourceMessageIds,
        },
      };
    }

    const saved = this.saveDevMeetingMinutes(roomId, minutes, user);
    const url = `/dev-meeting-minutes/${saved.id}`;

    return {
      content: [
        '회의록을 저장했습니다.',
        '',
        `제목: ${saved.title}`,
        `요약: ${this.compactContent(saved.summary, 120)}`,
        `결정사항: ${saved.decisions.length}개`,
        `액션 아이템: ${saved.actionItems.length}개`,
        '',
        `열기: ${url}`,
      ].join('\n'),
      messageType: 'MEETING_MINUTES_SAVED' as const,
      payload: {
        toolName: 'save_dev_meeting_minutes',
        status: 'saved',
        minutes: {
          id: saved.id,
          url,
          title: saved.title,
          summary: saved.summary,
          decisionCount: saved.decisions.length,
          actionItemCount: saved.actionItems.length,
        },
        sourceCount: minutes.sourceMessageIds.length,
        selectedSourceMessageIds,
      },
    };
  }

  private async buildCodeReviewSavedReply(
    userContent: string,
    user: DevManagementUser,
  ): Promise<{
    content: string;
    messageType: DevManagementMessageType;
    payload: Record<string, unknown>;
  }> {
    const sourceUrl = this.extractGithubUrl(userContent);
    if (!sourceUrl) {
      return {
        content:
          '코드 리뷰 저장에 실패했습니다.\n\n사유: GitHub commit, PR, compare, .diff URL을 찾지 못했습니다.',
        messageType: 'TOOL_RESULT' as const,
        payload: {
          toolName: 'save_code_review',
          status: 'failed',
          reason: 'MISSING_GITHUB_URL',
        },
      };
    }

    try {
      const review = await this.codeReviewsService.analyzeAndSave(user, {
        sourceUrl,
      });
      const reviewUrl = `/code-reviews/${review.id}`;
      const duplicate = Boolean(
        (review as Record<string, unknown>).duplicate,
      );
      const content = [
        duplicate
          ? '이미 같은 diff로 저장된 코드 리뷰가 있습니다.'
          : '코드 리뷰를 저장했습니다.',
        '',
        `제목: ${review.title}`,
        `위험도: ${this.codeReviewRiskLabel(review.riskLevel)}`,
        `평가 항목: ${review.findingCount}개`,
        `보조 확인: ${review.testGapCount}개`,
        '',
        `열기: ${reviewUrl}`,
      ].join('\n');

      return {
        content,
        messageType: 'CODE_REVIEW_SAVED' as const,
        payload: {
          toolName: 'save_code_review',
          status: duplicate ? 'duplicate' : 'saved',
          review: {
            id: review.id,
            url: reviewUrl,
            title: review.title,
            repository: review.repository,
            sourceType: review.sourceType,
            sourceUrl: review.sourceUrl,
            riskLevel: review.riskLevel,
            findingCount: review.findingCount,
            highSeverityCount: review.highSeverityCount,
            testGapCount: review.testGapCount,
            changedFileCount: review.changedFileCount,
            excludedFileCount: review.excludedFileCount,
          },
        },
      };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : '코드 리뷰 생성 중 오류가 발생했습니다.';
      return {
        content: `코드 리뷰 저장에 실패했습니다.\n\n사유: ${reason}`,
        messageType: 'TOOL_RESULT' as const,
        payload: {
          toolName: 'save_code_review',
          status: 'failed',
          reason,
          sourceUrl,
        },
      };
    }
  }

  private extractGithubUrl(content: string) {
    return (
      content
        .match(/https?:\/\/github\.com\/[^\s<>)\]]+/i)?.[0]
        ?.replace(/[.,;!?]+$/g, '') ?? null
    );
  }

  private codeReviewRiskLabel(riskLevel: string) {
    if (riskLevel === 'high') return '높음';
    if (riskLevel === 'medium') return '중간';
    return '낮음';
  }

  private summarizeDevMeeting(
    roomId: string,
    limit: number,
    selectedSourceMessageIds: string[] | null = null,
  ): DevMeetingMinutesStructure {
    const room = this.findRoom(roomId);
    const selectedIdSet =
      selectedSourceMessageIds && selectedSourceMessageIds.length > 0
        ? new Set(selectedSourceMessageIds)
        : null;
    const recentMessages = this.db
      .select()
      .from(devManagementMessagesTable)
      .where(eq(devManagementMessagesTable.roomId, roomId))
      .orderBy(desc(devManagementMessagesTable.createdAt))
      .limit(limit)
      .all()
      .reverse()
      .filter((message) => message.senderType === 'USER')
      .filter((message) => this.stripBotMention(message.content))
      .filter((message) => !selectedIdSet || selectedIdSet.has(message.id));

    const actionCandidates = recentMessages.filter((message) =>
      /해야|진행|확인|추가|수정|정리|검토|연결|구현|배포/.test(message.content),
    );
    const decisionCandidates = recentMessages.filter((message) =>
      /결정|확정|가자|진행하겠습니다|맞습니다|좋습니다|기준|완료/.test(
        message.content,
      ),
    );
    const unresolvedCandidates = recentMessages.filter((message) =>
      /미해결|이슈|문제|리스크|막힘|블로커|장애|오류|버그|미정|보류|확인 필요|확인필요|검토 필요|검토필요|논의 필요|논의필요/.test(
        message.content,
      ),
    );

    const toTextItem = (message: DevManagementMessageRow) => ({
      text: `${message.senderName}: ${this.compactContent(message.content, 90)}`,
      sourceMessageIds: [message.id],
    });

    const discussionPoints = recentMessages.slice(-5).map(toTextItem);
    const decisions = decisionCandidates.slice(-4).map(toTextItem);
    const actionItems = actionCandidates.slice(-5).map((message) => ({
      text: `${message.senderName}: ${this.compactContent(message.content, 90)}`,
      assigneeName: message.senderName,
      dueDate: null,
      sourceMessageIds: [message.id],
    }));
    const openQuestions = unresolvedCandidates.slice(-4).map(toTextItem);
    const sourceMessageIds = recentMessages.map((message) => message.id);

    return {
      title: `${room.name} 회의록`,
      summary:
        discussionPoints.length > 0
          ? discussionPoints.map((item) => item.text).join('\n')
          : '요약할 개발 채팅 메시지가 부족합니다.',
      discussionPoints,
      decisions,
      actionItems,
      openQuestions,
      sourceMessageIds,
    };
  }

  private getSelectedSourceMessageIds(payload: Record<string, unknown> | null) {
    const value = payload?.sourceMessageIds;
    if (!Array.isArray(value)) return null;
    const ids = value.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
    return ids.length > 0 ? [...new Set(ids)] : null;
  }

  private findDuplicateMeetingMinutes(roomId: string, sourceMessageIds: string[]) {
    const rows = this.db
      .select()
      .from(devMeetingMinutesTable)
      .where(eq(devMeetingMinutesTable.roomId, roomId))
      .orderBy(desc(devMeetingMinutesTable.createdAt))
      .limit(30)
      .all();
    const sourceKey = JSON.stringify(sourceMessageIds);

    return rows.find((row) => JSON.stringify(row.sourceMessageIds) === sourceKey);
  }

  private saveDevMeetingMinutes(
    roomId: string,
    minutes: DevMeetingMinutesStructure,
    user: DevManagementUser,
  ) {
    const now = new Date().toISOString();
    const row: DevMeetingMinutesInsert = {
      id: `dev-min-${randomUUID().slice(0, 12)}`,
      roomId,
      title: minutes.title,
      summary: minutes.summary,
      discussionPoints: minutes.discussionPoints,
      decisions: minutes.decisions,
      actionItems: minutes.actionItems,
      openQuestions: minutes.openQuestions,
      sourceMessageIds: minutes.sourceMessageIds,
      createdBy: user.id,
      createdByName: user.name || user.email,
      createdAt: now,
      updatedAt: now,
    };

    this.db.insert(devMeetingMinutesTable).values(row).run();
    const saved = this.db
      .select()
      .from(devMeetingMinutesTable)
      .where(eq(devMeetingMinutesTable.id, row.id))
      .get();

    if (!saved) {
      throw new NotFoundException(`Saved meeting minutes not found: ${row.id}`);
    }

    return saved;
  }

  private buildPrototypeSearchReply(userContent: string) {
    const query = this.stripBotMention(userContent);
    const terms = this.extractSearchTerms(userContent);
    const phrase = this.extractPrimarySearchPhrase(terms);
    const toolCall = {
      name: 'search_internal_prototypes',
      arguments: {
        query,
        phrase,
        terms,
        limit: 5,
      },
    };
    const toolResult = this.executePrototypeSearchTool(toolCall.arguments);

    const lines = toolResult.items.map((item, index) => {
      const url = item.demoUrl || item.figmaUrl || item.repoUrl;
      const scoreLabel = item.score > 0 ? `매칭 ${item.score}` : '최근 항목';
      return `${index + 1}. ${item.title} (${scoreLabel})\n   - ${item.summary}\n   - ${url}`;
    });
    const summary =
      toolResult.items.length > 0
        ? `네. 이름/설명 기준으로 관련 프로토타입 ${toolResult.items.length}건을 찾았습니다.`
        : `현재 등록된 프로토타입의 이름/설명 기준으로는 관련 항목을 찾지 못했습니다.`;

    return {
      content: [
        summary,
        '',
        lines.join('\n') || '검색어를 조금 바꿔 다시 물어보거나 새 프로토타입을 등록해 주세요.',
        '',
        `검색 기준: ${toolResult.phrase || toolResult.terms.join(' ') || '없음'}`,
        `검색어 후보: ${toolResult.terms.join(', ') || '없음'}`,
      ].join('\n'),
      messageType: 'PROTOTYPE_SEARCH_RESULT' as const,
      payload: {
        toolName: 'search_internal_prototypes',
        searchFields: ['title', 'summary'],
        toolCall,
        toolResult,
        phrase: toolResult.phrase,
        terms: toolResult.terms,
        sourceCount: toolResult.items.length,
        results: toolResult.items,
        sources: toolResult.items,
      },
    };
  }

  private executePrototypeSearchTool(input: {
    query: string;
    phrase?: string;
    terms: string[];
    limit: number;
  }) {
    const prototypes = this.db
      .select()
      .from(prototypesTable)
      .orderBy(desc(prototypesTable.updatedAt))
      .limit(80)
      .all();
    const terms =
      input.terms.length > 0 ? input.terms : this.extractSearchTerms(input.query);
    const phrase = input.phrase ?? this.extractPrimarySearchPhrase(terms);
    const limit = Math.min(Math.max(input.limit, 1), 10);

    const scored = prototypes
      .map((prototype) => ({
        prototype,
        score: this.scorePrototype(prototype, terms, phrase),
      }))
      .filter((item) => item.score > 0);
    const phraseScored = phrase
      ? scored.filter((item) =>
          this.prototypeMatchesPhrase(item.prototype, phrase),
        )
      : [];
    const strictScored =
      terms.length > 1
        ? scored.filter((item) =>
            this.prototypeMatchesAllTerms(item.prototype, terms),
          )
        : scored;
    const matched =
      phraseScored.length > 0
        ? phraseScored
        : terms.length > 1
          ? strictScored
          : scored;

    const ranked = matched
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const fallback =
      terms.length === 0
        ? prototypes.slice(0, limit).map((prototype) => ({
            prototype,
            score: 0,
          }))
        : [];
    const results = ranked.length > 0 ? ranked : fallback;

    return {
      phrase,
      terms,
      items: results.map(({ prototype, score }) => ({
        id: prototype.id,
        categoryId: prototype.categoryId,
        title: prototype.title,
        summary: prototype.summary,
        status: prototype.status,
        visibility: prototype.visibility,
        score,
        demoUrl: prototype.demoUrl,
        figmaUrl: prototype.figmaUrl,
        repoUrl: prototype.repoUrl,
        internalUrl: `/prototype/${prototype.categoryId}?prototypeId=${prototype.id}`,
        updatedAt: prototype.updatedAt,
      })),
    };
  }

  private buildTechDebtReply(roomId: string) {
    const tasks = this.db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.archived, false))
      .orderBy(desc(tasksTable.updatedAt))
      .limit(80)
      .all();
    const issues = this.db
      .select()
      .from(projectIssuesTable)
      .where(eq(projectIssuesTable.archived, false))
      .orderBy(desc(projectIssuesTable.updatedAt))
      .limit(80)
      .all();
    const messages = this.db
      .select()
      .from(devManagementMessagesTable)
      .where(eq(devManagementMessagesTable.roomId, roomId))
      .orderBy(desc(devManagementMessagesTable.createdAt))
      .limit(50)
      .all();

    const staleTasks = tasks
      .filter((task) => task.status !== 'DONE')
      .filter((task) =>
        /리팩토링|부채|임시|TODO|개선|복잡|테스트|정리/i.test(
          `${task.title} ${task.content}`,
        ),
      )
      .slice(0, 5);
    const openIssues = issues
      .filter((issue) => issue.status !== 'CLOSED')
      .filter(
        (issue) =>
          issue.priority === 'HIGH' ||
          issue.priority === 'URGENT' ||
          /반복|장애|오류|복잡|부채|개선|느림|성능/i.test(
            `${issue.title} ${issue.content}`,
          ),
      )
      .slice(0, 5);
    const debtMessages = messages
      .filter((message) =>
        /부채|리팩토링|임시|나중|복잡|깨짐|테스트|정리|개선/i.test(
          message.content,
        ),
      )
      .slice(0, 5);

    const sections = [
      this.formatDebtSection(
        '업무 히스토리 후보',
        staleTasks.map((task) => ({
          id: task.id,
          title: task.title,
          detail: `${task.status} / ${task.priority}`,
        })),
      ),
      this.formatDebtSection(
        '이슈 후보',
        openIssues.map((issue) => ({
          id: issue.id,
          title: issue.title,
          detail: `${issue.status} / ${issue.priority}`,
        })),
      ),
      this.formatDebtSection(
        '채팅 근거 후보',
        debtMessages.map((message) => ({
          id: message.id,
          title: this.compactContent(message.content, 70),
          detail: `${message.senderName} / ${message.createdAt}`,
        })),
      ),
    ];

    return {
      content: [
        '기술 부채 분석 후보입니다.',
        '',
        ...sections,
        '',
        '판단 기준: 완료되지 않은 업무, 높은 우선순위의 열린 이슈, 채팅에서 반복적으로 언급된 개선/임시/복잡도 신호를 후보로만 제시합니다.',
      ].join('\n'),
      messageType: 'TECH_DEBT_ANALYSIS' as const,
      payload: {
        toolName: 'analyze_technical_debt_candidates',
        sourceCount:
          staleTasks.length + openIssues.length + debtMessages.length,
        sources: {
          tasks: staleTasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
          })),
          issues: openIssues.map((issue) => ({
            id: issue.id,
            title: issue.title,
            status: issue.status,
            priority: issue.priority,
          })),
          messages: debtMessages.map((message) => ({
            id: message.id,
            senderName: message.senderName,
            createdAt: message.createdAt,
          })),
        },
      },
    };
  }

  private pickMessageSummaries(
    messages: DevManagementMessageRow[],
    limit: number,
  ) {
    return messages
      .slice(-limit)
      .map(
        (message) =>
          `${message.senderName}: ${this.compactContent(message.content)}`,
      );
  }

  private compactContent(content: string, limit = 48) {
    const cleaned = content.replace(/@개발\s?관리봇/g, '').trim();
    if (cleaned.length <= limit) return cleaned;
    return `${cleaned.slice(0, limit - 1)}...`;
  }

  private extractSearchTerms(content: string) {
    const stopWords = new Set([
      '개발관리봇',
      '개발',
      '관리',
      '프로토타입',
      '프로토',
      '타입',
      '참고',
      '검색',
      '찾아줘',
      '찾아',
      '추천',
      '해줘',
      '알려줘',
      '이',
      '주제',
      '화면',
      '관련',
      '중에',
      '있어',
      '있나',
      '있나요',
      '있냐',
      '있니',
      '없어',
      '없나',
      '없나요',
      '있을까',
      '있습니까',
      '있나요?',
      '있나?',
      '있냐?',
      '있음',
      '있는',
      '있',
      '좀',
      '중',
      '중에서',
      '대한',
      '으로',
      '으로는',
      '으로서',
      '관련된',
      '관한',
      '것',
    ]);
    const normalizeTerm = (term: string) =>
      term
        .trim()
        .toLowerCase()
        .replace(
          /(관련|프로토타입|프로토|타입|있나요|있나|있냐|있니|있어|있을까|있습니까|없나요|없나|없어|좀|중에|중에서|으로는|으로서|으로|대한|관한|것)+$/g,
          '',
        )
        .replace(/(에서|부터|까지)$/g, '')
        .replace(/[은는이가을를과와도만에의]$/g, '');
    return Array.from(
      new Set(
        content
          .replace(/@개발\s?관리봇/g, ' ')
          .split(/[^0-9A-Za-z가-힣]+/)
          .map((term) => normalizeTerm(term))
          .filter((term) => term.length >= 2 && !stopWords.has(term)),
      ),
    ).slice(0, 8);
  }

  private extractPrimarySearchPhrase(terms: string[]) {
    if (terms.length === 0) return '';
    if (terms.length === 1) return terms[0];
    return terms.slice(0, 2).join(' ');
  }

  private scorePrototype(
    prototype: {
      title: string;
      summary: string;
      notes: string | null;
      checklist: string[];
    },
    terms: string[],
    phrase = '',
  ) {
    if (terms.length === 0) return 1;
    const title = prototype.title.toLowerCase();
    const summary = prototype.summary.toLowerCase();
    const phraseScore = phrase
      ? (this.textIncludesPhrase(title, phrase) ? 10 : 0) +
        (this.textIncludesPhrase(summary, phrase) ? 7 : 0)
      : 0;

    return terms.reduce((score, term) => {
      if (title.includes(term)) return score + 3;
      if (summary.includes(term)) return score + 2;
      return score;
    }, phraseScore);
  }

  private prototypeMatchesPhrase(
    prototype: {
      title: string;
      summary: string;
    },
    phrase: string,
  ) {
    return (
      this.textIncludesPhrase(prototype.title, phrase) ||
      this.textIncludesPhrase(prototype.summary, phrase)
    );
  }

  private prototypeMatchesAllTerms(
    prototype: {
      title: string;
      summary: string;
    },
    terms: string[],
  ) {
    const searchable = `${prototype.title} ${prototype.summary}`.toLowerCase();
    return terms.every((term) => searchable.includes(term));
  }

  private textIncludesPhrase(text: string, phrase: string) {
    const normalizedText = text.toLowerCase();
    const normalizedPhrase = phrase.toLowerCase().trim();
    if (!normalizedPhrase) return false;
    return (
      normalizedText.includes(normalizedPhrase) ||
      normalizedText.replace(/\s+/g, '').includes(
        normalizedPhrase.replace(/\s+/g, ''),
      )
    );
  }

  private formatDebtSection(
    title: string,
    items: Array<{ id: string; title: string; detail: string }>,
  ) {
    if (items.length === 0) return `- ${title}: 후보 없음`;
    return [
      `- ${title}`,
      ...items.map(
        (item, index) => `  ${index + 1}. ${item.title} (${item.detail})`,
      ),
    ].join('\n');
  }

  private toRoomDto(
    room: DevManagementRoomRow,
    user?: DevManagementUser,
    pair?: DevManagementDmPairRow,
  ) {
    const countRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(devManagementMessagesTable)
      .where(eq(devManagementMessagesTable.roomId, room.id))
      .get();
    const dmCounterpart =
      room.roomType === 'DM' && user && pair
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

  private toMessageDto(
    row: DevManagementMessageRow | DevManagementMessageInsert,
  ) {
    return {
      id: row.id,
      roomId: row.roomId,
      senderId: row.senderId,
      senderType: row.senderType,
      senderName: row.senderName,
      senderRole: row.senderRole,
      content: row.content,
      messageType: row.messageType,
      payload: row.payload ?? null,
      createdAt: row.createdAt,
    };
  }

  private toBotSettingsDto(row: DevManagementBotSettingsRow) {
    return {
      roomId: row.roomId,
      enabled: row.enabled,
      responseMode: row.responseMode,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  }

  private isVisibleDevMember(email: string) {
    if (email === 'seed@towercrane.local') return false;
    if (email === 'codex-upload-test@example.com') return false;
    if (email.startsWith('test-agent-') && email.endsWith('@example.com')) {
      return false;
    }
    if (email.startsWith('meeting-') && email.endsWith('@towercrane.local')) {
      return false;
    }
    return true;
  }

  private getDmCounterpart(
    pair: DevManagementDmPairRow,
    currentUserId: string,
  ) {
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
