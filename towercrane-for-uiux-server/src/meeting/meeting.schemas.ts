import { z } from 'zod';

export const sendMeetingMessageSchema = z
  .object({
    content: z.string().trim().max(4000),
    messageType: z
      .enum(['TEXT', 'SYSTEM', 'COMMAND_RESULT', 'BOT_REPLY'])
      .default('TEXT'),
    payload: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  // 텍스트가 비어 있어도 이미지(payload.imageUrl)가 있으면 허용 (이미지 전용 메시지)
  .refine(
    (value) =>
      value.content.length > 0 ||
      (value.payload != null && typeof value.payload.imageUrl === 'string'),
    { message: '메시지 내용이나 이미지가 필요합니다.', path: ['content'] },
  );

export const toggleReactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
});

export const startMeetingDmSchema = z.object({
  otherUserId: z.string().trim().min(1),
});

export const createMeetingRoomSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).nullable().optional(),
  roomType: z
    .enum([
      'ANNOUNCE',
      'PROTOTYPE',
      'FEEDBACK',
      'ISSUE',
      'DECISION',
      'RESOURCE',
      'INTERNAL',
      'FREE',
      'QNA',
    ])
    .default('FREE'),
});

export const createMeetingWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).nullable().optional(),
  icon: z.string().trim().max(40).nullable().optional(),
});

export const updateMeetingWorkspaceSchema =
  createMeetingWorkspaceSchema.partial();

export const reorderMeetingWorkspacesSchema = z.object({
  items: z.array(z.object({ id: z.string(), orderIdx: z.number().int() })),
});

export type SendMeetingMessageInput = z.infer<typeof sendMeetingMessageSchema>;
export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;
export type StartMeetingDmInput = z.infer<typeof startMeetingDmSchema>;
export type CreateMeetingRoomInput = z.infer<typeof createMeetingRoomSchema>;
export type CreateMeetingWorkspaceInput = z.infer<
  typeof createMeetingWorkspaceSchema
>;
export type UpdateMeetingWorkspaceInput = z.infer<
  typeof updateMeetingWorkspaceSchema
>;
