import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { TaskIngestService } from './task-ingest.service';

@Controller('public/task-ingest')
export class TaskIngestController {
  constructor(private readonly taskIngestService: TaskIngestService) {}

  @Post()
  ingestTask(
    @Headers('x-towercrane-ingest-key') ingestKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.taskIngestService.ingestTask(body, ingestKey);
  }

  @Post(':taskId/reviews')
  ingestReview(
    @Headers('x-towercrane-ingest-key') ingestKey: string | undefined,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    return this.taskIngestService.ingestReview(taskId, body, ingestKey);
  }

  @Post(':taskId/code-reviews')
  ingestCodeReview(
    @Headers('x-towercrane-ingest-key') ingestKey: string | undefined,
    @Param('taskId') taskId: string,
    @Body() body: unknown,
  ) {
    return this.taskIngestService.ingestCodeReview(taskId, body, ingestKey);
  }
}
