import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AdminBoardConfigsController } from './admin-board-configs.controller';
import { AdminBoardsController } from './admin-boards.controller';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    BoardsController,
    AdminBoardsController,
    AdminBoardConfigsController,
  ],
  providers: [BoardsService],
})
export class BoardsModule {}
