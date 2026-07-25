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

export const apiDocImportEndpointSchema = z.object({
  title: z.string().trim().min(1).max(120),
  method: httpMethodSchema,
  path: z.string().trim().max(500).default(''),
  request: apiBlockContentImportSchema,
});

export const apiDocImportCollectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().max(80).nullable().optional(),
  emoji: z.string().trim().max(16).nullable().optional(),
  endpoints: z.array(apiDocImportEndpointSchema).default([]),
});

export const apiDocImportWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).nullable().optional(),
  icon: z.string().trim().max(80).nullable().optional(),
  emoji: z.string().trim().max(16).nullable().optional(),
  collections: z.array(apiDocImportCollectionSchema).default([]),
});

export const apiDocImportExportV1FileSchema = z.object({
  version: z.literal(1),
  source: z.literal('towercrane-postman-lite'),
  exportedAt: z.string().optional(),
  collections: z.array(apiDocImportCollectionSchema).min(1),
});

export const apiDocImportExportV2FileSchema = z.object({
  version: z.literal(2),
  source: z.literal('towercrane-api-spec'),
  exportedAt: z.string().optional(),
  workspaces: z.array(apiDocImportWorkspaceSchema).min(1),
});

export const apiDocImportExportFileSchema = z.discriminatedUnion('version', [
  apiDocImportExportV1FileSchema,
  apiDocImportExportV2FileSchema,
]);

export type ApiDocImportExportFile = z.infer<
  typeof apiDocImportExportFileSchema
>;
export type ApiDocImportExportV1File = z.infer<
  typeof apiDocImportExportV1FileSchema
>;
export type ApiDocImportExportV2File = z.infer<
  typeof apiDocImportExportV2FileSchema
>;
export type ApiDocImportWorkspace = z.infer<typeof apiDocImportWorkspaceSchema>;
export type ApiDocImportCollection = z.infer<
  typeof apiDocImportCollectionSchema
>;
export type ApiDocImportEndpoint = z.infer<typeof apiDocImportEndpointSchema>;
export type ApiBlockContentImport = z.infer<typeof apiBlockContentImportSchema>;
