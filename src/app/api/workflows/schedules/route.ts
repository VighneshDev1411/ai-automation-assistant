import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TriggerSystem } from '@/lib/workflow-engine/core/TriggerSystem'
import { handleApiError } from '@/app/api/utils'
import { z } from 'zod'

const scheduleQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  limit: z.coerce.number().min(1).max(100).default(20)
})

const createScheduleSchema = z.object({
  workflowId: z.string().uuid(),
  cron: z.string().min(1),
  timezone: z.string().default('America/Chicago'),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
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
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = scheduleQuerySchema.parse({
      organizationId: membership.organization_id,
      status: searchParams.get('status'),
      limit: searchParams.get('limit')
    })

    const triggerSystem = new TriggerSystem(supabase)
    const schedules = await triggerSystem.getScheduledWorkflows(membership.organization_id)

    return NextResponse.json({ schedules })

  } catch (error) {
    return handleApiError(error)
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
    const scheduleData = createScheduleSchema.parse(body)

    // Validate workflow exists and user has access
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, organization_id')
      .eq('id', scheduleData.workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Check user belongs to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', workflow.organization_id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const triggerSystem = new TriggerSystem(supabase)
    const scheduleId = await triggerSystem.scheduleWorkflow(scheduleData.workflowId, {
      cron: scheduleData.cron,
      timezone: scheduleData.timezone,
      startDate: scheduleData.startDate,
      endDate: scheduleData.endDate
    })

    return NextResponse.json({ 
      message: 'Workflow scheduled successfully',
      scheduleId 
    })

  } catch (error) {
    return handleApiError(error)
  }
}