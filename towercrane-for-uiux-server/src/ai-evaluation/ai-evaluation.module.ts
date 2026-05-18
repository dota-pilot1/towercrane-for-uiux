import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AiEvaluationController } from './ai-evaluation.controller';
import { AiEvaluationService } from './ai-evaluation.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [AiEvaluationController],
  providers: [AiEvaluationService],
})
export class AiEvaluationModule {}
