import { z } from 'zod';

export const titleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(300).nullable().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const fileSchema = z.object({
  name: z.string().trim().min(1).max(255),
  storageKey: z.string().trim().min(1).max(500),
  publicUrl: z.string().url().max(2_000),
  mimeType: z.string().trim().min(1).max(150),
  sizeBytes: z.number().int().min(0).max(100_000_000),
  sheetCount: z.number().int().min(0).max(10_000),
  apiCount: z.number().int().min(0).max(1_000_000),
});

export const reorderSchema = z.object({
  direction: z.enum(['up', 'down']),
});

export type TitleInput = z.infer<typeof titleSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type FileInput = z.infer<typeof fileSchema>;
