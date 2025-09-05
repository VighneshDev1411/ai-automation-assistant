import z from "zod"

const filterSchema = z.object({
  filters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    field: z.string(),
    operator: z.string(),
    value: z.any(),
    enabled: z.boolean(),
    priority: z.number().optional()
  })),
  context: z.object({
    executionId: z.string(),
    workflowId: z.string(),
    orgId: z.string(),
    userId: z.string(),
    triggerData: z.record(z.string(), z.any()),
    variables: z.record(z.string(),z.any()),
    currentStepIndex: z.number(),
    executionStartTime: z.string()
  }),
  options: z.object({
    stopOnFirstFailure: z.boolean().optional(),
    includeDetails: z.boolean().optional(),
    maxExecutionTime: z.number().optional()
  }).optional()
})
