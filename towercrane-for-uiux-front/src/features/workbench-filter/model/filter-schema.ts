import { z } from 'zod'

export const filterSchema = z.object({
  query: z.string().max(60),
  status: z.enum(['all', 'draft', 'building', 'ready']),
  visibility: z.enum(['all', 'public', 'private']),
})

export type FilterFormValues = z.infer<typeof filterSchema>
