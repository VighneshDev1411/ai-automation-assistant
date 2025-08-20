import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/supabase/services'
import { executeWorkflowSchema } from '@/lib/validations/workflow.schema'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ Fixed for Next.js 15
) {
  try {
    const { id } = await params // ✅ Await the params promise
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = executeWorkflowSchema.parse({
      workflow_id: id,
      trigger_data: body.trigger_data,
    })

    const service = new WorkflowService(supabase)
    const workflow = await service.findById(id)

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 }) // ✅ Fixed missing return
    }
    
    const { data: hasAccess } = await supabase.rpc(
      'check_organization_membership',
      {
        org_id: workflow.organization_id,
        user_id: user.id,
      }
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (workflow.status !== 'active') {
      return NextResponse.json(
        {
          error: 'Workflow is not active',
        },
        { status: 400 }
      )
    }

    const executionId = await service.executeWorkflow(
      validatedData.workflow_id,
      validatedData.trigger_data
    )

    await supabase.rpc('track_api_usage', {
      service_name: 'workflow_execution',
      endpoint_name: `/workflows/${id}/execute`,
      tokens: 0,
      cost_in_cents: 10, // Example cost
      usage_metadata: { workflow_id: id },
    })

    return NextResponse.json({ execution_id: executionId }, { status: 202 })
  } catch (error: any) {
    console.error('Error executing workflow:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}