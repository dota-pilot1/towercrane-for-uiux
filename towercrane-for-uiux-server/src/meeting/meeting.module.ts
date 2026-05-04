import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { MeetingController } from './meeting.controller';
import { MeetingGateway } from './meeting.gateway';
import { MeetingService } from './meeting.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MeetingController],
  providers: [MeetingService, MeetingGateway],
  exports: [MeetingGateway, MeetingService],
})
export class MeetingModule {}

