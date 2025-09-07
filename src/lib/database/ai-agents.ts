
import { createClient } from '@/lib/supabase/server'

export interface AIAgentRow {
  id: string
  organization_id: string
  created_by: string
  name: string
  type: string
  model: string
  prompt_template?: string
  system_prompt: string
  parameters: any
  tools: string[]
  knowledge_base_ids: string[]
  is_active: boolean
  usage_stats: any
  created_at: string
  updated_at: string
}

export async function getOrganizationAgents(organizationId: string): Promise<AIAgentRow[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('ai_agents')
    .select(`
      id,
      organization_id,
      name,
      type,
      model,
      prompt_template,
      system_prompt,
      parameters,
      tools,
      knowledge_base_ids,
      is_active,
      usage_stats,
      created_at,
      updated_at,
      created_by,
      profiles!created_by (
        first_name,
        last_name,
        email
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch agents: ${error.message}`)
  }

  return data || []
}

export async function createAgent(
  organizationId: string,
  userId: string,
  agentData: any
): Promise<AIAgentRow> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('ai_agents')
    .insert({
      organization_id: organizationId,
      created_by: userId,
      ...agentData,
      usage_stats: {
        total_requests: 0,
        total_tokens: 0,
        total_cost: 0,
        average_latency: 0,
        success_rate: 100,
        response_quality: 85,
        user_satisfaction: 80,
        efficiency: 90
      }
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create agent: ${error.message}`)
  }

  return data
}

export async function updateAgent(
  agentId: string,
  organizationId: string,
  updateData: any
): Promise<AIAgentRow> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('ai_agents')
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq('id', agentId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update agent: ${error.message}`)
  }

  return data
}

export async function deleteAgent(
  agentId: string,
  organizationId: string
): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', agentId)
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(`Failed to delete agent: ${error.message}`)
  }
}

export async function toggleAgentStatus(
  agentId: string,
  organizationId: string
): Promise<AIAgentRow> {
  const supabase = createClient()
  
  // First get current status
  const { data: currentAgent, error: fetchError } = await supabase
    .from('ai_agents')
    .select('is_active')
    .eq('id', agentId)
    .eq('organization_id', organizationId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch agent: ${fetchError.message}`)
  }

  // Toggle status
  const { data, error } = await supabase
    .from('ai_agents')
    .update({ 
      is_active: !currentAgent.is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', agentId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to toggle agent status: ${error.message}`)
  }

  return data
}

// Usage tracking functions
export async function updateAgentUsage(
  agentId: string,
  organizationId: string,
  usageData: {
    inputTokens: number
    outputTokens: number
    executionTime: number
    cost: number
  }
): Promise<void> {
  const supabase = createClient()
  
  // Use a stored procedure or raw SQL for atomic updates
  const { error } = await supabase.rpc('update_agent_usage_stats', {
    agent_id: agentId,
    organization_id: organizationId,
    input_tokens: usageData.inputTokens,
    output_tokens: usageData.outputTokens,
    execution_time: usageData.executionTime,
    cost: usageData.cost
  })

  if (error) {
    console.error('Failed to update agent usage:', error)
    // Don't throw here as this is non-critical
  }
}