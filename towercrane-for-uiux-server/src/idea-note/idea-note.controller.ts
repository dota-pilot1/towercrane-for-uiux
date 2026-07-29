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
  createIdeaNoteCategorySchema,
  createIdeaNoteDocumentSchema,
  createIdeaNoteSectionSchema,
  createIdeaNoteWorkspaceSchema,
  reorderIdeaNoteCategoriesSchema,
  reorderIdeaNoteDocumentsSchema,
  reorderIdeaNoteSectionsSchema,
  reorderIdeaNoteWorkspacesSchema,
  updateIdeaNoteCategorySchema,
  updateIdeaNoteDocumentSchema,
  updateIdeaNoteSectionSchema,
  updateIdeaNoteWorkspaceSchema,
} from './dto/idea-note.schema';
import { IdeaNoteService } from './idea-note.service';

@Controller('idea-note')
@UseGuards(SessionGuard)
export class IdeaNoteController {
  constructor(private readonly ideaNoteService: IdeaNoteService) {}

  @Get('workspaces')
  listWorkspaces(@Req() req: SessionRequest) {
    return this.ideaNoteService.listWorkspaces(req.user.id);
  }

  @Get('workspaces/:id/summary')
  getWorkspaceSummary(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.ideaNoteService.getWorkspaceSummary(req.user.id, id);
  }

  @Post('workspaces')
  createWorkspace(@Req() req: SessionRequest, @Body() body: unknown) {
    return this.ideaNoteService.createWorkspace(
      req.user.id,
      createIdeaNoteWorkspaceSchema.parse(body),
    );
  }

  @Patch('workspaces/:id')
  updateWorkspace(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.ideaNoteService.updateWorkspace(
      req.user.id,
      id,
      updateIdeaNoteWorkspaceSchema.parse(body),
    );
  }

  @Delete('workspaces/:id')
  @HttpCode(204)
  deleteWorkspace(@Req() req: SessionRequest, @Param('id') id: string) {
    this.ideaNoteService.deleteWorkspace(req.user.id, id);
  }

  @Post('workspaces/reorder')
  reorderWorkspaces(@Req() req: SessionRequest, @Body() body: unknown) {
    const { workspaceIds } = reorderIdeaNoteWorkspacesSchema.parse(body);
    return this.ideaNoteService.reorderWorkspaces(
      req.user.id,
      workspaceIds,
    );
  }

  @Get('workspaces/:workspaceId/categories')
  getCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.ideaNoteService.getCategories(req.user.id, workspaceId);
  }

  @Post('workspaces/:workspaceId/categories')
  createCategory(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.ideaNoteService.createCategory(
      req.user.id,
      workspaceId,
      createIdeaNoteCategorySchema.parse(body),
    );
  }

  @Patch('categories/:id')
  updateCategory(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.ideaNoteService.updateCategory(
      req.user.id,
      id,
      updateIdeaNoteCategorySchema.parse(body),
    );
  }

  @Delete('categories/:id')
  @HttpCode(204)
  deleteCategory(@Req() req: SessionRequest, @Param('id') id: string) {
    this.ideaNoteService.deleteCategory(req.user.id, id);
  }

  @Post('workspaces/:workspaceId/categories/reorder')
  reorderCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    const { categoryIds } = reorderIdeaNoteCategoriesSchema.parse(body);
    return this.ideaNoteService.reorderCategories(
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
    return this.ideaNoteService.getSections(req.user.id, categoryId);
  }

  @Post('sections')
  createSection(@Req() req: SessionRequest, @Body() body: unknown) {
    return this.ideaNoteService.createSection(
      req.user.id,
      createIdeaNoteSectionSchema.parse(body),
    );
  }

  @Patch('sections/:id')
  updateSection(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.ideaNoteService.updateSection(
      req.user.id,
      id,
      updateIdeaNoteSectionSchema.parse(body),
    );
  }

  @Delete('sections/:id')
  @HttpCode(204)
  deleteSection(@Req() req: SessionRequest, @Param('id') id: string) {
    this.ideaNoteService.deleteSection(req.user.id, id);
  }

  @Post('categories/:categoryId/sections/reorder')
  reorderSections(
    @Req() req: SessionRequest,
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    const { sectionIds } = reorderIdeaNoteSectionsSchema.parse(body);
    return this.ideaNoteService.reorderSections(
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
    return this.ideaNoteService.getDocuments(req.user.id, sectionId);
  }

  @Post('documents')
  createDocument(@Req() req: SessionRequest, @Body() body: unknown) {
    return this.ideaNoteService.createDocument(
      req.user.id,
      createIdeaNoteDocumentSchema.parse(body),
    );
  }

  @Patch('documents/:id')
  updateDocument(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.ideaNoteService.updateDocument(
      req.user.id,
      id,
      updateIdeaNoteDocumentSchema.parse(body),
    );
  }

  @Delete('documents/:id')
  @HttpCode(204)
  deleteDocument(@Req() req: SessionRequest, @Param('id') id: string) {
    this.ideaNoteService.deleteDocument(req.user.id, id);
  }

  @Post('sections/:sectionId/documents/reorder')
  reorderDocuments(
    @Req() req: SessionRequest,
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
  ) {
    const { documentIds } = reorderIdeaNoteDocumentsSchema.parse(body);
    return this.ideaNoteService.reorderDocuments(
      req.user.id,
      sectionId,
      documentIds,
    );
  }
}
