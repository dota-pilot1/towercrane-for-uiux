import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { ProjectCodeReviewController } from './project-code-review.controller';
import { ProjectCodeReviewService } from './project-code-review.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ProjectCodeReviewController],
  providers: [ProjectCodeReviewService],
})
export class ProjectCodeReviewModule {}
