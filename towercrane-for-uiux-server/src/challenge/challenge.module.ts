import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ChallengeController } from './controller/challenge.controller';
import { ChallengeService } from './service/challenge.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ChallengeController],
  providers: [ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule {}
