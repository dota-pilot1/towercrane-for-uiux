import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { MenusService } from './menus.service';
import type { CreateMenuDto, UpdateMenuDto } from './menus.service';

@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get()
  findAll() {
    return this.menusService.findAll();
  }

  @Post()
  create(@Body() createMenuDto: CreateMenuDto) {
    return this.menusService.create(createMenuDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto) {
    return this.menusService.update(id, updateMenuDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }
}
