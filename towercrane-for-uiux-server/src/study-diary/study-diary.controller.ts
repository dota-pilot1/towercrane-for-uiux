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
  createStudyDiaryCategorySchema,
  createStudyDiaryNoteSchema,
  createStudyDiarySectionSchema,
  organizeStudyDiaryNoteSchema,
  updateStudyDiaryCategorySchema,
  updateStudyDiaryNoteSchema,
  updateStudyDiarySchema,
  updateStudyDiarySectionSchema,
} from './dto/study-diary.schema';
import { StudyDiaryService } from './study-diary.service';

@Controller('study-diary')
@UseGuards(SessionGuard)
export class StudyDiaryController {
  constructor(private readonly studyDiaryService: StudyDiaryService) {}

  @Get('workspaces')
  listWorkspaces(@Req() req: SessionRequest) {
    return this.studyDiaryService.listWorkspaces(req.user.id);
  }

  @Post('workspaces')
  createWorkspace(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = updateStudyDiarySchema.parse(body);
    return this.studyDiaryService.createWorkspace(req.user.id, input);
  }

  @Get('workspaces/:workspaceId')
  getWorkspace(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.studyDiaryService.getWorkspace(req.user.id, workspaceId);
  }

  @Patch('workspaces/:workspaceId')
  updateWorkspace(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    const input = updateStudyDiarySchema.parse(body);
    return this.studyDiaryService.updateWorkspace(
      req.user.id,
      workspaceId,
      input,
    );
  }

  @Get('workspaces/:workspaceId/categories')
  getWorkspaceCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.studyDiaryService.getWorkspaceCategories(
      req.user.id,
      workspaceId,
    );
  }

  @Post('workspaces/:workspaceId/categories')
  createWorkspaceCategory(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    const input = createStudyDiaryCategorySchema.parse(body);
    return this.studyDiaryService.createWorkspaceCategory(
      req.user.id,
      workspaceId,
      input,
    );
  }

  @Post('workspaces/:workspaceId/categories/reorder')
  reorderWorkspaceCategories(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { categoryIds: string[] },
  ) {
    return this.studyDiaryService.reorderWorkspaceCategories(
      req.user.id,
      workspaceId,
      body.categoryIds,
    );
  }

  @Get('workspaces/:workspaceId/categories/:categoryId/sections')
  getWorkspaceSectionsByCategory(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.studyDiaryService.getWorkspaceSectionsByCategory(
      req.user.id,
      workspaceId,
      categoryId,
    );
  }

  @Get('workspaces/:workspaceId/sections/:sectionId/notes/mine')
  getWorkspaceMyNotes(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.studyDiaryService.getWorkspaceNotes(
      req.user.id,
      workspaceId,
      sectionId,
    );
  }

  @Get('me')
  getMyDiary(@Req() req: SessionRequest) {
    return this.studyDiaryService.getMyDiary(req.user.id);
  }

  @Patch('me')
  updateMyDiary(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = updateStudyDiarySchema.parse(body);
    return this.studyDiaryService.updateMyDiary(req.user.id, input);
  }

  @Get('categories')
  getCategories(@Req() req: SessionRequest) {
    return this.studyDiaryService.getCategories(req.user.id);
  }

  @Post('categories')
  createCategory(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createStudyDiaryCategorySchema.parse(body);
    return this.studyDiaryService.createCategory(req.user.id, input);
  }

  @Patch('categories/:id')
  updateCategory(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateStudyDiaryCategorySchema.parse(body);
    return this.studyDiaryService.updateCategory(req.user.id, id, input);
  }

  @Delete('categories/:id')
  @HttpCode(204)
  deleteCategory(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.studyDiaryService.deleteCategory(req.user.id, id);
  }

  @Post('categories/reorder')
  reorderCategories(
    @Req() req: SessionRequest,
    @Body() body: { categoryIds: string[] },
  ) {
    return this.studyDiaryService.reorderCategories(
      req.user.id,
      body.categoryIds,
    );
  }

  @Get('categories/:categoryId/sections')
  getSectionsByCategory(
    @Req() req: SessionRequest,
    @Param('categoryId') categoryId: string,
  ) {
    return this.studyDiaryService.getSectionsByCategory(
      req.user.id,
      categoryId,
    );
  }

  @Post('sections')
  createSection(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createStudyDiarySectionSchema.parse(body);
    return this.studyDiaryService.createSection(req.user.id, input);
  }

  @Patch('sections/:id')
  updateSection(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateStudyDiarySectionSchema.parse(body);
    return this.studyDiaryService.updateSection(req.user.id, id, input);
  }

  @Delete('sections/:id')
  @HttpCode(204)
  deleteSection(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.studyDiaryService.deleteSection(req.user.id, id);
  }

  @Post('sections/reorder')
  reorderSections(
    @Req() req: SessionRequest,
    @Body() body: { categoryId: string; sectionIds: string[] },
  ) {
    return this.studyDiaryService.reorderSections(
      req.user.id,
      body.categoryId,
      body.sectionIds,
    );
  }

  @Get('sections/:sectionId/notes/mine')
  getMyNotes(
    @Req() req: SessionRequest,
    @Param('sectionId') sectionId: string,
  ) {
    return this.studyDiaryService.getMyNotes(req.user.id, sectionId);
  }

  @Post('notes/organize')
  organizeNote(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = organizeStudyDiaryNoteSchema.parse(body);
    return this.studyDiaryService.organizeNote(req.user.id, input);
  }

  @Post('notes')
  createNote(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createStudyDiaryNoteSchema.parse(body);
    return this.studyDiaryService.createNote(req.user.id, input);
  }

  @Patch('notes/:id')
  updateNote(
    @Req() req: SessionRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateStudyDiaryNoteSchema.parse(body);
    return this.studyDiaryService.updateNote(req.user.id, id, input);
  }

  @Delete('notes/:id')
  @HttpCode(204)
  deleteNote(@Req() req: SessionRequest, @Param('id') id: string) {
    return this.studyDiaryService.deleteNote(req.user.id, id);
  }
}
