# Workflow Scheduler Setup

## Overview

The workflow scheduler automatically executes workflows based on their configured cron expressions. It runs every minute and checks for any scheduled workflows that are due for execution.

## How It Works

1. **Cron Job**: Vercel Cron calls `/api/cron/execute-schedules` every minute
2. **Schedule Check**: The endpoint queries the database for active schedules where `next_run_at <= current_time`
3. **Workflow Execution**: For each due schedule, it triggers the workflow
4. **Next Run Calculation**: After execution, it calculates the next run time using the cron expression
5. **Database Update**: Updates `last_run_at` and `next_run_at` in the database

## Configuration

### Vercel Cron Setup

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/execute-schedules",
      "schedule": "* * * * *"
    }
  ]
}
```

This runs every minute. You can adjust the schedule as needed.

### Environment Variables

Add these environment variables to your Vercel project:

- `CRON_SECRET` (optional): A secret token to secure the cron endpoint
  - Example: `CRON_SECRET=your_random_secret_here`

If set, requests to the cron endpoint must include:
```
Authorization: Bearer your_random_secret_here
```

## Timezone Configuration

**Default Timezone: America/Chicago (Central Time)**

The application defaults to Chicago/Central Time for all scheduled workflows. This can be changed:

### Per-Schedule Timezone

When creating a schedule through your UI:

1. Select timezone from the dropdown (defaults to `America/Chicago`)
2. Enter cron expression in standard format: `minute hour day month dayofweek`

Example for 7:48 AM Chicago time:
- Cron: `48 7 * * *`
- Timezone: `America/Chicago` (selected from dropdown)
- Result: Executes at 7:48 AM Central Time every day

### Available Timezones

**US Timezones:**
- `America/Chicago` - Central Time (Chicago) - **DEFAULT**
- `America/New_York` - Eastern Time (New York)
- `America/Los_Angeles` - Pacific Time (Los Angeles)
- `America/Denver` - Mountain Time (Denver)
- `America/Phoenix` - Mountain Time - Arizona (no DST)
- `America/Anchorage` - Alaska Time
- `Pacific/Honolulu` - Hawaii Time

**International:**
- `UTC` - Coordinated Universal Time
- `Europe/London` - London
- `Europe/Paris` - Paris
- `Asia/Tokyo` - Tokyo
- And more (see `src/lib/utils/timezone.ts`)

### Environment Variable

You can set a global default timezone in `.env`:

```bash
DEFAULT_TIMEZONE=America/Chicago
```

The scheduler will automatically handle:
- Timezone conversion
- Daylight Saving Time (DST) transitions
- Accurate execution times across timezones

## Testing Locally

### 1. Manual Test via API

You can manually trigger the cron job:

```bash
curl http://localhost:3000/api/cron/execute-schedules
```

Or with authentication:

```bash
curl -H "Authorization: Bearer your_secret" http://localhost:3000/api/cron/execute-schedules
```

### 2. Check Schedule Status

Query your schedules to see when they'll run next:

```sql
SELECT
  id,
  workflow_id,
  cron_expression,
  timezone,
  next_run_at,
  last_run_at,
  status
FROM workflow_schedules
WHERE status = 'active';
```

### 3. Create a Test Schedule

Through your UI or directly in the database:

```sql
INSERT INTO workflow_schedules (
  id,
  workflow_id,
  cron_expression,
  timezone,
  next_run_at,
  status
) VALUES (
  gen_random_uuid(),
  'your_workflow_id',
  '*/5 * * * *',  -- Every 5 minutes
  'America/Chicago',
  NOW() + INTERVAL '5 minutes',
  'active'
);
```

## Troubleshooting

### Schedule Not Executing

1. **Check if schedule is active**:
   ```sql
   SELECT * FROM workflow_schedules WHERE id = 'your_schedule_id';
   ```
   Ensure `status = 'active'`

2. **Check next_run_at**:
   - Should be in the past or very close to current time
   - Should be in ISO 8601 format (UTC)

3. **Check workflow status**:
   ```sql
   SELECT * FROM workflows WHERE id = 'your_workflow_id';
   ```
   Ensure the workflow status is `'active'`

4. **Check cron logs** (Vercel Dashboard):
   - Go to your project → Deployments → Logs
   - Filter by `/api/cron/execute-schedules`

5. **Verify timezone**:
   - Use IANA timezone names (e.g., `America/Chicago`, not `CST`)
   - Test with: `console.log(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))`

### Common Issues

**Issue**: "Schedule created but never runs"
- **Solution**: The `next_run_at` might be set incorrectly. Update it manually:
  ```sql
  UPDATE workflow_schedules
  SET next_run_at = NOW()
  WHERE id = 'your_schedule_id';
  ```

**Issue**: "Workflow runs at wrong time"
- **Solution**: Check the timezone setting. Remember:
  - Cron expression is in the specified timezone
  - Database stores `next_run_at` in UTC
  - The cron-parser library handles the conversion

**Issue**: "Cron runs but workflow doesn't execute"
- **Solution**: Check the `workflow_executions` table for errors:
  ```sql
  SELECT * FROM workflow_executions
  WHERE workflow_id = 'your_workflow_id'
  ORDER BY started_at DESC
  LIMIT 10;
  ```

## Cron Expression Examples

| Expression | Description |
|------------|-------------|
| `0 9 * * *` | Every day at 9:00 AM |
| `30 17 * * *` | Every day at 5:30 PM |
| `0 9 * * 1-5` | Weekdays at 9:00 AM |
| `0 */2 * * *` | Every 2 hours |
| `*/15 * * * *` | Every 15 minutes |
| `0 0 1 * *` | First day of every month at midnight |

## Chicago Time Examples

For Chicago (America/Chicago timezone):

| Time | Cron Expression |
|------|-----------------|
| 7:48 AM | `48 7 * * *` |
| 12:00 PM (noon) | `0 12 * * *` |
| 6:30 PM | `30 18 * * *` |
| Every hour at :15 | `15 * * * *` |

## Monitoring

### Check Recent Executions

```sql
SELECT
  s.id as schedule_id,
  w.name as workflow_name,
  s.cron_expression,
  s.timezone,
  s.last_run_at,
  s.next_run_at,
  (SELECT COUNT(*) FROM workflow_executions
   WHERE workflow_id = s.workflow_id
   AND started_at > NOW() - INTERVAL '24 hours') as executions_last_24h
FROM workflow_schedules s
JOIN workflows w ON w.id = s.workflow_id
WHERE s.status = 'active';
```

### Performance Stats

View execution statistics:
```bash
curl http://localhost:3000/api/workflows/schedules/stats
```

## Production Deployment

1. **Deploy to Vercel**:
   ```bash
   git add .
   git commit -m "Add workflow scheduler"
   git push
   ```

2. **Verify Cron is Active**:
   - Go to Vercel Dashboard → Project Settings → Cron Jobs
   - You should see the schedule running

3. **Monitor Logs**:
   - Check Vercel logs for cron execution
   - Look for "Cron execution completed" messages

4. **Set Up Alerts** (Optional):
   - Use Vercel's monitoring features
   - Set up notifications for failed cron executions

## Security Considerations

1. **Secure the Endpoint**: Always set `CRON_SECRET` in production
2. **Rate Limiting**: The cron runs every minute - ensure your database can handle the load
3. **Timeout**: The function has a 60-second timeout (configurable in vercel.json)
4. **Error Handling**: Failed schedules are logged but don't stop the entire cron job

## Next Steps

- Add monitoring dashboard for scheduled workflows
- Implement retry logic for failed executions
- Add email notifications for execution failures
- Create admin UI for viewing cron execution logs
