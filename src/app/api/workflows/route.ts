import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/supabase/services'
// import { createWorkflowSchema } from '@/lib/validations'
import { createWorkflowSchema } from '@/lib/validations/workflow.schema'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organizations with better error handling
    const { data: memberships, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)

    if (membershipError) {
      console.error('Membership error:', membershipError)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Use the first organization (or could use a query param to specify)
    const organizationId = memberships[0].organization_id

    const searchParams = request.nextUrl.searchParams
    const params = {
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
    }

    const service = new WorkflowService(supabase)
    const offset = (params.page - 1) * params.limit

    const workflows = await service.findByOrganization(organizationId, {
      limit: params.limit,
      offset,
    })

    const total = await service.count({ organization_id: organizationId })

    return NextResponse.json({
      workflows: workflows || [],
      pagination: {
        page: params.page,
        limit: params.limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / params.limit),
      },
    })
  } catch (error: any) {
    console.error('Error in workflows API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createWorkflowSchema.parse(body)

    // Get user's organizations
    const { data: memberships, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)

    if (membershipError || !memberships || memberships.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const membership = memberships[0]

    // Check if user has permission to create workflows
    if (membership.role === 'viewer') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const service = new WorkflowService(supabase)
    const workflow = await service.create({
      ...validatedData,
      organization_id: membership.organization_id,
      created_by: user.id,
      status: (validatedData as any).status || 'draft',
    })

    return NextResponse.json(workflow, { status: 201 })
  } catch (error: any) {
    console.error('Error creating workflow:', error)
    
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