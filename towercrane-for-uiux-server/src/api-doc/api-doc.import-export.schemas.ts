import { z } from 'zod';
import { httpMethodSchema } from './api-doc.schemas';

const keyValueItemSchema = z.object({
  key: z.string().default(''),
  value: z.string().default(''),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});

export const apiBlockContentImportSchema = z.object({
  method: httpMethodSchema,
  url: z.string().trim().min(1).max(1000),
  authEnabled: z.boolean().default(true),
  headers: z.array(keyValueItemSchema).default([]),
  params: z.array(keyValueItemSchema).default([]),
  body: z
    .object({
      type: z.enum(['none', 'json', 'raw']).default('none'),
      content: z.string().default(''),
    })
    .default({ type: 'none', content: '' }),
  description: z.string().max(4000).optional(),
});

const apiDocImportEndpointSchema = z.object({
  title: z.string().trim().min(1).max(120),
  method: httpMethodSchema,
  path: z.string().trim().max(500).default(''),
  request: apiBlockContentImportSchema,
});

const apiDocImportCollectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().max(80).nullable().optional(),
  emoji: z.string().trim().max(16).nullable().optional(),
  endpoints: z.array(apiDocImportEndpointSchema).default([]),
});

export const apiDocImportExportFileSchema = z.object({
  version: z.literal(1),
  source: z.literal('towercrane-postman-lite'),
  exportedAt: z.string().optional(),
  collections: z.array(apiDocImportCollectionSchema).min(1),
});

export type ApiDocImportExportFile = z.infer<typeof apiDocImportExportFileSchema>;
export type ApiDocImportCollection = z.infer<typeof apiDocImportCollectionSchema>;
export type ApiDocImportEndpoint = z.infer<typeof apiDocImportEndpointSchema>;
export type ApiBlockContentImport = z.infer<typeof apiBlockContentImportSchema>;
