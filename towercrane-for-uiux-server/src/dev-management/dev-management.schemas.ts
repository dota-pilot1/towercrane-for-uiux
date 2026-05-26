import { z } from 'zod';

export const sendDevManagementMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  target: z.enum(['ROOM', 'BOT']).default('ROOM'),
  messageType: z
    .enum([
      'TEXT',
      'SYSTEM',
      'BOT_REPLY',
      'SUMMARY',
      'PROTOTYPE_SEARCH_RESULT',
      'TECH_DEBT_ANALYSIS',
      'TOOL_RESULT',
    ])
    .default('TEXT'),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const createDevManagementRoomSchema = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).nullable().optional(),
  roomType: z
    .enum([
      'GENERAL',
      'PROTOTYPE',
      'ISSUE',
      'DECISION',
      'TECH_DEBT',
      'RESOURCE',
      'DM',
    ])
    .default('GENERAL'),
});

export const updateDevManagementBotSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  responseMode: z
    .enum(['MENTION_ONLY', 'DIRECT_ONLY', 'MENTION_OR_DIRECT'])
    .optional(),
});

export const startDevManagementDmSchema = z.object({
  otherUserId: z.string().trim().min(1),
});

export type SendDevManagementMessageInput = z.infer<
  typeof sendDevManagementMessageSchema
>;
export type CreateDevManagementRoomInput = z.infer<
  typeof createDevManagementRoomSchema
>;
export type UpdateDevManagementBotSettingsInput = z.infer<
  typeof updateDevManagementBotSettingsSchema
>;
export type StartDevManagementDmInput = z.infer<
  typeof startDevManagementDmSchema
>;
