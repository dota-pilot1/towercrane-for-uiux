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

  // PortOne(카카오페이) 결제 완료 후 서버 검증 + 적립
  @Post('topup/confirm')
  confirmTopup(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.pointsService.confirmTopup(user.id, body);
  }

  // 충전 취소(전액 환불) — 미사용분만 가능
  @Post('topup/refund')
  refundTopup(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.pointsService.refundTopup(user.id, body);
  }
}
