import { z } from 'zod';

export const axBoardCategorySchema = z.enum(['news', 'tips', 'qna', 'free']);

export const createAxBoardPostSchema = z.object({
  category: axBoardCategorySchema.default('free'),
  title: z.string().min(1).max(255),
  content: z.string().default(''),
});

export const updateAxBoardPostSchema = z.object({
  category: axBoardCategorySchema.optional(),
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
});

export const createAxBoardCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export type CreateAxBoardPostInput = z.infer<typeof createAxBoardPostSchema>;
export type UpdateAxBoardPostInput = z.infer<typeof updateAxBoardPostSchema>;
export type CreateAxBoardCommentInput = z.infer<
  typeof createAxBoardCommentSchema
>;
