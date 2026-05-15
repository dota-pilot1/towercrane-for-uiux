import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StudyDiaryController } from './study-diary.controller';
import { StudyDiaryService } from './study-diary.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [StudyDiaryController],
  providers: [StudyDiaryService],
})
export class StudyDiaryModule {}
