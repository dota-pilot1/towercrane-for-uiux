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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import type { SessionRequest } from '../auth/types';
import { SqlPracticeService } from './sql-practice.service';
import {
  addSqlTeamPracticeMemberSchema,
  createSqlUserPracticeProblemSchema,
  createSqlTeamPracticeWorkspaceSchema,
  createSqlPracticeNoteSchema,
  generateSqlUserPracticeAnswerSchema,
  listSqlPracticeNotesQuerySchema,
  replacePersonalSchemaVersionSchema,
  sqlPersonalPracticeProblemListQuerySchema,
  sqlTeamPracticeProblemListQuerySchema,
  sqlUserPracticeProblemListQuerySchema,
  updateSqlTeamPracticeMemberSchema,
  updateSqlTeamPracticeWorkspaceSchema,
  updateSqlUserPracticeProblemSchema,
  updateSqlPracticeNoteSchema,
} from './sql-practice.schemas';

type UploadedSqlFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

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
  userTable(@Param('tableName') tableName: string, @Req() req: SessionRequest) {
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

  @Get('personal/workspaces')
  personalWorkspaces(@Req() req: SessionRequest) {
    return this.sqlPracticeService.listPersonalPracticeWorkspaces(req.user.id);
  }

  @Get('personal/workspaces/default')
  defaultPersonalWorkspace(@Req() req: SessionRequest) {
    return this.sqlPracticeService.getDefaultPersonalPracticeWorkspace(
      req.user.id,
    );
  }

  @Get('personal/workspaces/:workspaceId/meta')
  personalWorkspaceMeta(
    @Param('workspaceId') workspaceId: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.getPersonalPracticeWorkspaceMeta(
      workspaceId,
      req.user.id,
    );
  }

  @Get('personal/workspaces/:workspaceId/tables')
  personalWorkspaceTables(
    @Param('workspaceId') workspaceId: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.getPersonalPracticeTables(
      workspaceId,
      req.user.id,
    );
  }

  @Get('personal/workspaces/:workspaceId/tables/:tableName/rows')
  personalWorkspaceTableRows(
    @Param('workspaceId') workspaceId: string,
    @Param('tableName') tableName: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.getPersonalPracticeTableRows(
      workspaceId,
      tableName,
      req.user.id,
    );
  }

  @Post('personal/workspaces/:workspaceId/execute')
  personalWorkspaceExecute(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.executePersonalPractice(
      workspaceId,
      body,
      req.user.id,
    );
  }

  @Post('personal/workspaces/:workspaceId/schema-versions/replace')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  replacePersonalSchemaVersion(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: UploadedSqlFile | undefined,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = replacePersonalSchemaVersionSchema.parse(body ?? {});
    return this.sqlPracticeService.replacePersonalPracticeSchemaVersion(
      workspaceId,
      file,
      input,
      req.user.id,
    );
  }

  @Get('personal/workspaces/:workspaceId/erd')
  personalWorkspaceErd(
    @Param('workspaceId') workspaceId: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.getPersonalPracticeErd(
      workspaceId,
      req.user.id,
    );
  }

  @Get('personal/workspaces/:workspaceId/problems')
  personalProblems(
    @Param('workspaceId') workspaceId: string,
    @Query() query: unknown,
    @Req() req: SessionRequest,
  ) {
    const parsed = sqlPersonalPracticeProblemListQuerySchema.parse(query);
    return this.sqlPracticeService.listPersonalPracticeProblems(
      workspaceId,
      parsed,
      req.user.id,
    );
  }

  @Post('personal/workspaces/:workspaceId/problems')
  createPersonalProblem(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = createSqlUserPracticeProblemSchema.parse(body);
    return this.sqlPracticeService.createPersonalPracticeProblem(
      workspaceId,
      input,
      req.user.id,
    );
  }

  @Post('personal/workspaces/:workspaceId/problems/generate-answer')
  generatePersonalProblemAnswer(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = generateSqlUserPracticeAnswerSchema.parse(body);
    return this.sqlPracticeService.generatePersonalPracticeAnswer(
      workspaceId,
      input,
      req.user.id,
    );
  }

  @Post('personal/workspaces/:workspaceId/problems/:id/grade')
  gradePersonalProblem(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.gradePersonalPracticeProblem(
      workspaceId,
      id,
      body,
      req.user.id,
    );
  }

  @Post('personal/workspaces/:workspaceId/problems/:id/share')
  sharePersonalProblem(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.sharePersonalPracticeProblem(
      workspaceId,
      id,
      req.user.id,
    );
  }

  @Post('personal/workspaces/:workspaceId/problems/:id/unshare')
  unsharePersonalProblem(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.unsharePersonalPracticeProblem(
      workspaceId,
      id,
      req.user.id,
    );
  }

  @Patch('personal/workspaces/:workspaceId/problems/:id')
  updatePersonalProblem(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = updateSqlUserPracticeProblemSchema.parse(body);
    return this.sqlPracticeService.updatePersonalPracticeProblem(
      workspaceId,
      id,
      input,
      req.user.id,
    );
  }

  @Delete('personal/workspaces/:workspaceId/problems/:id')
  @HttpCode(204)
  deletePersonalProblem(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.deletePersonalPracticeProblem(
      workspaceId,
      id,
      req.user.id,
    );
  }

  @Get('team/workspaces')
  teamWorkspaces(@Req() req: SessionRequest) {
    return this.sqlPracticeService.listTeamPracticeWorkspaces(req.user.id);
  }

  @Post('team/workspaces')
  createTeamWorkspace(@Body() body: unknown, @Req() req: SessionRequest) {
    const input = createSqlTeamPracticeWorkspaceSchema.parse(body);
    return this.sqlPracticeService.createTeamPracticeWorkspace(
      input,
      req.user.id,
    );
  }

  @Get('team/workspaces/:workspaceId')
  teamWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.getTeamPracticeWorkspace(
      workspaceId,
      req.user.id,
    );
  }

  @Patch('team/workspaces/:workspaceId')
  updateTeamWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = updateSqlTeamPracticeWorkspaceSchema.parse(body);
    return this.sqlPracticeService.updateTeamPracticeWorkspace(
      workspaceId,
      input,
      req.user.id,
    );
  }

  @Delete('team/workspaces/:workspaceId')
  @HttpCode(204)
  archiveTeamWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.archiveTeamPracticeWorkspace(
      workspaceId,
      req.user.id,
    );
  }

  @Get('team/workspaces/:workspaceId/members')
  teamMembers(
    @Param('workspaceId') workspaceId: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.listTeamPracticeMembers(
      workspaceId,
      req.user.id,
    );
  }

  @Post('team/workspaces/:workspaceId/members')
  addTeamMember(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = addSqlTeamPracticeMemberSchema.parse(body);
    return this.sqlPracticeService.addTeamPracticeMember(
      workspaceId,
      input,
      req.user.id,
    );
  }

  @Patch('team/workspaces/:workspaceId/members/:memberId')
  updateTeamMember(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = updateSqlTeamPracticeMemberSchema.parse(body);
    return this.sqlPracticeService.updateTeamPracticeMember(
      workspaceId,
      memberId,
      input,
      req.user.id,
    );
  }

  @Delete('team/workspaces/:workspaceId/members/:memberId')
  @HttpCode(204)
  removeTeamMember(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.removeTeamPracticeMember(
      workspaceId,
      memberId,
      req.user.id,
    );
  }

  @Get('team/workspaces/:workspaceId/meta')
  teamWorkspaceMeta(
    @Param('workspaceId') workspaceId: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.getTeamPracticeWorkspaceMeta(
      workspaceId,
      req.user.id,
    );
  }

  @Get('team/workspaces/:workspaceId/tables')
  teamWorkspaceTables(
    @Param('workspaceId') workspaceId: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.getTeamPracticeTables(
      workspaceId,
      req.user.id,
    );
  }

  @Get('team/workspaces/:workspaceId/tables/:tableName/rows')
  teamWorkspaceTableRows(
    @Param('workspaceId') workspaceId: string,
    @Param('tableName') tableName: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.getTeamPracticeTableRows(
      workspaceId,
      tableName,
      req.user.id,
    );
  }

  @Post('team/workspaces/:workspaceId/execute')
  teamWorkspaceExecute(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.executeTeamPractice(
      workspaceId,
      body,
      req.user.id,
    );
  }

  @Post('team/workspaces/:workspaceId/schema-versions/replace')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }),
  )
  replaceTeamSchemaVersion(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: UploadedSqlFile | undefined,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = replacePersonalSchemaVersionSchema.parse(body ?? {});
    return this.sqlPracticeService.replaceTeamPracticeSchemaVersion(
      workspaceId,
      file,
      input,
      req.user.id,
    );
  }

  @Get('team/workspaces/:workspaceId/erd')
  teamWorkspaceErd(
    @Param('workspaceId') workspaceId: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.getTeamPracticeErd(workspaceId, req.user.id);
  }

  @Get('team/workspaces/:workspaceId/problems')
  teamProblems(
    @Param('workspaceId') workspaceId: string,
    @Query() query: unknown,
    @Req() req: SessionRequest,
  ) {
    const parsed = sqlTeamPracticeProblemListQuerySchema.parse(query);
    return this.sqlPracticeService.listTeamPracticeProblems(
      workspaceId,
      parsed,
      req.user.id,
    );
  }

  @Post('team/workspaces/:workspaceId/problems')
  createTeamProblem(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = createSqlUserPracticeProblemSchema.parse(body);
    return this.sqlPracticeService.createTeamPracticeProblem(
      workspaceId,
      input,
      req.user.id,
    );
  }

  @Post('team/workspaces/:workspaceId/problems/generate-answer')
  generateTeamProblemAnswer(
    @Param('workspaceId') workspaceId: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = generateSqlUserPracticeAnswerSchema.parse(body);
    return this.sqlPracticeService.generateTeamPracticeAnswer(
      workspaceId,
      input,
      req.user.id,
    );
  }

  @Post('team/workspaces/:workspaceId/problems/:id/grade')
  gradeTeamProblem(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.gradeTeamPracticeProblem(
      workspaceId,
      id,
      body,
      req.user.id,
    );
  }

  @Get('team/workspaces/:workspaceId/problems/:id')
  teamProblem(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Req() req: SessionRequest,
  ) {
    return (
      this.sqlPracticeService.getTeamPracticeProblem(
        workspaceId,
        id,
        req.user.id,
      ) ?? null
    );
  }

  @Patch('team/workspaces/:workspaceId/problems/:id')
  updateTeamProblem(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: SessionRequest,
  ) {
    const input = updateSqlUserPracticeProblemSchema.parse(body);
    return this.sqlPracticeService.updateTeamPracticeProblem(
      workspaceId,
      id,
      input,
      req.user.id,
    );
  }

  @Delete('team/workspaces/:workspaceId/problems/:id')
  @HttpCode(204)
  deleteTeamProblem(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Req() req: SessionRequest,
  ) {
    return this.sqlPracticeService.deleteTeamPracticeProblem(
      workspaceId,
      id,
      req.user.id,
    );
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
  generateUserProblemAnswer(@Body() body: unknown, @Req() req: SessionRequest) {
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
  constructor(
    private readonly sqlPracticeService: SqlPracticeService,
    private readonly authService: AuthService,
  ) {}

  @Get('notes/by-id/:id')
  publicNoteById(@Param('id') id: string) {
    return this.sqlPracticeService.getPublicNoteById(id) ?? null;
  }

  @Get('notes/:token')
  publicNote(@Param('token') token: string) {
    return this.sqlPracticeService.getPublicNoteByToken(token) ?? null;
  }

  @Get('personal/:token')
  publicPersonalProblem(@Param('token') token: string, @Req() req: Request) {
    return this.sqlPracticeService.getPublicPersonalPracticeProblem(
      token,
      this.getOptionalUserId(req),
    );
  }

  @Get('personal/:token/tables/:tableName/rows')
  publicPersonalTableRows(
    @Param('token') token: string,
    @Param('tableName') tableName: string,
  ) {
    return this.sqlPracticeService.getPublicPersonalPracticeTableRows(
      token,
      tableName,
    );
  }

  @Post('personal/:token/grade')
  gradePublicPersonalProblem(
    @Param('token') token: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.sqlPracticeService.gradePublicPersonalPracticeProblem(
      token,
      body,
      this.getOptionalUserId(req),
    );
  }

  private getOptionalUserId(req: Request) {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) return undefined;

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) return undefined;

    try {
      return this.authService.getSessionUser(token).id;
    } catch {
      return undefined;
    }
  }
}
