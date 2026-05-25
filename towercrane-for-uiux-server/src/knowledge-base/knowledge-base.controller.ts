import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthService } from '../auth/auth.service';
import { KnowledgeBaseService } from './knowledge-base.service';

type User = ReturnType<AuthService['getSessionUser']>;

@UseGuards(AuthGuard)
@Controller('knowledge')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get('documents')
  listDocuments(@CurrentUser() user: User, @Query() query: Record<string, unknown>) {
    return this.knowledgeBaseService.listDocuments(query, user);
  }

  @Get('documents/:id')
  getDocument(@CurrentUser() user: User, @Param('id') id: string) {
    return this.knowledgeBaseService.getDocument(id, user);
  }

  @Post('documents')
  createDocument(@CurrentUser() user: User, @Body() body: unknown) {
    return this.knowledgeBaseService.createDocument(body, user);
  }

  @Patch('documents/:id')
  updateDocument(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.knowledgeBaseService.updateDocument(id, body, user);
  }

  @Delete('documents/:id')
  deleteDocument(@CurrentUser() user: User, @Param('id') id: string) {
    return this.knowledgeBaseService.deleteDocument(id, user);
  }

  @Post('search')
  search(@CurrentUser() user: User, @Body() body: unknown) {
    return this.knowledgeBaseService.search(body, user);
  }
}
