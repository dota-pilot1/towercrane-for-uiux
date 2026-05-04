import { z } from 'zod';

export const sendMeetingMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  messageType: z.enum(['TEXT', 'SYSTEM', 'COMMAND_RESULT', 'BOT_REPLY']).default('TEXT'),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const startMeetingDmSchema = z.object({
  otherUserId: z.string().trim().min(1),
});

export type SendMeetingMessageInput = z.infer<typeof sendMeetingMessageSchema>;
export type StartMeetingDmInput = z.infer<typeof startMeetingDmSchema>;
