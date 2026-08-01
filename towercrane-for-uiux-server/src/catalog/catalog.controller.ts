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
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('workspaces')
  @UseGuards(OptionalAuthGuard)
  listWorkspaces(@CurrentUser() user?: { id: string; role: string }) {
    return this.catalogService.listWorkspaces(
      user?.id ?? '',
      user?.role ?? 'guest',
    );
  }

  @Post('workspaces')
  @UseGuards(AuthGuard)
  createWorkspace(
    @CurrentUser() user: { id: string; role: string },
    @Body() body: unknown,
  ) {
    return this.catalogService.createWorkspace(user.id, user.role, body);
  }

  @Post('workspaces/reorder')
  @UseGuards(AuthGuard)
  reorderWorkspaces(
    @CurrentUser() user: { id: string; role: string },
    @Body() body: unknown,
  ) {
    return this.catalogService.reorderWorkspaces(user.id, user.role, body);
  }

  @Patch('workspaces/:workspaceId')
  @UseGuards(AuthGuard)
  updateWorkspace(
    @CurrentUser() user: { id: string; role: string },
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.updateWorkspace(
      user.id,
      user.role,
      workspaceId,
      body,
    );
  }

  @Delete('workspaces/:workspaceId')
  @UseGuards(AuthGuard)
  deleteWorkspace(
    @CurrentUser() user: { id: string; role: string },
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.catalogService.deleteWorkspace(user.id, user.role, workspaceId);
  }

  @Get('workspaces/:workspaceId/categories')
  @UseGuards(OptionalAuthGuard)
  listWorkspaceCategories(
    @CurrentUser() user: { id: string; role: string } | undefined,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.catalogService.listWorkspaceCategories(
      user?.id ?? '',
      user?.role ?? 'guest',
      workspaceId,
    );
  }

  @Post('workspaces/:workspaceId/categories')
  @UseGuards(AuthGuard)
  createWorkspaceCategory(
    @CurrentUser() user: { id: string; role: string },
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.createWorkspaceCategory(
      user.id,
      user.role,
      workspaceId,
      body,
    );
  }

  @Post('workspaces/:workspaceId/categories/reorder')
  @UseGuards(AuthGuard)
  reorderWorkspaceCategories(
    @CurrentUser() user: { id: string; role: string },
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.reorderWorkspaceCategories(
      user.id,
      user.role,
      workspaceId,
      body,
    );
  }

  @Get('workspaces/:workspaceId/topics')
  @UseGuards(OptionalAuthGuard)
  listWorkspaceTopics(
    @CurrentUser() user: { id: string; role: string } | undefined,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.catalogService.listWorkspaceCategories(
      user?.id ?? '',
      user?.role ?? 'guest',
      workspaceId,
    );
  }

  @Post('workspaces/:workspaceId/topics')
  @UseGuards(AuthGuard)
  createWorkspaceTopic(
    @CurrentUser() user: { id: string; role: string },
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.createWorkspaceCategory(
      user.id,
      user.role,
      workspaceId,
      body,
    );
  }

  @Post('workspaces/:workspaceId/topics/reorder')
  @UseGuards(AuthGuard)
  reorderWorkspaceTopics(
    @CurrentUser() user: { id: string; role: string },
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      items?: Array<{ id: string; orderIdx: number }>;
      topicIds?: string[];
      categoryIds?: string[];
    },
  ) {
    const items =
      body.items ??
      (body.topicIds ?? body.categoryIds ?? []).map((id, orderIdx) => ({
        id,
        orderIdx,
      }));

    return this.catalogService.reorderWorkspaceCategories(
      user.id,
      user.role,
      workspaceId,
      { items },
    );
  }

  @Get('categories')
  @UseGuards(OptionalAuthGuard)
  listCategories(@CurrentUser() user?: { id: string; role: string }) {
    return this.catalogService.listCategories(
      user?.id ?? '',
      user?.role ?? 'guest',
    );
  }

  @Post('categories/reorder')
  @UseGuards(AuthGuard)
  reorderCategories(
    @CurrentUser() user: { id: string },
    @Body('categoryIds') categoryIds: string[],
  ) {
    return this.catalogService.reorderCategories(user.id, categoryIds);
  }

  @Get('topics')
  @UseGuards(OptionalAuthGuard)
  listTopics(@CurrentUser() user?: { id: string; role: string }) {
    return this.catalogService.listCategories(
      user?.id ?? '',
      user?.role ?? 'guest',
    );
  }

  @Post('topics/reorder')
  @UseGuards(AuthGuard)
  reorderTopics(
    @CurrentUser() user: { id: string },
    @Body('topicIds') topicIds: string[],
  ) {
    return this.catalogService.reorderCategories(user.id, topicIds);
  }

  @Get('categories/:categoryId')
  @UseGuards(OptionalAuthGuard)
  getCategory(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
  ) {
    return this.catalogService.getCategory(
      user?.id ?? '',
      user?.role ?? 'guest',
      categoryId,
    );
  }

  @Get('topics/:topicId')
  @UseGuards(OptionalAuthGuard)
  getTopic(
    @CurrentUser() user: { id: string; role: string },
    @Param('topicId') topicId: string,
  ) {
    return this.catalogService.getCategory(
      user?.id ?? '',
      user?.role ?? 'guest',
      topicId,
    );
  }

  @Post('categories')
  @UseGuards(AuthGuard)
  createCategory(
    @CurrentUser() user: { id: string; role: string },
    @Body() body: unknown,
  ) {
    return this.catalogService.createCategory(user.id, user.role, body);
  }

  @Post('topics')
  @UseGuards(AuthGuard)
  createTopic(
    @CurrentUser() user: { id: string; role: string },
    @Body() body: unknown,
  ) {
    return this.catalogService.createCategory(user.id, user.role, body);
  }

  @Patch('categories/:categoryId')
  @UseGuards(AuthGuard)
  updateCategory(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.updateCategory(
      user.id,
      user.role,
      categoryId,
      body,
    );
  }

  @Patch('topics/:topicId')
  @UseGuards(AuthGuard)
  updateTopic(
    @CurrentUser() user: { id: string; role: string },
    @Param('topicId') topicId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.updateCategory(user.id, user.role, topicId, body);
  }

  @Delete('categories/:categoryId')
  @UseGuards(AuthGuard)
  deleteCategory(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
  ) {
    return this.catalogService.deleteCategory(user.id, user.role, categoryId);
  }

  @Delete('topics/:topicId')
  @UseGuards(AuthGuard)
  deleteTopic(
    @CurrentUser() user: { id: string; role: string },
    @Param('topicId') topicId: string,
  ) {
    return this.catalogService.deleteCategory(user.id, user.role, topicId);
  }

  @Get('categories/:categoryId/prototypes')
  @UseGuards(OptionalAuthGuard)
  listCategoryPrototypes(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.catalogService.listCategoryPrototypes(
      user?.id ?? '',
      user?.role ?? 'guest',
      categoryId,
      query,
    );
  }

  @Get('topics/:topicId/prototypes')
  @UseGuards(OptionalAuthGuard)
  listTopicPrototypes(
    @CurrentUser() user: { id: string; role: string },
    @Param('topicId') topicId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.catalogService.listCategoryPrototypes(
      user?.id ?? '',
      user?.role ?? 'guest',
      topicId,
      query,
    );
  }

  @Post('categories/:categoryId/prototypes')
  @UseGuards(AuthGuard)
  createPrototype(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.createPrototype(
      user.id,
      user.role,
      categoryId,
      body,
    );
  }

  @Post('topics/:topicId/prototypes')
  @UseGuards(AuthGuard)
  createTopicPrototype(
    @CurrentUser() user: { id: string; role: string },
    @Param('topicId') topicId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.createPrototype(
      user.id,
      user.role,
      topicId,
      body,
    );
  }

  @Patch('categories/:categoryId/prototypes/:prototypeId')
  @UseGuards(AuthGuard)
  updatePrototype(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
    @Param('prototypeId') prototypeId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.updatePrototype(
      user.id,
      user.role,
      categoryId,
      prototypeId,
      body,
    );
  }

  @Patch('topics/:topicId/prototypes/:prototypeId')
  @UseGuards(AuthGuard)
  updateTopicPrototype(
    @CurrentUser() user: { id: string; role: string },
    @Param('topicId') topicId: string,
    @Param('prototypeId') prototypeId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.updatePrototype(
      user.id,
      user.role,
      topicId,
      prototypeId,
      body,
    );
  }

  @Delete('categories/:categoryId/prototypes/:prototypeId')
  @UseGuards(AuthGuard)
  deletePrototype(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
    @Param('prototypeId') prototypeId: string,
  ) {
    return this.catalogService.deletePrototype(
      user.id,
      user.role,
      categoryId,
      prototypeId,
    );
  }

  @Delete('topics/:topicId/prototypes/:prototypeId')
  @UseGuards(AuthGuard)
  deleteTopicPrototype(
    @CurrentUser() user: { id: string; role: string },
    @Param('topicId') topicId: string,
    @Param('prototypeId') prototypeId: string,
  ) {
    return this.catalogService.deletePrototype(
      user.id,
      user.role,
      topicId,
      prototypeId,
    );
  }

  @Get('prototypes/:prototypeId/note')
  @UseGuards(OptionalAuthGuard)
  getPrototypeNote(
    @CurrentUser() user: { id: string; role: string } | undefined,
    @Param('prototypeId') prototypeId: string,
  ) {
    return this.catalogService.getPrototypeNote(
      user?.id ?? '',
      user?.role ?? 'guest',
      prototypeId,
    );
  }

  @Post('prototypes/:prototypeId/note/sections')
  @UseGuards(AuthGuard)
  createPrototypeNoteSection(
    @CurrentUser() user: { id: string; role: string },
    @Param('prototypeId') prototypeId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.createPrototypeNoteSection(
      user.id,
      user.role,
      prototypeId,
      body,
    );
  }

  @Patch('prototype-note-sections/:sectionId')
  @UseGuards(AuthGuard)
  updatePrototypeNoteSection(
    @CurrentUser() user: { id: string; role: string },
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.updatePrototypeNoteSection(
      user.id,
      user.role,
      sectionId,
      body,
    );
  }

  @Post('prototype-note-sections/:sectionId/notes')
  @UseGuards(AuthGuard)
  createPrototypeNoteEntry(
    @CurrentUser() user: { id: string; role: string },
    @Param('sectionId') sectionId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.createPrototypeNoteEntry(
      user.id,
      user.role,
      sectionId,
      body,
    );
  }

  @Delete('prototype-note-sections/:sectionId')
  @UseGuards(AuthGuard)
  deletePrototypeNoteSection(
    @CurrentUser() user: { id: string; role: string },
    @Param('sectionId') sectionId: string,
  ) {
    return this.catalogService.deletePrototypeNoteSection(
      user.id,
      user.role,
      sectionId,
    );
  }
}
