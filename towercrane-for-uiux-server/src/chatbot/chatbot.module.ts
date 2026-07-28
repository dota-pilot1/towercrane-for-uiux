import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ChatbotController } from './chatbot.controller';
import { openAiProvider } from './lib/openai.provider';
import { ChatbotSessionService } from './chatbot-session.service';
import { ChatbotToolsService } from './chatbot-tools.service';
import { ChatbotUsageService } from './chatbot-usage.service';
import { ChatbotStreamService } from './chatbot-stream.service';
import { ChatbotRealtimeService } from './chatbot-realtime.service';

/**
 * 서비스가 화면 메뉴와 1:1로 대응한다:
 *   chatbot-stream     기본 채팅 · 스트리밍 응답 · 파일 첨부 (+ 조합 담당)
 *   chatbot-tools      도구 호출 (Function Calling)
 *   chatbot-realtime   실시간 음성 (WebRTC — SSE 안 씀)
 *   chatbot-session    대화방·메시지 DB (모두가 공유)
 *   chatbot-usage      토큰 사용량 기록 (모두가 공유)
 */
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ChatbotController],
  providers: [
    openAiProvider,
    ChatbotSessionService,
    ChatbotToolsService,
    ChatbotUsageService,
    ChatbotStreamService,
    ChatbotRealtimeService,
  ],
})
export class ChatbotModule {}
