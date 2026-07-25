import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CodeReviewsService,
  type CodeReviewUser,
} from './code-reviews.service';

@Controller('code-reviews')
@UseGuards(AuthGuard)
export class CodeReviewsController {
  constructor(private readonly codeReviewsService: CodeReviewsService) {}

  @Get()
  list(
    @CurrentUser() user: CodeReviewUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.codeReviewsService.list(user, query);
  }

  @Post()
  create(@CurrentUser() user: CodeReviewUser, @Body() body: unknown) {
    return this.codeReviewsService.create(user, body);
  }

  @Post('manual')
  createManual(@CurrentUser() user: CodeReviewUser, @Body() body: unknown) {
    return this.codeReviewsService.createManual(user, body);
  }

  @Post('analyze')
  analyze(@CurrentUser() user: CodeReviewUser, @Body() body: unknown) {
    return this.codeReviewsService.analyzeAndSave(user, body);
  }

  @Post('pr/analyze')
  analyzeGithubPr(@CurrentUser() user: CodeReviewUser, @Body() body: unknown) {
    return this.codeReviewsService.analyzeGithubPrAndSave(user, body);
  }

  @Post('upload')
  upload(@CurrentUser() user: CodeReviewUser, @Body() body: unknown) {
    return this.codeReviewsService.upload(user, body);
  }

  @Post('repository/validate')
  validateRepository(
    @CurrentUser() user: CodeReviewUser,
    @Body() body: unknown,
  ) {
    return this.codeReviewsService.validateRepository(user, body);
  }

  @Get('preferences')
  preferences(@CurrentUser() user: CodeReviewUser) {
    return this.codeReviewsService.getGithubPrReviewPreferences(user);
  }

  @Put('preferences')
  savePreferences(@CurrentUser() user: CodeReviewUser, @Body() body: unknown) {
    return this.codeReviewsService.saveGithubPrReviewPreferences(user, body);
  }

  @Get(':reviewId')
  detail(
    @CurrentUser() user: CodeReviewUser,
    @Param('reviewId') reviewId: string,
  ) {
    return this.codeReviewsService.detail(user, reviewId);
  }

  @Patch(':reviewId')
  update(
    @CurrentUser() user: CodeReviewUser,
    @Param('reviewId') reviewId: string,
    @Body() body: unknown,
  ) {
    return this.codeReviewsService.update(user, reviewId, body);
  }

  @Put(':reviewId/documents')
  replaceDocuments(
    @CurrentUser() user: CodeReviewUser,
    @Param('reviewId') reviewId: string,
    @Body() body: unknown,
  ) {
    return this.codeReviewsService.replaceDocuments(user, reviewId, body);
  }

  @Delete(':reviewId')
  delete(
    @CurrentUser() user: CodeReviewUser,
    @Param('reviewId') reviewId: string,
  ) {
    return this.codeReviewsService.delete(user, reviewId);
  }
}
