import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get('sessions')
  listSessions() {
    return this.chatbotService.listSessions();
  }

  @Post('sessions')
  createSession(@Body() body: { title?: string }) {
    return this.chatbotService.createSession(body?.title);
  }

  @Patch('sessions/:id')
  renameSession(@Param('id') id: string, @Body() body: { title: string }) {
    return this.chatbotService.renameSession(id, body.title);
  }

  @Delete('sessions/:id')
  deleteSession(@Param('id') id: string) {
    return this.chatbotService.deleteSession(id);
  }

  @Get('sessions/:id/messages')
  listMessages(@Param('id') id: string) {
    return this.chatbotService.listMessages(id);
  }

  @Post('stream')
  async stream(
    @Body() body: { sessionId: string; message: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.chatbotService.streamGpt(body.sessionId, body.message, res);
  }
}
