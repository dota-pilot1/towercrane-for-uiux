import { z } from 'zod';

export const previewKindSchema = z.enum([
  'input',
  'button',
  'card',
  'filter-tabs',
]);

const commonComponentPropsSchema = z.record(z.string(), z.unknown());

export const listCommonComponentTemplatesQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().max(80).optional().default(''),
  style: z.string().trim().max(80).optional().default(''),
});

export const createCommonComponentTemplateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1200),
  category: z.string().trim().min(1).max(80),
  style: z.string().trim().min(1).max(80),
  previewKind: previewKindSchema,
  componentName: z.string().trim().min(1).max(160),
  tags: z.array(z.string().trim().min(1).max(40)).optional().default([]),
  examples: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(160),
        title: z.string().trim().min(1).max(160),
        summary: z.string().trim().max(1200),
        previewKind: previewKindSchema,
        previewVariant: z.string().trim().min(1).max(80),
        code: z.string().min(1).max(30000),
        props: commonComponentPropsSchema.optional().default({}),
        orderIdx: z.coerce.number().int().min(0),
      }),
    )
    .optional()
    .default([]),
  code: z.string().min(1).max(30000),
  notes: z.string().max(4000).optional().default(''),
});

export const createCommonComponentExampleSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(1200).optional().default(''),
  previewKind: previewKindSchema,
  previewVariant: z.string().trim().min(1).max(80).default('default'),
  code: z.string().min(1).max(30000),
  props: commonComponentPropsSchema.optional().default({}),
});

export const updateCommonComponentExampleSchema =
  createCommonComponentExampleSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
    });

export const updateCommonComponentTemplateSchema =
  createCommonComponentTemplateSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required',
    });

export type CommonComponentTemplateUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};
