// src/app/api/admin/queues/[queueName]/route.ts
/**
 * Queue Detail API
 * Get detailed information about a specific queue
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getRecentJobs,
  retryJob,
  removeJob,
  QueueName,
  QUEUE_NAMES,
} from '@/lib/queue/queue-manager'

// GET /api/admin/queues/[queueName] - Get queue details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queueName: string }> }
) {
  try {
    const { queueName } = await params
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

    // Validate queue name
    if (!Object.values(QUEUE_NAMES).includes(queueName as QueueName)) {
      return NextResponse.json({ error: 'Invalid queue name' }, { status: 400 })
    }

    // Get recent jobs
    const jobs = await getRecentJobs(queueName as QueueName, 100)

    return NextResponse.json({
      queueName,
      jobs: {
        waiting: jobs.waiting.map((j) => ({
          id: j.id,
          name: j.name,
          data: j.data,
          timestamp: j.timestamp,
        })),
        active: jobs.active.map((j) => ({
          id: j.id,
          name: j.name,
          data: j.data,
          timestamp: j.timestamp,
          progress: j.progress,
        })),
        completed: jobs.completed.map((j) => ({
          id: j.id,
          name: j.name,
          data: j.data,
          returnvalue: j.returnvalue,
          finishedOn: j.finishedOn,
        })),
        failed: jobs.failed.map((j) => ({
          id: j.id,
          name: j.name,
          data: j.data,
          failedReason: j.failedReason,
          finishedOn: j.finishedOn,
          attemptsMade: j.attemptsMade,
        })),
      },
    })
  } catch (error) {
    console.error('Error getting queue details:', error)
    return NextResponse.json(
      { error: 'Failed to get queue details' },
      { status: 500 }
    )
  }
}

// POST /api/admin/queues/[queueName] - Perform action on job
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ queueName: string }> }
) {
  try {
    const { queueName } = await params
    const body = await request.json()
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

    // Validate queue name
    if (!Object.values(QUEUE_NAMES).includes(queueName as QueueName)) {
      return NextResponse.json({ error: 'Invalid queue name' }, { status: 400 })
    }

    const { action, jobId } = body

    if (!action || !jobId) {
      return NextResponse.json(
        { error: 'action and jobId are required' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'retry':
        result = await retryJob(queueName as QueueName, jobId)
        break

      case 'remove':
        result = await removeJob(queueName as QueueName, jobId)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: result })
  } catch (error) {
    console.error('Error performing queue action:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}
