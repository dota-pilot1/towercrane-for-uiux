import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { Response } from 'express';

@Injectable()
export class ChatbotService {
  private openai: OpenAI | null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async streamGpt(message: string, res: Response) {
    if (!this.openai) {
      throw new ServiceUnavailableException('OpenAI API key is not configured.');
    }

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
