import { z } from 'zod';

export const projectIssueTypeSchema = z.enum([
  'BUG',
  'FEATURE',
  'IMPROVEMENT',
  'QUESTION',
  'RISK',
  'OTHER',
]);

export const projectIssueStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'TESTING',
  'CLOSED',
  'HOLD',
]);

export const projectIssuePrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

const queryBooleanSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}, z.boolean().default(false));

export const listProjectIssueCategoriesQuerySchema = z.object({
  archived: queryBooleanSchema,
});

export const createProjectIssueCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().default(''),
});

export const updateProjectIssueCategorySchema = createProjectIssueCategorySchema
  .partial()
  .extend({
    archived: z.boolean().optional(),
    orderIdx: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const listProjectIssuesQuerySchema = z.object({
  projectId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().max(120).optional().default(''),
  issueType: projectIssueTypeSchema.optional(),
  status: projectIssueStatusSchema.optional(),
  priority: projectIssuePrioritySchema.optional(),
  assigneeId: z.string().optional(),
  archived: queryBooleanSchema,
  sort: z
    .enum(['order', 'recent', 'oldest', 'dueDate', 'priority'])
    .default('order'),
});

export const createProjectIssueSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(5000).optional().default(''),
  issueType: projectIssueTypeSchema.default('BUG'),
  status: projectIssueStatusSchema.default('OPEN'),
  priority: projectIssuePrioritySchema.default('MEDIUM'),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const updateProjectIssueSchema = createProjectIssueSchema
  .omit({ projectId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const updateProjectIssueStatusSchema = z.object({
  status: projectIssueStatusSchema,
});

export const updateProjectIssuePrioritySchema = z.object({
  priority: projectIssuePrioritySchema,
});

export const updateProjectIssueAssigneeSchema = z.object({
  assigneeId: z.string().nullable(),
});

export const reorderProjectIssuesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        orderIdx: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const projectIssueIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const createProjectIssueChecklistSchema = z.object({
  content: z.string().trim().min(1).max(300),
  orderIdx: z.number().int().min(0).optional(),
});

export const updateProjectIssueChecklistSchema = z
  .object({
    content: z.string().trim().min(1).max(300).optional(),
    completed: z.boolean().optional(),
    orderIdx: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const updateProjectIssueCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const createProjectIssueCommentSchema = updateProjectIssueCommentSchema;

export const createProjectIssueAttachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(256),
  fileUrl: z.string().url().max(2048),
  contentType: z.string().trim().min(1).max(128),
  fileSize: z.number().int().min(0).default(0),
});

export type ListProjectIssuesQuery = z.infer<
  typeof listProjectIssuesQuerySchema
>;
export type CreateProjectIssueCategoryInput = z.infer<
  typeof createProjectIssueCategorySchema
>;
export type CreateProjectIssueInput = z.infer<typeof createProjectIssueSchema>;
export type UpdateProjectIssueInput = z.infer<typeof updateProjectIssueSchema>;
