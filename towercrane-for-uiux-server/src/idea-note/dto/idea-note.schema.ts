import { z } from 'zod';

export const createIdeaNoteWorkspaceSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().max(50).optional(),
});

export const updateIdeaNoteWorkspaceSchema =
  createIdeaNoteWorkspaceSchema.partial();

export const createIdeaNoteCategorySchema = z.object({
  name: z.string().trim().min(1).max(255),
});

export const updateIdeaNoteCategorySchema =
  createIdeaNoteCategorySchema.partial();

export const createIdeaNoteSectionSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
});

export const updateIdeaNoteSectionSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
});

export const createIdeaNoteDocumentSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().trim().max(255).optional(),
  content: z.string().max(1_000_000),
});

export const updateIdeaNoteDocumentSchema = z
  .object({
    title: z.string().trim().max(255).optional(),
    content: z.string().max(1_000_000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Must update at least one field',
  });

export const reorderIdeaNoteWorkspacesSchema = z.object({
  workspaceIds: z.array(z.string().uuid()),
});

export const reorderIdeaNoteCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid()),
});

export const reorderIdeaNoteSectionsSchema = z.object({
  sectionIds: z.array(z.string().uuid()),
});

export const reorderIdeaNoteDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()),
});

export type CreateIdeaNoteWorkspaceInput = z.infer<
  typeof createIdeaNoteWorkspaceSchema
>;
export type UpdateIdeaNoteWorkspaceInput = z.infer<
  typeof updateIdeaNoteWorkspaceSchema
>;
export type CreateIdeaNoteCategoryInput = z.infer<
  typeof createIdeaNoteCategorySchema
>;
export type UpdateIdeaNoteCategoryInput = z.infer<
  typeof updateIdeaNoteCategorySchema
>;
export type CreateIdeaNoteSectionInput = z.infer<
  typeof createIdeaNoteSectionSchema
>;
export type UpdateIdeaNoteSectionInput = z.infer<
  typeof updateIdeaNoteSectionSchema
>;
export type CreateIdeaNoteDocumentInput = z.infer<
  typeof createIdeaNoteDocumentSchema
>;
export type UpdateIdeaNoteDocumentInput = z.infer<
  typeof updateIdeaNoteDocumentSchema
>;
