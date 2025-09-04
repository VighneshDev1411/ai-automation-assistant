import { NextRequest, NextResponse } from "next/server"

interface RouteParams {
  params: { scheduleId: string }
}

// GET /api/workflows/schedules/[scheduleId]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { scheduleId } = params
    const schedule = scheduler.getSchedule(scheduleId)

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      schedule
    })

  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedule' },
      { status: 500 }
    )
  }
}

// PUT /api/workflows/schedules/[scheduleId]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { scheduleId } = params
    const body = await request.json()
    const updates = updateScheduleSchema.parse(body)

    const updatedSchedule = await scheduler.updateSchedule(scheduleId, updates)

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule,
      message: 'Schedule updated successfully'
    })

  } catch (error) {
    console.error('Error updating schedule:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update schedule' },
      { status: 500 }
    )
  }
}

// DELETE /api/workflows/schedules/[scheduleId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { scheduleId } = params
    await scheduler.deleteSchedule(scheduleId)

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}