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
import { CurrentUser } from '../auth/current-user.decorator';
import { TeamDocsService, type TeamDocUser } from './team-docs.service';

@Controller('team-docs')
@UseGuards(AuthGuard)
export class TeamDocsController {
  constructor(private readonly teamDocsService: TeamDocsService) {}

  @Get('tree')
  getTree() {
    return this.teamDocsService.getTree();
  }

  @Post('folders')
  createFolder(@CurrentUser() user: TeamDocUser, @Body() body: unknown) {
    return this.teamDocsService.createFolder(user, body);
  }

  @Post('documents')
  createDocument(@CurrentUser() user: TeamDocUser, @Body() body: unknown) {
    return this.teamDocsService.createDocument(user, body);
  }

  @Post('files')
  createFile(@CurrentUser() user: TeamDocUser, @Body() body: unknown) {
    return this.teamDocsService.createFile(user, body);
  }

  @Patch('reorder')
  reorder(@Body() body: unknown) {
    return this.teamDocsService.reorder(body);
  }

  @Get(':id')
  getNode(@Param('id') id: string) {
    return this.teamDocsService.getNode(id);
  }

  @Patch(':id')
  updateNode(
    @CurrentUser() user: TeamDocUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.teamDocsService.updateNode(user, id, body);
  }

  @Delete(':id')
  deleteNode(@Param('id') id: string) {
    return this.teamDocsService.deleteNode(id);
  }
}
