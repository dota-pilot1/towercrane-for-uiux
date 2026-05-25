import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ChatbotMonitoringController } from './chatbot-monitoring.controller';
import { ChatbotMonitoringService } from './chatbot-monitoring.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ChatbotMonitoringController],
  providers: [ChatbotMonitoringService],
})
export class ChatbotMonitoringModule {}
