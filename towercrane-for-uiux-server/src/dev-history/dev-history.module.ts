import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DevHistoryController } from './dev-history.controller';
import { DevHistoryService } from './dev-history.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DevHistoryController],
  providers: [DevHistoryService],
})
export class DevHistoryModule {}
