import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAIAgentSchema } from '@/lib/validations/ai-agent.schema'
import { AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/supabase-test'
import { RetryManager } from '@/lib/workflow-engine/core/RetryManager'
import { error } from 'console'

// GET /api/ai-agents - to list all agents for organization

export const GET = async () => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: AuthError,
    } = await supabase.auth.getUser()
    if (AuthError || !user) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      )
    }

    // Fetching the AI agents for the organization
    const { data: agents, error } = await supabase
      .from('ai_agents')
      .select(
        `
        id,
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
      `
      )
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      )
    }
    const transformedAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      model: agent.model,
      description: agent.system_prompt?.substring(0, 100) + '...' || '',
      isActive: agent.is_active,
      createdAt: agent.created_at,
      lastUsed: agent.updated_at, // Use updated_at as proxy for last used
      usage: {
        totalRequests: agent.usage_stats?.total_requests || 0,
        totalTokens: agent.usage_stats?.total_tokens || 0,
        totalCost: agent.usage_stats?.total_cost || 0,
        averageLatency: agent.usage_stats?.average_latency || 0,
        successRate: agent.usage_stats?.success_rate || 100,
      },
      performance: {
        responseQuality: agent.usage_stats?.response_quality || 85,
        userSatisfaction: agent.usage_stats?.user_satisfaction || 80,
        efficiency: agent.usage_stats?.efficiency || 90,
      },
      tags: agent.parameters?.tags || [],
      tools: agent.tools || [],
      createdBy:
        agent.profiles && agent.profiles.length > 0
          ? {
              name: `${agent.profiles[0].first_name} ${agent.profiles[0].last_name}`,
              email: agent.profiles[0].email,
            }
          : null,
    }))

    return NextResponse.json({
      success: true,
      data: transformedAgents,
      count: transformedAgents.length,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST , Now creating a agent

export const POST = async (request: NextRequest) => {
  try {
    const supabase = await createClient()

    // Get current user and organization
    const {
      data: { user },
      error: AuthError,
    } = await supabase.auth.getUser()
    if (AuthError || !user) {
      return NextResponse.json({ error: 'Unauthorized' })
    }

    // Get user's organization

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      )
    }

    // Parsing and then validating the request body

    const body = await request.json()
    const validationResult = createAIAgentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 }
      )
    }
    const agentData = validationResult.data
    // Create agent in database
    const { data: newAgent, error } = await supabase
      .from('ai_agents')
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        name: agentData.name,
        type: agentData.type,
        model: agentData.model,
        prompt_template: agentData.prompt_template,
        system_prompt: agentData.system_prompt,
        parameters: {
          ...agentData.parameters,
          tags: body.tags || [],
        },
        tools: agentData.tools || [],
        knowledge_base_ids: agentData.knowledge_base_ids || [],
        is_active: true,
        usage_stats: {
          total_requests: 0,
          total_tokens: 0,
          total_cost: 0,
          average_latency: 0,
          success_rate: 100,
          response_quality: 85,
          user_satisfaction: 80,
          efficiency: 90,
        },
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: newAgent,
        message: 'AI agent created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
