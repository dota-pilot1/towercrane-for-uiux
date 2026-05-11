import { z } from 'zod';

export const executeSqlSchema = z.object({
  query: z.string().trim().min(1, 'SQL query is required'),
});

export type ExecuteSqlInput = z.infer<typeof executeSqlSchema>;
