import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AiEvaluationService } from './ai-evaluation.service';

@Controller('ai-evaluation')
@UseGuards(AuthGuard)
export class AiEvaluationController {
  constructor(private readonly service: AiEvaluationService) {}

  // ── 평가 대상자 ──────────────────────────────────────────────────────────────

  @Get('evaluatees')
  listEvaluatees() {
    return this.service.listEvaluatees();
  }

  @Post('evaluatees')
  createEvaluatee(
    @Body() body: { name: string; role?: string; description?: string },
  ) {
    return this.service.createEvaluatee(body);
  }

  @Delete('evaluatees/:id')
  deleteEvaluatee(@Param('id') id: string) {
    return this.service.deleteEvaluatee(id);
  }

  // ── 평가 항목 ────────────────────────────────────────────────────────────────

  @Get('evaluatees/:id/items')
  getItems(@Param('id') id: string) {
    return this.service.getItemsByEvaluatee(id);
  }

  @Post('evaluatees/:id/items')
  createItem(
    @Param('id') evaluateeId: string,
    @Body() body: { categoryId: string; title: string; description?: string },
  ) {
    return this.service.createItem(evaluateeId, body);
  }

  @Delete('items/:itemId')
  deleteItem(@Param('itemId') itemId: string) {
    return this.service.deleteItem(itemId);
  }

  // ── 점수 ─────────────────────────────────────────────────────────────────────

  @Put('items/:itemId/score')
  upsertScore(
    @Param('itemId') itemId: string,
    @Body() body: { score: number; note?: string },
  ) {
    return this.service.upsertScore(itemId, body);
  }

  // ── 집계 ─────────────────────────────────────────────────────────────────────

  @Get('evaluatees/:id/summary')
  getSummary(@Param('id') id: string) {
    return this.service.getSummary(id);
  }
}
