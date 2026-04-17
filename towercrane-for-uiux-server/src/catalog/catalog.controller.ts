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
import { CatalogService } from './catalog.service';

@Controller('catalog')
@UseGuards(AuthGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  listCategories(@CurrentUser() user: { id: string; role: string }) {
    return this.catalogService.listCategories(user.id, user.role);
  }

  @Get('categories/:categoryId')
  getCategory(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
  ) {
    return this.catalogService.getCategory(user.id, user.role, categoryId);
  }

  @Post('categories')
  createCategory(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.catalogService.createCategory(user.id, body);
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.updateCategory(user.id, user.role, categoryId, body);
  }

  @Delete('categories/:categoryId')
  deleteCategory(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
  ) {
    return this.catalogService.deleteCategory(user.id, user.role, categoryId);
  }

  @Get('categories/:categoryId/prototypes')
  listCategoryPrototypes(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.catalogService.listCategoryPrototypes(
      user.id,
      user.role,
      categoryId,
      query,
    );
  }

  @Post('categories/:categoryId/prototypes')
  createPrototype(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    return this.catalogService.createPrototype(user.id, user.role, categoryId, body);
  }

  @Patch('categories/:categoryId/prototypes/:prototypeId')
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

  @Delete('categories/:categoryId/prototypes/:prototypeId')
  deletePrototype(
    @CurrentUser() user: { id: string; role: string },
    @Param('categoryId') categoryId: string,
    @Param('prototypeId') prototypeId: string,
  ) {
    return this.catalogService.deletePrototype(user.id, user.role, categoryId, prototypeId);
  }
}
