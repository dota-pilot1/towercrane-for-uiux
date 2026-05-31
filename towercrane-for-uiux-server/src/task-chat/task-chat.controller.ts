import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { UIMessage } from 'ai';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TaskChatService } from './task-chat.service';
import type { TaskUser } from '../tasks/tasks.service';

@Controller('task-chat')
@UseGuards(AuthGuard)
export class TaskChatController {
  constructor(private readonly taskChatService: TaskChatService) {}

  @Post('stream')
  async streamChat(
    @CurrentUser() user: TaskUser,
    @Body() body: { messages: UIMessage[] },
    @Res() res: Response,
  ): Promise<void> {
    // 인증된 user 컨텍스트를 서비스로 전달 → 각 Tool이 이 user로 DB를 제어한다.
    await this.taskChatService.streamChat(user, body.messages, res);
  }
}
