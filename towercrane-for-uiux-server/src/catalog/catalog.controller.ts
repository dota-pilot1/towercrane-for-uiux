import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Get('categories/:categoryId')
  getCategory(@Param('categoryId') categoryId: string) {
    return this.catalogService.getCategory(categoryId);
  }

  @Post('categories')
  createCategory(@Body() body: unknown) {
    return this.catalogService.createCategory(body);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.updateCategory(categoryId, body);
  }

  @Delete('categories/:categoryId')
  deleteCategory(@Param('categoryId') categoryId: string) {
    return this.catalogService.deleteCategory(categoryId);
  }

  @Post('categories/:categoryId/prototypes')
  createPrototype(
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.createPrototype(categoryId, body);
  }

  @Patch('categories/:categoryId/prototypes/:prototypeId')
  updatePrototype(
    @Param('categoryId') categoryId: string,
    @Param('prototypeId') prototypeId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.updatePrototype(categoryId, prototypeId, body);
  }

  @Delete('categories/:categoryId/prototypes/:prototypeId')
  deletePrototype(
    @Param('categoryId') categoryId: string,
    @Param('prototypeId') prototypeId: string,
  ) {
    return this.catalogService.deletePrototype(categoryId, prototypeId);
  }
}
