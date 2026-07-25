import { z } from 'zod';

export const boardKindSchema = z.enum([
  'NOTICE',
  'INQUIRY',
  'QNA',
  'FREE',
  'FAQ',
  'EVENT',
  'GENERAL',
]);

export const boardStatusSchema = z.enum(['PUBLISHED', 'HIDDEN', 'DRAFT']);

export const listBoardsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional().default(''),
  status: boardStatusSchema.optional(),
});

export const createBoardConfigSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]+$/)
    .min(2)
    .max(80),
  kind: boardKindSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(''),
  allowUserWrite: z.boolean().default(false),
  allowComment: z.boolean().default(false),
  isActive: z.boolean().default(true),
  orderIdx: z.number().int().min(0).default(0),
});

export const updateBoardConfigSchema = createBoardConfigSchema
  .omit({ code: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const createBoardSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(20000),
});

export const updateBoardSchema = createBoardSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const updateBoardStatusSchema = z.object({
  status: boardStatusSchema,
});

export const createBoardCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export type ListBoardsQuery = z.infer<typeof listBoardsQuerySchema>;
export type CreateBoardConfigInput = z.infer<typeof createBoardConfigSchema>;
export type UpdateBoardConfigInput = z.infer<typeof updateBoardConfigSchema>;
export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
