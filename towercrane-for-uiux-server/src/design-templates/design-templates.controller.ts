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
import {
  DesignTemplatesService,
  type DesignTemplateUser,
} from './design-templates.service';

@Controller('design-templates')
@UseGuards(AuthGuard)
export class DesignTemplatesController {
  constructor(private readonly designTemplatesService: DesignTemplatesService) {}

  @Get()
  list(
    @CurrentUser() user: DesignTemplateUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.designTemplatesService.list(user, query);
  }

  @Post()
  create(@CurrentUser() user: DesignTemplateUser, @Body() body: unknown) {
    return this.designTemplatesService.create(user, body);
  }

  @Get('references')
  listReferences(@CurrentUser() user: DesignTemplateUser) {
    return this.designTemplatesService.listReferences(user);
  }

  @Post('references')
  createReference(
    @CurrentUser() user: DesignTemplateUser,
    @Body() body: unknown,
  ) {
    return this.designTemplatesService.createReference(user, body);
  }

  @Patch('references/:referenceId')
  updateReference(
    @CurrentUser() user: DesignTemplateUser,
    @Param('referenceId') referenceId: string,
    @Body() body: unknown,
  ) {
    return this.designTemplatesService.updateReference(user, referenceId, body);
  }

  @Delete('references/:referenceId')
  deleteReference(
    @CurrentUser() user: DesignTemplateUser,
    @Param('referenceId') referenceId: string,
  ) {
    return this.designTemplatesService.deleteReference(user, referenceId);
  }

  @Get(':templateId')
  detail(
    @CurrentUser() user: DesignTemplateUser,
    @Param('templateId') templateId: string,
  ) {
    return this.designTemplatesService.detail(user, templateId);
  }

  @Patch(':templateId')
  update(
    @CurrentUser() user: DesignTemplateUser,
    @Param('templateId') templateId: string,
    @Body() body: unknown,
  ) {
    return this.designTemplatesService.update(user, templateId, body);
  }

  @Delete(':templateId')
  delete(
    @CurrentUser() user: DesignTemplateUser,
    @Param('templateId') templateId: string,
  ) {
    return this.designTemplatesService.delete(user, templateId);
  }
}
