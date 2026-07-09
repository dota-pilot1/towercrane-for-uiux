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
  createAxStudyNoteSchema,
  createAxStudyWorkspaceSchema,
  updateAxStudyNoteSchema,
  updateAxStudyWorkspaceSchema,
} from './dto/ax-study.schema';
import { AxStudyService } from './ax-study.service';

@Controller('ax-study')
@UseGuards(SessionGuard)
export class AxStudyController {
  constructor(private readonly axStudyService: AxStudyService) {}

  @Get('workspaces')
  listWorkspaces(@Req() req: SessionRequest) {
    return this.axStudyService.listWorkspaces(req.user.id);
  }

  @Post('workspaces')
  createWorkspace(@Req() req: SessionRequest, @Body() body: unknown) {
    const input = createAxStudyWorkspaceSchema.parse(body);
    return this.axStudyService.createWorkspace(req.user.id, input);
  }

  @Get('workspaces/:workspaceId')
  getWorkspace(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.axStudyService.getWorkspace(req.user.id, workspaceId);
  }

  @Patch('workspaces/:workspaceId')
  updateWorkspace(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    const input = updateAxStudyWorkspaceSchema.parse(body);
    return this.axStudyService.updateWorkspace(req.user.id, workspaceId, input);
  }

  @Delete('workspaces/:workspaceId')
  deleteWorkspace(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.axStudyService.deleteWorkspace(req.user.id, workspaceId);
  }

  @Post('workspaces/:workspaceId/notes')
  createNote(
    @Req() req: SessionRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    const input = createAxStudyNoteSchema.parse(body);
    return this.axStudyService.createNote(req.user.id, workspaceId, input);
  }

  @Patch('notes/:noteId')
  updateNote(
    @Req() req: SessionRequest,
    @Param('noteId') noteId: string,
    @Body() body: unknown,
  ) {
    const input = updateAxStudyNoteSchema.parse(body);
    return this.axStudyService.updateNote(req.user.id, noteId, input);
  }

  @Delete('notes/:noteId')
  deleteNote(@Req() req: SessionRequest, @Param('noteId') noteId: string) {
    return this.axStudyService.deleteNote(req.user.id, noteId);
  }
}
