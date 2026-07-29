import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { IdeaNoteController } from './idea-note.controller';
import { IdeaNoteService } from './idea-note.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [IdeaNoteController],
  providers: [IdeaNoteService],
})
export class IdeaNoteModule {}
