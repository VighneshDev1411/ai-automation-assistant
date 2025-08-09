import * as z from 'zod'

const triggerTypes = ['webhook', 'schedule', 'manual', 'email', 'form'] as const
const actionTypes = ['http', 'email', 'database', 'ai', 'transform', 'condition'] as const

const triggerConfigSchema = z.object({
  type: z.enum(triggerTypes),
  config: z.record(z.any()),
})

const actionSchema = z.object({
  id: z.string(),
  type: z.enum(actionTypes),
  name: z.string(),
  config: z.record(z.any()),
  nextActions: z.array(z.string()).optional(),
})

const conditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
  value: z.any(),
  thenAction: z.string().optional(),
  elseAction: z.string().optional(),
})

export const createWorkflowSchema = z.object({
  name: z.string()
    .min(2, 'Workflow name must be at least 2 characters')
    .max(100, 'Workflow name must be less than 100 characters'),
  description: z.string().max(500).optional(),
  trigger_config: triggerConfigSchema,
  actions: z.array(actionSchema).min(1, 'At least one action is required'),
  conditions: z.array(conditionSchema).optional(),
  error_handling: z.object({
    retry_count: z.number().min(0).max(5).default(3),
    retry_delay: z.number().min(0).max(3600).default(60),
    on_failure: z.enum(['stop', 'continue', 'notify']).default('stop'),
  }).optional(),
  schedule_config: z.object({
    cron: z.string().optional(),
    timezone: z.string().default('UTC'),
  }).optional(),
  tags: z.array(z.string()).max(10).optional(),
})

export const updateWorkflowSchema = createWorkflowSchema.partial().extend({
  status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
})

export const executeWorkflowSchema = z.object({
  workflow_id: z.string().uuid('Invalid workflow ID'),
  trigger_data: z.record(z.any()).optional(),
})