import { NextRequest, NextResponse } from "next/server"

interface RouteParams {
  params: { scheduleId: string }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { scheduleId } = params
    const body = await request.json()
    const { triggerData, userId } = body

    const schedule = scheduler.getSchedule(scheduleId)
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      )
    }

    const execution = await scheduler.executeWorkflowNow(
      schedule.workflowId,
      triggerData,
      userId
    )

    return NextResponse.json({
      success: true,
      execution,
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
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const status = url.searchParams.get('status')
    const scheduleId = url.searchParams.get('scheduleId')

    let executions = scheduler.getExecutionHistory(limit)

    // Filter by status if provided
    if (status) {
      executions = executions.filter(e => e.status === status)
    }

    // Filter by schedule ID if provided
    if (scheduleId) {
      executions = executions.filter(e => e.scheduleId === scheduleId)
    }

    const pending = scheduler.getPendingExecutions()

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