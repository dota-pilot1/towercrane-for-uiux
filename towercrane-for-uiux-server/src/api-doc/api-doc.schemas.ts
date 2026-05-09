import { z } from 'zod';

export const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().max(80).nullable().optional(),
  emoji: z.string().trim().max(16).nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  'At least one field is required',
);

export const createEndpointSchema = z.object({
  categoryId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(120),
  method: httpMethodSchema.default('GET'),
  path: z.string().trim().max(500).default(''),
});

export const updateEndpointSchema = z
  .object({
    categoryId: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).max(120).optional(),
    method: httpMethodSchema.optional(),
    path: z.string().trim().max(500).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field is required',
  });

export const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        orderIdx: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const apiDocBlockSchema = z.object({
  blockType: z.enum(['API']).default('API'),
  content: z.string().default(''),
});

export const replaceBlocksSchema = z.object({
  blocks: z.array(apiDocBlockSchema),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateEndpointInput = z.infer<typeof createEndpointSchema>;
export type UpdateEndpointInput = z.infer<typeof updateEndpointSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
export type ReplaceBlocksInput = z.infer<typeof replaceBlocksSchema>;

