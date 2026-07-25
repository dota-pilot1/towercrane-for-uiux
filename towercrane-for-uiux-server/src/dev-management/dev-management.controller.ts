import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { DevManagementGateway } from './dev-management.gateway';
import {
  DevManagementService,
  type DevManagementUser,
} from './dev-management.service';

@Controller('dev-management')
@UseGuards(AuthGuard)
export class DevManagementController {
  constructor(
    private readonly devManagementService: DevManagementService,
    private readonly devManagementGateway: DevManagementGateway,
  ) {}

  @Get('rooms')
  listRooms(@CurrentUser() user: DevManagementUser) {
    return this.devManagementService.listRooms(user);
  }

  @Post('rooms')
  createRoom(@CurrentUser() user: DevManagementUser, @Body() body: unknown) {
    return this.devManagementService.createRoom(user, body);
  }

  @Delete('rooms/:roomId')
  deleteRoom(
    @CurrentUser() user: DevManagementUser,
    @Param('roomId') roomId: string,
  ) {
    return this.devManagementService.deleteRoom(user, roomId);
  }

  @Get('rooms/:roomId')
  getRoom(
    @CurrentUser() user: DevManagementUser,
    @Param('roomId') roomId: string,
  ) {
    return this.devManagementService.getRoom(roomId, user);
  }

  @Get('rooms/:roomId/messages')
  listMessages(
    @CurrentUser() user: DevManagementUser,
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
  ) {
    return this.devManagementService.listMessages(
      roomId,
      user,
      Number(limit) || 100,
    );
  }

  @Post('rooms/:roomId/messages')
  async sendMessage(
    @CurrentUser() user: DevManagementUser,
    @Param('roomId') roomId: string,
    @Body() body: unknown,
  ) {
    const result = await this.devManagementService.sendMessage(
      roomId,
      user,
      body,
    );
    for (const message of result.messages) {
      this.devManagementGateway.broadcastMessage(roomId, message);
    }
    return result;
  }

  @Delete('rooms/:roomId/messages')
  clearMessages(
    @CurrentUser() user: DevManagementUser,
    @Param('roomId') roomId: string,
  ) {
    const result = this.devManagementService.clearMessages(roomId, user);
    this.devManagementGateway.broadcastMessagesCleared(roomId, result);
    return result;
  }

  @Get('rooms/:roomId/members')
  listMembers(
    @CurrentUser() user: DevManagementUser,
    @Param('roomId') roomId: string,
  ) {
    const room = this.devManagementService.getRoom(roomId, user);
    const storedMembers = this.devManagementService.listMembers(roomId, user);
    const onlineMembers = this.devManagementGateway.getPresenceMembers(roomId);
    const map = new Map<
      string,
      (typeof storedMembers)[number] & { currentRoomId?: string | null }
    >();
    const currentMember = storedMembers.find((member) => member.id === user.id);
    const dmCounterpartMember = room.dmCounterpart
      ? storedMembers.find((member) => member.id === room.dmCounterpart?.id)
      : null;
    const botMembers = storedMembers.filter(
      (member) => member.memberType === 'BOT',
    );

    if (currentMember) {
      map.set(currentMember.id, {
        ...currentMember,
        online: true,
        currentRoomId: roomId,
      });
    }

    if (room.roomType === 'DM' && dmCounterpartMember) {
      map.set(dmCounterpartMember.id, dmCounterpartMember);
    }

    for (const member of onlineMembers) {
      map.set(member.id, {
        ...member,
        memberType: 'USER',
        online: true,
      });
    }

    for (const member of botMembers) {
      map.set(member.id, member);
    }

    return Array.from(map.values());
  }

  @Get('rooms/:roomId/bot-settings')
  getBotSettings(
    @CurrentUser() user: DevManagementUser,
    @Param('roomId') roomId: string,
  ) {
    return this.devManagementService.getBotSettings(roomId, user);
  }

  @Patch('rooms/:roomId/bot-settings')
  updateBotSettings(
    @CurrentUser() user: DevManagementUser,
    @Param('roomId') roomId: string,
    @Body() body: unknown,
  ) {
    const settings = this.devManagementService.updateBotSettings(
      roomId,
      user,
      body,
    );
    this.devManagementGateway.broadcastBotSettings(roomId, settings);
    return settings;
  }

  @Post('dms')
  startDm(@CurrentUser() user: DevManagementUser, @Body() body: unknown) {
    return this.devManagementService.startDm(user, body);
  }
}
