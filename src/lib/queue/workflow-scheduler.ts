// src/lib/queue/workflow-scheduler.ts
/**
 * Workflow Scheduler
 * Manages scheduled workflow executions with cron expressions and timezone support
 */

import { createClient } from '@/lib/supabase/server'
import { scheduleWorkflow, unscheduleWorkflow, getScheduledWorkflows } from './queue-manager'

// Dynamic import for cron-parser to avoid webpack issues
const getCronParser = () => {
  if (typeof window === 'undefined') {
    // Server-side only
    return require('cron-parser')
  }
  return null
}

export interface ScheduleConfig {
  workflowId: string
  organizationId: string
  userId: string
  cronExpression: string
  timezone: string
  enabled: boolean
  name?: string
  description?: string
}

/**
 * Validate cron expression
 */
export function validateCronExpression(cronExpression: string): {
  valid: boolean
  error?: string
  nextRuns?: Date[]
} {
  try {
    // Use require for better compatibility in worker context
    const cronParser = typeof window === 'undefined' ? require('cron-parser') : null
    if (!cronParser) {
      throw new Error('cron-parser not available')
    }
    
    const interval = cronParser.parseExpression(cronExpression, {
      tz: 'UTC',
    })

    // Get next 5 runs to show user
    const nextRuns: Date[] = []
    for (let i = 0; i < 5; i++) {
      nextRuns.push(interval.next().toDate())
    }

    return {
      valid: true,
      nextRuns,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid cron expression',
    }
  }
}

/**
 * Get next run time for a cron expression
 */
export function getNextRunTime(
  cronExpression: string,
  timezone: string = 'UTC'
): Date | null {
  try {
    // Try to use cron-parser if available
    const cronParser = typeof window === 'undefined' ? require('cron-parser') : null
    if (!cronParser) {
      return null
    }
    
    const interval = cronParser.parseExpression(cronExpression, {
      tz: timezone,
    })
    return interval.next().toDate()
  } catch (error) {
    // Silent fail - not critical for workflow execution
    return null
  }
}

/**
 * Get human-readable description of cron expression
 */
export function describeCronExpression(cronExpression: string): string {
  const descriptions: Record<string, string> = {
    '* * * * *': 'Every minute',
    '*/5 * * * *': 'Every 5 minutes',
    '*/10 * * * *': 'Every 10 minutes',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 * * * *': 'Every hour',
    '0 */2 * * *': 'Every 2 hours',
    '0 */4 * * *': 'Every 4 hours',
    '0 */6 * * *': 'Every 6 hours',
    '0 */12 * * *': 'Every 12 hours',
    '0 0 * * *': 'Every day at midnight',
    '0 9 * * *': 'Every day at 9:00 AM',
    '0 12 * * *': 'Every day at noon',
    '0 17 * * *': 'Every day at 5:00 PM',
    '0 0 * * 0': 'Every Sunday at midnight',
    '0 0 * * 1': 'Every Monday at midnight',
    '0 0 * * 1-5': 'Every weekday at midnight',
    '0 9 * * 1-5': 'Every weekday at 9:00 AM',
    '0 0 1 * *': 'First day of every month at midnight',
    '0 0 1 1 *': 'Every January 1st at midnight',
  }

  return descriptions[cronExpression] || 'Custom schedule'
}

/**
 * Schedule a workflow with cron expression
 */
export async function scheduleWorkflowExecution(config: ScheduleConfig) {
  const supabase = await createClient()

  // Validate cron expression
  const validation = validateCronExpression(config.cronExpression)
  if (!validation.valid) {
    throw new Error(`Invalid cron expression: ${validation.error}`)
  }

  try {
    // Check if workflow exists and user has access
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, name, organization_id, status')
      .eq('id', config.workflowId)
      .single()

    if (workflowError || !workflow) {
      throw new Error('Workflow not found')
    }

    // Check organization access
    if (workflow.organization_id !== config.organizationId) {
      throw new Error('Access denied')
    }

    // Create schedule record in database
    const { data: schedule, error: scheduleError } = await supabase
      .from('workflow_schedules')
      .upsert({
        workflow_id: config.workflowId,
        organization_id: config.organizationId,
        created_by: config.userId,
        cron_expression: config.cronExpression,
        timezone: config.timezone,
        enabled: config.enabled,
        name: config.name || workflow.name,
        description: config.description,
        next_run_at: getNextRunTime(config.cronExpression, config.timezone)?.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'workflow_id',
      })
      .select()
      .single()

    if (scheduleError) {
      throw new Error(`Failed to create schedule: ${scheduleError.message}`)
    }

    // If enabled, schedule in job queue
    if (config.enabled) {
      await scheduleWorkflow(
        config.workflowId,
        config.cronExpression,
        {
          organizationId: config.organizationId,
          userId: config.userId,
          triggerData: {
            trigger_type: 'schedule',
            scheduled_at: new Date().toISOString(),
          },
          source: 'scheduled',
        },
        config.timezone
      )
    }

    console.log(`✅ Workflow scheduled: ${config.workflowId}`)
    return schedule
  } catch (error) {
    console.error('Error scheduling workflow:', error)
    throw error
  }
}

/**
 * Unschedule a workflow
 */
