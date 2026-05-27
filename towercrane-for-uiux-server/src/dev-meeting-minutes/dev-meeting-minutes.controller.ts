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
import {
  DevMeetingMinutesService,
  type DevMeetingMinutesUser,
} from './dev-meeting-minutes.service';

@Controller('dev-meeting-minutes')
@UseGuards(AuthGuard)
export class DevMeetingMinutesController {
  constructor(
    private readonly devMeetingMinutesService: DevMeetingMinutesService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: DevMeetingMinutesUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.devMeetingMinutesService.list(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: DevMeetingMinutesUser,
    @Body() body: unknown,
  ) {
    return this.devMeetingMinutesService.create(user, body);
  }

  @Get(':minutesId')
  detail(
    @CurrentUser() user: DevMeetingMinutesUser,
    @Param('minutesId') minutesId: string,
  ) {
    return this.devMeetingMinutesService.detail(user, minutesId);
  }

  @Patch(':minutesId')
  update(
    @CurrentUser() user: DevMeetingMinutesUser,
    @Param('minutesId') minutesId: string,
    @Body() body: unknown,
  ) {
    return this.devMeetingMinutesService.update(user, minutesId, body);
  }

  @Delete(':minutesId')
  delete(
    @CurrentUser() user: DevMeetingMinutesUser,
    @Param('minutesId') minutesId: string,
  ) {
    return this.devMeetingMinutesService.delete(user, minutesId);
  }
}
