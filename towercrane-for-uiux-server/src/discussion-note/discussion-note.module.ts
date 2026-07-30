import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DiscussionNoteController } from './discussion-note.controller';
import { DiscussionNoteService } from './discussion-note.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DiscussionNoteController],
  providers: [DiscussionNoteService],
})
export class DiscussionNoteModule {}
