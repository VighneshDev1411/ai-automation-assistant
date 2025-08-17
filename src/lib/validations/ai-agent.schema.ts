import * as z from 'zod'

const modelTypes = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
] as const

const agentTypes = ['conversational', 'analytical', 'task', 'custom'] as const

const toolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()),
  required: z.boolean().default(false),
})

export const createAIAgentSchema = z.object({
  name: z.string()
    .min(2, 'Agent name must be at least 2 characters')
    .max(100, 'Agent name must be less than 100 characters'),
  type: z.enum(agentTypes),
  model: z.enum(modelTypes),
  prompt_template: z.string().max(2000).optional(),
  system_prompt: z.string().max(2000),
  parameters: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    max_tokens: z.number().min(1).max(4000).default(1000),
    top_p: z.number().min(0).max(1).default(1),
    frequency_penalty: z.number().min(-2).max(2).default(0),
    presence_penalty: z.number().min(-2).max(2).default(0),
  }).optional(),
  tools: z.array(toolSchema).optional(),
  knowledge_base_ids: z.array(z.string().uuid()).optional(),
})

export const updateAIAgentSchema = createAIAgentSchema.partial().extend({
  is_active: z.boolean().optional(),
})
