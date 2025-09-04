import z from "zod"
import { NextRequest, NextResponse } from "next/server"

const validateScheduleSchema = z.object({
  scheduleType: z.enum(['cron', 'interval', 'delay', 'once', 'event']),
  schedule: z.object({
    type: z.enum(['cron', 'interval', 'delay', 'once', 'event']),
    expression: z.string().optional(),
    intervalMs: z.number().optional(),
    delayMs: z.number().optional(),
    executeAt: z.string().optional(),
    eventName: z.string().optional()
  }),
  timezone: z.string()
})

// POST /api/workflows/schedules/validate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scheduleType, schedule, timezone } = validateScheduleSchema.parse(body)

    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      nextExecutions: [] as Date[]
    }

    // Validate based on schedule type
    switch (scheduleType) {
      case 'cron':
        if (!schedule.expression) {
          validation.valid = false
          validation.errors.push('Cron expression is required')
        } else {
          try {
            // Validate cron expression (would use a cron library)
            const cron = require('node-cron')
            if (!cron.validate(schedule.expression)) {
              validation.valid = false
              validation.errors.push('Invalid cron expression')
            } else {
              // Calculate next 5 executions (mock implementation)
              const now = new Date()
              for (let i = 1; i <= 5; i++) {
                validation.nextExecutions.push(new Date(now.getTime() + i * 60 * 60 * 1000))
              }
            }
          } catch (error) {
            validation.valid = false
            validation.errors.push('Error validating cron expression')
          }
        }
        break

      case 'interval':
        if (!schedule.intervalMs || schedule.intervalMs <= 0) {
          validation.valid = false
          validation.errors.push('Interval must be greater than 0')
        } else if (schedule.intervalMs < 60000) {
          validation.warnings.push('Interval less than 1 minute may cause high system load')
        }
        break

      case 'delay':
        if (!schedule.delayMs || schedule.delayMs <= 0) {
          validation.valid = false
          validation.errors.push('Delay must be greater than 0')
        }
        break

      case 'once':
        if (!schedule.executeAt) {
          validation.valid = false
          validation.errors.push('Execution date is required')
        } else {
          const executeDate = new Date(schedule.executeAt)
          if (executeDate <= new Date()) {
            validation.valid = false
            validation.errors.push('Execution date must be in the future')
          }
        }
        break

      case 'event':
        if (!schedule.eventName) {
          validation.valid = false
          validation.errors.push('Event name is required')
        }
        break
    }

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone })
    } catch (error) {
      validation.valid = false
      validation.errors.push(`Invalid timezone: ${timezone}`)
    }

    return NextResponse.json({
      success: true,
      validation
    })

  } catch (error) {
    console.error('Error validating schedule:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to validate schedule' },
      { status: 500 }
    )
  }
}