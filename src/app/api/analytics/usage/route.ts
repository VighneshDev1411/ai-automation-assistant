import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dateRangeSchema } from '@/lib/validations/common.schema'
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const validatedParams = dateRangeSchema.parse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    })

    // Get user's current organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { data: usage, error } = await supabase.rpc('get_organization_usage', {
      org_id: membership.organization_id,
      start_date: validatedParams.startDate,
      end_date: validatedParams.endDate,
    })

    if (error) throw error

    // Calculate aggregated stats
    const stats = {
      totalExecutions: usage.reduce((sum: number, day: any) => sum + day.workflow_executions, 0),
      totalApiCalls: usage.reduce((sum: number, day: any) => sum + day.api_calls, 0),
      totalCost: usage.reduce((sum: number, day: any) => sum + day.total_cost_cents, 0) / 100,
      totalTokens: usage.reduce((sum: number, day: any) => sum + day.total_tokens, 0),
    }

    return NextResponse.json({
      usage,
      stats,
      period: {
        start: validatedParams.startDate,
        end: validatedParams.endDate,
      },
    })
  } catch (error: any) {
    console.error('Error fetching usage analytics:', error)
    
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