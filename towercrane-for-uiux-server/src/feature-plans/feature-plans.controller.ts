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
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FeaturePlansService, type FeaturePlanUser } from './feature-plans.service';

@Controller('feature-plans')
@UseGuards(AuthGuard)
export class FeaturePlansController {
  constructor(private readonly featurePlansService: FeaturePlansService) {}

  @Get()
  list(
    @CurrentUser() user: FeaturePlanUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.featurePlansService.list(user, query);
  }

  @Post()
  create(@CurrentUser() user: FeaturePlanUser, @Body() body: unknown) {
    return this.featurePlansService.create(user, body);
  }

  @Get(':planId')
  detail(
    @CurrentUser() user: FeaturePlanUser,
    @Param('planId') planId: string,
  ) {
    return this.featurePlansService.detail(user, planId);
  }

  @Patch(':planId')
  update(
    @CurrentUser() user: FeaturePlanUser,
    @Param('planId') planId: string,
    @Body() body: unknown,
  ) {
    return this.featurePlansService.update(user, planId, body);
  }

  @Delete(':planId')
  delete(
    @CurrentUser() user: FeaturePlanUser,
    @Param('planId') planId: string,
  ) {
    return this.featurePlansService.delete(user, planId);
  }

  @Post(':planId/register-task')
  registerTask(
    @CurrentUser() user: FeaturePlanUser,
    @Param('planId') planId: string,
  ) {
    return this.featurePlansService.registerTask(user, planId);
  }
}
