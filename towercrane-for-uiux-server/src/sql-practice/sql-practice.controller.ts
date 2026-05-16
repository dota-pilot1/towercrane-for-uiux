import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { SessionRequest } from '../auth/types';
import { SqlPracticeService } from './sql-practice.service';
import {
  createSqlUserPracticeProblemSchema,
  createSqlPracticeNoteSchema,
  generateSqlUserPracticeAnswerSchema,
  listSqlPracticeNotesQuerySchema,
  sqlUserPracticeProblemListQuerySchema,
  updateSqlUserPracticeProblemSchema,
  updateSqlPracticeNoteSchema,
} from './sql-practice.schemas';

@Controller('sql')
@UseGuards(AuthGuard)
export class SqlPracticeController {
  constructor(private readonly sqlPracticeService: SqlPracticeService) {}

  @Get('user/meta')
  userMeta(@Req() req: SessionRequest) {
    return this.sqlPracticeService.getUserPracticeMeta(req.user.id);
  }

  @Get('user/tables')
  userTables(@Req() req: SessionRequest) {
    return this.sqlPracticeService.getUserPracticeTables(req.user.id);
  }

  @Get('user/tables/:tableName')
  userTable(
    @Param('tableName') tableName: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.getUserPracticeTable(tableName, req.user.id);
  }

  @Post('user/execute')
  userExecute(@Body() body: unknown, @Req() req: SessionRequest) {
    return this.sqlPracticeService.executeUserPractice(body, req.user.id);
  }

  @Post('user/reset')
  userReset(@Req() req: SessionRequest) {
    return this.sqlPracticeService.resetUserPractice(req.user.id);
  }

  @Get('user/erd')
  userErd() {
    return this.sqlPracticeService.getUserPracticeErd();
  }

  @Get('user/problems')
  userProblems(@Query() query: unknown, @Req() req: SessionRequest) {
    const parsed = sqlUserPracticeProblemListQuerySchema.parse(query);
    return this.sqlPracticeService.listUserPracticeProblems(
      parsed,
      req.user.id,
    );
  }

  @Get('user/submissions/mine')
  myUserPracticeSubmissions(@Req() req: SessionRequest) {
    return this.sqlPracticeService.getMyUserPracticeSubmissions(req.user.id);
  }

  @Post('user/problems')
  createUserProblem(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createSqlUserPracticeProblemSchema.parse(body);
    return this.sqlPracticeService.createUserPracticeProblem(
      input,
      req.user.id,
    );
  }

  @Post('user/problems/generate-answer')
  generateUserProblemAnswer(
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = generateSqlUserPracticeAnswerSchema.parse(body);
    return this.sqlPracticeService.generateUserPracticeAnswer(
      input,
      req.user.id,
    );
  }

  @Post('user/problems/:id/grade')
  gradeUserProblem(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.gradeUserPracticeProblem(
      id,
      body,
      req.user.id,
    );
  }

  @Get('user/problems/:id')
  userProblem(@Param('id') id: string) {
    return this.sqlPracticeService.getUserPracticeProblem(id) ?? null;
  }

  @Patch('user/problems/:id')
  updateUserProblem(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = updateSqlUserPracticeProblemSchema.parse(body);
    return this.sqlPracticeService.updateUserPracticeProblem(
      id,
      input,
      req.user.id,
    );
  }

  @Delete('user/problems/:id')
  @HttpCode(204)
  deleteUserProblem(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.sqlPracticeService.deleteUserPracticeProblem(id, req.user.id);
  }

  @Get('meta')
  meta(@Req() req: SessionRequest) {
    return this.sqlPracticeService.getMeta(req.user.id);
  }

  @Get('seeds')
  seeds(@Req() req: SessionRequest) {
    return this.sqlPracticeService.listSeeds(req.user.id);
  }

  @Post('seeds/activate')
  activateSeed(@Body() body: unknown, @Req() req: SessionRequest) {
    return this.sqlPracticeService.activateSeed(body, req.user.id);
  }

  @Get('tables')
  tables(@Req() req: SessionRequest) {
    return this.sqlPracticeService.getTables(req.user.id);
  }

  @Get('tables/:tableName')
  table(@Param('tableName') tableName: string, @Req() req: SessionRequest) {
    return this.sqlPracticeService.getTable(tableName, req.user.id);
  }

  @Post('execute')
  execute(@Body() body: unknown, @Req() req: SessionRequest) {
    return this.sqlPracticeService.execute(body, req.user.id);
  }

  @Post('reset')
  reset(@Req() req: SessionRequest) {
    return this.sqlPracticeService.reset(req.user.id);
  }

  @Post('reload-seed')
  reloadSeed(@Req() req: SessionRequest) {
    return this.sqlPracticeService.reloadSeed(req.user.id);
  }

  @Get('seeds/:fileName/erd')
  seedErd(@Param('fileName') fileName: string) {
    return this.sqlPracticeService.getSeedErd(fileName);
  }

  @Post('gemini')
  geminiAsk(@Body() body: unknown) {
    return this.sqlPracticeService.geminiAsk(body);
  }

  @Post('submissions/grade')
  gradeSubmission(@Body() body: unknown, @Req() req: SessionRequest) {
    return this.sqlPracticeService.gradeAndSaveSubmission(body, req.user.id);
  }

  @Get('submissions/mine')
  mySubmissions(@Query() query: unknown, @Req() req: SessionRequest) {
    return this.sqlPracticeService.getMySubmissions(query, req.user.id);
  }

  @Get('submissions/ranking')
  ranking(@Query() query: unknown) {
    return this.sqlPracticeService.getRanking(query);
  }

  @Get('submissions/activity/mine')
  myActivity(@Query() query: unknown, @Req() req: SessionRequest) {
    return this.sqlPracticeService.getMyRecentActivity(query, req.user.id);
  }

  @Delete('submissions/activity/mine/:id')
  deleteMyActivityItem(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.sqlPracticeService.deleteMyActivityLog(id, req.user.id);
  }

  @Delete('submissions/activity/mine')
  clearMyActivity(@Query() query: unknown, @Req() req: SessionRequest) {
    return this.sqlPracticeService.clearMyActivityLogs(query, req.user.id);
  }

  @Get('submissions/activity')
  activity(@Query() query: unknown) {
    return this.sqlPracticeService.getRecentActivity(query);
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

  @Post('notes/:id/share')
  shareNote(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.sqlPracticeService.enableNotePublicShare(id, req.user.id);
  }

  @Patch('notes/:id')
  updateNote(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = updateSqlPracticeNoteSchema.parse(body);
    return this.sqlPracticeService.updateNote(id, input, req.user.id);
  }

  @Delete('notes/:id')
  @HttpCode(204)
  deleteNote(@Param('id') id: string, @Req() req: SessionRequest) {
    return this.sqlPracticeService.deleteNote(id, req.user.id);
  }
}

@Controller('public/sql')
export class SqlPracticePublicController {
  constructor(private readonly sqlPracticeService: SqlPracticeService) {}

  @Get('notes/:token')
  publicNote(@Param('token') token: string) {
    return this.sqlPracticeService.getPublicNoteByToken(token) ?? null;
  }
}
