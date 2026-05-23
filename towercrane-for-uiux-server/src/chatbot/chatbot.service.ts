import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { Response } from 'express';

@Injectable()
export class ChatbotService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async streamGpt(message: string, res: Response) {
    const stream = await this.openai.chat.completions.create({
      model:
        this.configService.get<string>('OPENAI_DEFAULT_MODEL') ?? 'gpt-4o-mini',
      stream: true,
      messages: [{ role: 'user', content: message }],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }
}
