import { z } from 'zod';

export const listProjectBoardPostsQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
});

export const createProjectBoardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(''),
  orderIdx: z.coerce.number().int().min(0).optional().default(0),
});

export const updateProjectBoardSchema = createProjectBoardSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const createProjectBoardPostSchema = z.object({
  title: z.string().trim().min(1).max(180),
  content: z.string().max(20000).optional().default(''),
});

export const updateProjectBoardPostSchema = createProjectBoardPostSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type ListProjectBoardPostsQuery = z.infer<
  typeof listProjectBoardPostsQuerySchema
>;
export type CreateProjectBoardInput = z.infer<typeof createProjectBoardSchema>;
export type UpdateProjectBoardInput = z.infer<typeof updateProjectBoardSchema>;
export type CreateProjectBoardPostInput = z.infer<
  typeof createProjectBoardPostSchema
>;
export type UpdateProjectBoardPostInput = z.infer<
  typeof updateProjectBoardPostSchema
>;
