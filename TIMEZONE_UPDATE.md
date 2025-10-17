# Timezone Update: Chicago/Central Time Support

## Summary

The application now defaults to **America/Chicago (Central Time)** for all scheduled workflows and time-related operations.

## Changes Made

### 1. **UI Components Updated**

#### TriggerNode Component (`src/components/workflow-builder/nodes/TriggerNode.tsx`)
- **Before:** Timezone dropdown defaulted to `UTC`
- **After:** Timezone dropdown now defaults to `America/Chicago`
- Added comprehensive US timezone options:
  - America/Chicago (Central Time) - **DEFAULT**
  - America/New_York (Eastern Time)
  - America/Los_Angeles (Pacific Time)
  - America/Denver (Mountain Time)
  - America/Phoenix (Arizona - no DST)
  - America/Anchorage (Alaska Time)
  - Pacific/Honolulu (Hawaii Time)
- Includes international timezones (UTC, London, Paris, Tokyo, etc.)

### 2. **Backend APIs Updated**

#### Schedule Creation API (`src/app/api/workflows/schedules/route.ts`)
- Updated default timezone in schema: `UTC` → `America/Chicago`
- All new schedules created without explicit timezone will use Chicago time

#### TriggerSystem (`src/lib/workflow-engine/core/TriggerSystem.ts`)
- Updated `scheduleWorkflow()` method default: `UTC` → `America/Chicago`
- Updated `calculateNextRun()` method default: `UTC` → `America/Chicago`
- Ensures consistent timezone handling across the system

#### Cron Executor (`src/app/api/cron/execute-schedules/route.ts`)
- Updated `calculateNextRun()` function default: `UTC` → `America/Chicago`
- Maintains timezone consistency in scheduled executions

### 3. **New Timezone Utility Library**

Created comprehensive timezone utilities (`src/lib/utils/timezone.ts`):

#### Constants:
- `DEFAULT_TIMEZONE = 'America/Chicago'`
- `US_TIMEZONES` - Array of US timezone options with labels
- `INTERNATIONAL_TIMEZONES` - Array of international timezone options
- `ALL_TIMEZONES` - Combined list of all available timezones

#### Helper Functions:
- `getTimezoneLabel(timezone)` - Get friendly timezone name
- `getTimezoneAbbr(timezone)` - Get timezone abbreviation (CT, ET, PT, etc.)
- `formatDateInTimezone(date, timezone)` - Format dates in specific timezone
- `getCurrentTimeInTimezone(timezone)` - Get current time in timezone
- `parseTimeInTimezone(timeString, timezone)` - Parse time in timezone
- `observesDST(timezone)` - Check if timezone uses Daylight Saving Time
- `isValidTimezone(timezone)` - Validate timezone string
- `getUserTimezone()` - Get user's browser timezone
- `formatCronWithTimezone(cron, timezone)` - Format cron with timezone info

#### Chicago-Specific Examples:
```typescript
export const CHICAGO_CRON_EXAMPLES = [
  { expression: '0 9 * * 1-5', description: 'Weekdays at 9:00 AM CT' },
  { expression: '30 17 * * *', description: 'Daily at 5:30 PM CT' },
  { expression: '0 8 * * *', description: 'Daily at 8:00 AM CT' },
  // ... more examples
]
```

### 4. **Configuration Files**

#### Environment Variables (`.env.example`)
```bash
# Timezone Configuration
DEFAULT_TIMEZONE=America/Chicago
```

#### Documentation Updates
- `CRON_SETUP.md` - Added comprehensive timezone section
- `TIMEZONE_UPDATE.md` - This file (migration guide)

## Usage Examples

### Creating a Schedule (7:48 AM Chicago Time)

**Via UI:**
1. Open Trigger Node configuration
2. Select "Schedule" trigger type
3. Enter cron expression: `48 7 * * *`
4. Select timezone: `America/Chicago` (default)
5. The workflow will execute at 7:48 AM Central Time every day

**Via API:**
```typescript
POST /api/workflows/schedules
{
  "workflowId": "uuid-here",
  "cron": "48 7 * * *",
  "timezone": "America/Chicago"  // Optional, defaults to Chicago
}
```

### Common Chicago Time Schedules

| Description | Cron Expression | Time (CT) |
|-------------|----------------|-----------|
| Morning standup | `0 9 * * 1-5` | 9:00 AM weekdays |
| Lunch reminder | `30 12 * * *` | 12:30 PM daily |
| End of day report | `0 17 * * 1-5` | 5:00 PM weekdays |
| Your current schedule | `48 7 * * *` | 7:48 AM daily |
| Midnight batch | `0 0 * * *` | 12:00 AM daily |

### Using Timezone Utilities

