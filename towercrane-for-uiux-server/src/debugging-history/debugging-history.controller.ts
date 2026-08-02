import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/guard/session.guard';
import type { SessionRequest } from '../auth/types';
import { documentPatchSchema, documentSchema, reorderSchema, titleSchema } from './debugging-history.schemas';
import { DebuggingPlaybookService } from './debugging-history.service';

@Controller('debugging-playbook')
@UseGuards(SessionGuard)
export class DebuggingPlaybookController {
  constructor(private readonly service: DebuggingPlaybookService) {}
  @Get() list(@Req() req: SessionRequest) { return this.service.list(req.user.id); }
  @Post('categories') createCategory(@Req() req: SessionRequest, @Body() body: unknown) { return this.service.createCategory(req.user.id, titleSchema.parse(body)); }
  @Patch('categories/:id') updateCategory(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.updateCategory(req.user.id, id, titleSchema.parse(body)); }
  @Delete('categories/:id') deleteCategory(@Req() req: SessionRequest, @Param('id') id: string) { return this.service.deleteCategory(req.user.id, id); }
  @Post('categories/:categoryId/topics') createTopic(@Req() req: SessionRequest, @Param('categoryId') categoryId: string, @Body() body: unknown) { return this.service.createTopic(req.user.id, categoryId, titleSchema.parse(body)); }
  @Patch('topics/:id') updateTopic(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.updateTopic(req.user.id, id, titleSchema.parse(body)); }
  @Delete('topics/:id') deleteTopic(@Req() req: SessionRequest, @Param('id') id: string) { return this.service.deleteTopic(req.user.id, id); }
  @Post('topics/:topicId/documents') createDocument(@Req() req: SessionRequest, @Param('topicId') topicId: string, @Body() body: unknown) { return this.service.createDocument(req.user.id, topicId, documentSchema.parse(body)); }
  @Patch('documents/:id') updateDocument(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.updateDocument(req.user.id, id, documentPatchSchema.parse(body)); }
  @Delete('documents/:id') deleteDocument(@Req() req: SessionRequest, @Param('id') id: string) { return this.service.deleteDocument(req.user.id, id); }
  @Post('documents/:id/reorder') reorderDocument(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.reorderDocument(req.user.id, id, reorderSchema.parse(body).direction); }
}
