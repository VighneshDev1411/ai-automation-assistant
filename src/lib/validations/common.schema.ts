import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { WorkflowService } from '../supabase/services'

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  orderBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc').optional(),
})

// export const searchSchema = z.object({
//   q: z.string().optional(),
//   filters: z.record(z.any()).optional(),
//   page: z.coerce.number().min(1).default(1).optional(),
//   limit: z.coerce.number().min(1).max(100).default(20).optional(),
//   orderBy: z.string().optional(),
//   order: z.enum(['asc', 'desc']).default('desc').optional(),
// })

// import { z } from 'zod'

export const searchSchema = z.object({
  q: z.string().default(''),                       // allow empty
  page: z.coerce.number().int().min(1).default(1), // coerce from string
  limit: z.coerce.number().int().min(1).default(10),
  orderBy: z.string().default('created_at'),
  order: z.enum(['asc','desc']).default('desc'),
})


// Fix 6: Update the API route to handle empty query params
// src/app/api/workflows/route.ts (update the GET handler)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    
    // Parse with defaults
    const params = {
      q: searchParams.get('q') || undefined,
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
      orderBy: searchParams.get('orderBy') || 'created_at',
      order: (searchParams.get('order') || 'desc') as 'asc' | 'desc',
    }

    // Get user's current organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const service = new WorkflowService(supabase)
    const offset = (params.page - 1) * params.limit

    const workflows = await service.findByOrganization(membership.organization_id, {
      limit: params.limit,
      offset,
    })

    const total = await service.count({ organization_id: membership.organization_id })

    return NextResponse.json({
      workflows,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
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