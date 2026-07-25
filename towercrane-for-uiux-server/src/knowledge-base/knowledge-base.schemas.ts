import { z } from 'zod';

export const knowledgeChannelSchema = z.enum(['notice', 'faq', 'ai', 'dev']);
export const knowledgeStatusSchema = z.enum(['draft', 'published', 'archived']);
export const knowledgeVisibilitySchema = z.enum(['all', 'department', 'role']);

export const listKnowledgeDocumentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  q: z.string().trim().max(120).optional().default(''),
  channel: knowledgeChannelSchema.optional(),
  status: knowledgeStatusSchema.optional(),
});

export const createKnowledgeDocumentSchema = z.object({
  channel: knowledgeChannelSchema.default('notice'),
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().max(800).optional().default(''),
  contentMarkdown: z.string().trim().min(1).max(50000),
  contentJson: z.string().trim().max(200000).nullable().optional(),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(30)
    .optional()
    .default([]),
  status: knowledgeStatusSchema.optional().default('draft'),
  visibility: knowledgeVisibilitySchema.optional().default('all'),
  effectiveFrom: z.string().trim().max(40).nullable().optional(),
  effectiveTo: z.string().trim().max(40).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateKnowledgeDocumentSchema = createKnowledgeDocumentSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const searchKnowledgeSchema = z.object({
  query: z.string().trim().min(1).max(200),
  channels: z.array(knowledgeChannelSchema).max(4).optional(),
  limit: z.number().int().min(1).max(20).optional().default(5),
});

export type ListKnowledgeDocumentsQuery = z.infer<
  typeof listKnowledgeDocumentsQuerySchema
>;
export type CreateKnowledgeDocumentInput = z.infer<
  typeof createKnowledgeDocumentSchema
>;
export type UpdateKnowledgeDocumentInput = z.infer<
  typeof updateKnowledgeDocumentSchema
>;
