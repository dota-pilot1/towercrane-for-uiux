import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AiMonitoringService } from './ai-monitoring.service';

@UseGuards(AuthGuard)
@Controller('admin/ai-monitoring')
export class AiMonitoringController {
  constructor(private readonly service: AiMonitoringService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get('by-user')
  getByUser() {
    return this.service.getByUser();
  }

  @Get('by-day')
  getByDay(@Query('days') days?: string) {
    return this.service.getByDay(days ? parseInt(days, 10) : 30);
  }
}
