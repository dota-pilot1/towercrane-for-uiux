import { z } from 'zod';

export const createAiStudyNoteSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(['private', 'public']).default('private'),
});

export const updateAiStudyNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(500).nullable().optional(),
  visibility: z.enum(['private', 'public']).optional(),
});

export const createAiStudyNoteItemSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().default(''),
  resourceUrl: z.string().max(2048).nullable().optional(),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
});

export const updateAiStudyNoteItemSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().optional(),
  resourceUrl: z.string().max(2048).nullable().optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
});

// content는 Lexical 리치 에디터 JSON(이미지·표 포함 시 수 KB~수십 KB) → 넉넉히 허용
const NOTE_CONTENT_MAX = 200_000;

export const createAiStudyNoteNoteSchema = z.object({
  title: z.string().max(200).optional().default(''),
  content: z.string().min(1).max(NOTE_CONTENT_MAX),
});

export const updateAiStudyNoteNoteSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(NOTE_CONTENT_MAX).optional(),
});

export type CreateAiStudyNoteInput = z.infer<typeof createAiStudyNoteSchema>;
export type UpdateAiStudyNoteInput = z.infer<typeof updateAiStudyNoteSchema>;
export type CreateAiStudyNoteItemInput = z.infer<
  typeof createAiStudyNoteItemSchema
>;
export type UpdateAiStudyNoteItemInput = z.infer<
  typeof updateAiStudyNoteItemSchema
>;
export type CreateAiStudyNoteNoteInput = z.infer<
  typeof createAiStudyNoteNoteSchema
>;
export type UpdateAiStudyNoteNoteInput = z.infer<
  typeof updateAiStudyNoteNoteSchema
>;
