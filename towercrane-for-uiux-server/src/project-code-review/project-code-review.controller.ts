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
import { ProjectCodeReviewService } from './project-code-review.service';
import {
  createProjectCodeReviewCategorySchema,
  createProjectCodeReviewNoteSchema,
  createProjectCodeReviewSectionSchema,
  createProjectCodeReviewWorkspaceSchema,
  updateProjectCodeReviewCategorySchema,
  updateProjectCodeReviewNoteSchema,
  updateProjectCodeReviewSectionSchema,
  updateProjectCodeReviewWorkspaceSchema,
} from './dto/project-code-review.schema';

@Controller('project-code-review')
@UseGuards(SessionGuard)
export class ProjectCodeReviewController {
  constructor(
    private readonly projectCodeReviewService: ProjectCodeReviewService,
  ) {}

  // ── 워크스페이스 ──────────────────────────────────────────
  @Get('workspaces')
  listWorkspaces(@Req() req: SessionRequest) {
    return this.projectCodeReviewService.listWorkspaces(req.user.id);
  }

  @Get('workspaces/:id/summary')
  getWorkspaceSummary(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.projectCodeReviewService.getWorkspaceSummary(req.user.id, id);
  }

  @Post('workspaces')
  createWorkspace(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createProjectCodeReviewWorkspaceSchema.parse(body);
    return this.projectCodeReviewService.createWorkspace(req.user.id, input);
  }

  @Patch('workspaces/:id')
  updateWorkspace(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateProjectCodeReviewWorkspaceSchema.parse(body);
    return this.projectCodeReviewService.updateWorkspace(
      req.user.id,
      id,
      input,
    );
  }

  @Delete('workspaces/:id')
  @HttpCode(204)
  deleteWorkspace(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.projectCodeReviewService.deleteWorkspace(req.user.id, id);
  }

  @Post('workspaces/reorder')
  reorderWorkspaces(
    @Req() req: SessionRequest,
    @Body() body: { workspaceIds: string[] },
  ) {
    return this.projectCodeReviewService.reorderWorkspaces(
      req.user.id,
      body.workspaceIds,
    );
  }

  // ── 1차 주제 (카테고리) ───────────────────────────────────
  @Get('workspaces/:workspaceId/categories')
  getCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.projectCodeReviewService.getCategories(
      req.user.id,
      workspaceId,
    );
  }

  @Post('workspaces/:workspaceId/categories')
  createCategory(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    const input = createProjectCodeReviewCategorySchema.parse(body);
    return this.projectCodeReviewService.createCategory(
      req.user.id,
      workspaceId,
      input,
    );
  }

  @Patch('categories/:id')
  updateCategory(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateProjectCodeReviewCategorySchema.parse(body);
    return this.projectCodeReviewService.updateCategory(req.user.id, id, input);
  }

  @Delete('categories/:id')
  @HttpCode(204)
  deleteCategory(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.projectCodeReviewService.deleteCategory(req.user.id, id);
  }

  @Post('workspaces/:workspaceId/categories/reorder')
  reorderCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { categoryIds: string[] },
  ) {
    return this.projectCodeReviewService.reorderCategories(
      req.user.id,
      workspaceId,
      body.categoryIds,
    );
  }

  // ── 2차 주제 (섹션) ───────────────────────────────────────
  @Get('categories/:categoryId/sections')
  getSections(
    @Req() req: SessionRequest,
    @Param('categoryId') categoryId: string,
  ) {
    return this.projectCodeReviewService.getSections(req.user.id, categoryId);
  }

  @Post('sections')
  createSection(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createProjectCodeReviewSectionSchema.parse(body);
    return this.projectCodeReviewService.createSection(req.user.id, input);
  }

  @Patch('sections/:id')
  updateSection(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateProjectCodeReviewSectionSchema.parse(body);
    return this.projectCodeReviewService.updateSection(req.user.id, id, input);
  }

  @Delete('sections/:id')
  @HttpCode(204)
  deleteSection(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.projectCodeReviewService.deleteSection(req.user.id, id);
  }

  @Post('categories/:categoryId/sections/reorder')
  reorderSections(
    @Req() req: SessionRequest,
    @Param('categoryId') categoryId: string,
    @Body() body: { sectionIds: string[] },
  ) {
    return this.projectCodeReviewService.reorderSections(
      req.user.id,
      categoryId,
      body.sectionIds,
    );
  }

  // ── 노트 ──────────────────────────────────────────────────
  @Get('sections/:sectionId/notes')
  getNotes(@Req() req: SessionRequest, @Param('sectionId') sectionId: string) {
    return this.projectCodeReviewService.getNotes(req.user.id, sectionId);
  }

  @Post('notes')
  createNote(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createProjectCodeReviewNoteSchema.parse(body);
    return this.projectCodeReviewService.createNote(req.user.id, input);
  }

  @Patch('notes/:id')
  updateNote(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateProjectCodeReviewNoteSchema.parse(body);
    return this.projectCodeReviewService.updateNote(req.user.id, id, input);
  }

  @Post('sections/:sectionId/notes/reorder')
  reorderNotes(
    @Req() req: SessionRequest,
    @Param('sectionId') sectionId: string,
    @Body() body: { noteIds: string[] },
  ) {
    return this.projectCodeReviewService.reorderNotes(
      req.user.id,
      sectionId,
      body.noteIds,
    );
  }

  @Delete('notes/:id')
  @HttpCode(204)
  deleteNote(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.projectCodeReviewService.deleteNote(req.user.id, id);
  }
}
