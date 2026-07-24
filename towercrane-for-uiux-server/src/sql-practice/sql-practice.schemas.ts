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

export const sqlPracticeSubmissionActivityQuerySchema = z.object({
  seedFile: seedFileNameSchema,
  limit: z.coerce.number().int().min(1).max(100).default(30),
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

export const sqlUserPracticeLevelSchema = z.coerce.number().int().min(1).max(5);

export const sqlUserPracticeProblemListQuerySchema = z.object({
  level: z
    .union([sqlUserPracticeLevelSchema, z.literal('all')])
    .optional()
    .transform((value) => (value === 'all' ? undefined : value)),
  mine: z.coerce.boolean().optional().default(false),
});

export const createSqlUserPracticeProblemSchema = z.object({
  problemSetId: optionalTrimmedString,
  title: z.string().trim().min(1, 'Title is required').max(80),
  description: z.string().trim().min(1, 'Description is required').max(4000),
  level: sqlUserPracticeLevelSchema.default(1),
  orderIdx: z.coerce.number().int().min(0).optional(),
  targetTables: z.array(z.string().trim().min(1)).max(12).default([]),
  starterSql: optionalTrimmedString,
  answerSql: z.string().trim().min(1, 'Answer SQL is required').max(10000),
  explanation: optionalTrimmedString,
  visibility: z.enum(['public', 'private']).default('public'),
  status: z.enum(['draft', 'published']).default('published'),
});

export const updateSqlUserPracticeProblemSchema =
  createSqlUserPracticeProblemSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    });

export const generateSqlUserPracticeAnswerSchema = z.object({
  title: optionalTrimmedString,
  description: z.string().trim().min(1, 'Description is required').max(4000),
  level: sqlUserPracticeLevelSchema.default(1),
  targetTables: z.array(z.string().trim().min(1)).max(12).default([]),
});

export const createSqlPracticeProblemSetSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(80),
  description: z.string().trim().max(1000).optional().default(''),
  level: sqlUserPracticeLevelSchema.nullable().optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

export const updateSqlPracticeProblemSetSchema =
  createSqlPracticeProblemSetSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    });

export const generateSqlPracticeProblemSetProblemsSchema = z.object({
  problemSetId: optionalTrimmedString,
  count: z.coerce.number().int().min(1).max(10).optional().default(10),
  additionalInstructions: z.string().trim().max(2000).optional(),
});

export const gradeSqlUserPracticeProblemSchema = z.object({
  submittedSql: z
    .string()
    .trim()
    .min(1, 'Submitted SQL is required')
    .max(10000),
});

export const sqlPersonalPracticeProblemListQuerySchema = z.object({
  level: z
    .union([sqlUserPracticeLevelSchema, z.literal('all')])
    .optional()
    .transform((value) => (value === 'all' ? undefined : value)),
  problemSetId: optionalTrimmedString,
});

export const replacePersonalSchemaVersionSchema = z.object({
  title: optionalTrimmedString,
  description: z.string().trim().max(500).optional().default(''),
});

const sqlStudyWorkspaceBaseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(80),
  description: z.string().trim().max(1000).optional().default(''),
});

export const sqlStudyMetaPatchSchema = z.object({
  learningGoal: z.string().trim().max(2000).nullable().optional(),
  level: z
    .enum(['beginner', 'basic', 'intermediate', 'advanced'])
    .nullable()
    .optional(),
  topics: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  visibility: z.enum(['private', 'public', 'official']).optional(),
});

export const createSqlPersonalPracticeWorkspaceSchema =
  sqlStudyWorkspaceBaseSchema.extend(sqlStudyMetaPatchSchema.shape);

export const updateSqlPersonalPracticeWorkspaceSchema =
  createSqlPersonalPracticeWorkspaceSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    });

export const createSqlTeamPracticeWorkspaceSchema = sqlStudyWorkspaceBaseSchema;

export const updateSqlTeamPracticeWorkspaceSchema =
  createSqlTeamPracticeWorkspaceSchema
    .partial()
    .extend(sqlStudyMetaPatchSchema.shape)
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    });

export const updateSqlStudyErdSchema = z.object({
  erdMmd: z.string().trim().min(1, 'ERD is required').max(200000),
});