export async function unscheduleWorkflowExecution(
  workflowId: string,
  organizationId: string
) {
  const supabase = await createClient()

  try {
    // Remove from job queue
    await unscheduleWorkflow(workflowId)

    // Update database record
    const { error } = await supabase
      .from('workflow_schedules')
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('workflow_id', workflowId)
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to unschedule workflow: ${error.message}`)
    }

    console.log(`✅ Workflow unscheduled: ${workflowId}`)
    return true
  } catch (error) {
    console.error('Error unscheduling workflow:', error)
    throw error
  }
}

/**
 * Enable a scheduled workflow
 */
export async function enableScheduledWorkflow(
  workflowId: string,
  organizationId: string
) {
  const supabase = await createClient()

  try {
    // Get schedule config
    const { data: schedule, error: scheduleError } = await supabase
      .from('workflow_schedules')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('organization_id', organizationId)
      .single()

    if (scheduleError || !schedule) {
      throw new Error('Schedule not found')
    }

    // Schedule in job queue
    await scheduleWorkflow(
      workflowId,
      schedule.cron_expression,
      {
        organizationId,
        userId: schedule.created_by,
        triggerData: {
          trigger_type: 'schedule',
          scheduled_at: new Date().toISOString(),
        },
        source: 'scheduled',
      },
      schedule.timezone
    )

    // Update database
    const { error } = await supabase
      .from('workflow_schedules')
      .update({
        enabled: true,
        next_run_at: getNextRunTime(schedule.cron_expression, schedule.timezone)?.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('workflow_id', workflowId)
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Failed to enable schedule: ${error.message}`)
    }

    console.log(`✅ Schedule enabled: ${workflowId}`)
    return true
  } catch (error) {
    console.error('Error enabling schedule:', error)
    throw error
  }
}

/**
 * Disable a scheduled workflow
 */
export async function disableScheduledWorkflow(
  workflowId: string,
  organizationId: string
) {
  return await unscheduleWorkflowExecution(workflowId, organizationId)
}

/**
 * Get schedule for a workflow
 */
export async function getWorkflowSchedule(
  workflowId: string,
  organizationId: string,
  supabaseClient?: any // Optional supabase client (for worker context)
) {
  const supabase = supabaseClient || await createClient()

  const { data, error } = await supabase
    .from('workflow_schedules')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    throw new Error(`Failed to get schedule: ${error.message}`)
  }

  return data
}

/**
 * Get all schedules for an organization
 */
export async function getOrganizationSchedules(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workflow_schedules')
    .select(`
      *,
      workflow:workflows (
        id,
        name,
        description,
        status
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get schedules: ${error.message}`)
  }

  return data
}

/**
 * Update schedule next run time (called after execution)
 */
export async function updateScheduleNextRun(
  workflowId: string,
  organizationId: string,
  supabaseClient?: any // Optional supabase client (for worker context)
) {
  const supabase = supabaseClient || await createClient()

  try {
    const schedule = await getWorkflowSchedule(workflowId, organizationId, supabase)

    if (!schedule || !schedule.enabled) {
      return
    }

    const nextRun = getNextRunTime(schedule.cron_expression, schedule.timezone)

    if (nextRun) {
      await supabase
        .from('workflow_schedules')
        .update({
          next_run_at: nextRun.toISOString(),
          last_run_at: new Date().toISOString(),
        })
        .eq('workflow_id', workflowId)
        .eq('organization_id', organizationId)
    } else {
      // Just update last_run_at if we can't calculate next run
      await supabase
        .from('workflow_schedules')
        .update({
          last_run_at: new Date().toISOString(),
        })
        .eq('workflow_id', workflowId)
        .eq('organization_id', organizationId)
    }
  } catch (error) {
    // Silent fail - not critical for workflow execution
  }
}

/**
 * Sync all schedules from database to job queue (on startup)
 */
export async function syncAllSchedules() {
  const supabase = await createClient()

  try {
    console.log('🔄 Syncing all schedules...')

    // Get all enabled schedules
    const { data: schedules, error } = await supabase
      .from('workflow_schedules')
      .select('*')
      .eq('enabled', true)

    if (error) {
      throw new Error(`Failed to fetch schedules: ${error.message}`)
    }

    if (!schedules || schedules.length === 0) {
      console.log('✅ No schedules to sync')
      return
    }

    // Get currently scheduled jobs
    const currentSchedules = await getScheduledWorkflows()
    const currentScheduleIds = new Set(
      currentSchedules.map(s => s.id?.replace('scheduled-', ''))
    )

    // Schedule each workflow
    for (const schedule of schedules) {
      try {
        // Skip if already scheduled
        if (currentScheduleIds.has(schedule.workflow_id)) {
          console.log(`⏭️ Skipping already scheduled workflow: ${schedule.workflow_id}`)
          continue
        }

        await scheduleWorkflow(
          schedule.workflow_id,
          schedule.cron_expression,
          {
            organizationId: schedule.organization_id,
            userId: schedule.created_by,
            triggerData: {
              trigger_type: 'schedule',
              scheduled_at: new Date().toISOString(),
            },
            source: 'scheduled',
          },
          schedule.timezone
        )

        console.log(`✅ Synced schedule: ${schedule.workflow_id}`)
      } catch (error) {
        console.error(`❌ Failed to sync schedule ${schedule.workflow_id}:`, error)
      }
    }

    console.log(`✅ Synced ${schedules.length} schedules`)
  } catch (error) {
    console.error('Error syncing schedules:', error)
    throw error
  }
}
