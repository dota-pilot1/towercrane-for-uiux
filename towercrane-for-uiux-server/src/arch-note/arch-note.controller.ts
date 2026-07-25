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
import { ArchNoteService } from './arch-note.service';
import {
  createArchNoteCategorySchema,
  createArchNoteNoteSchema,
  createArchNoteSectionSchema,
  createArchNoteWorkspaceSchema,
  updateArchNoteCategorySchema,
  updateArchNoteNoteSchema,
  updateArchNoteSectionSchema,
  updateArchNoteWorkspaceSchema,
} from './dto/arch-note.schema';

@Controller('arch-note')
@UseGuards(SessionGuard)
export class ArchNoteController {
  constructor(private readonly archNoteService: ArchNoteService) {}

  // ── 워크스페이스 ──────────────────────────────────────────
  @Get('workspaces')
  listWorkspaces(@Req() req: SessionRequest) {
    return this.archNoteService.listWorkspaces(req.user.id);
  }

  @Post('workspaces')
  createWorkspace(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createArchNoteWorkspaceSchema.parse(body);
    return this.archNoteService.createWorkspace(req.user.id, input);
  }

  @Patch('workspaces/:id')
  updateWorkspace(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateArchNoteWorkspaceSchema.parse(body);
    return this.archNoteService.updateWorkspace(req.user.id, id, input);
  }

  @Delete('workspaces/:id')
  @HttpCode(204)
  deleteWorkspace(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.archNoteService.deleteWorkspace(req.user.id, id);
  }

  @Post('workspaces/reorder')
  reorderWorkspaces(
    @Req() req: SessionRequest,
    @Body() body: { workspaceIds: string[] },
  ) {
    return this.archNoteService.reorderWorkspaces(
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
    return this.archNoteService.getCategories(req.user.id, workspaceId);
  }

  @Post('workspaces/:workspaceId/categories')
  createCategory(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    const input = createArchNoteCategorySchema.parse(body);
    return this.archNoteService.createCategory(req.user.id, workspaceId, input);
  }

  @Patch('categories/:id')
  updateCategory(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateArchNoteCategorySchema.parse(body);
    return this.archNoteService.updateCategory(req.user.id, id, input);
  }

  @Delete('categories/:id')
  @HttpCode(204)
  deleteCategory(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.archNoteService.deleteCategory(req.user.id, id);
  }

  @Post('workspaces/:workspaceId/categories/reorder')
  reorderCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { categoryIds: string[] },
  ) {
    return this.archNoteService.reorderCategories(
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
    return this.archNoteService.getSections(req.user.id, categoryId);
  }

  @Post('sections')
  createSection(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createArchNoteSectionSchema.parse(body);
    return this.archNoteService.createSection(req.user.id, input);
  }

  @Patch('sections/:id')
  updateSection(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateArchNoteSectionSchema.parse(body);
    return this.archNoteService.updateSection(req.user.id, id, input);
  }

  @Delete('sections/:id')
  @HttpCode(204)
  deleteSection(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.archNoteService.deleteSection(req.user.id, id);
  }

  @Post('categories/:categoryId/sections/reorder')
  reorderSections(
    @Req() req: SessionRequest,
    @Param('categoryId') categoryId: string,
    @Body() body: { sectionIds: string[] },
  ) {
    return this.archNoteService.reorderSections(
      req.user.id,
      categoryId,
      body.sectionIds,
    );
  }

  // ── 노트 ──────────────────────────────────────────────────
  @Get('sections/:sectionId/notes')
  getNotes(@Req() req: SessionRequest, @Param('sectionId') sectionId: string) {
    return this.archNoteService.getNotes(req.user.id, sectionId);
  }

  @Post('notes')
  createNote(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createArchNoteNoteSchema.parse(body);
    return this.archNoteService.createNote(req.user.id, input);
  }

  @Patch('notes/:id')
  updateNote(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateArchNoteNoteSchema.parse(body);
    return this.archNoteService.updateNote(req.user.id, id, input);
  }

  @Post('sections/:sectionId/notes/reorder')
  reorderNotes(
    @Req() req: SessionRequest,
    @Param('sectionId') sectionId: string,
    @Body() body: { noteIds: string[] },
  ) {
    return this.archNoteService.reorderNotes(
      req.user.id,
      sectionId,
      body.noteIds,
    );
  }

  @Delete('notes/:id')
  @HttpCode(204)
  deleteNote(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.archNoteService.deleteNote(req.user.id, id);
  }
}
