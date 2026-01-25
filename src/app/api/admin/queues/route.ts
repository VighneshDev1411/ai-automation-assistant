// src/app/api/admin/queues/route.ts
/**
 * Queue Admin API
 * Monitor and manage job queues (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getQueueCounts,
  getRecentJobs,
  QUEUE_NAMES,
  getScheduledWorkflows,
} from '@/lib/queue/queue-manager'

// GET /api/admin/queues - Get queue statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get queue statistics
    const queueStats = await Promise.all(
      Object.values(QUEUE_NAMES).map(async (queueName) => {
        const counts = await getQueueCounts(queueName)
        return {
          name: queueName,
          ...counts,
        }
      })
    )

    // Get scheduled workflows
    const scheduled = await getScheduledWorkflows()

    return NextResponse.json({
      queues: queueStats,
      scheduled: scheduled.length,
      scheduledJobs: scheduled,
    })
  } catch (error) {
    console.error('Error getting queue stats:', error)
    return NextResponse.json(
      { error: 'Failed to get queue stats' },
      { status: 500 }
    )
  }
}
