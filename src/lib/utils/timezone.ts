/**
 * Timezone utilities for the AI Automation Platform
 * Default timezone: America/Chicago (Central Time)
 */

export const DEFAULT_TIMEZONE = 'America/Chicago'

/**
 * Common US timezones
 */
export const US_TIMEZONES = [
  { value: 'America/Chicago', label: 'Central Time (Chicago)', abbr: 'CT' },
  { value: 'America/New_York', label: 'Eastern Time (New York)', abbr: 'ET' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)', abbr: 'MT' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', abbr: 'PT' },
  { value: 'America/Phoenix', label: 'Mountain Time - Arizona (Phoenix)', abbr: 'MST' },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)', abbr: 'AKT' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)', abbr: 'HST' },
]

/**
 * International timezones
 */
export const INTERNATIONAL_TIMEZONES = [
  { value: 'UTC', label: 'Coordinated Universal Time', abbr: 'UTC' },
  { value: 'Europe/London', label: 'London', abbr: 'GMT/BST' },
  { value: 'Europe/Paris', label: 'Paris', abbr: 'CET' },
  { value: 'Europe/Berlin', label: 'Berlin', abbr: 'CET' },
  { value: 'Asia/Tokyo', label: 'Tokyo', abbr: 'JST' },
  { value: 'Asia/Shanghai', label: 'Shanghai', abbr: 'CST' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', abbr: 'HKT' },
  { value: 'Asia/Singapore', label: 'Singapore', abbr: 'SGT' },
  { value: 'Asia/Dubai', label: 'Dubai', abbr: 'GST' },
  { value: 'Australia/Sydney', label: 'Sydney', abbr: 'AEDT' },
]

/**
 * All available timezones (US first, then international)
 */
export const ALL_TIMEZONES = [...US_TIMEZONES, ...INTERNATIONAL_TIMEZONES]

/**
 * Get timezone label by value
 */
export function getTimezoneLabel(timezone: string): string {
  const tz = ALL_TIMEZONES.find(t => t.value === timezone)
  return tz ? tz.label : timezone
}

/**
 * Get timezone abbreviation by value
 */
export function getTimezoneAbbr(timezone: string): string {
  const tz = ALL_TIMEZONES.find(t => t.value === timezone)
  return tz ? tz.abbr : timezone
}

/**
 * Convert a date to a specific timezone and format it
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    ...options
  }

  return dateObj.toLocaleString('en-US', defaultOptions)
}

/**
 * Get the current time in a specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string = DEFAULT_TIMEZONE): string {
  return formatDateInTimezone(new Date(), timezone)
}

/**
 * Convert a time string to a specific timezone
 * Example: "09:00" in Chicago time
 */
export function parseTimeInTimezone(
  timeString: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const [hours, minutes] = timeString.split(':').map(Number)

  // Create a date in the specified timezone
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024')
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1')

  const date = new Date(year, month, day, hours, minutes, 0)
  return date
}

/**
 * Get timezone offset in hours
 */
export function getTimezoneOffset(timezone: string = DEFAULT_TIMEZONE): number {
  const date = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  })

  const utcHours = date.getUTCHours()
  const tzHours = parseInt(formatter.format(date))

  return tzHours - utcHours
}

/**
 * Check if a timezone observes daylight saving time
 */
export function observesDST(timezone: string): boolean {
  const jan = new Date(2024, 0, 1)
  const jul = new Date(2024, 6, 1)

  const janOffset = getTimezoneOffsetAt(timezone, jan)
  const julOffset = getTimezoneOffsetAt(timezone, jul)

  return janOffset !== julOffset
}

/**
 * Get timezone offset at a specific date
 */
function getTimezoneOffsetAt(timezone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const tzTime = formatter.format(date)
  const [tzHours, tzMinutes] = tzTime.split(':').map(Number)

  const utcHours = date.getUTCHours()
  const utcMinutes = date.getUTCMinutes()

  return (tzHours * 60 + tzMinutes) - (utcHours * 60 + utcMinutes)
}

/**
 * Format a cron expression with timezone info
 */
export function formatCronWithTimezone(
  cronExpression: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const tzAbbr = getTimezoneAbbr(timezone)
  return `${cronExpression} (${tzAbbr})`
}

/**
 * Common cron expressions for Chicago time
 */
export const CHICAGO_CRON_EXAMPLES = [
  { expression: '0 9 * * 1-5', description: 'Weekdays at 9:00 AM CT' },
  { expression: '30 17 * * *', description: 'Daily at 5:30 PM CT' },
  { expression: '0 8 * * *', description: 'Daily at 8:00 AM CT' },
  { expression: '0 12 * * *', description: 'Daily at 12:00 PM CT' },
  { expression: '0 0 * * *', description: 'Daily at midnight CT' },
  { expression: '0 */2 * * *', description: 'Every 2 hours CT' },
  { expression: '*/15 * * * *', description: 'Every 15 minutes' },
  { expression: '0 9 1 * *', description: 'First of month at 9:00 AM CT' },
]

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get user's local timezone (browser)
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE
}
