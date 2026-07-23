import { z } from 'zod';

// 워크스페이스 (백엔드/프론트엔드/DevOps 등 분류)
export const createArchNoteWorkspaceSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().max(50).optional(),
});

export const updateArchNoteWorkspaceSchema =
  createArchNoteWorkspaceSchema.partial();

// 1차 주제
export const createArchNoteCategorySchema = z.object({
  name: z.string().min(1).max(255),
});

export const updateArchNoteCategorySchema =
  createArchNoteCategorySchema.partial();

// 2차 주제
export const createArchNoteSectionSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(255),
});

export const updateArchNoteSectionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
});

// 노트
export const createArchNoteNoteSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().max(255).optional(),
  content: z.string(),
});

export const updateArchNoteNoteSchema = z
  .object({
    title: z.string().max(255).optional(),
    content: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Must update at least one field',
  });

export type CreateArchNoteWorkspaceInput = z.infer<
  typeof createArchNoteWorkspaceSchema
>;
export type UpdateArchNoteWorkspaceInput = z.infer<
  typeof updateArchNoteWorkspaceSchema
>;
export type CreateArchNoteCategoryInput = z.infer<
  typeof createArchNoteCategorySchema
>;
export type UpdateArchNoteCategoryInput = z.infer<
  typeof updateArchNoteCategorySchema
>;
export type CreateArchNoteSectionInput = z.infer<
  typeof createArchNoteSectionSchema
>;
export type UpdateArchNoteSectionInput = z.infer<
  typeof updateArchNoteSectionSchema
>;
export type CreateArchNoteNoteInput = z.infer<typeof createArchNoteNoteSchema>;
export type UpdateArchNoteNoteInput = z.infer<typeof updateArchNoteNoteSchema>;
