import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { DevChallengeController } from './dev-challenge.controller';
import { DevChallengeService } from './dev-challenge.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [DevChallengeController],
  providers: [DevChallengeService],
  exports: [DevChallengeService],
})
export class DevChallengeModule {}

