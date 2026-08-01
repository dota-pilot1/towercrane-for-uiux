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
import { CommonComponentTemplatesService } from './common-component-templates.service';
import type { CommonComponentTemplateUser } from './common-component-templates.schemas';

@Controller('common-component-templates')
@UseGuards(AuthGuard)
export class CommonComponentTemplatesController {
  constructor(private readonly service: CommonComponentTemplatesService) {}

  @Get()
  list(
    @CurrentUser() user: CommonComponentTemplateUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.list(user, query);
  }

  @Post()
  create(
    @CurrentUser() user: CommonComponentTemplateUser,
    @Body() body: unknown,
  ) {
    return this.service.create(user, body);
  }

  @Get(':templateId')
  detail(
    @CurrentUser() user: CommonComponentTemplateUser,
    @Param('templateId') templateId: string,
  ) {
    return this.service.detail(user, templateId);
  }

  @Patch(':templateId')
  update(
    @CurrentUser() user: CommonComponentTemplateUser,
    @Param('templateId') templateId: string,
    @Body() body: unknown,
  ) {
    return this.service.update(user, templateId, body);
  }

  @Post(':templateId/examples')
  createExample(
    @CurrentUser() user: CommonComponentTemplateUser,
    @Param('templateId') templateId: string,
    @Body() body: unknown,
  ) {
    return this.service.createExample(user, templateId, body);
  }

  @Patch(':templateId/examples/:exampleId')
  updateExample(
    @CurrentUser() user: CommonComponentTemplateUser,
    @Param('templateId') templateId: string,
    @Param('exampleId') exampleId: string,
    @Body() body: unknown,
  ) {
    return this.service.updateExample(user, templateId, exampleId, body);
  }

  @Delete(':templateId')
  delete(
    @CurrentUser() user: CommonComponentTemplateUser,
    @Param('templateId') templateId: string,
  ) {
    return this.service.delete(user, templateId);
  }
}
