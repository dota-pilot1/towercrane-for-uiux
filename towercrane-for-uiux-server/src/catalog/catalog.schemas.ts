import { z } from 'zod';

export const createCategorySchema = z.object({
  title: z.string().min(2).max(40),
  summary: z.string().min(8).max(140),
  group: z.string().min(2).max(24),
  iconKey: z.string().min(2).max(24).default('custom'),
  tags: z.array(z.string()).default([]),
  checklist: z.array(z.string()).default([]),
});

export const createPrototypeSchema = z.object({
  title: z.string().min(2).max(50),
  repoUrl: z.string().url(),
  summary: z.string().min(8).max(160),
  status: z.enum(['draft', 'building', 'ready']),
  visibility: z.enum(['public', 'private']),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreatePrototypeInput = z.infer<typeof createPrototypeSchema>;
