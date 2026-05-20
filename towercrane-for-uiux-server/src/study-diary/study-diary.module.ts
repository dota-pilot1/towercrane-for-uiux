import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StudyDiaryController } from './study-diary.controller';
import { StudyDiaryPublicController } from './study-diary-public.controller';
import { StudyDiaryService } from './study-diary.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [StudyDiaryController, StudyDiaryPublicController],
  providers: [StudyDiaryService],
})
export class StudyDiaryModule {}
