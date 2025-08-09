import * as z from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export const searchSchema = z.object({
  q: z.string().optional(),
  filters: z.record(z.any()).optional(),
}).merge(paginationSchema)

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})
