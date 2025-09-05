import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TriggerSystem } from '@/lib/workflow-engine/core/TriggerSystem'
import { handleApiError } from '@/app/api/utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const workflowId = searchParams.get('workflowId')
    const scheduleId = searchParams.get('scheduleId')
    const status = searchParams.get('status')
    const limit = Number(searchParams.get('limit')) || 50

    const triggerSystem = new TriggerSystem(supabase)

    // ✅ FIXED: Added await and proper filter handling
    let executions = await triggerSystem.getExecutions({
      workflowId: workflowId || undefined,
      scheduleId: scheduleId || undefined,
      status: status || undefined,
      limit
    })

    // ✅ FIXED: Added await for getPendingExecutions
    const pending = await triggerSystem.getPendingExecutions()

    return NextResponse.json({
      success: true,
      executions,
      pending,
      count: executions.length,          // ✅ FIXED: Now executions is resolved
      pendingCount: pending.length       // ✅ FIXED: Now pending is resolved
    })

  } catch (error) {
    console.error('Error fetching executions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch executions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { workflowId, triggerData = {} } = body

    // Validate workflow exists
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, organization_id, status')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    if (workflow.status !== 'active') {
      return NextResponse.json({ error: 'Workflow is not active' }, { status: 400 })
    }

    // Check user has access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', workflow.organization_id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Execute workflow
    const triggerSystem = new TriggerSystem(supabase)
    const executionId = await triggerSystem.handleManualTrigger(workflowId, triggerData, user.id)

    return NextResponse.json({
      success: true,
      executionId,
      message: 'Workflow execution started'
    })

  } catch (error) {
    return handleApiError(error)
  }
}
