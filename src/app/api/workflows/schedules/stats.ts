import { ScheduleBuilder } from "@/lib/workflow-engine/scheduling/WorkflowScheduler"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const templates = [
      {
        id: 'daily-report',
        name: 'Daily Report',
        description: 'Generate daily reports at a specific time',
        scheduleType: 'cron',
        schedule: ScheduleBuilder.dailyAt(9, 0),
        timezone: 'America/New_York',
        retryPolicy: {
          maxRetries: 3,
          retryDelayMs: 300000, // 5 minutes
          backoffMultiplier: 2
        }
      },
      {
        id: 'business-hours-processing',
        name: 'Business Hours Processing',
        description: 'Process data every hour during business hours',
        scheduleType: 'cron',
        schedule: ScheduleBuilder.businessHours(),
        timezone: 'America/New_York',
        conditions: [
          {
            id: 'business-day',
            name: 'Business Day Check',
            type: 'time',
            condition: {
              id: 'business-day-condition',
              type: 'custom',
              operator: 'equals',
              value: null,
              customFunction: 'timeBasedCondition',
              metadata: { name: 'Business Day Check' }
            },
            blockExecution: true
          }
        ]
      },
      {
        id: 'weekly-maintenance',
        name: 'Weekly Maintenance',
        description: 'System maintenance every Sunday at 2 AM',
        scheduleType: 'cron',
        schedule: ScheduleBuilder.weeklyOn(0, 2), // Sunday at 2 AM
        timezone: 'UTC',
        maxExecutions: 52 // Once per week for a year
      },
      {
        id: 'monthly-billing',
        name: 'Monthly Billing',
        description: 'Generate monthly bills on the 1st of each month',
        scheduleType: 'cron',
        schedule: ScheduleBuilder.monthlyOn(1, 0), // 1st day at midnight
        timezone: 'UTC',
        retryPolicy: {
          maxRetries: 5,
          retryDelayMs: 3600000, // 1 hour
          backoffMultiplier: 1.5
        }
      },
      {
        id: 'real-time-processing',
        name: 'Real-time Data Processing',
        description: 'Process incoming data every 5 minutes',
        scheduleType: 'interval',
        schedule: ScheduleBuilder.everyNMinutes(5),
        timezone: 'UTC',
        maxExecutions: 1000
      },
      {
        id: 'user-onboarding',
        name: 'User Onboarding',
        description: 'Welcome new users when they register',
        scheduleType: 'event',
        schedule: ScheduleBuilder.onEvent('user.registered', 30000), // 30 second debounce
        timezone: 'UTC'
      },
      {
        id: 'delayed-follow-up',
        name: 'Delayed Follow-up',
        description: 'Follow up with users 24 hours after signup',
        scheduleType: 'delay',
        schedule: ScheduleBuilder.afterDelay(86400000, 'user.registered'), // 24 hours
        timezone: 'UTC'
      },
      {
        id: 'system-backup',
        name: 'System Backup',
        description: 'Daily system backup at 3 AM',
        scheduleType: 'cron',
        schedule: ScheduleBuilder.dailyAt(3, 0),
        timezone: 'UTC',
        conditions: [
          {
            id: 'storage-check',
            name: 'Storage Space Check',
            type: 'system',
            condition: {
              id: 'storage-condition',
              type: 'custom',
              operator: 'equals',
              value: { minimumSpace: '10GB' },
              customFunction: 'checkStorageSpace',
              metadata: { name: 'Storage Space Check' }
            },
            blockExecution: true
          }
        ],
        retryPolicy: {
          maxRetries: 2,
          retryDelayMs: 1800000, // 30 minutes
          backoffMultiplier: 2
        }
      }
    ]

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length
    })

  } catch (error) {
    console.error('Error fetching schedule templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}