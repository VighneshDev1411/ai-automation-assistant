export class ScheduleBuilder {
  // ✅ Daily schedule at specific time
  static dailyAt(hour: number, minute: number = 0): string {
    if (hour < 0 || hour > 23) throw new Error('Hour must be between 0-23')
    if (minute < 0 || minute > 59) throw new Error('Minute must be between 0-59')
    return `${minute} ${hour} * * *`
  }

  // ✅ FIXED: Add the missing everyMinutes method
  static everyMinutes(minutes: number): string {
    if (minutes <= 0 || minutes > 59) throw new Error('Minutes must be between 1-59')
    return `*/${minutes} * * * *`
  }

  // ✅ Keep the existing everyNMinutes for backward compatibility
  static everyNMinutes(n: number): string {
    if (n <= 0 || n > 59) throw new Error('N must be between 1-59')
    return `*/${n} * * * *`
  }

  // ✅ Business hours (9 AM to 5 PM, Monday to Friday)
  static businessHours(): string {
    return '0 9-17 * * 1-5' // Every hour from 9 AM to 5 PM, Monday to Friday
  }

  // ✅ Weekly schedule on specific day and time
  static weeklyOn(dayOfWeek: number, hour: number = 0, minute: number = 0): string {
    if (dayOfWeek < 0 || dayOfWeek > 6) throw new Error('Day of week must be between 0-6')
    if (hour < 0 || hour > 23) throw new Error('Hour must be between 0-23')
    if (minute < 0 || minute > 59) throw new Error('Minute must be between 0-59')
    return `${minute} ${hour} * * ${dayOfWeek}`
  }

  // ✅ Monthly schedule on specific day
  static monthlyOn(dayOfMonth: number, hour: number = 0, minute: number = 0): string {
    if (dayOfMonth < 1 || dayOfMonth > 31) throw new Error('Day of month must be between 1-31')
    if (hour < 0 || hour > 23) throw new Error('Hour must be between 0-23')
    if (minute < 0 || minute > 59) throw new Error('Minute must be between 0-59')
    return `${minute} ${hour} ${dayOfMonth} * *`
  }

  // ✅ ADD: everySeconds (for testing/short intervals)
  static everySeconds(seconds: number): string {
    if (seconds <= 0 || seconds > 59) throw new Error('Seconds must be between 1-59')
    return `*/${seconds} * * * * *` // 6-field cron for seconds
  }

  // ✅ ADD: everyHours 
  static everyHours(hours: number): string {
    if (hours <= 0 || hours > 23) throw new Error('Hours must be between 1-23')
    return `0 */${hours} * * *`
  }

  // ✅ Every N hours (keeping for compatibility)
  static everyNHours(n: number): string {
    if (n <= 0 || n > 23) throw new Error('N must be between 1-23')
    return `0 */${n} * * *`
  }

  // ✅ Every N days at specific time
  static everyNDays(n: number, hour: number = 0, minute: number = 0): string {
    if (n <= 0) throw new Error('N must be greater than 0')
    if (hour < 0 || hour > 23) throw new Error('Hour must be between 0-23')
    if (minute < 0 || minute > 59) throw new Error('Minute must be between 0-59')
    return `${minute} ${hour} */${n} * *`
  }

  // ✅ On specific weekdays
  static onWeekdays(hour: number = 9, minute: number = 0): string {
    if (hour < 0 || hour > 23) throw new Error('Hour must be between 0-23')
    if (minute < 0 || minute > 59) throw new Error('Minute must be between 0-59')
    return `${minute} ${hour} * * 1-5`
  }

  // ✅ On weekends
  static onWeekends(hour: number = 10, minute: number = 0): string {
    if (hour < 0 || hour > 23) throw new Error('Hour must be between 0-23')
    if (minute < 0 || minute > 59) throw new Error('Minute must be between 0-59')
    return `${minute} ${hour} * * 0,6`
  }

  // ✅ Event-based schedule (for webhooks/triggers)
  static onEvent(eventType: string, debounceMs: number = 0): EventSchedule {
    return {
      type: 'event',
      eventType,
      debounceMs,
      toString: () => `event:${eventType}:${debounceMs}`
    }
  }

  // ✅ Delay-based schedule
  static afterDelay(delayMs: number, triggerEvent?: string): DelaySchedule {
    return {
      type: 'delay',
      delayMs,
      triggerEvent,
      toString: () => `delay:${delayMs}:${triggerEvent || 'immediate'}`
    }
  }

  // ✅ Custom cron expression
  static custom(cronExpression: string): string {
    if (!this.isValidCron(cronExpression)) {
      throw new Error('Invalid cron expression')
    }
    return cronExpression
  }

  // ✅ Common shortcuts
  static hourly(): string {
    return '0 * * * *' // Every hour at minute 0
  }

  static daily(): string {
    return '0 0 * * *' // Every day at midnight
  }

  static weekly(): string {
    return '0 0 * * 0' // Every Sunday at midnight
  }

  static monthly(): string {
    return '0 0 1 * *' // Every 1st of the month at midnight
  }

  static yearly(): string {
    return '0 0 1 1 *' // Every January 1st at midnight
  }

  // ✅ Validate cron expression
  public static isValidCron(cron: string): boolean {
    const cronRegex = /^(\*|[0-9,\-\/\*]+)\s+(\*|[0-9,\-\/\*]+)\s+(\*|[0-9,\-\/\*]+)\s+(\*|[0-9,\-\/\*]+)\s+(\*|[0-9,\-\/\*]+)$/
    return cronRegex.test(cron)
  }

  // ✅ Generate human-readable description
  static describe(cronExpression: string): string {
    // Common patterns with descriptions
    const patterns: { [key: string]: string } = {
      '0 0 * * *': 'Daily at midnight',
      '0 9 * * *': 'Daily at 9:00 AM',
      '0 0 * * 0': 'Weekly on Sunday at midnight',
      '0 0 1 * *': 'Monthly on the 1st at midnight',
      '*/5 * * * *': 'Every 5 minutes',
      '*/10 * * * *': 'Every 10 minutes',
      '*/15 * * * *': 'Every 15 minutes',
      '*/30 * * * *': 'Every 30 minutes',
      '0 */1 * * *': 'Every hour',
      '0 */2 * * *': 'Every 2 hours',
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
      '0 9-17 * * 1-5': 'Hourly during business hours (9 AM - 5 PM, Mon-Fri)',
      '0 9 * * 1-5': 'Daily at 9 AM on weekdays',
      '0 0 * * 1-5': 'Daily at midnight on weekdays',
      '0 0 * * 6,0': 'Daily at midnight on weekends'
    }

    return patterns[cronExpression] || `Custom schedule: ${cronExpression}`
  }

  // ✅ Parse cron expression into components
  static parse(cronExpression: string): CronComponents {
    const parts = cronExpression.trim().split(/\s+/)
    
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression: must have 5 parts')
    }

    return {
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4],
      expression: cronExpression
    }
  }

  // ✅ Build cron from components
  static build(components: Partial<CronComponents>): string {
    const {
      minute = '*',
      hour = '*',
      dayOfMonth = '*',
      month = '*',
      dayOfWeek = '*'
    } = components

    return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`
  }
}

// ✅ Supporting interfaces
export interface EventSchedule {
  type: 'event'
  eventType: string
  debounceMs: number
  toString(): string
}

export interface DelaySchedule {
  type: 'delay'
  delayMs: number
  triggerEvent?: string
  toString(): string
}

export interface CronComponents {
  minute: string
  hour: string
  dayOfMonth: string
  month: string
  dayOfWeek: string
  expression?: string
}

// ✅ Export helper functions
export const scheduleHelpers = {
  // Convert milliseconds to human readable
  msToHuman(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`
    return `${seconds} second${seconds > 1 ? 's' : ''}`
  },

  // Validate schedule string
  isValidSchedule(schedule: string | object): boolean {
    if (typeof schedule === 'string') {
      return ScheduleBuilder.isValidCron(schedule)
    }
    if (typeof schedule === 'object' && schedule !== null) {
      return 'type' in schedule && ['event', 'delay'].includes((schedule as any).type)
    }
    return false
  },

  // Get next execution time (simplified)
  getNextExecution(cronExpression: string): Date {
    // This is a simplified calculation
    // In production, use a proper cron library like 'node-cron' or 'cron-parser'
    const now = new Date()
    const next = new Date(now)
    next.setMinutes(next.getMinutes() + 1) // Simple approximation
    return next
  }
}