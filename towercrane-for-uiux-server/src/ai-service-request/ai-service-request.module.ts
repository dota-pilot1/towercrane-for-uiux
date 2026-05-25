import { Module } from '@nestjs/common';
import { AiServiceRequestController } from './ai-service-request.controller';
import { AiServiceRequestService } from './ai-service-request.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AiServiceRequestController],
  providers: [AiServiceRequestService],
})
export class AiServiceRequestModule {}
