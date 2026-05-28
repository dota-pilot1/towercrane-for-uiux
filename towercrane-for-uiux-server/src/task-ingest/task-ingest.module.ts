import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { TaskIngestController } from './task-ingest.controller';
import { TaskIngestService } from './task-ingest.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [TaskIngestController],
  providers: [TaskIngestService],
})
export class TaskIngestModule {}
