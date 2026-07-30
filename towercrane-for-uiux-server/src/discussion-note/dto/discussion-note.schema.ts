import { z } from 'zod';

export const discussionNoteStatusSchema = z.enum([
  'OPEN',
  'DISCUSSING',
  'DECIDED',
  'ON_HOLD',
  'CLOSED',
]);

export const discussionNotePrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const listDiscussionNotesQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  status: discussionNoteStatusSchema.optional(),
});

export const createDiscussionNoteSchema = z.object({
  title: z.string().trim().min(1).max(180),
  content: z.string().max(12000).optional().default(''),
  decisionSummary: z.string().max(8000).optional().default(''),
  status: discussionNoteStatusSchema.optional().default('OPEN'),
  priority: discussionNotePrioritySchema.optional().default('MEDIUM'),
});

export const updateDiscussionNoteSchema = createDiscussionNoteSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const createDiscussionNoteCommentSchema = z.object({
  content: z.string().trim().min(1).max(8000),
});

export const updateDiscussionNoteCommentSchema =
  createDiscussionNoteCommentSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    {
      message: 'At least one field is required',
    },
  );

export type ListDiscussionNotesQuery = z.infer<
  typeof listDiscussionNotesQuerySchema
>;
export type CreateDiscussionNoteInput = z.infer<
  typeof createDiscussionNoteSchema
>;
export type UpdateDiscussionNoteInput = z.infer<
  typeof updateDiscussionNoteSchema
>;
export type CreateDiscussionNoteCommentInput = z.infer<
  typeof createDiscussionNoteCommentSchema
>;
export type UpdateDiscussionNoteCommentInput = z.infer<
  typeof updateDiscussionNoteCommentSchema
>;
