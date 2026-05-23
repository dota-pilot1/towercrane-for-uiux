import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('stream')
  async stream(@Body() body: { message: string }, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.chatbotService.streamGpt(body.message, res);
  }
}
