import { z } from 'zod';

const isoDateTimeSchema = z.string().datetime({ offset: true });

export const listProjectSchedulesQuerySchema = z
  .object({
    from: isoDateTimeSchema,
    to: isoDateTimeSchema,
  })
  .refine((value) => Date.parse(value.from) <= Date.parse(value.to), {
    message: '조회 종료일은 시작일 이후여야 합니다.',
    path: ['to'],
  });

const projectScheduleFieldsSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().max(12000).optional().default(''),
  startAt: isoDateTimeSchema,
  endAt: isoDateTimeSchema.nullable().optional().default(null),
});

export const createProjectScheduleSchema = projectScheduleFieldsSchema.refine(
  (value) =>
    !value.endAt || Date.parse(value.startAt) <= Date.parse(value.endAt),
  {
    message: '종료일은 시작일 이후여야 합니다.',
    path: ['endAt'],
  },
);

export const updateProjectScheduleSchema = projectScheduleFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const reorderProjectSchedulesSchema = z.object({
  scheduleIds: z
    .array(z.string().trim().min(1))
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: '일정 ID가 중복되었습니다.',
    }),
});

export type CreateProjectScheduleInput = z.infer<
  typeof createProjectScheduleSchema
>;
export type UpdateProjectScheduleInput = z.infer<
  typeof updateProjectScheduleSchema
>;
