import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { ReviewService } from './review.service'

@Controller('prototypes/:prototypeId/reviews')
@UseGuards(AuthGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string },
    @Param('prototypeId') prototypeId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reviewService.listReviews(prototypeId, user.id, query)
  }

  @Get('me')
  getMine(
    @CurrentUser() user: { id: string },
    @Param('prototypeId') prototypeId: string,
  ) {
    return this.reviewService.getMyReview(prototypeId, user.id)
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Param('prototypeId') prototypeId: string,
    @Body() body: unknown,
  ) {
    return this.reviewService.createReview(prototypeId, user.id, body)
  }

  @Patch('me')
  updateMine(
    @CurrentUser() user: { id: string },
    @Param('prototypeId') prototypeId: string,
    @Body() body: unknown,
  ) {
    return this.reviewService.updateMyReview(prototypeId, user.id, body)
  }

  @Delete('me')
  deleteMine(
    @CurrentUser() user: { id: string },
    @Param('prototypeId') prototypeId: string,
  ) {
    return this.reviewService.deleteMyReview(prototypeId, user.id)
  }
}
