import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AxBoardController } from './ax-board.controller';
import { AxBoardService } from './ax-board.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AxBoardController],
  providers: [AxBoardService],
})
export class AxBoardModule {}
