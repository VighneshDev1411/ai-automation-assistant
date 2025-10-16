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

    // Fetch workflow executions from the database
    const { data: executions, error: executionsError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (executionsError) {
      console.error('Error fetching executions:', executionsError)
      return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 })
    }

    // Calculate statistics
    const totalExecutions = executions?.length || 0
    const successfulExecutions = executions?.filter(e => e.status === 'success').length || 0
    const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0

    // Calculate average duration
    const durations = executions
      ?.filter(e => e.duration_ms)
      .map(e => e.duration_ms) || []

    const avgDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    const avgDuration = avgDurationMs > 0
      ? avgDurationMs > 1000
        ? `${(avgDurationMs / 1000).toFixed(1)}s`
        : `${Math.round(avgDurationMs)}ms`
      : '0s'

    // Count active workflows
    const { data: workflows } = await supabase
      .from('workflows')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    const activeWorkflows = workflows?.length || 0

    // Format recent executions
    const recentExecutions = executions?.slice(0, 10).map(execution => ({
      id: execution.id,
      workflowName: execution.workflow_name || 'Unnamed Workflow',
      status: execution.status || 'unknown',
      startTime: new Date(execution.created_at).toLocaleString(),
      duration: execution.duration_ms
        ? execution.duration_ms > 1000
          ? `${(execution.duration_ms / 1000).toFixed(1)}s`
          : `${execution.duration_ms}ms`
        : 'N/A',
      trigger: execution.trigger_type || 'Manual',
    })) || []

    // Calculate performance by workflow
    const workflowStats = new Map<string, { name: string; total: number; successful: number }>()

    executions?.forEach(execution => {
      const workflowName = execution.workflow_name || 'Unnamed Workflow'
      const stats = workflowStats.get(workflowName) || { name: workflowName, total: 0, successful: 0 }

      stats.total++
      if (execution.status === 'success') {
        stats.successful++
      }

      workflowStats.set(workflowName, stats)
    })

    const performanceByWorkflow = Array.from(workflowStats.values())
      .map(stats => ({
        name: stats.name,
        executions: stats.total,
        successRate: stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.executions - a.executions)
      .slice(0, 10)

    return NextResponse.json({
      totalExecutions,
      successRate,
      avgDuration,
      activeWorkflows,
      recentExecutions,
      performanceByWorkflow,
    })
  } catch (error) {
    console.error('Error in analytics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
