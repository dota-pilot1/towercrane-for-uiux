import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiDocService, type ApiDocUser } from './api-doc.service';

@Controller('api-doc')
@UseGuards(AuthGuard)
export class ApiDocController {
  constructor(private readonly apiDocService: ApiDocService) {}

  @Get('categories')
  listCategories() {
    return this.apiDocService.listCategories();
  }

  @Get('export')
  exportAll() {
    return this.apiDocService.exportAll();
  }

  @Post('import')
  importAll(@CurrentUser() user: ApiDocUser, @Body() body: unknown) {
    return this.apiDocService.importAll(user, body);
  }

  @Post('categories')
  createCategory(@CurrentUser() user: ApiDocUser, @Body() body: unknown) {
    return this.apiDocService.createCategory(user, body);
  }

  @Patch('categories/reorder')
  reorderCategories(@CurrentUser() user: ApiDocUser, @Body() body: unknown) {
    return this.apiDocService.reorderCategories(user, body);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @CurrentUser() user: ApiDocUser,
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.apiDocService.updateCategory(user, categoryId, body);
  }

  @Delete('categories/:categoryId')
  deleteCategory(
    @CurrentUser() user: ApiDocUser,
    @Param('categoryId') categoryId: string,
  ) {
    return this.apiDocService.deleteCategory(user, categoryId);
  }

  @Get('categories/:categoryId/endpoints')
  listEndpoints(@Param('categoryId') categoryId: string) {
    return this.apiDocService.listEndpoints(categoryId);
  }

  @Post('endpoints')
  createEndpoint(@CurrentUser() user: ApiDocUser, @Body() body: unknown) {
    return this.apiDocService.createEndpoint(user, body);
  }

  @Patch('endpoints/reorder')
  reorderEndpoints(@CurrentUser() user: ApiDocUser, @Body() body: unknown) {
    return this.apiDocService.reorderEndpoints(user, body);
  }

  @Patch('endpoints/:endpointId')
  updateEndpoint(
    @CurrentUser() user: ApiDocUser,
    @Param('endpointId') endpointId: string,
    @Body() body: unknown,
  ) {
    return this.apiDocService.updateEndpoint(user, endpointId, body);
  }

  @Delete('endpoints/:endpointId')
  deleteEndpoint(
    @CurrentUser() user: ApiDocUser,
    @Param('endpointId') endpointId: string,
  ) {
    return this.apiDocService.deleteEndpoint(user, endpointId);
  }

  @Get('endpoints/:endpointId/blocks')
  listBlocks(@Param('endpointId') endpointId: string) {
    return this.apiDocService.listBlocks(endpointId);
  }

  @Put('endpoints/:endpointId/blocks')
  replaceBlocks(
    @CurrentUser() user: ApiDocUser,
    @Param('endpointId') endpointId: string,
    @Body() body: unknown,
  ) {
    return this.apiDocService.replaceBlocks(user, endpointId, body);
  }
}
