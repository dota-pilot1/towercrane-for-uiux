import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TestPlaybookService } from './test-playbook.service';

@Controller('test-playbook')
@UseGuards(AuthGuard)
export class TestPlaybookController {
  constructor(private readonly service: TestPlaybookService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) { return this.service.list(user.id); }

  @Post('categories')
  createCategory(@CurrentUser() user: { id: string }, @Body() body: unknown) { return this.service.createCategory(user.id, body); }

  @Patch('categories/:categoryId')
  updateCategory(@CurrentUser() user: { id: string }, @Param('categoryId') id: string, @Body() body: unknown) { return this.service.updateCategory(user.id, id, body); }

  @Delete('categories/:categoryId')
  deleteCategory(@CurrentUser() user: { id: string }, @Param('categoryId') id: string) { return this.service.deleteCategory(user.id, id); }

  @Post('categories/:categoryId/documents')
  createDocument(@CurrentUser() user: { id: string }, @Param('categoryId') id: string, @Body() body: unknown) { return this.service.createDocument(user.id, id, body); }

  @Patch('documents/:documentId')
  updateDocument(@CurrentUser() user: { id: string }, @Param('documentId') id: string, @Body() body: unknown) { return this.service.updateDocument(user.id, id, body); }

  @Delete('documents/:documentId')
  deleteDocument(@CurrentUser() user: { id: string }, @Param('documentId') id: string) { return this.service.deleteDocument(user.id, id); }

  @Post('documents/:documentId/contents')
  createContent(@CurrentUser() user: { id: string }, @Param('documentId') id: string, @Body() body: unknown) { return this.service.createContent(user.id, id, body); }

  @Patch('contents/:contentId')
  updateContent(@CurrentUser() user: { id: string }, @Param('contentId') id: string, @Body() body: unknown) { return this.service.updateContent(user.id, id, body); }

  @Delete('contents/:contentId')
  deleteContent(@CurrentUser() user: { id: string }, @Param('contentId') id: string) { return this.service.deleteContent(user.id, id); }

  @Post('contents/:contentId/reorder')
  moveContent(@CurrentUser() user: { id: string }, @Param('contentId') id: string, @Body() body: { direction?: 'up' | 'down' }) { return this.service.moveContent(user.id, id, body.direction === 'up' ? 'up' : 'down'); }
}
