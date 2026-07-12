import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AiStudyNoteController } from './ai-study-note.controller';
import { AiStudyNoteService } from './ai-study-note.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AiStudyNoteController],
  providers: [AiStudyNoteService],
})
export class AiStudyNoteModule {}
