import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TriggerSystem } from '@/lib/workflow-engine/core/TriggerSystem'

// This endpoint should be called by Vercel Cron or a similar scheduler
// Add this to vercel.json as a cron job

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Verify the request is from authorized cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Check if request is from Vercel Cron (has x-vercel-cron header)
    const isVercelCron = request.headers.get('x-vercel-cron')

    // Only check auth if CRON_SECRET is explicitly set in environment
    if (cronSecret && cronSecret !== 'undefined' && cronSecret.trim() !== '') {
      if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        // Allow Vercel Cron even without secret
        if (!isVercelCron) {
          console.error('[CRON] Unauthorized access attempt from non-Vercel source')
          return NextResponse.json({
            error: 'Unauthorized',
            message: 'CRON_SECRET is required for non-Vercel cron requests'
          }, { status: 401 })
        }
      }
      console.log('[CRON] Authorized request via secret')
    } else if (isVercelCron) {
      console.log('[CRON] Vercel Cron request (no CRON_SECRET configured)')
    } else {
      console.log('[CRON] Public access (no CRON_SECRET set) - consider setting CRON_SECRET for security')
    }

    const supabase = await createClient()

    // Get all active schedules that should run now
    const now = new Date()
    const { data: schedules, error } = await supabase
      .from('workflow_schedules')
      .select(`
        id,
        workflow_id,
        cron_expression,
        timezone,
        next_run_at,
        last_run_at,
        workflows!inner(
          id,
          name,
          status,
          created_by
        )
      `)
      .eq('status', 'active')
      .eq('workflows.status', 'active')
      .lte('next_run_at', now.toISOString())

    if (error) {
      console.error('Error fetching schedules:', error)
      return NextResponse.json({
        error: 'Failed to fetch schedules',
        details: error.message
      }, { status: 500 })
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({
        message: 'No schedules due for execution',
        executedCount: 0
      })
    }

    const triggerSystem = new TriggerSystem(supabase)
    const executedSchedules: string[] = []
    const failedSchedules: { id: string; error: string }[] = []

    // Execute each scheduled workflow
    for (const schedule of schedules) {
      try {
        const workflowName = (schedule as any).workflows?.name || 'Unknown'
        console.log(`[CRON] Executing scheduled workflow: ${workflowName} (${schedule.workflow_id})`)

        // Calculate next run time BEFORE executing
        const nextRun = calculateNextRun(schedule.cron_expression, schedule.timezone || 'UTC')

        // Execute the workflow
        await triggerSystem.handleScheduled(schedule.workflow_id, schedule.id)

        // Update schedule with last run and next run
        await supabase
          .from('workflow_schedules')
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRun,
            updated_at: now.toISOString()
          })
          .eq('id', schedule.id)

        console.log(`[CRON] Successfully executed ${workflowName}. Next run: ${nextRun}`)
        executedSchedules.push(schedule.id)

      } catch (error) {
        console.error(`[CRON] Failed to execute schedule ${schedule.id}:`, error)
        failedSchedules.push({
          id: schedule.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const executionTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Cron execution completed',
      executedCount: executedSchedules.length,
      failedCount: failedSchedules.length,
      totalSchedulesChecked: schedules.length,
      executed: executedSchedules,
      failed: failedSchedules,
      executionTimeMs: executionTime,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('[CRON] Execution error:', error)
    const executionTime = Date.now() - startTime

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Calculate next run time based on cron expression
function calculateNextRun(cronExpression: string, timezone: string = 'America/Chicago'): string {
  const cronParser = require('cron-parser')

  try {
    const interval = cronParser.parseExpression(cronExpression, {
      tz: timezone,
      currentDate: new Date()
    })

    const nextDate = interval.next().toDate()
    return nextDate.toISOString()

  } catch (error) {
    console.error('Error parsing cron expression:', error)
    // Fallback: add 24 hours
    const nextRun = new Date()
    nextRun.setHours(nextRun.getHours() + 24)
    return nextRun.toISOString()
  }
}

// Allow POST for manual triggering (optional)
export async function POST(request: NextRequest) {
  return GET(request)
}
