import { z } from 'zod';

export const listFeaturePlansQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  taskId: z.string().trim().max(80).optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createFeaturePlanSchema = z.object({
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(12000),
  content: z.string().max(12000).optional().default(''),
  acceptanceCriteria: z.string().max(8000).optional().default(''),
  plan: z.string().max(8000).optional().default(''),
  folderStructure: z.string().max(8000).optional().default(''),
  checklist: z.array(z.string().trim().min(1).max(1000)).optional().default([]),
  mmdContent: z.string().max(20000).optional().default(''),
  sourceFileName: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .optional()
    .default(null),
  linkedTaskId: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .nullable()
    .optional()
    .default(null),
});

export const updateFeaturePlanSchema = createFeaturePlanSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type ListFeaturePlansQuery = z.infer<typeof listFeaturePlansQuerySchema>;
export type CreateFeaturePlanInput = z.infer<typeof createFeaturePlanSchema>;
export type UpdateFeaturePlanInput = z.infer<typeof updateFeaturePlanSchema>;
