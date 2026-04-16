import { z } from 'zod'

export const filterSchema = z.object({
  keyword: z.string().max(40),
  team: z.string(),
  status: z.enum(['all', 'ready', 'review', 'issued', 'hold']),
  minAmount: z.number().min(0).max(5000000),
})

export type FilterFormValues = z.infer<typeof filterSchema>
