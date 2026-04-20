import { z } from 'zod';

export const createCategorySchema = z.object({
  title: z.string().min(2).max(40),
  summary: z.string().min(8).max(140),
  group: z.string().min(2).max(24).default('general'),
  iconKey: z.string().min(2).max(24).default('custom'),
  tags: z.array(z.string()).default([]),
  checklist: z.array(z.string()).default([]),
});

export const createPrototypeSchema = z.object({
  title: z.string().min(2).max(50),
  repoUrl: z.string().optional().or(z.literal('')),
  demoUrl: z.string().optional().or(z.literal('')),
  figmaUrl: z.string().optional().or(z.literal('')),
  summary: z.string().min(2).max(160),
  status: z.enum(['draft', 'building', 'ready']),
  visibility: z.enum(['public', 'private']),
  tags: z.array(z.string().trim().min(1).max(24)).default([]),
  checklist: z.array(z.string().trim().min(1).max(100)).default([]),
  notes: z.string().max(2000).optional().or(z.literal('')),
  images: z.array(z.string().url()).optional().default([]),
});

export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const updatePrototypeSchema = createPrototypeSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const listPrototypesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional().default(''),
  sort: z.enum(['recent', 'oldest', 'title']).default('recent'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreatePrototypeInput = z.infer<typeof createPrototypeSchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type UpdatePrototypeInput = z.infer<typeof updatePrototypeSchema>;
export type ListPrototypesQuery = z.infer<typeof listPrototypesQuerySchema>;
