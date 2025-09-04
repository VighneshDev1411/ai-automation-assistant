// src/app/api/workflows/schedules/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { WorkflowScheduler, ScheduleBuilder } from '@/lib/workflow-engine/scheduling/WorkflowScheduler'

const scheduleSchema = z.object({
  workflowId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  scheduleType: z.enum(['cron', 'interval', 'delay', 'once', 'event']),
  schedule: z.object({
    type: z.enum(['cron', 'interval', 'delay', 'once', 'event']),
    expression: z.string().optional(),
    intervalMs: z.number().optional(),
    delayMs: z.number().optional(),
    executeAt: z.string().optional(),
    eventName: z.string().optional(),
    debounceMs: z.number().optional()
  }),
  timezone: z.string().default('UTC'),
  enabled: z.boolean().default(true),
  maxExecutions: z.number().optional(),
  conditions: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['time', 'data', 'system', 'custom']),
    condition: z.any(),
    blockExecution: z.boolean()
  })).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10),
    retryDelayMs: z.number().min(1000),
    backoffMultiplier: z.number().min(1).optional(),
    retryConditions: z.array(z.string()).optional()
  }).optional()
})

const updateScheduleSchema = scheduleSchema.partial()

// Initialize scheduler (in real app, this would be a singleton)
const scheduler = new WorkflowScheduler()

// GET /api/workflows/schedules
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const workflowId = url.searchParams.get('workflowId')
    const enabled = url.searchParams.get('enabled')

    let schedules = scheduler.getAllSchedules()

    // Filter by workflow ID if provided
    if (workflowId) {
      schedules = scheduler.getSchedulesByWorkflow(workflowId)
    }

    // Filter by enabled status if provided
    if (enabled !== null) {
      const isEnabled = enabled === 'true'
      schedules = schedules.filter(s => s.enabled === isEnabled)
    }

    // Get statistics
    const stats = scheduler.getStats()

    return NextResponse.json({
      success: true,
      schedules,
      stats,
      count: schedules.length
    })

  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedules' },
      { status: 500 }
    )
  }
}

// POST /api/workflows/schedules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const scheduleData = scheduleSchema.parse(body)

    // Start scheduler if not running
    if (!scheduler['isRunning']) {
      await scheduler.start()
    }

    const schedule = await scheduler.createSchedule(scheduleData)

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Schedule created successfully'
    })

  } catch (error) {
    console.error('Error creating schedule:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create schedule' },
      { status: 500 }
    )
  }
}

// src/app/api/workflows/schedules/[scheduleId]/route.ts


// src/app/api/workflows/schedules/[scheduleId]/toggle/route.ts


// src/app/api/workflows/schedules/[scheduleId]/execute/route.ts

// POST /api/workflows/schedules/[scheduleId]/execute


// src/app/api/workflows/schedules/executions/route.ts

// GET /api/workflows/schedules/executions


// src/app/api/workflows/schedules/templates/route.ts

// GET /api/workflows/schedules/templates


// src/app/api/workflows/schedules/stats/route.ts

// GET /api/workflows/schedules/stats

// src/app/api/workflows/schedules/validate/route.ts

