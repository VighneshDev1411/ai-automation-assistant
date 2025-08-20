import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkflowService } from "@/lib/supabase/services";
import { updateWorkflowSchema } from "@/lib/validations/workflow.schema";

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> } // ✅ Fixed for Next.js 15
) {
  try {
    const { id } = await params // ✅ Await the params promise
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const service = new WorkflowService(supabase)
    const workflow = await service.findById(id)

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const { data: hasAccess } = await supabase.rpc('check_organization_membership', {
      org_id: workflow.organization_id,
      user_id: user.id
    })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(workflow)

  } catch (error: any) {
    console.error("Error fetching workflow: ", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ Fixed for Next.js 15
) {
  try {
    const { id } = await params // ✅ Await the params promise
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateWorkflowSchema.parse(body)

    const service = new WorkflowService(supabase)
    const workflow = await service.findById(id)

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Check if user has permission to update this workflow
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', workflow.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role === 'viewer') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const updatedWorkflow = await service.update(id, validatedData)

    return NextResponse.json(updatedWorkflow)
  } catch (error: any) {
    console.error('Error updating workflow:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ Fixed for Next.js 15
) {
  try {
    const { id } = await params // ✅ Await the params promise
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = new WorkflowService(supabase)
    const workflow = await service.findById(id)

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Check if user has permission to delete this workflow
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', workflow.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role === 'viewer') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Only allow deletion if workflow is not active
    if (workflow.status === 'active') {
      return NextResponse.json(
        { error: 'Cannot delete active workflow. Please pause or archive it first.' },
        { status: 400 }
      )
    }

    await service.delete(id)

    return NextResponse.json({ success: true }, { status: 204 })
  } catch (error: any) {
    console.error('Error deleting workflow:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}