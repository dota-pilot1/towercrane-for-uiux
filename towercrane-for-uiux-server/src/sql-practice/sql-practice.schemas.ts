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

export const geminiAskSchema = z.object({
  content: z.string().trim().min(1, 'Content is required'),
  mode: z.enum(['sql', 'general', 'grading']),
});

export const gradeSqlPracticeSubmissionSchema = z.object({
  seedFile: seedFileNameSchema,
  seedHash: z.string().trim().optional(),
  exampleId: z.string().trim().min(1, 'Example id is required'),
  exampleTitle: z.string().trim().min(1, 'Example title is required'),
  exampleLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  exampleOrder: z.number().int().positive(),
  description: z.string().trim().min(1, 'Description is required'),
  hint: z.string().trim().min(1, 'Hint is required'),
  relatedTables: z.array(z.string().trim().min(1)).default([]),
  submittedSql: z.string().trim().min(1, 'Submitted SQL is required'),
  answerSql: z.string().trim().min(1, 'Answer SQL is required'),
});

export const sqlPracticeSubmissionSeedQuerySchema = z.object({
  seedFile: seedFileNameSchema,
});

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

export const listSqlPracticeNotesQuerySchema = z.object({
  seedFile: optionalTrimmedString,
  exampleId: optionalTrimmedString,
  tableName: optionalTrimmedString,
});

export const createSqlPracticeNoteSchema = z.object({
  seedFile: optionalTrimmedString,
  exampleId: optionalTrimmedString,
  exampleTitle: optionalTrimmedString,
  tableName: optionalTrimmedString,
  title: optionalTrimmedString,
  content: z.string().trim().min(1, 'Note content is required'),
  pinned: z.boolean().default(false),
});

export const updateSqlPracticeNoteSchema = z
  .object({
    seedFile: optionalTrimmedString,
    exampleId: optionalTrimmedString,
    exampleTitle: optionalTrimmedString,
    tableName: optionalTrimmedString,
    title: optionalTrimmedString,
    content: z.string().trim().min(1, 'Note content is required').optional(),
    pinned: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type ExecuteSqlInput = z.infer<typeof executeSqlSchema>;
export type ActivateSeedInput = z.infer<typeof activateSeedSchema>;
export type GeminiAskInput = z.infer<typeof geminiAskSchema>;
export type GradeSqlPracticeSubmissionInput = z.infer<typeof gradeSqlPracticeSubmissionSchema>;
export type SqlPracticeSubmissionSeedQuery = z.infer<
  typeof sqlPracticeSubmissionSeedQuerySchema
>;
export type ListSqlPracticeNotesQuery = z.infer<typeof listSqlPracticeNotesQuerySchema>;
export type CreateSqlPracticeNoteInput = z.infer<typeof createSqlPracticeNoteSchema>;
export type UpdateSqlPracticeNoteInput = z.infer<typeof updateSqlPracticeNoteSchema>;
