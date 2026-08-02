import { z } from 'zod';

const optionalUrl = z.string().trim().url().or(z.literal('')).default('');

export const createTutorialCategorySchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(240).default(''),
});

export const updateTutorialCategorySchema = createTutorialCategorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const createTutorialSectionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().max(240).default(''),
});

export const updateTutorialSectionSchema = createTutorialSectionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const createTutorialLessonSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(500).default(''),
  content: z.string().max(200000).default(''),
  videoUrl: optionalUrl,
  videoTitle: z.string().trim().max(160).default(''),
  documentUrl: optionalUrl,
  documentTitle: z.string().trim().max(160).default(''),
});

export const updateTutorialLessonSchema = createTutorialLessonSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const tutorialContentTypeSchema = z.enum([
  'lexical',
  'youtube',
  'document',
]);

export const createTutorialContentSchema = z.object({
  type: tutorialContentTypeSchema,
  title: z.string().trim().min(1).max(200),
  content: z.string().max(200000).default(''),
  url: optionalUrl,
});

export const updateTutorialContentSchema = createTutorialContentSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type CreateTutorialCategoryInput = z.infer<
  typeof createTutorialCategorySchema
>;
export type CreateTutorialSectionInput = z.infer<
  typeof createTutorialSectionSchema
>;
export type CreateTutorialLessonInput = z.infer<
  typeof createTutorialLessonSchema
>;
export type CreateTutorialContentInput = z.infer<
  typeof createTutorialContentSchema
>;
