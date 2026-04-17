import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { DatabaseService } from '../database/database.service'
import {
  prototypeReviewsTable,
  prototypesTable,
  usersTable,
} from '../database/schema'
import {
  listReviewsQuerySchema,
  reviewInputSchema,
} from './review.schemas'

export type ReviewStats = {
  avgRating: number
  count: number
  distribution: Record<number, number>
}

@Injectable()
export class ReviewService {
  constructor(private readonly databaseService: DatabaseService) {}

  private get db() {
    return this.databaseService.db
  }

  listReviews(prototypeId: string, currentUserId: string, rawQuery: unknown) {
    this.ensurePrototype(prototypeId)
    const query = listReviewsQuerySchema.parse(rawQuery ?? {})
    const { page, pageSize } = query
    const offset = (page - 1) * pageSize

    const rows = this.db
      .select({
        id: prototypeReviewsTable.id,
        prototypeId: prototypeReviewsTable.prototypeId,
        userId: prototypeReviewsTable.userId,
        rating: prototypeReviewsTable.rating,
        content: prototypeReviewsTable.content,
        createdAt: prototypeReviewsTable.createdAt,
        updatedAt: prototypeReviewsTable.updatedAt,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(prototypeReviewsTable)
      .innerJoin(usersTable, eq(prototypeReviewsTable.userId, usersTable.id))
      .where(eq(prototypeReviewsTable.prototypeId, prototypeId))
      .orderBy(desc(prototypeReviewsTable.createdAt))
      .limit(pageSize)
      .offset(offset)
      .all()

    const totalRow = this.db
      .select({ count: sql<number>`count(*)` })
      .from(prototypeReviewsTable)
      .where(eq(prototypeReviewsTable.prototypeId, prototypeId))
      .get()

    const total = Number(totalRow?.count ?? 0)

    return {
      items: rows.map((r) => ({
        id: r.id,
        prototypeId: r.prototypeId,
        userId: r.userId,
        userName: r.userName,
        rating: r.rating,
        content: r.content,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        isMine: r.userId === currentUserId,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      stats: this.getStats(prototypeId),
    }
  }

  getMyReview(prototypeId: string, userId: string) {
    const row = this.db
      .select()
      .from(prototypeReviewsTable)
      .where(
        and(
          eq(prototypeReviewsTable.prototypeId, prototypeId),
          eq(prototypeReviewsTable.userId, userId),
        ),
      )
      .get()

    return row ?? null
  }

  createReview(prototypeId: string, userId: string, payload: unknown) {
    this.ensurePrototype(prototypeId)
    const input = reviewInputSchema.parse(payload)

    const existing = this.getMyReview(prototypeId, userId)
    if (existing) {
      throw new ConflictException('이미 작성한 리뷰가 있습니다. 수정해주세요.')
    }

    const now = new Date().toISOString()
    const id = `review-${randomUUID().slice(0, 10)}`

    this.db
      .insert(prototypeReviewsTable)
      .values({
        id,
        prototypeId,
        userId,
        rating: input.rating,
        content: input.content,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    return this.getMyReview(prototypeId, userId)
  }

  updateMyReview(prototypeId: string, userId: string, payload: unknown) {
    const existing = this.getMyReview(prototypeId, userId)
    if (!existing) {
      throw new NotFoundException('작성한 리뷰가 없습니다.')
    }

    const input = reviewInputSchema.partial().parse(payload)
    if (!input.rating && !input.content) {
      throw new BadRequestException('수정할 값이 없습니다.')
    }

    this.db
      .update(prototypeReviewsTable)
      .set({
        ...(input.rating ? { rating: input.rating } : {}),
        ...(input.content ? { content: input.content } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(prototypeReviewsTable.prototypeId, prototypeId),
          eq(prototypeReviewsTable.userId, userId),
        ),
      )
      .run()

    return this.getMyReview(prototypeId, userId)
  }

  deleteMyReview(prototypeId: string, userId: string) {
    const existing = this.getMyReview(prototypeId, userId)
    if (!existing) {
      throw new NotFoundException('작성한 리뷰가 없습니다.')
    }

    this.db
      .delete(prototypeReviewsTable)
      .where(
        and(
          eq(prototypeReviewsTable.prototypeId, prototypeId),
          eq(prototypeReviewsTable.userId, userId),
        ),
      )
      .run()

    return { success: true }
  }

  getStats(prototypeId: string): ReviewStats {
    const rows = this.db
      .select({ rating: prototypeReviewsTable.rating })
      .from(prototypeReviewsTable)
      .where(eq(prototypeReviewsTable.prototypeId, prototypeId))
      .all()

    const count = rows.length
    const sum = rows.reduce((acc, r) => acc + r.rating, 0)
    const avgRating = count > 0 ? Number((sum / count).toFixed(2)) : 0

    const distribution: Record<number, number> = {}
    for (let i = 1; i <= 10; i += 1) distribution[i] = 0
    for (const r of rows) {
      distribution[r.rating] = (distribution[r.rating] ?? 0) + 1
    }

    return { avgRating, count, distribution }
  }

  getAggregatesForPrototypes(prototypeIds: string[]) {
    if (prototypeIds.length === 0) return new Map<string, { avgRating: number; count: number }>()

    const rows = this.db
      .select({
        prototypeId: prototypeReviewsTable.prototypeId,
        rating: prototypeReviewsTable.rating,
      })
      .from(prototypeReviewsTable)
      .all()

    const map = new Map<string, { sum: number; count: number }>()
    for (const row of rows) {
      if (!prototypeIds.includes(row.prototypeId)) continue
      const current = map.get(row.prototypeId) ?? { sum: 0, count: 0 }
      current.sum += row.rating
      current.count += 1
      map.set(row.prototypeId, current)
    }

    const result = new Map<string, { avgRating: number; count: number }>()
    for (const [id, { sum, count }] of map) {
      result.set(id, {
        avgRating: count > 0 ? Number((sum / count).toFixed(2)) : 0,
        count,
      })
    }
    return result
  }

  private ensurePrototype(prototypeId: string) {
    const row = this.db
      .select({ id: prototypesTable.id })
      .from(prototypesTable)
      .where(eq(prototypesTable.id, prototypeId))
      .get()

    if (!row) {
      throw new NotFoundException(`Prototype not found: ${prototypeId}`)
    }
  }
}
