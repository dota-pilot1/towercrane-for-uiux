import { z } from 'zod';

export const issueTypeSchema = z.enum([
  'BUG',
  'FEATURE',
  'IMPROVEMENT',
  'QUESTION',
  'OTHER',
]);

export const issueStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'TESTING',
  'CLOSED',
]);

export const issuePrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const listIssuesQuerySchema = z.object({
  prototypeId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().max(120).optional().default(''),
  issueType: issueTypeSchema.optional(),
  status: issueStatusSchema.optional(),
  priority: issuePrioritySchema.optional(),
  assigneeId: z.string().optional(),
  sort: z
    .enum(['order', 'recent', 'oldest', 'priority'])
    .default('order'),
});

export const createIssueSchema = z.object({
  prototypeId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(5000).optional().default(''),
  issueType: issueTypeSchema.default('BUG'),
  status: issueStatusSchema.default('OPEN'),
  priority: issuePrioritySchema.default('MEDIUM'),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const updateIssueSchema = createIssueSchema
  .omit({ prototypeId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const updateIssueStatusSchema = z.object({
  status: issueStatusSchema,
});

export const reorderIssuesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        orderIdx: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const createIssueCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const updateIssueCommentSchema = createIssueCommentSchema;

export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
