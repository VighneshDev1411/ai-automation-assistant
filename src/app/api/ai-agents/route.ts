// src/app/api/ai-agents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAIAgentSchema } from '@/lib/validations/ai-agent.schema'

// GET /api/ai-agents - to list all agents for organization
export const GET = async () => {
  try {
    const supabase = await createClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    if (!user) {
      console.error('No user found')
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    console.log('Authenticated user:', user.email) // Debug log

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 })
    }

    if (!profile?.organization_id) {
      console.error('No organization found for user')
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      )
    }

    console.log('User organization:', profile.organization_id) // Debug log

    // Fetching the AI agents for the organization
    const { data: agents, error } = await supabase
      .from('ai_agents')
      .select(`
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
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch agents' },
        { status: 500 }
      )
    }
    
    // Transform agents data
    const transformedAgents = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      model: agent.model,
      description: agent.system_prompt?.substring(0, 100) + '...' || '',
      isActive: agent.is_active,
      createdAt: agent.created_at,
      lastUsed: agent.updated_at,
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
          ? `${agent.profiles[0].first_name || ''} ${agent.profiles[0].last_name || ''}`.trim() || agent.profiles[0].email
          : 'Unknown',
    }))

    return NextResponse.json({
      success: true,
      data: transformedAgents,
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/ai-agents - Create new agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Fixed: Correct variable name for authError
    const {
      data: { user },
      error: authError, // Fixed: was 'AuthError'
    } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
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

    const body = await request.json()
    
    // Validate input
    const validationResult = createAIAgentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: validationResult.error.flatten()
        },
        { status: 400 }
      )
    }

    const agentData = validationResult.data

    // Create agent
    const { data: newAgent, error } = await supabase
      .from('ai_agents')
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        name: agentData.name,
        type: agentData.type,
        model: agentData.model,
        system_prompt: agentData.system_prompt,
        prompt_template: agentData.prompt_template || '',
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