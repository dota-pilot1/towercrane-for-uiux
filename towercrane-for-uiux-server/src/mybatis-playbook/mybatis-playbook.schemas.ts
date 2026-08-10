import { z } from 'zod';

export const titleSchema = z.object({ title: z.string().trim().min(1).max(255) });
export const documentSchema = z.object({ title: z.string().trim().min(1).max(255), content: z.string().max(500_000).default(''), parentId: z.string().trim().min(1).nullable().optional() });
export const documentPatchSchema = documentSchema.partial();
export const documentAiEditSchema = z.object({
  content: z.string().max(500_000),
  instruction: z.string().trim().min(1).max(10_000),
});
export const commentSchema = z.object({
  title: z.string().trim().min(1).max(255).default('댓글'),
  content: z.string().trim().min(1).max(200_000),
  parentId: z.string().trim().min(1).nullable().optional(),
});
export const commentPatchSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  content: z.string().trim().min(1).max(200_000),
});
export const reorderSchema = z.object({ direction: z.enum(['up', 'down']) });
export const reorderCategoriesSchema = z.object({ categoryIds: z.array(z.string().trim().min(1)).min(1) });
export const reorderTopicsSchema = z.object({ topicIds: z.array(z.string().trim().min(1)).min(1) });
export const reorderDocumentsSchema = z.object({ documentIds: z.array(z.string().trim().min(1)).min(1), parentId: z.string().trim().min(1).nullable() });

export type TitleInput = z.infer<typeof titleSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type DocumentPatchInput = z.infer<typeof documentPatchSchema>;
export type DocumentAiEditInput = z.infer<typeof documentAiEditSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type CommentPatchInput = z.infer<typeof commentPatchSchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
export type ReorderTopicsInput = z.infer<typeof reorderTopicsSchema>;
export type ReorderDocumentsInput = z.infer<typeof reorderDocumentsSchema>;
