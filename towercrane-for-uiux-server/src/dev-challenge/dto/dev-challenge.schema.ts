import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  summary: z.string().max(500).optional(),
  icon: z.string().min(1).max(100).default('Trophy'),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createSectionSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1).max(255),
  summary: z.string().max(500).optional(),
  orderIdx: z.number().int().nonnegative().optional(),
});

export const updateSectionSchema = createSectionSchema.partial();

export const assignmentStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export const assignmentBlockTypeSchema = z.enum(['NOTE', 'MMD', 'CHECKLIST', 'GITHUB', 'FIGMA', 'FILE', 'DBTABLE']);

export const checklistItemSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(500),
});

export const createAssignmentSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().min(1).max(255),
  summary: z.string().max(1000).optional(),
  difficulty: z.string().min(1).max(100).default('BASIC'),
  status: assignmentStatusSchema.default('DRAFT'),
  noteContent: z.string().optional(),
  checklistItems: z.array(checklistItemSchema).default([]),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  summary: z.string().max(1000).optional(),
  difficulty: z.string().min(1).max(100).optional(),
  status: assignmentStatusSchema.optional(),
});

export const createAssignmentBlockSchema = z.object({
  assignmentId: z.string().uuid(),
  blockType: assignmentBlockTypeSchema,
  title: z.string().max(255).optional(),
  content: z.string(),
  orderIdx: z.number().int().nonnegative().optional(),
});

export const updateAssignmentBlockSchema = createAssignmentBlockSchema
  .omit({ assignmentId: true })
  .partial();

const optionalUrlSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)
  .pipe(z.url().optional());

export const createSubmissionSchema = z
  .object({
    assignmentId: z.string().uuid(),
    comment: z.string().max(4000).default(''),
    githubUrl: optionalUrlSchema,
    checkedItems: z.array(z.string()).default([]),
  })
  .refine((data) => data.comment.trim().length > 0 || Boolean(data.githubUrl), {
    message: 'comment or githubUrl is required',
  });

export const updateSubmissionSchema = z
  .object({
    comment: z.string().max(4000).optional(),
    githubUrl: optionalUrlSchema,
    checkedItems: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      data.comment === undefined ||
      data.comment.trim().length > 0 ||
      Boolean(data.githubUrl),
    { message: 'comment or githubUrl is required' },
  );

export const reviewSubmissionSchema = z.object({
  status: z.enum(['SUBMITTED', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED']).optional(),
  adminRating: z.number().int().min(0).max(5).optional(),
  adminFeedback: z.string().max(2000).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type CreateAssignmentBlockInput = z.infer<typeof createAssignmentBlockSchema>;
export type UpdateAssignmentBlockInput = z.infer<typeof updateAssignmentBlockSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
