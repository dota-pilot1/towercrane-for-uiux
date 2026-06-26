import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SessionUser } from '../auth/types';
import { AnalyticsService } from './analytics.service';

interface TrackPageViewDto {
  path: string;
  visitorId: string;
  sessionId: string;
  referrer?: string | null;
}

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // 수집: 로그인 여부 무관(익명 허용) — 라우트 변경 시 프론트가 호출
  @Post('pageview')
  @UseGuards(OptionalAuthGuard)
  track(
    @Body() body: TrackPageViewDto,
    @CurrentUser() user?: SessionUser,
  ) {
    if (!body?.path || !body?.visitorId || !body?.sessionId) {
      return { ok: false };
    }
    return this.analyticsService.track({
      path: body.path,
      visitorId: body.visitorId,
      sessionId: body.sessionId,
      referrer: body.referrer ?? null,
      userId: user?.id ?? null,
    });
  }

  // 조회: 로그인 사용자만
  @Get('daily')
  @UseGuards(AuthGuard)
  daily(@Query('days') days?: string) {
    return this.analyticsService.daily(toInt(days, 14));
  }

  @Get('top-pages')
  @UseGuards(AuthGuard)
  topPages(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.analyticsService.topPages(toInt(days, 14), toInt(limit, 10));
  }

  @Get('heatmap')
  @UseGuards(AuthGuard)
  heatmap(@Query('days') days?: string) {
    return this.analyticsService.heatmap(toInt(days, 28));
  }

  @Get('summary')
  @UseGuards(AuthGuard)
  summary(@Query('days') days?: string) {
    return this.analyticsService.summary(toInt(days, 14));
  }
}
