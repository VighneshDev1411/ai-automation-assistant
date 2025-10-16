import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get user session
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

    const organizationId = profile?.organization_id

    // Fetch workflows - try by organization_id first, then by created_by as fallback
    let workflows = null
    let workflowsError = null

    if (organizationId) {
      const result = await supabase
        .from('workflows')
        .select('id, status')
        .eq('organization_id', organizationId)

      workflows = result.data
      workflowsError = result.error
    }

    // Fallback: if no workflows found by org, try fetching by user
    if (!workflows || workflows.length === 0) {
      const result = await supabase
        .from('workflows')
        .select('id, status')
        .eq('created_by', user.id)

      workflows = result.data
      workflowsError = result.error
    }

    if (workflowsError) {
      console.error('Error fetching workflows:', workflowsError)
    }

    const totalWorkflows = workflows?.length || 0
    const activeWorkflows = workflows?.filter(w => w.status === 'active').length || 0

    // Fetch executions from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let executions = null
    let executionsError = null

    if (organizationId) {
      const result = await supabase
        .from('workflow_executions')
        .select('id, status')
        .eq('organization_id', organizationId)
        .gte('created_at', today.toISOString())

      executions = result.data
      executionsError = result.error
    }

    // Fallback: try fetching by user_id if available
    if (!executions || executions.length === 0) {
      const result = await supabase
        .from('workflow_executions')
        .select('id, status')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())

      executions = result.data
      executionsError = result.error
    }

    if (executionsError) {
      console.error('Error fetching executions:', executionsError)
    }

    const executionsToday = executions?.length || 0
    const successfulToday = executions?.filter(e => e.status === 'success').length || 0
    const successRate = executionsToday > 0
      ? Math.round((successfulToday / executionsToday) * 100)
      : 0

    return NextResponse.json({
      totalWorkflows,
      activeWorkflows,
      executionsToday,
      successRate,
    })
  } catch (error) {
    console.error('Error in dashboard API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
