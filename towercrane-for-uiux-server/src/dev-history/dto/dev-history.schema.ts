import { z } from 'zod';

export const createDevHistoryWorkspaceSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().max(50).optional(),
});

export const updateDevHistoryWorkspaceSchema =
  createDevHistoryWorkspaceSchema.partial();

export const createDevHistoryCategorySchema = z.object({
  name: z.string().trim().min(1).max(255),
});

export const updateDevHistoryCategorySchema =
  createDevHistoryCategorySchema.partial();

export const createDevHistorySectionSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
});

export const updateDevHistorySectionSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
});

export const createDevHistoryDocumentSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().trim().max(255).optional(),
  content: z.string().max(1_000_000),
});

export const updateDevHistoryDocumentSchema = z
  .object({
    title: z.string().trim().max(255).optional(),
    content: z.string().max(1_000_000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Must update at least one field',
  });

export const reorderDevHistoryWorkspacesSchema = z.object({
  workspaceIds: z.array(z.string().uuid()),
});

export const reorderDevHistoryCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid()),
});

export const reorderDevHistorySectionsSchema = z.object({
  sectionIds: z.array(z.string().uuid()),
});

export const reorderDevHistoryDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()),
});

export type CreateDevHistoryWorkspaceInput = z.infer<
  typeof createDevHistoryWorkspaceSchema
>;
export type UpdateDevHistoryWorkspaceInput = z.infer<
  typeof updateDevHistoryWorkspaceSchema
>;
export type CreateDevHistoryCategoryInput = z.infer<
  typeof createDevHistoryCategorySchema
>;
export type UpdateDevHistoryCategoryInput = z.infer<
  typeof updateDevHistoryCategorySchema
>;
export type CreateDevHistorySectionInput = z.infer<
  typeof createDevHistorySectionSchema
>;
export type UpdateDevHistorySectionInput = z.infer<
  typeof updateDevHistorySectionSchema
>;
export type CreateDevHistoryDocumentInput = z.infer<
  typeof createDevHistoryDocumentSchema
>;
export type UpdateDevHistoryDocumentInput = z.infer<
  typeof updateDevHistoryDocumentSchema
>;
