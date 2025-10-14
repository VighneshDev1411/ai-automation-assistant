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

    // Get user's organization - try multiple approaches
    let organizationId: string | null = null

    // First try: Check profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id) {
      organizationId = profile.organization_id
    } else {
      // Second try: Check organization_members table
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      if (membership?.organization_id) {
        organizationId = membership.organization_id
      }
    }

    // If still no organization found, return empty list instead of error
    if (!organizationId) {
      console.warn('No organization found for user:', user.email)
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No organization found. Please join or create an organization.',
      })
    }

    console.log('User organization:', organizationId) // Debug log

    // Fetching the AI agents for the organization
    const { data: agents, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error fetching agents:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))

      // If table doesn't exist, return empty array
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('ai_agents table does not exist, returning empty array')
        return NextResponse.json({
          success: true,
          data: [],
          message: 'Database table not yet created. Please run migrations.',
        })
      }

      return NextResponse.json(
        { error: 'Failed to fetch agents', details: error.message },
        { status: 500 }
      )
    }

    // If no agents found, return empty array
    if (!agents || agents.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }
    
    // Transform agents data safely
    const transformedAgents = agents.map(agent => {
      try {
        return {
          id: agent.id,
          name: agent.name || 'Unnamed Agent',
          type: agent.type || 'task',
          model: agent.model || 'gpt-3.5-turbo',
          description: agent.system_prompt ? agent.system_prompt.substring(0, 100) + '...' : '',
          systemPrompt: agent.system_prompt || '',
          promptTemplate: agent.prompt_template || '',
          parameters: agent.parameters || {},
          isActive: agent.is_active ?? false,
          createdAt: agent.created_at,
          lastUsed: agent.updated_at,
          usageStats: {
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
          knowledgeBaseIds: agent.knowledge_base_ids || [],
          organizationId: agent.organization_id,
          createdBy: agent.created_by,
        }
      } catch (err) {
        console.error('Error transforming agent:', agent.id, err)
        return null
      }
    }).filter(agent => agent !== null)

    return NextResponse.json({
      success: true,
      data: transformedAgents,
    })

  } catch (error) {
    console.error('API error in GET /api/ai-agents:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
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