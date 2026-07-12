import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guard/session.guard';
import type { SessionRequest } from '../auth/types';
import {
  createAiStudyNoteItemSchema,
  createAiStudyNoteNoteSchema,
  createAiStudyNoteSchema,
  updateAiStudyNoteItemSchema,
  updateAiStudyNoteNoteSchema,
  updateAiStudyNoteSchema,
} from './dto/ai-study-note.schema';
import { AiStudyNoteService } from './ai-study-note.service';

@Controller('ai-study-note')
@UseGuards(SessionGuard)
export class AiStudyNoteController {
  constructor(private readonly aiStudyNoteService: AiStudyNoteService) {}

  @Get('plans')
  listPlans(@Req() req: SessionRequest) {
    return this.aiStudyNoteService.listPlans(req.user.id);
  }

  @Post('plans')
  createPlan(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createAiStudyNoteSchema.parse(body);
    return this.aiStudyNoteService.createPlan(req.user.id, input);
  }

  @Get('plans/:planId')
  getPlan(@Req() req: SessionRequest, @Param('planId') planId: string) {
    return this.aiStudyNoteService.getPlan(req.user.id, planId);
  }

  @Patch('plans/:planId')
  updatePlan(
    @Req() req: SessionRequest,
    @Param('planId') planId: string,
    @Body() body: unknown,
  ) {
    const input = updateAiStudyNoteSchema.parse(body);
    return this.aiStudyNoteService.updatePlan(req.user.id, planId, input);
  }

  @Delete('plans/:planId')
  deletePlan(@Req() req: SessionRequest, @Param('planId') planId: string) {
    return this.aiStudyNoteService.deletePlan(req.user.id, planId);
  }

  @Post('plans/:planId/items')
  createItem(
    @Req() req: SessionRequest,
    @Param('planId') planId: string,
    @Body() body: unknown,
  ) {
    const input = createAiStudyNoteItemSchema.parse(body);
    return this.aiStudyNoteService.createItem(req.user.id, planId, input);
  }

  @Patch('items/:itemId')
  updateItem(
    @Req() req: SessionRequest,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ) {
    const input = updateAiStudyNoteItemSchema.parse(body);
    return this.aiStudyNoteService.updateItem(req.user.id, itemId, input);
  }

  @Delete('items/:itemId')
  deleteItem(@Req() req: SessionRequest, @Param('itemId') itemId: string) {
    return this.aiStudyNoteService.deleteItem(req.user.id, itemId);
  }

  @Get('items/:itemId/notes')
  listItemNotes(
    @Req() req: SessionRequest,
    @Param('itemId') itemId: string,
  ) {
    return this.aiStudyNoteService.listItemNotes(req.user.id, itemId);
  }

  @Post('items/:itemId/notes')
  createItemNote(
    @Req() req: SessionRequest,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ) {
    const input = createAiStudyNoteNoteSchema.parse(body);
    return this.aiStudyNoteService.createItemNote(req.user.id, itemId, input);
  }

  @Patch('notes/:noteId')
  updateItemNote(
    @Req() req: SessionRequest,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
  ) {
    const input = updateAiStudyNoteNoteSchema.parse(body);
    return this.aiStudyNoteService.updateItemNote(req.user.id, noteId, input);
  }

  @Delete('notes/:noteId')
  deleteItemNote(@Req() req: SessionRequest, @Param('noteId') noteId: string) {
    return this.aiStudyNoteService.deleteItemNote(req.user.id, noteId);
  }
}
