import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ArchNoteController } from './arch-note.controller';
import { ArchNoteService } from './arch-note.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ArchNoteController],
  providers: [ArchNoteService],
})
export class ArchNoteModule {}
