import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/supabase/services'
import { createWorkflowSchema } from '@/lib/validations/workflow.schema'
import { searchSchema } from '@/lib/validations/common.schema'
import { error } from 'console'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const searchParams = request.nextUrl.searchParams

    const validatedParams = searchSchema.parse({
      q: searchParams.get('q'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      orderBy: searchParams.get('orderBy'),
      order: searchParams.get('order'),
    })

    const service = new WorkflowService(supabase)

    const { data: membership } = await supabase
      .from('organization_member')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      )
    }

    const offset = (validatedParams.page - 1) * validatedParams.limit

    const workflows = await service.findByOrganization(
      membership.organization_id,
      {
        limit: validatedParams.limit,
        offset,
      }
    )

    const total = await service.count({
      organization_id: membership.organization_id,
    })

    return NextResponse.json({
      workflows,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        totalPages: Math.ceil(total / validatedParams.limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching workflows:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createWorkflowSchema.parse(body)

    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      )
    }

    if (membership.role === 'viewer') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )

      const service = new WorkflowService(supabase)
      const workflow = await service.create({
        ...validatedData,
        organization_id: membership?.organization_id,
        created_by: user?.id,
        status: 'draft',
      })
      return NextResponse.json(workflow, { status: 201 })
    }
  } catch (error: any) {
    console.error('Error creating workflow: ', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )

      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
