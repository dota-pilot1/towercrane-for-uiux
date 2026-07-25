import { z } from 'zod';

const riskLevelSchema = z.enum(['low', 'medium', 'high']);
const sourceTypeSchema = z.enum(['commit', 'pr', 'compare', 'diff_url']);
const findingSeveritySchema = z.enum(['low', 'medium', 'high']);
const findingCategorySchema = z.enum([
  'process',
  'code',
  'syntax',
  'structure',
  'architecture',
  'clean_code',
  'diagram',
  'risk',
]);
export const codeReviewSectionSchema = z.enum([
  'structure',
  'process',
  'code',
  'syntax',
  'architecture',
  'diagram',
]);

export const codeReviewFindingSchema = z.object({
  category: findingCategorySchema.optional().default('code'),
  severity: findingSeveritySchema,
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(12000),
  filePath: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .nullable()
    .optional()
    .default(null),
  lineNumber: z.coerce
    .number()
    .int()
    .min(1)
    .nullable()
    .optional()
    .default(null),
  recommendation: z.string().trim().min(1).max(4000),
});

export const codeReviewChangedFileSchema = z.object({
  path: z.string().trim().min(1).max(500),
  additions: z.coerce.number().int().min(0).default(0),
  deletions: z.coerce.number().int().min(0).default(0),
  reviewed: z.boolean().default(true),
  excludedReason: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional()
    .default(null),
});

export const codeReviewDocumentTypeSchema = z.enum([
  'overview',
  'review',
  'checklist',
  'issue',
  'note',
]);

export const codeReviewDocumentSchema = z.object({
  id: z.string().trim().min(1).max(120),
  type: codeReviewDocumentTypeSchema,
  title: z.string().trim().min(1).max(180),
  content: z.string().max(120000).default(''),
  orderIdx: z.coerce.number().int().min(0).default(0),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

export const listCodeReviewsQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  repository: z.string().trim().max(200).optional().default(''),
  taskId: z.string().trim().max(80).optional().default(''),
  sourceType: sourceTypeSchema.optional(),
  riskLevel: riskLevelSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createCodeReviewSchema = z.object({
  taskId: z.string().trim().min(1).max(80).nullable().optional().default(null),
  sourceType: sourceTypeSchema,
  sourceUrl: z.string().trim().min(1).max(1000),
  repository: z.string().trim().min(1).max(240),
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(12000),
  riskLevel: riskLevelSchema,
  findings: z.array(codeReviewFindingSchema).default([]),
  testGaps: z.array(z.string().trim().min(1).max(1000)).default([]),
  changedFiles: z.array(codeReviewChangedFileSchema).default([]),
  excludedFiles: z.array(codeReviewChangedFileSchema).default([]),
  diffHash: z.string().trim().min(12).max(128),
  diffSnapshot: z.string().max(120000).nullable().optional().default(null),
  model: z.string().trim().max(120).nullable().optional().default(null),
});

export const createManualCodeReviewSchema = z.object({
  taskId: z.string().trim().min(1).max(80).nullable().optional().default(null),
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().max(12000).default(''),
  repository: z.string().trim().max(240).optional().default('manual'),
  riskLevel: riskLevelSchema.default('low'),
  documents: z.array(codeReviewDocumentSchema).default([]),
});

export const replaceCodeReviewDocumentsSchema = z.object({
  documents: z.array(codeReviewDocumentSchema),
});

export const uploadCodeReviewSchema = z.object({
  taskId: z.string().trim().min(1).max(80).nullable().optional().default(null),
  sourceUrl: z.string().trim().min(1).max(1000),
  reviewGoal: z.string().trim().max(1000).optional().default(''),
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(12000),
  riskLevel: riskLevelSchema.default('low'),
  findings: z.array(codeReviewFindingSchema).default([]),
  testGaps: z.array(z.string().trim().min(1).max(1000)).default([]),
  model: z.string().trim().max(120).optional().default('external'),
});

export const analyzeCodeReviewSchema = z.object({
  sourceUrl: z.string().trim().min(1).max(1000),
  repositoryUrl: z.string().trim().min(1).max(1000).optional(),
  reviewGoal: z.string().trim().max(1000).optional().default(''),
  sections: z
    .array(codeReviewSectionSchema)
    .min(1)
    .max(6)
    .optional()
    .default(['structure', 'process', 'code', 'syntax', 'architecture']),
});

const githubPrReviewCriterionSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  title: z.string().trim().min(1).max(60),
  instruction: z.string().trim().min(1).max(1000),
  enabled: z.boolean().default(true),
  orderIdx: z.coerce.number().int().min(0).default(0),
});

export const saveGithubPrReviewPreferencesSchema = z
  .object({
    criteria: z.array(githubPrReviewCriterionSchema).min(1).max(10),
  })
  .superRefine((value, ctx) => {
    const activeCount = value.criteria.filter(
      (criterion) => criterion.enabled,
    ).length;
    if (activeCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['criteria'],
        message: '활성 리뷰 기준은 최소 1개 이상이어야 합니다.',
      });
    }
  });

export const analyzeGithubPrReviewSchema = z.object({
  sourceUrl: z.string().trim().min(1).max(1000),
  reviewNote: z.string().trim().max(1000).optional().default(''),
});

export type UploadCodeReviewInput = z.infer<typeof uploadCodeReviewSchema>;

export const validateCodeReviewRepositorySchema = z.object({
  repositoryUrl: z.string().trim().min(1).max(1000),
});

export const updateCodeReviewSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    summary: z.string().trim().min(1).max(12000).optional(),
    riskLevel: riskLevelSchema.optional(),
    taskId: z.string().trim().min(1).max(80).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type ListCodeReviewsQuery = z.infer<typeof listCodeReviewsQuerySchema>;
export type CreateCodeReviewInput = z.infer<typeof createCodeReviewSchema>;
export type CreateManualCodeReviewInput = z.infer<
  typeof createManualCodeReviewSchema
>;
export type ReplaceCodeReviewDocumentsInput = z.infer<
  typeof replaceCodeReviewDocumentsSchema
>;
export type AnalyzeCodeReviewInput = z.infer<typeof analyzeCodeReviewSchema>;
export type SaveGithubPrReviewPreferencesInput = z.infer<
  typeof saveGithubPrReviewPreferencesSchema
>;
export type AnalyzeGithubPrReviewInput = z.infer<
  typeof analyzeGithubPrReviewSchema
>;
export type ValidateCodeReviewRepositoryInput = z.infer<
  typeof validateCodeReviewRepositorySchema
>;
export type UpdateCodeReviewInput = z.infer<typeof updateCodeReviewSchema>;
