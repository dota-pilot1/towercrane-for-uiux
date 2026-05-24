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

  @Post('rooms/:roomId/messages')
  sendMessage(
    @CurrentUser() user: MeetingUser,
    @Param('roomId') roomId: string,
    @Body() body: unknown,
  ) {
    const saved = this.meetingService.sendMessage(roomId, user, body);
    this.meetingGateway.broadcastMeetingMessage(roomId, saved);
    return saved;
  }
}