```typescript
import {
  DEFAULT_TIMEZONE,
  formatDateInTimezone,
  CHICAGO_CRON_EXAMPLES
} from '@/lib/utils/timezone'

// Format a date in Chicago time
const chicagoTime = formatDateInTimezone(new Date(), 'America/Chicago')
// Output: "Jan 17, 2025, 07:48 AM"

// Get current time in Chicago
const now = getCurrentTimeInTimezone('America/Chicago')

// Validate timezone
if (isValidTimezone('America/Chicago')) {
  // Timezone is valid
}
```

## Migration Guide

### For Existing Schedules

Existing schedules in the database with `timezone = 'UTC'` will continue to work as-is. To update them to Chicago time:

```sql
-- Update all UTC schedules to Chicago time
UPDATE workflow_schedules
SET timezone = 'America/Chicago'
WHERE timezone = 'UTC';

-- Recalculate next_run_at for updated schedules
-- (The cron job will automatically update these on next run)
```

### For Developers

If you're creating schedules programmatically:

**Before:**
```typescript
await triggerSystem.scheduleWorkflow(workflowId, {
  cron: '0 9 * * *',
  timezone: 'UTC'  // Was required
})
```

**After:**
```typescript
await triggerSystem.scheduleWorkflow(workflowId, {
  cron: '0 9 * * *'
  // timezone defaults to 'America/Chicago', or specify explicitly
})
```

## Daylight Saving Time (DST)

Chicago observes Daylight Saving Time:
- **CST (Central Standard Time):** UTC-6 (November - March)
- **CDT (Central Daylight Time):** UTC-5 (March - November)

The system automatically handles DST transitions:
- When DST starts (spring forward), 2:00 AM becomes 3:00 AM
- When DST ends (fall back), 2:00 AM occurs twice

The `cron-parser` library handles these edge cases correctly.

## Testing

### Test Your Schedule Locally

```bash
# Start the dev server
npm run dev

# In another terminal, manually trigger the cron
curl http://localhost:3000/api/cron/execute-schedules

# Check the logs for execution
```

### Test Timezone Conversion

```typescript
// In browser console or Node REPL
const date = new Date('2025-01-17T13:48:00Z')  // UTC time
console.log(date.toLocaleString('en-US', {
  timeZone: 'America/Chicago'
}))
// Output: "1/17/2025, 7:48:00 AM"
```

## Troubleshooting

### Schedule Runs at Wrong Time

**Problem:** Schedule executes at the wrong local time

**Solution:**
1. Check the `timezone` field in the `workflow_schedules` table
2. Ensure cron expression is correct for your intended time
3. Remember: cron expression is in the **specified timezone**, not UTC

### DST Transition Issues

**Problem:** Schedule doesn't run during DST transition

**Solution:**
- Avoid scheduling at 2:00 AM during DST transitions
- Use 1:00 AM or 3:00 AM instead
- The system handles most edge cases automatically

### Timezone Not Available

**Problem:** Desired timezone not in dropdown

**Solution:**
1. Add to `US_TIMEZONES` or `INTERNATIONAL_TIMEZONES` in `src/lib/utils/timezone.ts`
2. Use IANA timezone format (e.g., `America/Chicago`, not `CST`)
3. Verify timezone name at: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

## Benefits

✅ **User-Friendly:** Schedules in local Chicago time, not UTC
✅ **Consistent:** Default timezone across entire application
✅ **Flexible:** Easy to change per-schedule or globally
✅ **DST-Aware:** Automatic handling of Daylight Saving Time
✅ **Well-Documented:** Comprehensive utilities and examples
✅ **Production-Ready:** Tested and deployed to Vercel

## Related Files

- `src/components/workflow-builder/nodes/TriggerNode.tsx` - UI component
- `src/app/components/workflow-builder/NodeInspector.tsx` - Configuration panel
- `src/app/api/workflows/schedules/route.ts` - Schedule API
- `src/lib/workflow-engine/core/TriggerSystem.ts` - Core scheduling logic
- `src/app/api/cron/execute-schedules/route.ts` - Cron executor
- `src/lib/utils/timezone.ts` - Timezone utilities (NEW)
- `.env.example` - Environment configuration
- `CRON_SETUP.md` - Cron documentation

## Support

For questions or issues related to timezone configuration:
1. Check `CRON_SETUP.md` for setup instructions
2. Review `src/lib/utils/timezone.ts` for available utilities
3. Test locally using `curl http://localhost:3000/api/cron/execute-schedules`
4. Check Vercel logs for production issues

## Future Enhancements

Potential improvements for consideration:
- [ ] Auto-detect user's browser timezone
- [ ] Timezone picker with search functionality
- [ ] Visual timezone converter in UI
- [ ] Schedule preview showing next 5 execution times
- [ ] Timezone-aware schedule history/logs
- [ ] Multi-timezone team support
