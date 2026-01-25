// src/app/api/utils/validate-cron/route.ts
/**
 * Cron Validation Utility API
 * Validates cron expressions using simple regex (no external dependencies)
 */

import { NextRequest, NextResponse } from 'next/server'

// Common cron patterns
const CRON_PRESETS: Record<string, string[]> = {
  '* * * * *': ['Every minute'],
  '*/5 * * * *': ['Every 5 minutes'],
  '*/10 * * * *': ['Every 10 minutes'],
  '*/15 * * * *': ['Every 15 minutes'],
  '*/30 * * * *': ['Every 30 minutes'],
  '0 * * * *': ['Every hour'],
  '0 */6 * * *': ['Every 6 hours'],
  '0 0 * * *': ['Every day at midnight'],
  '0 9 * * *': ['Every day at 9:00 AM'],
  '0 17 * * *': ['Every day at 5:00 PM'],
  '0 9 * * 1-5': ['Every weekday at 9:00 AM'],
  '0 9 * * 1': ['Every Monday at 9:00 AM'],
  '0 0 1 * *': ['First day of every month at midnight'],
}

function validateCronExpression(expression: string): { valid: boolean; error?: string } {
  // Remove extra whitespace
  const cleaned = expression.trim().replace(/\s+/g, ' ')
  
  // Split into parts
  const parts = cleaned.split(' ')
  
  // Must have 5 parts (minute hour day month weekday)
  if (parts.length !== 5) {
    return {
      valid: false,
      error: 'Cron expression must have 5 parts: minute hour day month weekday'
    }
  }

  // Validate each part
  const [minute, hour, day, month, weekday] = parts

  // Simple validation rules
  if (!isValidCronPart(minute, 0, 59)) {
    return { valid: false, error: 'Invalid minute value (0-59)' }
  }
  if (!isValidCronPart(hour, 0, 23)) {
    return { valid: false, error: 'Invalid hour value (0-23)' }
  }
  if (!isValidCronPart(day, 1, 31)) {
    return { valid: false, error: 'Invalid day value (1-31)' }
  }
  if (!isValidCronPart(month, 1, 12)) {
    return { valid: false, error: 'Invalid month value (1-12)' }
  }
  if (!isValidCronPart(weekday, 0, 7)) {
    return { valid: false, error: 'Invalid weekday value (0-7, 0 and 7 = Sunday)' }
  }

  return { valid: true }
}

function isValidCronPart(part: string, min: number, max: number): boolean {
  // * means any
  if (part === '*') return true

  // */N means every N
  if (part.startsWith('*/')) {
    const num = parseInt(part.slice(2))
    return !isNaN(num) && num > 0 && num <= max
  }

  // N means specific value
  if (/^\d+$/.test(part)) {
    const num = parseInt(part)
    return num >= min && num <= max
  }

  // N-M means range
  if (/^\d+-\d+$/.test(part)) {
    const [start, end] = part.split('-').map(Number)
    return start >= min && start <= max && end >= min && end <= max && start <= end
  }

  // N,M,O means list
  if (part.includes(',')) {
    const values = part.split(',').map(v => parseInt(v.trim()))
    return values.every(v => !isNaN(v) && v >= min && v <= max)
  }

  return false
}

function generateNextRuns(expression: string): string[] {
  // For common patterns, return approximate times
  const now = new Date()
  const times: string[] = []

  // Simple approximation for common patterns
  if (expression.startsWith('*/')) {
    const minutes = parseInt(expression.split(' ')[0].slice(2))
    for (let i = 1; i <= 5; i++) {
      const next = new Date(now.getTime() + minutes * i * 60000)
      times.push(next.toISOString())
    }
  } else if (CRON_PRESETS[expression]) {
    // Just return some future times
    for (let i = 1; i <= 5; i++) {
      const next = new Date(now.getTime() + i * 60000) // 1 minute intervals for demo
      times.push(next.toISOString())
    }
  } else {
    // Generic future times
    for (let i = 1; i <= 5; i++) {
      const next = new Date(now.getTime() + i * 3600000) // 1 hour intervals
      times.push(next.toISOString())
    }
  }

  return times
}

export async function POST(request: NextRequest) {
  try {
    const { cronExpression } = await request.json()

    if (!cronExpression) {
      return NextResponse.json(
        { valid: false, error: 'Cron expression is required' },
        { status: 400 }
      )
    }

    const validation = validateCronExpression(cronExpression)

    if (!validation.valid) {
      return NextResponse.json(validation, { status: 400 })
    }

    // Generate approximate next run times
    const nextRuns = generateNextRuns(cronExpression)

    return NextResponse.json({
      valid: true,
      nextRuns,
      description: CRON_PRESETS[cronExpression]?.[0] || 'Custom schedule'
    })
  } catch (error: any) {
    console.error('Error validating cron expression:', error)
    return NextResponse.json(
      {
        valid: false,
        error: error.message || 'Invalid cron expression',
      },
      { status: 400 }
    )
  }
}
