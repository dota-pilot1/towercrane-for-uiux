import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MeetingGateway } from './meeting.gateway';
import { MeetingService, type MeetingUser } from './meeting.service';

@Controller('meeting')
@UseGuards(AuthGuard)
export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly meetingGateway: MeetingGateway,
  ) {}

  // --- workspace routes (static before :param) ---

  @Get('workspaces')
  listWorkspaces(@CurrentUser() user: MeetingUser) {
    return this.meetingService.listWorkspaces(user);
  }

  @Post('workspaces')
  createWorkspace(@CurrentUser() user: MeetingUser, @Body() body: unknown) {
    return this.meetingService.createWorkspace(user, body);
  }

  @Post('workspaces/reorder')
  reorderWorkspaces(@CurrentUser() user: MeetingUser, @Body() body: unknown) {
    return this.meetingService.reorderWorkspaces(user, body);
  }

  @Get('workspaces/:workspaceId/rooms')
  listWorkspaceRooms(
    @CurrentUser() user: MeetingUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.meetingService.listWorkspaceRooms(user, workspaceId);
  }

  @Post('workspaces/:workspaceId/rooms')
  createWorkspaceRoom(
    @CurrentUser() user: MeetingUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.meetingService.createWorkspaceRoom(user, workspaceId, body);
  }

  @Patch('workspaces/:workspaceId')
  updateWorkspace(
    @CurrentUser() user: MeetingUser,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.meetingService.updateWorkspace(user, workspaceId, body);
  }

  @Delete('workspaces/:workspaceId')
  deleteWorkspace(
    @CurrentUser() user: MeetingUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.meetingService.deleteWorkspace(user, workspaceId);
  }

  // --- room routes ---

  @Get('rooms')
  listRooms(@CurrentUser() user: MeetingUser) {
    return this.meetingService.listRooms(user);
  }

  @Post('rooms')
  createRoom(@CurrentUser() user: MeetingUser, @Body() body: unknown) {
    return this.meetingService.createRoom(user, body);
  }

  @Delete('rooms/:roomId')
  deleteRoom(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
  ) {
    return this.meetingService.deleteRoom(user, roomId);
  }

  @Get('rooms/:roomId')
  getRoom(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
  ) {
    return this.meetingService.getRoom(roomId, user);
  }

  @Get('rooms/:roomId/messages')
  listMessages(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
  ) {
    return this.meetingService.listMessages(roomId, user, Number(limit) || 100);
  }

  @Get('rooms/:roomId/members')
  listMembers(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
  ) {
    const storedMembers = this.meetingService.listMembers(roomId, user);
    const onlineMembers = this.meetingGateway.getPresenceMembers();
    const map = new Map(storedMembers.map((member) => [member.id, member]));

    for (const member of onlineMembers) {
      map.set(member.id, { ...member, online: true });
    }

    return Array.from(map.values());
  }

  @Post('dms')
  startDm(
    @CurrentUser() user: MeetingUser,
    @Body() body: unknown,
  ) {
    return this.meetingService.startDm(user, body);
  }

  @Post('rooms/:roomId/leave')
  leaveDm(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
  ) {
    return this.meetingService.leaveDm(user, roomId);
  }

  @Post('rooms/:roomId/messages')
  sendMessage(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
    @Body() body: unknown,
  ) {
    const saved = this.meetingService.sendMessage(roomId, user, body);
    this.meetingGateway.broadcastMeetingMessage(roomId, saved);
    // 인박스(안읽음/알림)용 — 채널은 전체, DM은 참여자에게만
    const { room, audience } = this.meetingService.getRoomAudience(roomId);
    this.meetingGateway.broadcastInboxMessage(audience, {
      message: saved,
      roomType: room.roomType,
      roomName: room.name,
      workspaceId: room.workspaceId ?? null,
    });
    return saved;
  }

  // 접근 가능한 모든 방의 안읽음/멘션 수
  @Get('unread-counts')
  unreadCounts(@CurrentUser() user: MeetingUser) {
    return this.meetingService.getUnreadCounts(user);
  }

  // 방 읽음 처리 (읽음 커서 upsert)
  @Post('rooms/:roomId/read')
  markRead(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
  ) {
    return this.meetingService.markRoomRead(user, roomId);
  }

  // 메시지 내용 검색 — q 필수, roomId 지정 시 해당 방만
  @Get('messages/search')
  searchMessages(
    @CurrentUser() user: MeetingUser,
    @Query('q') q: string,
    @Query('roomId') roomId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.meetingService.searchMessages(
      user,
      q ?? '',
      roomId || undefined,
      Number(limit) || 30,
    );
  }

  // 채널 메시지 전체 비우기 (admin 전용). DM은 불가.
  @Delete('rooms/:roomId/messages')
  clearMessages(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
  ) {
    const result = this.meetingService.clearRoomMessages(user, roomId);
    this.meetingGateway.broadcastMeetingMessagesCleared(roomId);
    return result;
  }

  // 메시지 고정/해제 — 멤버 누구나. body.pinned 미지정 시 고정(true).
  @Post('rooms/:roomId/messages/:messageId/pin')
  setPin(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Body() body: { pinned?: boolean },
  ) {
    const pinned = body?.pinned !== false;
    const updated = this.meetingService.setMessagePinned(user, roomId, messageId, pinned);
    this.meetingGateway.broadcastMeetingMessagePinned(roomId, updated);
    return updated;
  }

  // 이모지 리액션 토글 — 멤버 누구나
  @Post('rooms/:roomId/messages/:messageId/reactions')
  toggleReaction(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Body() body: unknown,
  ) {
    const updated = this.meetingService.toggleReaction(user, roomId, messageId, body);
    this.meetingGateway.broadcastMeetingMessageReaction(roomId, updated);
    return updated;
  }

  // 채널 고정 메시지 목록
  @Get('rooms/:roomId/pins')
  listPins(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
  ) {
    return this.meetingService.listPinnedMessages(roomId, user);
  }
}
