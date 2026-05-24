import { z } from 'zod';

export const sendMeetingMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  messageType: z.enum(['TEXT', 'SYSTEM', 'COMMAND_RESULT', 'BOT_REPLY']).default('TEXT'),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const startMeetingDmSchema = z.object({
  otherUserId: z.string().trim().min(1),
});

export const createMeetingRoomSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).nullable().optional(),
  roomType: z
    .enum(['ANNOUNCE', 'PROTOTYPE', 'FEEDBACK', 'ISSUE', 'DECISION', 'RESOURCE', 'INTERNAL', 'FREE', 'QNA'])
    .default('FREE'),
});

export type SendMeetingMessageInput = z.infer<typeof sendMeetingMessageSchema>;
export type StartMeetingDmInput = z.infer<typeof startMeetingDmSchema>;
export type CreateMeetingRoomInput = z.infer<typeof createMeetingRoomSchema>;
