import { z } from 'zod';

export const taskTypeSchema = z.enum([
  'FEATURE',
  'BUG',
  'DOCS',
  'DESIGN',
  'REFACTOR',
  'QA',
  'CHORE',
]);

export const taskStatusSchema = z.enum([
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
  'HOLD',
]);

export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const taskScopeSchema = z.enum(['TEAM', 'PERSONAL']);
export const taskVisibilitySchema = z.enum(['TEAM', 'PRIVATE']);

const queryBooleanSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}, z.boolean().default(false));

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().max(120).optional().default(''),
  scope: z.enum(['all', 'my', 'user']).default('all'),
  userId: z.string().optional(),
  taskType: taskTypeSchema.optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().optional(),
  archived: queryBooleanSchema,
  sort: z
    .enum(['order', 'recent', 'oldest', 'dueDate', 'priority'])
    .default('order'),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().max(5000).optional().default(''),
  mmdContent: z.string().max(20000).optional().default(''),
  taskType: taskTypeSchema.default('FEATURE'),
  status: taskStatusSchema.default('TODO'),
  priority: taskPrioritySchema.default('MEDIUM'),
  scope: taskScopeSchema.default('TEAM'),
  visibility: taskVisibilitySchema.optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export const updateTaskSchema = createTaskSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
});

export const updateTaskPrioritySchema = z.object({
  priority: taskPrioritySchema,
});

export const updateTaskAssigneeSchema = z.object({
  assigneeId: z.string().nullable(),
});

export const reorderTasksSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        orderIdx: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const taskIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export const createChecklistSchema = z.object({
  content: z.string().trim().min(1).max(300),
  orderIdx: z.number().int().min(0).optional(),
});

export const updateChecklistSchema = z
  .object({
    content: z.string().trim().min(1).max(300).optional(),
    completed: z.boolean().optional(),
    orderIdx: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const createCommentSchema = updateCommentSchema;

export const createAttachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(256),
  fileUrl: z.string().url().max(2048),
  contentType: z.string().trim().min(1).max(128),
  fileSize: z.number().int().min(0).default(0),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
