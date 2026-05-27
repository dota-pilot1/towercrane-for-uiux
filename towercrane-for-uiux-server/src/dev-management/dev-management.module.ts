import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CodeReviewsModule } from '../code-reviews/code-reviews.module';
import { DatabaseModule } from '../database/database.module';
import { DevManagementController } from './dev-management.controller';
import { DevManagementGateway } from './dev-management.gateway';
import { DevManagementService } from './dev-management.service';

@Module({
  imports: [DatabaseModule, AuthModule, CodeReviewsModule],
  controllers: [DevManagementController],
  providers: [DevManagementService, DevManagementGateway],
  exports: [DevManagementService, DevManagementGateway],
})
export class DevManagementModule {}
