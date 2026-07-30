import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ProjectScheduleController } from './project-schedule.controller';
import { ProjectScheduleService } from './project-schedule.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProjectScheduleController],
  providers: [ProjectScheduleService],
})
export class ProjectScheduleModule {}
