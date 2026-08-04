import { z } from 'zod';

export const titleSchema = z.object({ title: z.string().trim().min(1).max(255) });
export const documentSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().max(200_000).default(''),
});
export const documentPatchSchema = documentSchema.partial();
export const reorderSchema = z.object({ direction: z.enum(['up', 'down']) });

export type TitleInput = z.infer<typeof titleSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type DocumentPatchInput = z.infer<typeof documentPatchSchema>;
