import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ProjectBoardController } from './project-board.controller';
import { ProjectBoardService } from './project-board.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProjectBoardController],
  providers: [ProjectBoardService],
})
export class ProjectBoardModule {}
