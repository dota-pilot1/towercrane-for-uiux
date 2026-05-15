import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BoardsService } from './boards.service';

@Controller('admin/board-configs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminBoardConfigsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Get()
  list() {
    return this.boardsService.listAllConfigs();
  }

  @Post()
  create(@Body() body: unknown) {
    return this.boardsService.createConfig(body);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() body: unknown) {
    return this.boardsService.updateConfig(code, body);
  }

  @Delete(':code')
  deactivate(@Param('code') code: string) {
    return this.boardsService.deactivateConfig(code);
  }
}

