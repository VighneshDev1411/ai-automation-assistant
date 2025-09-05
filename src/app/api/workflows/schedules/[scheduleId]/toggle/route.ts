import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TriggerSystem } from '@/lib/workflow-engine/core/TriggerSystem'

// ✅ FIXED: Correct type for Next.js 15
interface RouteContext {
  params: Promise<{ scheduleId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { scheduleId } = params
    
    // Get the desired status from request body (optional)
    const body = await request.json().catch(() => ({}))
    const { enabled } = body  // true/false or undefined for auto-toggle

    // Get current schedule
    const { data: schedule, error } = await supabase
      .from('workflow_schedules')
      .select('id, status, workflows:workflows!inner(id, organization_id)')
      .eq('id', scheduleId)
      .single()

    if (error || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Check access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq(
        'organization_id',
        Array.isArray(schedule.workflows)
          ? schedule.workflows[0]?.organization_id
          : (schedule.workflows as { organization_id: string } | undefined)?.organization_id
      )
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Determine new status
    let newStatus: string
    if (enabled !== undefined) {
      // Use provided status
      newStatus = enabled ? 'active' : 'inactive'
    } else {
      // Auto-toggle
      newStatus = schedule.status === 'active' ? 'inactive' : 'active'
    }

    // Update schedule directly
    const { error: updateError } = await supabase
      .from('workflow_schedules')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduleId)

    if (updateError) {
      throw new Error(`Failed to update schedule: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      scheduleId,
      previousStatus: schedule.status,
      newStatus,
      message: `Schedule ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
    })

  } catch (error) {
    console.error('Error toggling schedule:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// Add runtime configuration
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'