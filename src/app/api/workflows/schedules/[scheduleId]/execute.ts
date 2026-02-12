import { getSupabase } from "@/lib/supabase/supabase-test"
import { TriggerSystem } from "@/lib/workflow-engine/core/TriggerSystem"
import { NextRequest, NextResponse } from "next/server"

interface RouteParams {
  params: { scheduleId: string }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const supabase = getSupabase()
  const scheduler = new TriggerSystem(supabase)

  try {
    const { scheduleId } = params
    const body = await request.json()
    const { triggerData, userId } = body

    const { data: schedule, error } = await supabase
      .from('workflow_schedules')
      .select('*, workflows!inner(id, name)')
      .eq('id', scheduleId)
      .single()

    if (error || !schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // ✅ Use existing handleManualTrigger method
    const executionId = await scheduler.handleManualTrigger(
      schedule.workflow_id,
      { ...triggerData, scheduleId },
      userId
    )

    return NextResponse.json({
      success: true,
      execution: { id: executionId, workflowId: schedule.workflow_id },
      message: 'Workflow executed successfully'
    })

  } catch (error) {
    console.error('Error executing workflow:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to execute workflow' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const scheduler = new TriggerSystem(getSupabase())
  
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const status = url.searchParams.get('status')
    const scheduleId = url.searchParams.get('scheduleId')

    // ✅ Use existing getExecutions method
    const executions = await scheduler.getExecutions({
      scheduleId: scheduleId ?? undefined,
      status: status || undefined,
      limit
    })

    const pending = await scheduler.getPendingExecutions()  // ✅ Add await

    return NextResponse.json({
      success: true,
      executions,
      pending,
      count: executions.length,
      pendingCount: pending.length
    })

  } catch (error) {
    console.error('Error fetching executions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch executions' },
      { status: 500 }
    )
  }
}