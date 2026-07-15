import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * OpenAI 클라이언트를 한 곳에서 만들어 주입한다.
 * 스트리밍·도구 호출 서비스가 같이 쓰므로 각자 new 하지 않는다.
 * API 키가 없으면 null — 쓰는 쪽에서 ServiceUnavailable을 던진다.
 */
export const OPENAI_CLIENT = 'OPENAI_CLIENT';

export const openAiProvider = {
  provide: OPENAI_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): OpenAI | null => {
    const apiKey = configService.get<string>('OPENAI_API_KEY');
    return apiKey ? new OpenAI({ apiKey }) : null;
  },
};
