// Supabase Client Configuration
// src/lib/supabase/server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        async get(name: string) {
          return (await cookieStore).get(name)?.value
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            ;(await cookieStore).set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            ;(await cookieStore).set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// src/lib/supabase/client.ts (for client-side usage)

// Updated AI Agent Schema Validation
// src/lib/validations/ai-agent.schema.ts

import * as z from 'zod'

const modelTypes = [
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'claude-3-opus',
  'claude-3-sonnet',
  'claude-3-haiku',
] as const

const agentTypes = ['conversational', 'analytical', 'task', 'custom'] as const

const toolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.string(), z.any()),
  required: z.boolean().default(false),
})

export const createAIAgentSchema = z.object({
  name: z
    .string()
    .min(2, 'Agent name must be at least 2 characters')
    .max(100, 'Agent name must be less than 100 characters'),
  type: z.enum(agentTypes),
  model: z.enum(modelTypes),
  prompt_template: z.string().max(2000).optional(),
  system_prompt: z
    .string()
    .min(10, 'System prompt must be at least 10 characters')
    .max(2000, 'System prompt must be less than 2000 characters'),
  parameters: z
    .object({
      temperature: z.number().min(0).max(2).default(0.7),
      max_tokens: z.number().min(1).max(4000).default(1000),
      top_p: z.number().min(0).max(1).default(1),
      frequency_penalty: z.number().min(-2).max(2).default(0),
      presence_penalty: z.number().min(-2).max(2).default(0),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
  tools: z.array(z.string()).optional(),
  knowledge_base_ids: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
})

export const updateAIAgentSchema = createAIAgentSchema.partial().extend({
  is_active: z.boolean().optional(),
})

// Database Query Helpers
// src/lib/database/ai-agents.ts

// SQL function for atomic usage updates (add to your Supabase migration)
/*
CREATE OR REPLACE FUNCTION update_agent_usage_stats(
  agent_id UUID,
  organization_id UUID,
  input_tokens INTEGER,
  output_tokens INTEGER,
  execution_time INTEGER,
  cost DECIMAL
)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_agents 
  SET 
    usage_stats = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            usage_stats,
            '{total_requests}',
            ((usage_stats->>'total_requests')::INTEGER + 1)::text::jsonb
          ),
          '{total_tokens}',
          ((usage_stats->>'total_tokens')::INTEGER + input_tokens + output_tokens)::text::jsonb
        ),
        '{total_cost}',
        ((usage_stats->>'total_cost')::DECIMAL + cost)::text::jsonb
      ),
      '{average_latency}',
      CASE 
        WHEN (usage_stats->>'total_requests')::INTEGER = 0 THEN execution_time::text::jsonb
        ELSE (((usage_stats->>'average_latency')::INTEGER * (usage_stats->>'total_requests')::INTEGER + execution_time) / ((usage_stats->>'total_requests')::INTEGER + 1))::text::jsonb
      END
    ),
    updated_at = NOW()
  WHERE 
    id = agent_id 
    AND ai_agents.organization_id = update_agent_usage_stats.organization_id;
END;
$$ LANGUAGE plpgsql;
*/
