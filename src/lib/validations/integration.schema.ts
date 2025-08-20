import * as z from 'zod'

const providers = [
  'google',
  'slack',
  'github',
  'microsoft',
  'notion',
  'discord',
  'stripe',
  'shopify',
  'mailchimp',
  'twilio',
] as const

export const createIntegrationSchema = z.object({
  provider: z.enum(providers),
  settings: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const updateIntegrationSchema = z.object({
  settings: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  status: z.enum(['connected', 'disconnected', 'error', 'pending']).optional(),
})

export const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
  provider: z.enum(providers),
})

// src/lib/validations/ai-agent.schema.ts
