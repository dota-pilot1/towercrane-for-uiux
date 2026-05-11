import { z } from 'zod';

export const executeSqlSchema = z.object({
  query: z.string().trim().min(1, 'SQL query is required'),
});

export const seedFileNameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9._-]+\.sql$/, 'Invalid SQL seed file name.');

export const activateSeedSchema = z.object({
  source: z.enum(['builtin', 'uploaded']).default('builtin'),
  fileName: seedFileNameSchema,
});

export type ExecuteSqlInput = z.infer<typeof executeSqlSchema>;
export type ActivateSeedInput = z.infer<typeof activateSeedSchema>;
