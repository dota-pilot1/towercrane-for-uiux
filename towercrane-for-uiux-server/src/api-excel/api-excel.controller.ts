import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { ApiDocUser } from '../api-doc/api-doc.service';
import { ApiExcelService } from './api-excel.service';
import { categorySchema, fileSchema, reorderSchema, titleSchema } from './api-excel.schemas';

@Controller('api-excel')
@UseGuards(AuthGuard)
export class ApiExcelController {
  constructor(private readonly service: ApiExcelService) {}

  @Get()
  list() { return this.service.list(); }

  @Post('projects')
  createProject(@CurrentUser() user: ApiDocUser, @Body() body: unknown) {
    return this.service.createProject(user, titleSchema.parse(body));
  }

  @Patch('projects/:id')
  updateProject(@CurrentUser() user: ApiDocUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.updateProject(user, id, titleSchema.partial().parse(body));
  }

  @Delete('projects/:id')
  deleteProject(@CurrentUser() user: ApiDocUser, @Param('id') id: string) {
    return this.service.deleteProject(user, id);
  }

  @Post('projects/:projectId/categories')
  createCategory(@CurrentUser() user: ApiDocUser, @Param('projectId') projectId: string, @Body() body: unknown) {
    return this.service.createCategory(user, projectId, categorySchema.parse(body));
  }

  @Patch('categories/:id')
  updateCategory(@CurrentUser() user: ApiDocUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.updateCategory(user, id, categorySchema.parse(body));
  }

  @Delete('categories/:id')
  deleteCategory(@CurrentUser() user: ApiDocUser, @Param('id') id: string) {
    return this.service.deleteCategory(user, id);
  }

  @Post('categories/:categoryId/files')
  createFile(@CurrentUser() user: ApiDocUser, @Param('categoryId') categoryId: string, @Body() body: unknown) {
    return this.service.createFile(user, categoryId, fileSchema.parse(body));
  }

  @Patch('files/:id')
  updateFile(@CurrentUser() user: ApiDocUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.updateFile(user, id, fileSchema.partial().parse(body));
  }

  @Delete('files/:id')
  deleteFile(@CurrentUser() user: ApiDocUser, @Param('id') id: string) {
    return this.service.deleteFile(user, id);
  }

  @Post('files/:id/reorder')
  reorderFile(@CurrentUser() user: ApiDocUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.reorderFile(user, id, reorderSchema.parse(body).direction);
  }
}
