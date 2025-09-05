import { supabase } from "@/lib/supabase/supabase-test"
import { TriggerSystem } from "@/lib/workflow-engine/core/TriggerSystem"
import { NextRequest, NextResponse } from "next/server"

// POST /api/workflows/schedules/[scheduleId]/toggle
interface RouteParams {
  params: { scheduleId: string }
}
export async function POST(request: NextRequest, { params }: RouteParams) {
  
  const scheduler = new TriggerSystem(supabase)

  try {
    const { scheduleId } = params
    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled field must be a boolean' },
        { status: 400 }
      )
    }

    const updatedSchedule = await scheduler.toggleSchedule(scheduleId, enabled)

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule,
      message: `Schedule ${enabled ? 'enabled' : 'disabled'} successfully`
    })

  } catch (error) {
    console.error('Error toggling schedule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle schedule' },
      { status: 500 }
    )
  }
}
