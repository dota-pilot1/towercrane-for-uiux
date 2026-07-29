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
  createDevHistoryCategorySchema,
  createDevHistoryDocumentSchema,
  createDevHistorySectionSchema,
  createDevHistoryWorkspaceSchema,
  reorderDevHistoryCategoriesSchema,
  reorderDevHistoryDocumentsSchema,
  reorderDevHistorySectionsSchema,
  reorderDevHistoryWorkspacesSchema,
  updateDevHistoryCategorySchema,
  updateDevHistoryDocumentSchema,
  updateDevHistorySectionSchema,
  updateDevHistoryWorkspaceSchema,
} from './dto/dev-history.schema';
import { DevHistoryService } from './dev-history.service';

@Controller('dev-history')
@UseGuards(SessionGuard)
export class DevHistoryController {
  constructor(private readonly devHistoryService: DevHistoryService) {}

  @Get('workspaces')
  listWorkspaces(@Req() req: SessionRequest) {
    return this.devHistoryService.listWorkspaces(req.user.id);
  }

  @Get('workspaces/:id/summary')
  getWorkspaceSummary(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.devHistoryService.getWorkspaceSummary(req.user.id, id);
  }

  @Post('workspaces')
  createWorkspace(@Req() req: SessionRequest, @Body() body: unknown) {
    return this.devHistoryService.createWorkspace(
      req.user.id,
      createDevHistoryWorkspaceSchema.parse(body),
    );
  }

  @Patch('workspaces/:id')
  updateWorkspace(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.devHistoryService.updateWorkspace(
      req.user.id,
      id,
      updateDevHistoryWorkspaceSchema.parse(body),
    );
  }

  @Delete('workspaces/:id')
  @HttpCode(204)
  deleteWorkspace(@Req() req: SessionRequest, @Param('id') id: string) {
    this.devHistoryService.deleteWorkspace(req.user.id, id);
  }

  @Post('workspaces/reorder')
  reorderWorkspaces(@Req() req: SessionRequest, @Body() body: unknown) {
    const { workspaceIds } = reorderDevHistoryWorkspacesSchema.parse(body);
    return this.devHistoryService.reorderWorkspaces(
      req.user.id,
      workspaceIds,
    );
  }

  @Get('workspaces/:workspaceId/categories')
  getCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.devHistoryService.getCategories(req.user.id, workspaceId);
  }

  @Post('workspaces/:workspaceId/categories')
  createCategory(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.devHistoryService.createCategory(
      req.user.id,
      workspaceId,
      createDevHistoryCategorySchema.parse(body),
    );
  }

  @Patch('categories/:id')
  updateCategory(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.devHistoryService.updateCategory(
      req.user.id,
      id,
      updateDevHistoryCategorySchema.parse(body),
    );
  }

  @Delete('categories/:id')
  @HttpCode(204)
  deleteCategory(@Req() req: SessionRequest, @Param('id') id: string) {
    this.devHistoryService.deleteCategory(req.user.id, id);
  }

  @Post('workspaces/:workspaceId/categories/reorder')
  reorderCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    const { categoryIds } = reorderDevHistoryCategoriesSchema.parse(body);
    return this.devHistoryService.reorderCategories(
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
    return this.devHistoryService.getSections(req.user.id, categoryId);
  }

  @Post('sections')
  createSection(@Req() req: SessionRequest, @Body() body: unknown) {
    return this.devHistoryService.createSection(
      req.user.id,
      createDevHistorySectionSchema.parse(body),
    );
  }

  @Patch('sections/:id')
  updateSection(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.devHistoryService.updateSection(
      req.user.id,
      id,
      updateDevHistorySectionSchema.parse(body),
    );
  }

  @Delete('sections/:id')
  @HttpCode(204)
  deleteSection(@Req() req: SessionRequest, @Param('id') id: string) {
    this.devHistoryService.deleteSection(req.user.id, id);
  }

  @Post('categories/:categoryId/sections/reorder')
  reorderSections(
    @Req() req: SessionRequest,
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    const { sectionIds } = reorderDevHistorySectionsSchema.parse(body);
    return this.devHistoryService.reorderSections(
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
    return this.devHistoryService.getDocuments(req.user.id, sectionId);
  }

  @Post('documents')
  createDocument(@Req() req: SessionRequest, @Body() body: unknown) {
    return this.devHistoryService.createDocument(
      req.user.id,
      createDevHistoryDocumentSchema.parse(body),
    );
  }

  @Patch('documents/:id')
  updateDocument(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.devHistoryService.updateDocument(
      req.user.id,
      id,
      updateDevHistoryDocumentSchema.parse(body),
    );
  }

  @Delete('documents/:id')
  @HttpCode(204)
  deleteDocument(@Req() req: SessionRequest, @Param('id') id: string) {
    this.devHistoryService.deleteDocument(req.user.id, id);
  }

  @Post('sections/:sectionId/documents/reorder')
  reorderDocuments(
    @Req() req: SessionRequest,
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
  ) {
    const { documentIds } = reorderDevHistoryDocumentsSchema.parse(body);
    return this.devHistoryService.reorderDocuments(
      req.user.id,
      sectionId,
      documentIds,
    );
  }
}
