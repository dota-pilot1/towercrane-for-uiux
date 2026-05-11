import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SqlPracticeService } from './sql-practice.service';

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
}
