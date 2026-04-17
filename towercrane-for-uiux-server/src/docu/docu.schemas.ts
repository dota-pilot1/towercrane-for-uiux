import { z } from 'zod';

export const blockTypeEnum = z.enum([
  'NOTE',
  'MMD',
  'FIGMA',
  'FILE',
  'DBTABLE',
  'GITHUB',
]);

export const createSectionSchema = z.object({
  title: z.string().min(1).max(80),
});

export const updateSectionSchema = z.object({
  title: z.string().min(1).max(80),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(120),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(120),
});

export const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        orderIdx: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const blockInputSchema = z.object({
  blockType: blockTypeEnum,
  blockTitle: z.string().max(120).nullable().optional(),
  content: z.string().default(''),
});

export const replaceBlocksSchema = z.object({
  blocks: z.array(blockInputSchema),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
export type BlockInput = z.infer<typeof blockInputSchema>;
export type ReplaceBlocksInput = z.infer<typeof replaceBlocksSchema>;
