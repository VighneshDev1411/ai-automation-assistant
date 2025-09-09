import { createClient } from '@/lib/supabase/server'
import { updateAIAgentSchema } from '@/lib/validations/ai-agent.schema'
import { NextRequest, NextResponse } from 'next/server'
type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { params } = context
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Fetch specific agent
    const { data: agent, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: agent })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateAIAgentSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.format(),
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    // Update agent in database
    const { data: updatedAgent, error } = await supabase
      .from('ai_agents')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedAgent,
      message: 'Agent updated successfully',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Check if agent exists and belongs to organization
    const { data: existingAgent, error: checkError } = await supabase
      .from('ai_agents')
      .select('id, name')
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'Failed to verify agent' },
        { status: 500 }
      )
    }

    // Delete agent
    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to delete agent' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Agent "${existingAgent.name}" deleted successfully`,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
