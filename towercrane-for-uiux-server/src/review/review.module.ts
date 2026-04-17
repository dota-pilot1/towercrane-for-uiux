import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { DatabaseModule } from '../database/database.module'
import { ReviewController } from './review.controller'
import { ReviewService } from './review.service'

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
