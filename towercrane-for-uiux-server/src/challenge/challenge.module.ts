import { Module } from '@nestjs/common';
import { ChallengeController } from './controller/challenge.controller';
import { ChallengeService } from './service/challenge.service';

@Module({
  controllers: [ChallengeController],
  providers: [ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule {}
