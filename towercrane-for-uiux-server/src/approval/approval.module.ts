import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ApprovalController],
  providers: [ApprovalService],
})
export class ApprovalsModule {}
