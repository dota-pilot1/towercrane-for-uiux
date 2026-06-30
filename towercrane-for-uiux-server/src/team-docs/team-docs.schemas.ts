import { z } from 'zod';

const parentId = z.string().min(1).nullable().optional().default(null);

export const createTeamDocFolderSchema = z.object({
  parentId,
  title: z.string().trim().min(1).max(120),
});

export const createTeamDocDocumentSchema = z.object({
  parentId,
  title: z.string().trim().min(1).max(160),
  content: z.string().max(100000).optional().default(''),
});

export const createTeamDocFileSchema = z.object({
  parentId,
  fileName: z.string().trim().min(1).max(256),
  fileUrl: z.string().url().max(2048),
  contentType: z.string().trim().min(1).max(128),
  fileSize: z.number().int().min(0).default(0),
});

export const updateTeamDocNodeSchema = z
  .object({
    title: z.string().trim().min(1).max(256).optional(),
    content: z.string().max(100000).optional(),
    parentId: z.string().min(1).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: '변경할 내용이 없습니다.',
  });

export const reorderTeamDocNodesSchema = z.object({
  parentId,
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        orderIdx: z.number().int().min(0),
      }),
    )
    .min(1),
});
