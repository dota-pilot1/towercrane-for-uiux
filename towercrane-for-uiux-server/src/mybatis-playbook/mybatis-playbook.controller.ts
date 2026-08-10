import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/guard/session.guard';
import type { SessionRequest } from '../auth/types';
import { commentPatchSchema, commentSchema, documentAiEditSchema, documentPatchSchema, documentSchema, reorderCategoriesSchema, reorderDocumentsSchema, reorderSchema, reorderTopicsSchema, titleSchema } from './mybatis-playbook.schemas';
import { MybatisPlaybookService } from './mybatis-playbook.service';

@Controller('mybatis-playbook')
@UseGuards(SessionGuard)
export class MybatisPlaybookController {
  constructor(private readonly service: MybatisPlaybookService) {}
  @Get() list(@Req() req: SessionRequest) { return this.service.list(req.user.id); }
  @Post('categories') createCategory(@Req() req: SessionRequest, @Body() body: unknown) { return this.service.createCategory(req.user.id, titleSchema.parse(body)); }
  @Post('categories/reorder') reorderCategories(@Req() req: SessionRequest, @Body() body: unknown) { return this.service.reorderCategories(req.user.id, reorderCategoriesSchema.parse(body).categoryIds); }
  @Patch('categories/:id') updateCategory(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.updateCategory(req.user.id, id, titleSchema.parse(body)); }
  @Delete('categories/:id') deleteCategory(@Req() req: SessionRequest, @Param('id') id: string) { return this.service.deleteCategory(req.user.id, id); }
  @Post('categories/:categoryId/topics') createTopic(@Req() req: SessionRequest, @Param('categoryId') categoryId: string, @Body() body: unknown) { return this.service.createTopic(req.user.id, categoryId, titleSchema.parse(body)); }
  @Post('categories/:categoryId/topics/reorder') reorderTopics(@Req() req: SessionRequest, @Param('categoryId') categoryId: string, @Body() body: unknown) { return this.service.reorderTopics(req.user.id, categoryId, reorderTopicsSchema.parse(body).topicIds); }
  @Patch('topics/:id') updateTopic(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.updateTopic(req.user.id, id, titleSchema.parse(body)); }
  @Delete('topics/:id') deleteTopic(@Req() req: SessionRequest, @Param('id') id: string) { return this.service.deleteTopic(req.user.id, id); }
  @Post('topics/:topicId/documents') createDocument(@Req() req: SessionRequest, @Param('topicId') topicId: string, @Body() body: unknown) { return this.service.createDocument(req.user.id, topicId, documentSchema.parse(body)); }
  @Post('topics/:topicId/documents/reorder') reorderDocuments(@Req() req: SessionRequest, @Param('topicId') topicId: string, @Body() body: unknown) { const input = reorderDocumentsSchema.parse(body); return this.service.reorderDocuments(req.user.id, topicId, input.documentIds, input.parentId); }
  @Patch('documents/:id') updateDocument(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.updateDocument(req.user.id, id, documentPatchSchema.parse(body)); }
  @Post('documents/:id/ai-edit') aiEditDocument(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.aiEditDocument(req.user.id, id, documentAiEditSchema.parse(body)); }
  @Delete('documents/:id') deleteDocument(@Req() req: SessionRequest, @Param('id') id: string) { return this.service.deleteDocument(req.user.id, id); }
  @Post('documents/:id/reorder') reorderDocument(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.reorderDocument(req.user.id, id, reorderSchema.parse(body).direction); }
  @Get('documents/:documentId/comments') listComments(@Req() req: SessionRequest, @Param('documentId') documentId: string) { return this.service.listComments(req.user.id, documentId); }
  @Post('documents/:documentId/comments') createComment(@Req() req: SessionRequest, @Param('documentId') documentId: string, @Body() body: unknown) { return this.service.createComment(req.user.id, documentId, commentSchema.parse(body)); }
  @Patch('comments/:id') updateComment(@Req() req: SessionRequest, @Param('id') id: string, @Body() body: unknown) { return this.service.updateComment(req.user.id, id, commentPatchSchema.parse(body)); }
  @Delete('comments/:id') deleteComment(@Req() req: SessionRequest, @Param('id') id: string) { return this.service.deleteComment(req.user.id, id); }
}
