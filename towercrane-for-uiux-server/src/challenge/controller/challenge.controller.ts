import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ChallengeService } from '../service/challenge.service';
import { SessionGuard } from '../../auth/guard/session.guard';
import { AdminGuard } from '../../auth/guard/admin.guard';
import {
  createCategorySchema,
  updateCategorySchema,
  createSectionSchema,
  createTopicSchema,
  createSubmissionSchema,
  createGptThreadSchema,
  updateGptThreadSchema,
  sendGptMessageSchema,
  createNoteSchema,
  updateNoteSchema,
} from '../dto/challenge.schema';
import type { SessionRequest } from '../../auth/types';

@Controller('api/challenge')
@UseGuards(SessionGuard)
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  // ─── Categories ─────────────────────────────────────────────────────────

  @Get('categories')
  async getCategories() {
    return this.challengeService.getCategories();
  }

  @Post('categories')
  @UseGuards(AdminGuard)
  async createCategory(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createCategorySchema.parse(body);
    return this.challengeService.createCategory(input, req.user.id);
  }

  @Get('categories/:id')
  async getCategory(@Param('id') id: string) {
    return this.challengeService.getCategoryById(id);
  }

  @Patch('categories/:id')
  @UseGuards(AdminGuard)
  async updateCategory(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = updateCategorySchema.parse(body);
    return this.challengeService.updateCategory(id, input, req.user.id);
  }

  @Delete('categories/:id')
  @UseGuards(AdminGuard)
  async deleteCategory(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.challengeService.deleteCategory(id, req.user.id);
  }

  // ─── Sections ───────────────────────────────────────────────────────────

  @Get('categories/:categoryId/sections')
  async getSectionsByCategory(@Param('categoryId') categoryId: string) {
    return this.challengeService.getSectionsByCategory(categoryId);
  }

  @Post('sections')
  @UseGuards(AdminGuard)
  async createSection(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createSectionSchema.parse(body);
    return this.challengeService.createSection(input, req.user.id);
  }

  @Get('sections/:id')
  async getSection(@Param('id') id: string) {
    return this.challengeService.getSectionById(id);
  }

  @Patch('sections/:id')
  @UseGuards(AdminGuard)
  async updateSection(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = createSectionSchema.partial().parse(body);
    return this.challengeService.updateSection(id, input, req.user.id);
  }

  @Delete('sections/:id')
  @UseGuards(AdminGuard)
  async deleteSection(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.challengeService.deleteSection(id, req.user.id);
  }

  // ─── Topics (Blocks) ────────────────────────────────────────────────────

  @Get('sections/:sectionId/topics')
  async getTopicsBySection(@Param('sectionId') sectionId: string) {
    return this.challengeService.getTopicsBySection(sectionId);
  }

  @Post('topics')
  @UseGuards(AdminGuard)
  async createTopic(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createTopicSchema.parse(body);
    return this.challengeService.createTopic(input, req.user.id);
  }

  @Get('topics/:id')
  async getTopic(@Param('id') id: string) {
    return this.challengeService.getTopicById(id);
  }

  @Patch('topics/:id')
  @UseGuards(AdminGuard)
  async updateTopic(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = createTopicSchema.partial().parse(body);
    return this.challengeService.updateTopic(id, input, req.user.id);
  }

  @Post('topics/reorder')
  @UseGuards(AdminGuard)
  async reorderTopics(@Body() body: { sectionId: string; topicIds: string[] }, @Req() req: SessionRequest) {
    return this.challengeService.reorderTopics(body.sectionId, body.topicIds, req.user.id);
  }

  @Delete('topics/:id')
  @UseGuards(AdminGuard)
  async deleteTopic(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.challengeService.deleteTopic(id, req.user.id);
  }

  // ─── Submissions ────────────────────────────────────────────────────────

  @Get('topics/:topicId/submissions')
  async getSubmissionsByTopic(@Param('topicId') topicId: string) {
    return this.challengeService.getSubmissionsByTopic(topicId);
  }

  @Get('submissions/:id')
  async getSubmission(@Param('id') id: string, @Req() req: SessionRequest) {
    const submission = await this.challengeService.getSubmissionById(id);
    if (submission && submission.userId !== req.user.id && req.user.role !== 'admin') {
      throw new ForbiddenException('Not authorized');
    }
    return submission;
  }

  @Post('submissions')
  async createSubmission(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createSubmissionSchema.parse(body);
    return this.challengeService.createSubmission(input, req.user.id);
  }

  @Patch('submissions/:id')
  async updateSubmission(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = createSubmissionSchema.partial().parse(body);
    return this.challengeService.updateSubmission(id, input, req.user.id);
  }

  @Post('submissions/:id/rate')
  @UseGuards(AdminGuard)
  async rateSubmission(
    @Param('id') id: string,
    @Body() body: { adminRating: number; adminFeedback?: string },
    @Req() req: SessionRequest,
  ) {
    return this.challengeService.rateSubmission(id, body.adminRating, body.adminFeedback, req.user.id);
  }

  // ─── GPT Threads ────────────────────────────────────────────────────────

  @Get('sections/:sectionId/gpt/threads')
  async getGptThreads(@Param('sectionId') sectionId: string, @Req() req: SessionRequest) {
    return this.challengeService.getGptThreads(sectionId, req.user.id);
  }

  @Post('gpt/threads')
  async createGptThread(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createGptThreadSchema.parse(body);
    return this.challengeService.createGptThread(input, req.user.id);
  }

  @Get('gpt/threads/:id')
  async getGptThread(@Param('id') id: string, @Req() req: SessionRequest) {
    const thread = await this.challengeService.getGptThreadById(id);
    if (thread && thread.userId !== req.user.id && !thread.isShared) {
      throw new ForbiddenException('Not authorized');
    }
    return thread;
  }

  @Patch('gpt/threads/:id')
  async updateGptThread(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = updateGptThreadSchema.parse(body);
    return this.challengeService.updateGptThread(id, input, req.user.id);
  }

  @Delete('gpt/threads/:id')
  async deleteGptThread(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.challengeService.deleteGptThread(id, req.user.id);
  }

  // ─── GPT Messages ───────────────────────────────────────────────────────

  @Get('gpt/threads/:threadId/messages')
  async getGptMessages(@Param('threadId') threadId: string, @Req() req: SessionRequest) {
    const thread = await this.challengeService.getGptThreadById(threadId);
    if (!thread) throw new Error('Thread not found');
    if (thread.userId !== req.user.id && !thread.isShared) {
      throw new ForbiddenException('Not authorized');
    }
    return this.challengeService.getGptMessages(threadId);
  }

  @Post('gpt/threads/:threadId/messages')
  async sendGptMessage(
    @Param('threadId') threadId: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = sendGptMessageSchema.parse(body);
    const thread = await this.challengeService.getGptThreadById(threadId);
    if (!thread) throw new Error('Thread not found');
    if (thread.userId !== req.user.id) {
      throw new ForbiddenException('Not authorized');
    }
    return this.challengeService.createGptMessage(threadId, 'user', input.content);
  }

  // ─── User Notes ─────────────────────────────────────────────────────────

  @Get('sections/:sectionId/notes/mine')
  async getMyNotes(@Param('sectionId') sectionId: string, @Req() req: SessionRequest) {
    return this.challengeService.getMyNotes(sectionId, req.user.id);
  }

  @Get('sections/:sectionId/notes/shared')
  async getSharedNotes(@Param('sectionId') sectionId: string, @Req() req: SessionRequest) {
    return this.challengeService.getSharedNotes(sectionId, req.user.id);
  }

  @Post('notes')
  async createNote(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createNoteSchema.parse(body);
    return this.challengeService.createNote(input, req.user.id);
  }

  @Get('notes/:id')
  async getNote(@Param('id') id: string, @Req() req: SessionRequest) {
    const note = await this.challengeService.getNoteById(id);
    if (!note) throw new Error('Note not found');
    if (note.userId !== req.user.id && note.visibility === 'private') {
      throw new ForbiddenException('Not authorized');
    }
    return note;
  }

  @Patch('notes/:id')
  async updateNote(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = updateNoteSchema.partial().parse(body);
    return this.challengeService.updateNote(id, input, req.user.id);
  }

  @Delete('notes/:id')
  async deleteNote(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.challengeService.deleteNote(id, req.user.id);
  }
}
