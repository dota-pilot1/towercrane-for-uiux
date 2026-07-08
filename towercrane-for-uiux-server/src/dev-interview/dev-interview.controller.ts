import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import {
  DevInterviewService,
  type DevInterviewMessage,
} from './dev-interview.service';

@Controller('dev-interview')
export class DevInterviewController {
  constructor(private readonly devInterviewService: DevInterviewService) {}

  @Post('chat/stream')
  @UseGuards(AuthGuard)
  async stream(
    @Body() body: { messages?: DevInterviewMessage[] },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.devInterviewService.stream(body.messages ?? [], res);
  }
}
