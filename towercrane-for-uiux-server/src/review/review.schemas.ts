import { z } from 'zod'

export const reviewInputSchema = z.object({
  rating: z.coerce.number().int().min(1).max(10),
  content: z.string().trim().min(1).max(2000),
})

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export type ReviewInput = z.infer<typeof reviewInputSchema>
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>
