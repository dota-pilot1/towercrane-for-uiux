import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TutorialService } from './tutorial.service';

@Controller('tutorial')
@UseGuards(AuthGuard)
export class TutorialController {
  constructor(private readonly tutorialService: TutorialService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.tutorialService.list(user.id);
  }

  @Post('categories')
  createCategory(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.tutorialService.createCategory(user.id, body);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @CurrentUser() user: { id: string },
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.tutorialService.updateCategory(user.id, categoryId, body);
  }

  @Delete('categories/:categoryId')
  deleteCategory(
    @CurrentUser() user: { id: string },
    @Param('categoryId') categoryId: string,
  ) {
    return this.tutorialService.deleteCategory(user.id, categoryId);
  }

  @Post('categories/:categoryId/sections')
  createSection(
    @CurrentUser() user: { id: string },
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.tutorialService.createSection(user.id, categoryId, body);
  }

  @Patch('sections/:sectionId')
  updateSection(
    @CurrentUser() user: { id: string },
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
  ) {
    return this.tutorialService.updateSection(user.id, sectionId, body);
  }

  @Delete('sections/:sectionId')
  deleteSection(
    @CurrentUser() user: { id: string },
    @Param('sectionId') sectionId: string,
  ) {
    return this.tutorialService.deleteSection(user.id, sectionId);
  }

  @Post('sections/:sectionId/lessons')
  createLesson(
    @CurrentUser() user: { id: string },
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
  ) {
    return this.tutorialService.createLesson(user.id, sectionId, body);
  }

  @Patch('lessons/:lessonId')
  updateLesson(
    @CurrentUser() user: { id: string },
    @Param('lessonId') lessonId: string,
    @Body() body: unknown,
  ) {
    return this.tutorialService.updateLesson(user.id, lessonId, body);
  }

  @Delete('lessons/:lessonId')
  deleteLesson(
    @CurrentUser() user: { id: string },
    @Param('lessonId') lessonId: string,
  ) {
    return this.tutorialService.deleteLesson(user.id, lessonId);
  }

  @Post('lessons/:lessonId/contents')
  createContent(
    @CurrentUser() user: { id: string },
    @Param('lessonId') lessonId: string,
    @Body() body: unknown,
  ) {
    return this.tutorialService.createContent(user.id, lessonId, body);
  }

  @Patch('contents/:contentId')
  updateContent(
    @CurrentUser() user: { id: string },
    @Param('contentId') contentId: string,
    @Body() body: unknown,
  ) {
    return this.tutorialService.updateContent(user.id, contentId, body);
  }

  @Delete('contents/:contentId')
  deleteContent(
    @CurrentUser() user: { id: string },
    @Param('contentId') contentId: string,
  ) {
    return this.tutorialService.deleteContent(user.id, contentId);
  }
}