export const sqlTeamPracticeProblemListQuerySchema = z.object({
  level: z
    .union([sqlUserPracticeLevelSchema, z.literal('all')])
    .optional()
    .transform((value) => (value === 'all' ? undefined : value)),
  mine: z.coerce.boolean().optional().default(false),
  problemSetId: optionalTrimmedString,
});

export const addSqlTeamPracticeMemberSchema = z.object({
  userId: z.string().trim().min(1, 'User id is required'),
  role: z.enum(['owner', 'editor', 'member']).default('member'),
});

export const updateSqlTeamPracticeMemberSchema = z.object({
  role: z.enum(['owner', 'editor', 'member']),
});

export const publicShareTokenSchema = z.string().trim().min(16).max(128);

export type ExecuteSqlInput = z.infer<typeof executeSqlSchema>;
export type ActivateSeedInput = z.infer<typeof activateSeedSchema>;
export type GeminiAskInput = z.infer<typeof geminiAskSchema>;
export type GradeSqlPracticeSubmissionInput = z.infer<
  typeof gradeSqlPracticeSubmissionSchema
>;
export type SqlPracticeSubmissionSeedQuery = z.infer<
  typeof sqlPracticeSubmissionSeedQuerySchema
>;
export type SqlPracticeSubmissionActivityQuery = z.infer<
  typeof sqlPracticeSubmissionActivityQuerySchema
>;
export type ListSqlPracticeNotesQuery = z.infer<
  typeof listSqlPracticeNotesQuerySchema
>;
export type CreateSqlPracticeNoteInput = z.infer<
  typeof createSqlPracticeNoteSchema
>;
export type UpdateSqlPracticeNoteInput = z.infer<
  typeof updateSqlPracticeNoteSchema
>;
export type SqlUserPracticeProblemListQuery = z.infer<
  typeof sqlUserPracticeProblemListQuerySchema
>;
export type CreateSqlUserPracticeProblemInput = z.infer<
  typeof createSqlUserPracticeProblemSchema
>;
export type UpdateSqlUserPracticeProblemInput = z.infer<
  typeof updateSqlUserPracticeProblemSchema
>;
export type GenerateSqlUserPracticeAnswerInput = z.infer<
  typeof generateSqlUserPracticeAnswerSchema
>;
export type CreateSqlPracticeProblemSetInput = z.infer<
  typeof createSqlPracticeProblemSetSchema
>;
export type UpdateSqlPracticeProblemSetInput = z.infer<
  typeof updateSqlPracticeProblemSetSchema
>;
export type GenerateSqlPracticeProblemSetProblemsInput = z.infer<
  typeof generateSqlPracticeProblemSetProblemsSchema
>;
export type GradeSqlUserPracticeProblemInput = z.infer<
  typeof gradeSqlUserPracticeProblemSchema
>;
export type SqlPersonalPracticeProblemListQuery = z.infer<
  typeof sqlPersonalPracticeProblemListQuerySchema
>;
export type ReplacePersonalSchemaVersionInput = z.infer<
  typeof replacePersonalSchemaVersionSchema
>;
export type CreateSqlPersonalPracticeWorkspaceInput = z.infer<
  typeof createSqlPersonalPracticeWorkspaceSchema
>;
export type UpdateSqlPersonalPracticeWorkspaceInput = z.infer<
  typeof updateSqlPersonalPracticeWorkspaceSchema
>;
export type CreateSqlTeamPracticeWorkspaceInput = z.infer<
  typeof createSqlTeamPracticeWorkspaceSchema
>;
export type UpdateSqlTeamPracticeWorkspaceInput = z.infer<
  typeof updateSqlTeamPracticeWorkspaceSchema
>;
export type SqlTeamPracticeProblemListQuery = z.infer<
  typeof sqlTeamPracticeProblemListQuerySchema
>;
export type AddSqlTeamPracticeMemberInput = z.infer<
  typeof addSqlTeamPracticeMemberSchema
>;
export type UpdateSqlTeamPracticeMemberInput = z.infer<
  typeof updateSqlTeamPracticeMemberSchema
>;
export type UpdateSqlStudyErdInput = z.infer<typeof updateSqlStudyErdSchema>;
