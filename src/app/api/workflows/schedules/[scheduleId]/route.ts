import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TriggerSystem } from '@/lib/workflow-engine/core/TriggerSystem'
import { handleApiError } from '@/app/api/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scheduleId } = params

    // Get schedule details
    const { data: schedule, error } = await supabase
      .from('workflow_schedules')
      .select(`
        *,
        workflows!inner(
          id,
          name,
          organization_id
        )
      `)
      .eq('id', scheduleId)
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Check user has access to this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', schedule.workflows[0].organization_id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const triggerSystem = new TriggerSystem(supabase)
    const executionHistory = await triggerSystem.getExecutionHistory(schedule.workflow_id, 10)

    return NextResponse.json({ 
      schedule,
      recentExecutions: executionHistory 
    })

  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scheduleId } = params

    // Verify access before deletion
    const { data: schedule, error } = await supabase
      .from('workflow_schedules')
      .select(`
        id,
        workflows!inner(organization_id)
      `)
      .eq('id', scheduleId)
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Check user has access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', schedule.workflows[0].organization_id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const triggerSystem = new TriggerSystem(supabase)
    await triggerSystem.unscheduleWorkflow(scheduleId)

    return NextResponse.json({ 
      message: 'Schedule deleted successfully' 
    })

  } catch (error) {
    return handleApiError(error)
  }
}