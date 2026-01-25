// src/app/api/workflows/[id]/schedule/route.ts
/**
 * Workflow Schedule API
 * Manage workflow scheduling (create, update, delete, get)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  scheduleWorkflowExecution,
  unscheduleWorkflowExecution,
  getWorkflowSchedule,
  enableScheduledWorkflow,
  disableScheduledWorkflow,
  validateCronExpression,
  describeCronExpression,
  getNextRunTime,
} from '@/lib/queue/workflow-scheduler'

// GET /api/workflows/[id]/schedule - Get workflow schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    // Get schedule
    const schedule = await getWorkflowSchedule(workflowId, membership.organization_id)

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Add human-readable description
    const scheduleWithDetails = {
      ...schedule,
      description_text: describeCronExpression(schedule.cron_expression),
      next_runs: validateCronExpression(schedule.cron_expression).nextRuns,
    }

    return NextResponse.json(scheduleWithDetails)
  } catch (error) {
    console.error('Error getting workflow schedule:', error)
    return NextResponse.json(
      { error: 'Failed to get schedule' },
      { status: 500 }
    )
  }
}

// POST /api/workflows/[id]/schedule - Create or update workflow schedule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    // Validate required fields
    const { cronExpression, timezone = 'UTC', enabled = true, name, description } = body

    if (!cronExpression) {
      return NextResponse.json(
        { error: 'Cron expression is required' },
        { status: 400 }
      )
    }

    // Validate cron expression
    const validation = validateCronExpression(cronExpression)
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid cron expression: ${validation.error}` },
        { status: 400 }
      )
    }

    // Create schedule
    const schedule = await scheduleWorkflowExecution({
      workflowId,
      organizationId: membership.organization_id,
      userId: user.id,
      cronExpression,
      timezone,
      enabled,
      name,
      description,
    })

    return NextResponse.json({
      success: true,
      schedule: {
        ...schedule,
        description_text: describeCronExpression(cronExpression),
        next_runs: validation.nextRuns,
      },
    })
  } catch (error) {
    console.error('Error creating workflow schedule:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create schedule' },
      { status: 500 }
    )
  }
}

// DELETE /api/workflows/[id]/schedule - Delete workflow schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    // Unschedule workflow
    await unscheduleWorkflowExecution(workflowId, membership.organization_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting workflow schedule:', error)
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    )
  }
}

// PATCH /api/workflows/[id]/schedule - Enable/disable schedule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled field is required and must be boolean' },
        { status: 400 }
      )
    }

    if (enabled) {
      await enableScheduledWorkflow(workflowId, membership.organization_id)
    } else {
      await disableScheduledWorkflow(workflowId, membership.organization_id)
    }

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error('Error updating workflow schedule:', error)
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    )
  }
}
