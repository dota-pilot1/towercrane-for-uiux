import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CodeReviewsController } from './code-reviews.controller';
import { CodeReviewsService } from './code-reviews.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CodeReviewsController],
  providers: [CodeReviewsService],
  exports: [CodeReviewsService],
})
export class CodeReviewsModule {}
