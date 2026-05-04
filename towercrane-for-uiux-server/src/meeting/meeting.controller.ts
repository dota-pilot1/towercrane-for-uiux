import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
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

  @Get('rooms')
  listRooms(@CurrentUser() user: MeetingUser) {
    return this.meetingService.listRooms(user);
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
