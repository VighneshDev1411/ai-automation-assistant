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

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Fetch total workflows
    const { data: workflows, error: workflowsError } = await supabase
      .from('workflows')
      .select('id, status')
      .eq('organization_id', organizationId)

    const totalWorkflows = workflows?.length || 0
    const activeWorkflows = workflows?.filter(w => w.status === 'active').length || 0

    // Fetch executions from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: executions, error: executionsError } = await supabase
      .from('workflow_executions')
      .select('id, status')
      .eq('organization_id', organizationId)
      .gte('created_at', today.toISOString())

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
