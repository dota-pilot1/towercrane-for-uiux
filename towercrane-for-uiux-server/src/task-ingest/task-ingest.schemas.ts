import { z } from 'zod';
import {
  taskPrioritySchema,
  taskStatusSchema,
  taskTypeSchema,
} from '../tasks/tasks.schemas';

export const publicTaskIngestSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().max(5000).optional().default(''),
  acceptanceCriteria: z.string().max(8000).optional().default(''),
  plan: z.string().max(8000).optional().default(''),
  folderStructure: z.string().max(8000).optional().default(''),
  mmdContent: z.string().max(20000).optional().default(''),
  checklists: z
    .array(z.string().trim().min(1).max(300))
    .max(20)
    .optional()
    .default([]),
  taskType: taskTypeSchema.optional().default('FEATURE'),
  status: taskStatusSchema.optional().default('TODO'),
  priority: taskPrioritySchema.optional().default('MEDIUM'),
  dueDate: z.string().nullable().optional(),
  assigneeEmail: z.string().email().optional(),
  workspaceId: z.string().trim().min(1).optional(),
});

export const publicTaskReviewIngestSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  format: z.enum(['MARKDOWN', 'HTML']).optional().default('MARKDOWN'),
  content: z.string().trim().min(1).max(50000),
});

export type PublicTaskIngestInput = z.infer<typeof publicTaskIngestSchema>;
export type PublicTaskReviewIngestInput = z.infer<
  typeof publicTaskReviewIngestSchema
>;
