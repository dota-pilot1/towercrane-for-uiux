import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EnglishChatController } from './english-chat.controller';
import { EnglishChatService } from './english-chat.service';

@Module({
  imports: [AuthModule],
  controllers: [EnglishChatController],
  providers: [EnglishChatService],
})
export class EnglishChatModule {}
