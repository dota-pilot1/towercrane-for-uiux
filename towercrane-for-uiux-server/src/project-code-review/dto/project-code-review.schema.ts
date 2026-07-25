import { z } from 'zod';

// 워크스페이스 (프로젝트 단위 분류)
export const createProjectCodeReviewWorkspaceSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(50).optional(),
});

export const updateProjectCodeReviewWorkspaceSchema =
  createProjectCodeReviewWorkspaceSchema.partial();

// 1차 주제
export const createProjectCodeReviewCategorySchema = z.object({
  name: z.string().min(1).max(255),
});

export const updateProjectCodeReviewCategorySchema =
  createProjectCodeReviewCategorySchema.partial();

// 2차 주제
export const createProjectCodeReviewSectionSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(255),
});

export const updateProjectCodeReviewSectionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

// 노트
export const createProjectCodeReviewNoteSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().max(255).optional(),
  content: z.string(),
});

export const updateProjectCodeReviewNoteSchema = z
  .object({
    title: z.string().max(255).optional(),
    content: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Must update at least one field',
  });

export type CreateProjectCodeReviewWorkspaceInput = z.infer<
  typeof createProjectCodeReviewWorkspaceSchema
>;
export type UpdateProjectCodeReviewWorkspaceInput = z.infer<
  typeof updateProjectCodeReviewWorkspaceSchema
>;
export type CreateProjectCodeReviewCategoryInput = z.infer<
  typeof createProjectCodeReviewCategorySchema
>;
export type UpdateProjectCodeReviewCategoryInput = z.infer<
  typeof updateProjectCodeReviewCategorySchema
>;
export type CreateProjectCodeReviewSectionInput = z.infer<
  typeof createProjectCodeReviewSectionSchema
>;
export type UpdateProjectCodeReviewSectionInput = z.infer<
  typeof updateProjectCodeReviewSectionSchema
>;
export type CreateProjectCodeReviewNoteInput = z.infer<
  typeof createProjectCodeReviewNoteSchema
>;
export type UpdateProjectCodeReviewNoteInput = z.infer<
  typeof updateProjectCodeReviewNoteSchema
>;
