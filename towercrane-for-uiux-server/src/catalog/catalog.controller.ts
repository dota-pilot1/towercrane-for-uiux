import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

  @Post('categories/:categoryId/prototypes')
  createPrototype(
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.createPrototype(categoryId, body);
  }
}
