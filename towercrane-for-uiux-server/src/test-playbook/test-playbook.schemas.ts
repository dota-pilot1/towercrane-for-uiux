import { z } from 'zod';

const optionalUrl = z.string().trim().url().or(z.literal('')).default('');
const status = z.enum(['draft', 'running', 'review', 'approved']);

export const createCategorySchema = z.object({ title: z.string().trim().min(1).max(120) });
export const updateCategorySchema = createCategorySchema.partial();

export const stepSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).default(''),
  command: z.string().max(1000).default(''),
  artifact: z.string().max(160).default(''),
  result: z.string().max(4000).default(''),
  done: z.boolean().default(false),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().max(500).default(''),
  content: z.string().max(300000).default(''),
  steps: z.array(stepSchema).max(100).default([]),
  githubUrl: optionalUrl,
  reviewNotes: z.string().max(10000).default(''),
  status,
});

export const updateDocumentSchema = createDocumentSchema.partial();

export const createContentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(300000).default(''),
});

export const updateContentSchema = createContentSchema.partial();
