import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { Response } from 'express';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// 영어 회화 튜터 페르소나 — 한국인 개발자 대상
const SYSTEM_PROMPT = `You are a friendly English conversation tutor for a Korean software developer.

Rules:
- Always reply in natural, conversational English.
- Keep replies short (2-4 sentences) so it feels like a real chat.
- Ask a follow-up question to keep the conversation going.
- If the user's English has a notable mistake, add ONE short correction on a new line at the end, prefixed with "💡". Keep corrections gentle and brief.
- If the user writes in Korean, reply in English and gently encourage them to try writing in English.
- Favor practical, developer-friendly topics when relevant.`;

@Injectable()
export class EnglishChatService {
  private openai: OpenAI | null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  // 기존 ChatbotService.streamGpt와 동일한 SSE 규약:
  //   data: {"text": "..."}      (토큰 청크)
  //   data: {"type":"done", ...} (완료)
  //   data: [DONE]
  async stream(messages: ChatMessage[], res: Response) {
    if (!this.openai) {
      res.write(
        `data: ${JSON.stringify({
          text: '(서버에 OPENAI_API_KEY가 설정되지 않아 응답할 수 없습니다.)',
        })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    const model =
      this.configService.get<string>('OPENAI_DEFAULT_MODEL') ?? 'gpt-4o-mini';

    const stream = await this.openai.chat.completions.create({
      model,
      stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    });

    let assistantContent = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) {
        assistantContent += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(
      `data: ${JSON.stringify({ type: 'done', assistantMessage: assistantContent })}\n\n`,
    );
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
