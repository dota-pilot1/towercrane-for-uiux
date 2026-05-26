import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DevManagementController } from './dev-management.controller';
import { DevManagementGateway } from './dev-management.gateway';
import { DevManagementService } from './dev-management.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DevManagementController],
  providers: [DevManagementService, DevManagementGateway],
  exports: [DevManagementService, DevManagementGateway],
})
export class DevManagementModule {}
