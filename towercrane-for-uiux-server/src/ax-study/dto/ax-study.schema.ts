import { z } from 'zod';

export const createAxStudyWorkspaceSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(['private', 'shared', 'public']).default('private'),
});

export const updateAxStudyWorkspaceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(['private', 'shared', 'public']).optional(),
});

export const createAxStudyNoteSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().default(''),
  tags: z.array(z.string()).default([]),
});

export const updateAxStudyNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateAxStudyWorkspaceInput = z.infer<
  typeof createAxStudyWorkspaceSchema
>;
export type UpdateAxStudyWorkspaceInput = z.infer<
  typeof updateAxStudyWorkspaceSchema
>;
export type CreateAxStudyNoteInput = z.infer<typeof createAxStudyNoteSchema>;
export type UpdateAxStudyNoteInput = z.infer<typeof updateAxStudyNoteSchema>;
