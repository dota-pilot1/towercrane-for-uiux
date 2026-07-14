import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApprovalService, type ApprovalUser } from './approval.service';

@Controller('approvals')
@UseGuards(AuthGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  /** 결재 상신 */
  @Post()
  submit(@CurrentUser() user: ApprovalUser, @Body() body: unknown) {
    return this.approvalService.submit(user, body);
  }

  /** 받은함 — 내가 결재해야 할 목록 */
  @Get('inbox')
  inbox(@CurrentUser() user: ApprovalUser) {
    return this.approvalService.getInbox(user);
  }

  /** 보낸함 — 내가 상신한 목록 */
  @Get('sent')
  sent(@CurrentUser() user: ApprovalUser) {
    return this.approvalService.getSent(user);
  }

  /** 로그인 사용자의 작성 중 초안 조회 */
  @Get('draft')
  draft(@CurrentUser() user: ApprovalUser) {
    return this.approvalService.getDraft(user);
  }

  /** 로그인 사용자의 작성 중 초안 저장 */
  @Put('draft')
  saveDraft(@CurrentUser() user: ApprovalUser, @Body() body: unknown) {
    return this.approvalService.saveDraft(user, body);
  }

  /** 로그인 사용자의 작성 중 초안 초기화 */
  @Delete('draft')
  deleteDraft(@CurrentUser() user: ApprovalUser) {
    return this.approvalService.deleteDraft(user);
  }

  /** 결재 처리 (승인 / 반려) */
  @Post(':id/act')
  act(
    @CurrentUser() user: ApprovalUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.approvalService.act(user, id, body);
  }
}
