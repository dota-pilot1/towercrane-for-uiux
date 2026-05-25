import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/guard/admin.guard';
import { ChatbotMonitoringService } from './chatbot-monitoring.service';

@Controller('admin/chatbot-monitoring')
@UseGuards(AuthGuard, AdminGuard)
export class ChatbotMonitoringController {
  constructor(private readonly service: ChatbotMonitoringService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get('users')
  getUsers() {
    return this.service.getUsers();
  }
}
