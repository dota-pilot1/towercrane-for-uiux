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
import { AdminGuard } from '../auth/guard/admin.guard';
import { SessionGuard } from '../auth/guard/session.guard';
import type { SessionRequest } from '../auth/types';
import {
  createAssignmentBlockSchema,
  createAssignmentSchema,
  createCategorySchema,
  createSectionSchema,
  createSubmissionSchema,
  reviewSubmissionSchema,
  updateAssignmentBlockSchema,
  updateAssignmentSchema,
  updateCategorySchema,
  updateSectionSchema,
  updateSubmissionSchema,
} from './dto/dev-challenge.schema';
import { DevChallengeService } from './dev-challenge.service';

@Controller('dev-challenge')
@UseGuards(SessionGuard)
export class DevChallengeController {
  constructor(private readonly devChallengeService: DevChallengeService) {}

  @Get('categories')
  getCategories() {
    return this.devChallengeService.getCategories();
  }

  @Post('categories')
  @UseGuards(AdminGuard)
  createCategory(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createCategorySchema.parse(body);
    return this.devChallengeService.createCategory(input, req.user.id);
  }

  @Patch('categories/:id')
  @UseGuards(AdminGuard)
  updateCategory(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = updateCategorySchema.parse(body);
    return this.devChallengeService.updateCategory(id, input, req.user.id);
  }

  @Delete('categories/:id')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  deleteCategory(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.devChallengeService.deleteCategory(id, req.user.id);
  }

  @Post('categories/reorder')
  @UseGuards(AdminGuard)
  reorderCategories(@Body() body: { categoryIds: string[] }) {
    return this.devChallengeService.reorderCategories(body.categoryIds);
  }

  @Get('categories/:categoryId/sections')
  getSectionsByCategory(@Param('categoryId') categoryId: string) {
    return this.devChallengeService.getSectionsByCategory(categoryId);
  }

  @Post('sections')
  @UseGuards(AdminGuard)
  createSection(@Body() body: unknown) {
    const input = createSectionSchema.parse(body);
    return this.devChallengeService.createSection(input);
  }

  @Patch('sections/:id')
  @UseGuards(AdminGuard)
  updateSection(@Param('id') id: string, @Body() body: unknown) {
    const input = updateSectionSchema.parse(body);
    return this.devChallengeService.updateSection(id, input);
  }

  @Delete('sections/:id')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  deleteSection(@Param('id') id: string) {
    return this.devChallengeService.deleteSection(id);
  }

  @Post('sections/reorder')
  @UseGuards(AdminGuard)
  reorderSections(@Body() body: { categoryId: string; sectionIds: string[] }) {
    return this.devChallengeService.reorderSections(body.categoryId, body.sectionIds);
  }

  @Get('sections/:sectionId/assignments')
  getAssignmentsBySection(@Param('sectionId') sectionId: string) {
    return this.devChallengeService.getAssignmentsBySection(sectionId);
  }

  @Get('assignments/:id')
  getAssignment(@Param('id') id: string) {
    return this.devChallengeService.getAssignmentDetail(id);
  }

  @Post('assignments')
  @UseGuards(AdminGuard)
  createAssignment(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createAssignmentSchema.parse(body);
    return this.devChallengeService.createAssignment(input, req.user.id);
  }

  @Patch('assignments/:id')
  @UseGuards(AdminGuard)
  updateAssignment(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = updateAssignmentSchema.parse(body);
    return this.devChallengeService.updateAssignment(id, input, req.user.id);
  }

  @Delete('assignments/:id')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  deleteAssignment(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.devChallengeService.deleteAssignment(id, req.user.id);
  }

  @Post('assignments/reorder')
  @UseGuards(AdminGuard)
  reorderAssignments(@Body() body: { sectionId: string; assignmentIds: string[] }) {
    return this.devChallengeService.reorderAssignments(body.sectionId, body.assignmentIds);
  }

  @Post('assignments/:assignmentId/blocks')
  @UseGuards(AdminGuard)
  createAssignmentBlock(@Param('assignmentId') assignmentId: string, @Body() body: unknown) {
    const input = createAssignmentBlockSchema.parse({ ...(body as object), assignmentId });
    return this.devChallengeService.createAssignmentBlock(input);
  }

  @Patch('blocks/:id')
  @UseGuards(AdminGuard)
  updateAssignmentBlock(@Param('id') id: string, @Body() body: unknown) {
    const input = updateAssignmentBlockSchema.parse(body);
    return this.devChallengeService.updateAssignmentBlock(id, input);
  }

  @Delete('blocks/:id')
  @UseGuards(AdminGuard)
  @HttpCode(204)
  deleteAssignmentBlock(@Param('id') id: string) {
    return this.devChallengeService.deleteAssignmentBlock(id);
  }

  @Get('assignments/:assignmentId/submissions')
  @UseGuards(AdminGuard)
  getSubmissionsByAssignment(@Param('assignmentId') assignmentId: string) {
    return this.devChallengeService.getSubmissionsByAssignment(assignmentId);
  }

  @Get('assignments/:assignmentId/submissions/my')
  getMySubmission(@Param('assignmentId') assignmentId: string, @Req() req: SessionRequest) {
    return this.devChallengeService.getMySubmission(assignmentId, req.user.id) ?? null;
  }

  @Post('submissions')
  createSubmission(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createSubmissionSchema.parse(body);
    return this.devChallengeService.createSubmission(input, req.user.id);
  }

  @Patch('submissions/:id')
  updateSubmission(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = updateSubmissionSchema.parse(body);
    return this.devChallengeService.updateSubmission(id, input, req.user.id);
  }

  @Post('submissions/:id/review')
  @UseGuards(AdminGuard)
  reviewSubmission(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = reviewSubmissionSchema.parse(body);
    return this.devChallengeService.reviewSubmission(id, input, req.user.id);
  }
}
