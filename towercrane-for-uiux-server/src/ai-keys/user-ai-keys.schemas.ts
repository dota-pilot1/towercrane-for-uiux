import { z } from 'zod';

export const aiProviderSchema = z.enum(['openai']);
export const saveAiKeySchema = z.object({
  apiKey: z.string().trim().min(10).max(500),
});

export type AiProvider = z.infer<typeof aiProviderSchema>;
export type SaveAiKeyInput = z.infer<typeof saveAiKeySchema>;
