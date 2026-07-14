import { z } from 'zod';

export const approvalCategorySchema = z.enum([
  'LEAVE',
  'PURCHASE',
  'TRIP',
  'EXPENSE',
  'PROPOSAL',
]);

export const approvalStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
]);

// 첨부파일 — presign 업로드 후 publicUrl을 저장
export const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(256),
  url: z.string().url(),
  size: z.number().int().nonnegative().optional(),
  contentType: z.string().trim().max(128).optional(),
});

// 품의(자유양식) — Form Builder가 만든 동적 필드
export const formFieldSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1).max(80),
  type: z.enum(['text', 'textarea', 'number', 'date', 'select']),
  value: z.string().max(2000).default(''),
  options: z.array(z.string().max(80)).max(20).optional(),
});

// ── 분류별 구조화 데이터(meta) ──────────────────────────────
export const leaveMetaSchema = z.object({
  kind: z.literal('LEAVE'),
  leaveType: z.enum(['연차', '반차', '병가', '기타']),
  startDate: z.string().trim().min(1), // YYYY-MM-DD
  endDate: z.string().trim().min(1),
  days: z.number().positive().max(365),
});

export const purchaseMetaSchema = z.object({
  kind: z.literal('PURCHASE'),
  itemName: z.string().trim().min(1).max(120),
  quantity: z.number().int().positive().max(100000),
  unitPrice: z.number().nonnegative().max(1_000_000_000),
  amount: z.number().nonnegative().max(1_000_000_000_000),
  attachments: z.array(attachmentSchema).max(10).default([]),
});

export const tripMetaSchema = z.object({
  kind: z.literal('TRIP'),
  destination: z.string().trim().min(1).max(120),
  startDate: z.string().trim().min(1),
  endDate: z.string().trim().min(1),
  estimatedCost: z.number().nonnegative().max(1_000_000_000),
});

export const expenseMetaSchema = z.object({
  kind: z.literal('EXPENSE'),
  useDate: z.string().trim().min(1),
  expenseType: z.enum(['식대', '교통', '숙박', '기타']),
  paymentMethod: z.enum(['개인', '법인카드']),
  amount: z.number().nonnegative().max(1_000_000_000),
  attachments: z.array(attachmentSchema).max(10).default([]),
});

export const proposalMetaSchema = z.object({
  kind: z.literal('PROPOSAL'),
  fields: z.array(formFieldSchema).max(30).default([]),
});

export const approvalMetaSchema = z.discriminatedUnion('kind', [
  leaveMetaSchema,
  purchaseMetaSchema,
  tripMetaSchema,
  expenseMetaSchema,
  proposalMetaSchema,
]);

export const createApprovalSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(3000),
    category: approvalCategorySchema,
    meta: approvalMetaSchema,
    approverIds: z.array(z.string().trim().min(1)).min(1).max(5),
  })
  .superRefine((val, ctx) => {
    // meta.kind가 category와 일치해야 함
    if (val.meta.kind !== val.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meta', 'kind'],
        message: 'meta.kind가 분류와 일치하지 않습니다.',
      });
    }
  });

export const actApprovalSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().trim().max(500).optional().default(''),
});

const draftApproverSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().max(120),
  position: z.string().max(120).nullable(),
});

export const saveApprovalDraftSchema = z.object({
  category: approvalCategorySchema,
  title: z.string().max(120),
  content: z.string().max(3000),
  approvers: z.array(draftApproverSchema).max(5),
  leaveType: z.enum(['연차', '반차', '병가', '기타']),
  leaveStart: z.string().max(20),
  leaveEnd: z.string().max(20),
  itemName: z.string().max(120),
  quantity: z.string().max(20),
  unitPrice: z.string().max(30),
  purchaseFiles: z.array(attachmentSchema).max(10),
  destination: z.string().max(120),
  tripStart: z.string().max(20),
  tripEnd: z.string().max(20),
  estimatedCost: z.string().max(30),
  useDate: z.string().max(20),
  expenseType: z.enum(['식대', '교통', '숙박', '기타']),
  paymentMethod: z.enum(['개인', '법인카드']),
  expenseAmount: z.string().max(30),
  expenseFiles: z.array(attachmentSchema).max(10),
  formFields: z.array(formFieldSchema).max(30),
});

export type ApprovalAttachment = z.infer<typeof attachmentSchema>;
export type ApprovalFormField = z.infer<typeof formFieldSchema>;
export type ApprovalMeta = z.infer<typeof approvalMetaSchema>;
export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
export type ActApprovalInput = z.infer<typeof actApprovalSchema>;
export type SaveApprovalDraftInput = z.infer<typeof saveApprovalDraftSchema>;
