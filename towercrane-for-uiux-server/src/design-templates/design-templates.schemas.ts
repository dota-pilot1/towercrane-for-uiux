import { z } from 'zod';

export const designTemplateFileSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(240),
  url: z.string().trim().min(1).max(2048),
  fileType: z.string().trim().max(120).default('application/octet-stream'),
  fileSize: z.coerce.number().int().min(0).default(0),
  purpose: z
    .enum(['source', 'convention', 'asset'])
    .optional()
    .default('source'),
});

export const listDesignTemplatesQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().max(80).optional().default(''),
});

export const createDesignTemplateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1200),
  category: z.string().trim().min(1).max(80),
  tags: z.array(z.string().trim().min(1).max(40)).optional().default([]),
  coverImageUrl: z.string().trim().max(2048).nullable().optional().default(null),
  previewImageUrls: z
    .array(z.string().trim().min(1).max(2048))
    .optional()
    .default([]),
  files: z.array(designTemplateFileSchema).optional().default([]),
  conventionFiles: z.array(designTemplateFileSchema).optional().default([]),
  designRules: z.string().max(12000).optional().default(''),
  aiPrompt: z.string().max(12000).optional().default(''),
});

export const updateDesignTemplateSchema = createDesignTemplateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const createDesignReferenceSchema = z.object({
  title: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().max(600).optional().default(''),
  url: z.string().trim().min(1).max(2048),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});

export const updateDesignReferenceSchema = createDesignReferenceSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type ListDesignTemplatesQuery = z.infer<
  typeof listDesignTemplatesQuerySchema
>;
export type CreateDesignTemplateInput = z.infer<
  typeof createDesignTemplateSchema
>;
export type UpdateDesignTemplateInput = z.infer<
  typeof updateDesignTemplateSchema
>;
export type CreateDesignReferenceInput = z.infer<
  typeof createDesignReferenceSchema
>;
export type UpdateDesignReferenceInput = z.infer<
  typeof updateDesignReferenceSchema
>;
