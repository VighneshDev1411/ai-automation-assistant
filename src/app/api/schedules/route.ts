// src/app/api/schedules/route.ts
/**
 * Organization Schedules API
 * Get all schedules for an organization
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrganizationSchedules } from '@/lib/queue/workflow-scheduler'

// GET /api/schedules - Get all schedules for organization
export async function GET(request: NextRequest) {
  try {
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

    // Get all schedules
    const schedules = await getOrganizationSchedules(membership.organization_id)

    return NextResponse.json({ schedules })
  } catch (error) {
    console.error('Error getting schedules:', error)
    return NextResponse.json(
      { error: 'Failed to get schedules' },
      { status: 500 }
    )
  }
}
