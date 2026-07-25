import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  summary: z.string().max(500).optional(),
  icon: z.string().default('Trophy'),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createSectionSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(255),
  summary: z.string().max(500).optional(),
  orderIdx: z.number().int().nonnegative().default(0),
});

export const updateSectionSchema = createSectionSchema.partial();

export const createTopicSchema = z.object({
  sectionId: z.string().uuid(),
  blockType: z.enum([
    'NOTE',
    'MMD',
    'CHECKLIST',
    'GITHUB',
    'FIGMA',
    'FILE',
    'DBTABLE',
  ]),
  blockTitle: z.string().max(255).optional(),
  content: z.string(),
  orderIdx: z.number().int().nonnegative().default(0),
});

export const updateTopicSchema = createTopicSchema.partial();

export const createSubmissionSchema = z.object({
  topicId: z.string().uuid(),
  content: z.string(),
  checkedItems: z.string().array().default([]),
});

export const updateSubmissionSchema = createSubmissionSchema.partial();

export const rateSubmissionSchema = z.object({
  adminRating: z.number().int().min(0).max(100),
  adminFeedback: z.string().max(2000).optional(),
});

export const createGptThreadSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().min(1).max(255),
  model: z.string().default('gpt-4o-mini'),
});

export const updateGptThreadSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  model: z.string().optional(),
  isShared: z.boolean().optional(),
});

export const sendGptMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export const createNoteSchema = z
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

export const updateNoteSchema = z
  .object({
    sectionId: z.string().uuid().optional(),
    topicId: z.string().uuid().optional(),
    title: z.string().max(255).optional(),
    content: z.string().optional(),
    visibility: z.enum(['private', 'shared', 'public']).optional(),
    pinned: z.boolean().optional(),
  })
  .refine(
    (data) =>
      !(
        data.sectionId === undefined &&
        data.topicId === undefined &&
        data.content === undefined
      ),
    { message: 'Must update at least one field' },
  );

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type RateSubmissionInput = z.infer<typeof rateSubmissionSchema>;
export type CreateGptThreadInput = z.infer<typeof createGptThreadSchema>;
export type UpdateGptThreadInput = z.infer<typeof updateGptThreadSchema>;
export type SendGptMessageInput = z.infer<typeof sendGptMessageSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
