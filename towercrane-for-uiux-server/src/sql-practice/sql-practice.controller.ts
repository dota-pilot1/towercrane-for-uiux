import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { SessionRequest } from '../auth/types';
import { SqlPracticeService } from './sql-practice.service';
import {
  createSqlPracticeNoteSchema,
  listSqlPracticeNotesQuerySchema,
  updateSqlPracticeNoteSchema,
} from './sql-practice.schemas';

@Controller('sql')
@UseGuards(AuthGuard)
export class SqlPracticeController {
  constructor(private readonly sqlPracticeService: SqlPracticeService) {}

  @Get('meta')
  meta() {
    return this.sqlPracticeService.getMeta();
  }

  @Get('seeds')
  seeds() {
    return this.sqlPracticeService.listSeeds();
  }

  @Post('seeds/activate')
  activateSeed(@Body() body: unknown) {
    return this.sqlPracticeService.activateSeed(body);
  }

  @Get('tables')
  tables() {
    return this.sqlPracticeService.getTables();
  }

  @Get('tables/:tableName')
  table(@Param('tableName') tableName: string) {
    return this.sqlPracticeService.getTable(tableName);
  }

  @Post('execute')
  execute(@Body() body: unknown) {
    return this.sqlPracticeService.execute(body);
  }

  @Post('reset')
  reset() {
    return this.sqlPracticeService.reset();
  }

  @Post('reload-seed')
  reloadSeed() {
    return this.sqlPracticeService.reloadSeed();
  }

  @Get('seeds/:fileName/erd')
  seedErd(@Param('fileName') fileName: string) {
    return this.sqlPracticeService.getSeedErd(fileName);
  }

  @Post('gemini')
  geminiAsk(@Body() body: unknown) {
    return this.sqlPracticeService.geminiAsk(body);
  }

  @Get('notes/mine')
  notes(@Query() query: unknown, @Req() req: SessionRequest) {
    const filter = listSqlPracticeNotesQuerySchema.parse(query);
    return this.sqlPracticeService.getMyNotes(req.user.id, filter);
  }

  @Post('notes')
  createNote(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createSqlPracticeNoteSchema.parse(body);
    return this.sqlPracticeService.createNote(input, req.user.id);
  }

  @Get('notes/:id')
  note(@Param('id') id: string, @Req() req: SessionRequest) {
    const note = this.sqlPracticeService.getNoteById(id);
    if (!note || note.userId !== req.user.id) return null;
    return note;
  }

  @Patch('notes/:id')
  updateNote(@Param('id') id: string, @Body() body: unknown, @Req() req: SessionRequest) {
    const input = updateSqlPracticeNoteSchema.parse(body);
    return this.sqlPracticeService.updateNote(id, input, req.user.id);
  }

  @Delete('notes/:id')
  @HttpCode(204)
  deleteNote(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.sqlPracticeService.deleteNote(id, req.user.id);
  }
}
