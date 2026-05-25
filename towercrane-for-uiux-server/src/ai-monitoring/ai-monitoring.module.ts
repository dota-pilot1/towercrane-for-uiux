import { Module } from '@nestjs/common';
import { AiMonitoringController } from './ai-monitoring.controller';
import { AiMonitoringService } from './ai-monitoring.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AiMonitoringController],
  providers: [AiMonitoringService],
})
export class AiMonitoringModule {}
