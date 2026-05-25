import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthService } from '../auth/auth.service';
import { AiServiceRequestService } from './ai-service-request.service';

type User = ReturnType<AuthService['getSessionUser']>;

@UseGuards(AuthGuard)
@Controller('ai-service-requests')
export class AiServiceRequestController {
  constructor(private readonly service: AiServiceRequestService) {}

  @Post()
  submit(@CurrentUser() user: User, @Body() body: Parameters<AiServiceRequestService['submit']>[2]) {
    return this.service.submit(user.id, user.name, body);
  }

  @Get('my')
  getMyRequests(@CurrentUser() user: User) {
    return this.service.getMyRequests(user.id);
  }

  @Get()
  getAllRequests(@CurrentUser() user: User) {
    if (user.role !== 'admin') return this.service.getMyRequests(user.id);
    return this.service.getAllRequests();
  }

  @Get(':id')
  getRequest(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getRequest(id, user.id, user.role);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.service.updateStatus(id, 'manager_approved');
  }

  @Patch(':id/admin-approve')
  adminApprove(@Param('id') id: string) {
    return this.service.updateStatus(id, 'active');
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.service.updateStatus(id, 'rejected', body.reason);
  }

  @Patch(':id/revise')
  revise(@Param('id') id: string) {
    return this.service.updateStatus(id, 'revision_requested');
  }
}
