import { z } from 'zod';

const sourceMessageIdsSchema = z.array(z.string().trim().min(1)).default([]);

export const minutesTextItemSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  sourceMessageIds: sourceMessageIdsSchema,
});

export const minutesActionItemSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  assigneeName: z.string().trim().max(80).nullable().optional().default(null),
  dueDate: z.string().trim().max(40).nullable().optional().default(null),
  sourceMessageIds: sourceMessageIdsSchema,
});

export const listDevMeetingMinutesQuerySchema = z.object({
  roomId: z.string().trim().min(1).optional(),
  q: z.string().trim().max(120).optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createDevMeetingMinutesSchema = z.object({
  roomId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(10000),
  discussionPoints: z.array(minutesTextItemSchema).default([]),
  decisions: z.array(minutesTextItemSchema).default([]),
  actionItems: z.array(minutesActionItemSchema).default([]),
  openQuestions: z.array(minutesTextItemSchema).default([]),
  sourceMessageIds: sourceMessageIdsSchema,
});

export const updateDevMeetingMinutesSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    summary: z.string().trim().min(1).max(10000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type ListDevMeetingMinutesQuery = z.infer<
  typeof listDevMeetingMinutesQuerySchema
>;
export type CreateDevMeetingMinutesInput = z.infer<
  typeof createDevMeetingMinutesSchema
>;
export type UpdateDevMeetingMinutesInput = z.infer<
  typeof updateDevMeetingMinutesSchema
>;
