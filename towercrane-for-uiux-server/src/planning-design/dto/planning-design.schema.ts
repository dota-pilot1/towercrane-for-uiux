import { z } from 'zod';

export const createPlanningDesignWorkspaceSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(500).nullable().optional(),
  icon: z.string().trim().max(50).optional(),
});

export const updatePlanningDesignWorkspaceSchema =
  createPlanningDesignWorkspaceSchema.partial();

export const createPlanningDesignCategorySchema = z.object({
  name: z.string().trim().min(1).max(255),
});

export const updatePlanningDesignCategorySchema =
  createPlanningDesignCategorySchema.partial();

export const createPlanningDesignSectionSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
});

export const updatePlanningDesignSectionSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
});

export const createPlanningDesignDocumentSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().trim().max(255).optional(),
  content: z.string().max(1_000_000),
});

export const updatePlanningDesignDocumentSchema = z
  .object({
    title: z.string().trim().max(255).optional(),
    content: z.string().max(1_000_000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Must update at least one field',
  });

export const reorderPlanningDesignWorkspacesSchema = z.object({
  workspaceIds: z.array(z.string().uuid()),
});

export const reorderPlanningDesignCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid()),
});

export const reorderPlanningDesignSectionsSchema = z.object({
  sectionIds: z.array(z.string().uuid()),
});

export const reorderPlanningDesignDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()),
});

export type CreatePlanningDesignWorkspaceInput = z.infer<
  typeof createPlanningDesignWorkspaceSchema
>;
export type UpdatePlanningDesignWorkspaceInput = z.infer<
  typeof updatePlanningDesignWorkspaceSchema
>;
export type CreatePlanningDesignCategoryInput = z.infer<
  typeof createPlanningDesignCategorySchema
>;
export type UpdatePlanningDesignCategoryInput = z.infer<
  typeof updatePlanningDesignCategorySchema
>;
export type CreatePlanningDesignSectionInput = z.infer<
  typeof createPlanningDesignSectionSchema
>;
export type UpdatePlanningDesignSectionInput = z.infer<
  typeof updatePlanningDesignSectionSchema
>;
export type CreatePlanningDesignDocumentInput = z.infer<
  typeof createPlanningDesignDocumentSchema
>;
export type UpdatePlanningDesignDocumentInput = z.infer<
  typeof updatePlanningDesignDocumentSchema
>;
