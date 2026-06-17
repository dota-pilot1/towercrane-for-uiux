import { z } from 'zod';

export const updateStudyDiarySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(['private', 'shared', 'public']).optional(),
});

export const createStudyDiaryCategorySchema = z.object({
  name: z.string().min(1).max(255),
  summary: z.string().max(500).optional(),
  icon: z.string().default('Trophy'),
});

export const updateStudyDiaryCategorySchema =
  createStudyDiaryCategorySchema.partial();

export const createStudyDiarySectionSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(255),
  summary: z.string().max(500).optional(),
  orderIdx: z.number().int().nonnegative().optional(),
});

export const updateStudyDiarySectionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  summary: z.string().max(500).nullable().optional(),
  orderIdx: z.number().int().nonnegative().optional(),
});

export const createStudyDiaryNoteSchema = z
  .object({
    sectionId: z.string().uuid().optional(),
    topicId: z.string().uuid().optional(),
    title: z.string().max(255).optional(),
    content: z.string(),
    visibility: z.enum(['private', 'shared', 'public']).default('private'),
    pinned: z.boolean().default(false),
  })
  .refine((data) => data.sectionId || data.topicId, {
    message: 'sectionId or topicId must be provided',
  });

export const updateStudyDiaryNoteSchema = z
  .object({
    sectionId: z.string().uuid().optional(),
    topicId: z.string().uuid().optional(),
    title: z.string().max(255).nullable().optional(),
    content: z.string().optional(),
    visibility: z.enum(['private', 'shared', 'public']).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Must update at least one field',
  });

export const organizeStudyDiaryNoteSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().trim().min(1).max(30000),
  mode: z.enum(['organize', 'summary', 'interview']).default('organize'),
});

export type UpdateStudyDiaryInput = z.infer<typeof updateStudyDiarySchema>;
export type CreateStudyDiaryCategoryInput = z.infer<
  typeof createStudyDiaryCategorySchema
>;
export type UpdateStudyDiaryCategoryInput = z.infer<
  typeof updateStudyDiaryCategorySchema
>;
export type CreateStudyDiarySectionInput = z.infer<
  typeof createStudyDiarySectionSchema
>;
export type UpdateStudyDiarySectionInput = z.infer<
  typeof updateStudyDiarySectionSchema
>;
export type CreateStudyDiaryNoteInput = z.infer<
  typeof createStudyDiaryNoteSchema
>;
export type UpdateStudyDiaryNoteInput = z.infer<
  typeof updateStudyDiaryNoteSchema
>;
export type OrganizeStudyDiaryNoteInput = z.infer<
  typeof organizeStudyDiaryNoteSchema
>;
