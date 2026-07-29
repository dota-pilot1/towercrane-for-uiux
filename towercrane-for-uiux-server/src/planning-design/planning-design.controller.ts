import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guard/session.guard';
import type { SessionRequest } from '../auth/types';
import {
  createPlanningDesignCategorySchema,
  createPlanningDesignDocumentSchema,
  createPlanningDesignSectionSchema,
  createPlanningDesignWorkspaceSchema,
  reorderPlanningDesignCategoriesSchema,
  reorderPlanningDesignDocumentsSchema,
  reorderPlanningDesignSectionsSchema,
  reorderPlanningDesignWorkspacesSchema,
  updatePlanningDesignCategorySchema,
  updatePlanningDesignDocumentSchema,
  updatePlanningDesignSectionSchema,
  updatePlanningDesignWorkspaceSchema,
} from './dto/planning-design.schema';
import { PlanningDesignService } from './planning-design.service';

@Controller('planning-design')
@UseGuards(SessionGuard)
export class PlanningDesignController {
  constructor(private readonly planningDesignService: PlanningDesignService) {}

  @Get('workspaces')
  listWorkspaces(@Req() req: SessionRequest) {
    return this.planningDesignService.listWorkspaces(req.user.id);
  }

  @Post('workspaces')
  createWorkspace(@Req() req: SessionRequest, @Body() body: unknown) {
    return this.planningDesignService.createWorkspace(
      req.user.id,
      createPlanningDesignWorkspaceSchema.parse(body),
    );
  }

  @Patch('workspaces/:id')
  updateWorkspace(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.planningDesignService.updateWorkspace(
      req.user.id,
      id,
      updatePlanningDesignWorkspaceSchema.parse(body),
    );
  }

  @Delete('workspaces/:id')
  @HttpCode(204)
  deleteWorkspace(@Req() req: SessionRequest, @Param('id') id: string) {
    this.planningDesignService.deleteWorkspace(req.user.id, id);
  }

  @Post('workspaces/reorder')
  reorderWorkspaces(@Req() req: SessionRequest, @Body() body: unknown) {
    const { workspaceIds } = reorderPlanningDesignWorkspacesSchema.parse(body);
    return this.planningDesignService.reorderWorkspaces(
      req.user.id,
      workspaceIds,
    );
  }

  @Get('workspaces/:workspaceId/categories')
  getCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.planningDesignService.getCategories(req.user.id, workspaceId);
  }

  @Post('workspaces/:workspaceId/categories')
  createCategory(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.planningDesignService.createCategory(
      req.user.id,
      workspaceId,
      createPlanningDesignCategorySchema.parse(body),
    );
  }

  @Patch('categories/:id')
  updateCategory(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.planningDesignService.updateCategory(
      req.user.id,
      id,
      updatePlanningDesignCategorySchema.parse(body),
    );
  }

  @Delete('categories/:id')
  @HttpCode(204)
  deleteCategory(@Req() req: SessionRequest, @Param('id') id: string) {
    this.planningDesignService.deleteCategory(req.user.id, id);
  }

  @Post('workspaces/:workspaceId/categories/reorder')
  reorderCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    const { categoryIds } = reorderPlanningDesignCategoriesSchema.parse(body);
    return this.planningDesignService.reorderCategories(
      req.user.id,
      workspaceId,
      categoryIds,
    );
  }

  @Get('categories/:categoryId/sections')
  getSections(
    @Req() req: SessionRequest,
    @Param('categoryId') categoryId: string,
  ) {
    return this.planningDesignService.getSections(req.user.id, categoryId);
  }

  @Post('sections')
  createSection(@Req() req: SessionRequest, @Body() body: unknown) {
    return this.planningDesignService.createSection(
      req.user.id,
      createPlanningDesignSectionSchema.parse(body),
    );
  }

  @Patch('sections/:id')
  updateSection(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.planningDesignService.updateSection(
      req.user.id,
      id,
      updatePlanningDesignSectionSchema.parse(body),
    );
  }

  @Delete('sections/:id')
  @HttpCode(204)
  deleteSection(@Req() req: SessionRequest, @Param('id') id: string) {
    this.planningDesignService.deleteSection(req.user.id, id);
  }

  @Post('categories/:categoryId/sections/reorder')
  reorderSections(
    @Req() req: SessionRequest,
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    const { sectionIds } = reorderPlanningDesignSectionsSchema.parse(body);
    return this.planningDesignService.reorderSections(
      req.user.id,
      categoryId,
      sectionIds,
    );
  }

  @Get('sections/:sectionId/documents')
  getDocuments(
    @Req() req: SessionRequest,
    @Param('sectionId') sectionId: string,
  ) {
    return this.planningDesignService.getDocuments(req.user.id, sectionId);
  }

  @Post('documents')
  createDocument(@Req() req: SessionRequest, @Body() body: unknown) {
    return this.planningDesignService.createDocument(
      req.user.id,
      createPlanningDesignDocumentSchema.parse(body),
    );
  }

  @Patch('documents/:id')
  updateDocument(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.planningDesignService.updateDocument(
      req.user.id,
      id,
      updatePlanningDesignDocumentSchema.parse(body),
    );
  }

  @Delete('documents/:id')
  @HttpCode(204)
  deleteDocument(@Req() req: SessionRequest, @Param('id') id: string) {
    this.planningDesignService.deleteDocument(req.user.id, id);
  }

  @Post('sections/:sectionId/documents/reorder')
  reorderDocuments(
    @Req() req: SessionRequest,
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
  ) {
    const { documentIds } = reorderPlanningDesignDocumentsSchema.parse(body);
    return this.planningDesignService.reorderDocuments(
      req.user.id,
      sectionId,
      documentIds,
    );
  }
}
