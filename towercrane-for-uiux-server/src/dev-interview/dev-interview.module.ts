import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DevInterviewController } from './dev-interview.controller';
import { DevInterviewService } from './dev-interview.service';

@Module({
  imports: [AuthModule],
  controllers: [DevInterviewController],
  providers: [DevInterviewService],
})
export class DevInterviewModule {}
