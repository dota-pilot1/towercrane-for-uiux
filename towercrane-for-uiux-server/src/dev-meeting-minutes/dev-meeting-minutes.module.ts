import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DevMeetingMinutesController } from './dev-meeting-minutes.controller';
import { DevMeetingMinutesService } from './dev-meeting-minutes.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DevMeetingMinutesController],
  providers: [DevMeetingMinutesService],
  exports: [DevMeetingMinutesService],
})
export class DevMeetingMinutesModule {}
