import { Controller, Get, Param } from '@nestjs/common';
import { StudyDiaryService } from './study-diary.service';

@Controller('study-diary/public')
export class StudyDiaryPublicController {
  constructor(private readonly studyDiaryService: StudyDiaryService) {}

  @Get('workspaces/:workspaceId')
  getPublicWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.studyDiaryService.getPublicWorkspace(workspaceId);
  }

  @Get('workspaces/:workspaceId/categories')
  getPublicWorkspaceCategories(@Param('workspaceId') workspaceId: string) {
    return this.studyDiaryService.getPublicWorkspaceCategories(workspaceId);
  }

  @Get('workspaces/:workspaceId/categories/:categoryId/sections')
  getPublicWorkspaceSections(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.studyDiaryService.getPublicWorkspaceSections(
      workspaceId,
      categoryId,
    );
  }

  @Get('workspaces/:workspaceId/sections/:sectionId/notes')
  getPublicWorkspaceNotes(
    @Param('workspaceId') workspaceId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.studyDiaryService.getPublicWorkspaceNotes(
      workspaceId,
      sectionId,
    );
  }

  @Get(':userId')
  getPublicDiary(@Param('userId') userId: string) {
    return this.studyDiaryService.getPublicDiary(userId);
  }

  @Get(':userId/categories')
  getPublicCategories(@Param('userId') userId: string) {
    return this.studyDiaryService.getPublicCategories(userId);
  }

  @Get(':userId/categories/:categoryId/sections')
  getPublicSections(
    @Param('userId') userId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.studyDiaryService.getPublicSections(userId, categoryId);
  }

  @Get(':userId/sections/:sectionId/notes')
  getPublicNotes(
    @Param('userId') userId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.studyDiaryService.getPublicNotes(userId, sectionId);
  }
}
