import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('agentId')
    const status = searchParams.get('status')
    const model = searchParams.get('model')
    const dateFilter = searchParams.get('dateFilter') || '24h'
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build query
    let query = supabase
      .from('ai_execution_logs')
      .select('*')
      .eq('organization_id', membership.organization_id)

    // Apply filters
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (model && model !== 'all') {
      query = query.eq('model', model)
    }

    // Date filter
    const now = new Date()
    const filterDate = new Date()
    switch (dateFilter) {
      case '1h':
        filterDate.setHours(now.getHours() - 1)
        break
      case '24h':
        filterDate.setDate(now.getDate() - 1)
        break
      case '7d':
        filterDate.setDate(now.getDate() - 7)
        break
      case '30d':
        filterDate.setDate(now.getDate() - 30)
        break
    }
    query = query.gte('timestamp', filterDate.toISOString())

    // Execute query
    query = query
      .order('timestamp', { ascending: false })
      .limit(limit)

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching execution logs:', error)
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedLogs = logs?.map(log => ({
      id: log.id,
      agentId: log.agent_id,
      agentName: log.agent_name,
      model: log.model,
      timestamp: new Date(log.timestamp),
      status: log.status,
      duration: log.duration,
      tokensUsed: {
        input: log.tokens_input || 0,
        output: log.tokens_output || 0,
        total: log.tokens_total || 0,
      },
      cost: parseFloat(log.cost || '0'),
      request: {
        prompt: log.request_prompt || '',
        parameters: log.request_parameters || {},
      },
      response: {
        content: log.response_content || '',
        metadata: log.response_metadata || {},
      },
      error: log.error_message,
      sessionId: log.session_id,
      workflowId: log.workflow_id,
      userId: log.user_id,
    })) || []

    return NextResponse.json({ 
      logs: transformedLogs,
      total: transformedLogs.length,
      organizationId: membership.organization_id,
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to create a new execution log
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['agentId', 'agentName', 'model', 'duration', 'tokensUsed', 'cost']
    for (const field of requiredFields) {
      if (body[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Insert execution log
    const { data, error } = await supabase
      .from('ai_execution_logs')
      .insert({
        agent_id: body.agentId,
        agent_name: body.agentName,
        agent_type: body.agentType,
        model: body.model,
        workflow_id: body.workflowId,
        execution_id: body.executionId,
        organization_id: membership.organization_id,
        user_id: user.id,
        status: body.status || 'success',
        duration: body.duration,
        tokens_input: body.tokensUsed.input || 0,
        tokens_output: body.tokensUsed.output || 0,
        tokens_total: body.tokensUsed.total || 0,
        cost: body.cost,
        request_prompt: body.request?.prompt,
        request_parameters: body.request?.parameters || {},
        response_content: body.response?.content,
        response_metadata: body.response?.metadata || {},
        error_message: body.error,
        error_code: body.errorCode,
        session_id: body.sessionId,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating execution log:', error)
      return NextResponse.json({ error: 'Failed to create log' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      log: data,
    }, { status: 201 })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to clear old logs
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const olderThan = searchParams.get('olderThan') || '30d'

    // Calculate cutoff date
    const cutoffDate = new Date()
    switch (olderThan) {
      case '7d':
        cutoffDate.setDate(cutoffDate.getDate() - 7)
        break
      case '30d':
        cutoffDate.setDate(cutoffDate.getDate() - 30)
        break
      case '90d':
        cutoffDate.setDate(cutoffDate.getDate() - 90)
        break
    }

    // Delete old logs
    const { error } = await supabase
      .from('ai_execution_logs')
      .delete()
      .eq('organization_id', membership.organization_id)
      .lt('timestamp', cutoffDate.toISOString())

    if (error) {
      console.error('Error deleting logs:', error)
      return NextResponse.json({ error: 'Failed to delete logs' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Deleted logs older than ${olderThan}`,
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}