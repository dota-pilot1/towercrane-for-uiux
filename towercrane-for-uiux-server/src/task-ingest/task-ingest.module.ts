import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CodeReviewsModule } from '../code-reviews/code-reviews.module';
import { DatabaseModule } from '../database/database.module';
import { TaskIngestController } from './task-ingest.controller';
import { TaskIngestService } from './task-ingest.service';

@Module({
  imports: [ConfigModule, DatabaseModule, CodeReviewsModule],
  controllers: [TaskIngestController],
  providers: [TaskIngestService],
})
export class TaskIngestModule {}
