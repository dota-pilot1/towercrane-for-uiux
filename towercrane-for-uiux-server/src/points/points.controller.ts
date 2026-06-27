import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { PointsService } from './points.service';

@Controller('points')
@UseGuards(AuthGuard)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('me')
  getMyWallet(@CurrentUser() user: { id: string }) {
    return this.pointsService.getWallet(user.id);
  }

  @Post('topup')
  topup(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.pointsService.topup(user.id, body);
  }
}
