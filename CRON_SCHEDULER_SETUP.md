# Cron Scheduler Setup Guide

This guide explains how the cron scheduler works and how to configure it for your AI Automation Platform.

## Overview

The cron scheduler allows workflows to be executed automatically on a schedule using cron expressions. The platform supports multiple scheduling methods:

1. **Vercel Cron** (Primary, Recommended)
2. **GitHub Actions** (Backup/Alternative)

## Architecture

```
Vercel Cron (every 5 min)
  ↓
/api/cron/execute-schedules
  ↓
TriggerSystem.handleScheduled()
  ↓
WorkflowEngine.executeWorkflow()
  ↓
Workflow Execution
```

## Setup Instructions

### Option 1: Vercel Cron (Recommended)

Vercel Cron is configured and ready to use. No additional setup required!

The scheduler is already configured in `vercel.json`:
```json
"crons": [
  {
    "path": "/api/cron/execute-schedules",
    "schedule": "*/5 * * * *"
  }
]
```

**Advantages:**
- ✅ No external dependencies
- ✅ Runs automatically on Vercel
- ✅ No secrets to configure
- ✅ Built-in monitoring in Vercel dashboard

**How to verify it's working:**
1. Deploy to Vercel
2. Check Vercel Dashboard → Cron Jobs
3. View execution logs in Vercel Logs

### Option 2: GitHub Actions (Backup)

If you need a backup scheduler or want to use GitHub Actions:

1. **Set GitHub Repository Secrets:**
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add secrets:
     - `CRON_SECRET`: Any secure random string (e.g., generate with `openssl rand -hex 32`)
     - `VERCEL_PROJECT_URL`: Your Vercel project URL (e.g., `your-app.vercel.app`)

2. **Enable the GitHub Actions workflow:**
   - Edit `.github/workflows/cron-trigger.yml`
   - Uncomment the `schedule` section:
     ```yaml
     schedule:
       - cron: '*/5 * * * *'
     ```

3. **Set CRON_SECRET environment variable in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `CRON_SECRET` with the same value as GitHub secret

**Manual Trigger:**
- Go to: Repository → Actions → "Trigger Workflow Scheduler (Backup)"
- Click "Run workflow"

## How Schedules Work

### Creating a Schedule

Schedules are created through the workflow builder or API:

```typescript
// Example: Schedule a workflow to run every day at 9 AM
await triggerSystem.scheduleWorkflow(workflowId, {
  cron: '0 9 * * *',
  timezone: 'America/New_York',
  startDate: '2025-01-01',  // Optional
  endDate: '2025-12-31'     // Optional
})
```

### Cron Expression Format

Standard 5-field cron format:
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

**Common Examples:**
- `0 9 * * *` - Daily at 9:00 AM
- `*/5 * * * *` - Every 5 minutes
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 0 1 * *` - Monthly on the 1st at midnight
- `0 9-17 * * 1-5` - Every hour from 9 AM to 5 PM, Monday-Friday

### Using ScheduleBuilder (Helper Class)

```typescript
import { ScheduleBuilder } from '@/lib/workflow-engine/scheduling/WorkflowScheduler'

// Common schedules
ScheduleBuilder.dailyAt(9, 0)        // Daily at 9:00 AM
ScheduleBuilder.everyMinutes(5)      // Every 5 minutes
ScheduleBuilder.weeklyOn(1, 9, 0)    // Every Monday at 9:00 AM
ScheduleBuilder.businessHours()      // Every hour, 9 AM-5 PM, Mon-Fri
ScheduleBuilder.monthly()            // 1st of every month at midnight
```

## Database Schema

Schedules are stored in the `workflow_schedules` table:

```sql
- id: UUID
- workflow_id: UUID (references workflows)
- cron_expression: TEXT
- timezone: TEXT (default: 'America/Chicago')
- status: TEXT ('active' or 'inactive')
- next_run_at: TIMESTAMPTZ (calculated automatically)
- last_run_at: TIMESTAMPTZ (updated after each run)
- start_date: TIMESTAMPTZ (optional)
- end_date: TIMESTAMPTZ (optional)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## Execution Flow

1. **Cron Trigger** (every 5 minutes)
   - Vercel Cron or GitHub Actions calls `/api/cron/execute-schedules`

2. **Query Due Schedules**
   - Fetch all active schedules where `next_run_at <= NOW()`
   - Filter by active workflow status

3. **Calculate Next Run**
   - Use `cron-parser` library to calculate next execution time
   - Consider timezone settings

4. **Execute Workflow**
   - Call `TriggerSystem.handleScheduled()`
   - Which calls `WorkflowEngine.executeWorkflow()`

5. **Update Schedule**
   - Set `last_run_at` to current time
   - Set `next_run_at` to calculated next time

## Monitoring & Debugging

### View Scheduled Workflows

**API Endpoint:**
```bash
GET /api/workflows/schedules
```

**Response:**
```json
{
  "schedules": [
    {
      "id": "schedule-uuid",
      "workflowId": "workflow-uuid",
      "workflowName": "Daily Report",
      "cronExpression": "0 9 * * *",
      "timezone": "America/New_York",
      "status": "active",
      "nextRunAt": "2025-01-15T09:00:00Z",
      "lastRunAt": "2025-01-14T09:00:00Z"
    }
  ]
}
```

### View Execution History

Check the `workflow_executions` table for executions with:
- `trigger_data.trigger = 'scheduled'`
- `trigger_data.scheduleId` = your schedule ID

### Logs

**Vercel:**
- Dashboard → Your Project → Logs
- Filter by `/api/cron/execute-schedules`

**Console Logs:**
```
[CRON] Vercel Cron request
[CRON] Executing scheduled workflow: Daily Report (workflow-id)
[CRON] Successfully executed Daily Report. Next run: 2025-01-15T09:00:00Z
```

### Health Check

Use the TriggerSystem health check:

```typescript
const triggerSystem = new TriggerSystem(supabase)
const health = await triggerSystem.getSystemHealth()

console.log(health)
// {
//   status: 'healthy',
//   checks: {
//     database: { status: 'healthy', latency: 45 },
//     schedules: { status: 'healthy', count: 12 }
//   },
//   timestamp: '2025-01-14T...',
//   uptime: 3600000
// }
```

## Troubleshooting

### Schedules Not Running

1. **Check schedule status:**
   ```sql
   SELECT id, workflow_id, status, next_run_at, last_run_at
   FROM workflow_schedules
   WHERE status = 'active'
   ORDER BY next_run_at;
   ```

2. **Verify Vercel Cron:**
   - Go to Vercel Dashboard → Cron Jobs
   - Check execution history
   - View error logs

3. **Check workflow status:**
   ```sql
   SELECT w.id, w.name, w.status, ws.status as schedule_status
   FROM workflows w
   JOIN workflow_schedules ws ON ws.workflow_id = w.id
   WHERE ws.status = 'active';
   ```
   - Both workflow AND schedule must be 'active'

4. **Test cron endpoint manually:**
   ```bash
   curl https://your-app.vercel.app/api/cron/execute-schedules
   ```

### Invalid Cron Expression

Use the validation endpoint:
```bash
POST /api/workflows/schedules/validate
{
  "scheduleType": "cron",
  "schedule": {
    "type": "cron",
    "expression": "0 9 * * *"
  },
  "timezone": "America/New_York"
}
```

### Timezone Issues

- All times are stored in UTC in the database
- The `timezone` field is used by `cron-parser` to calculate next runs
- Verify timezone is valid: `Intl.DateTimeFormat(undefined, { timeZone: 'America/New_York' })`

## API Reference

### Create Schedule
```
POST /api/workflows/schedules
Body: {
  workflowId: string
  cronExpression: string
  timezone?: string
  startDate?: string
  endDate?: string
}
```

### Toggle Schedule
```
POST /api/workflows/schedules/[scheduleId]/toggle
```

### Get Schedule Stats
```
GET /api/workflows/schedules/stats
```

### Validate Schedule
```
POST /api/workflows/schedules/validate
```

## Security

### CRON_SECRET (Optional)

The `CRON_SECRET` environment variable adds an extra layer of security for non-Vercel cron requests.

**When to use:**
- Using GitHub Actions as primary scheduler
- Want to prevent unauthorized cron triggers

**Setup:**
1. Generate a secure secret:
   ```bash
   openssl rand -hex 32
   ```

2. Set in Vercel environment variables

3. Set in GitHub secrets (if using GitHub Actions)

**Note:** Vercel Cron requests are automatically trusted (via `x-vercel-cron` header)

## Performance

### Execution Time Limits

- Vercel Cron endpoint: 60 seconds (configured in vercel.json)
- Long-running workflows execute asynchronously
- Monitor execution time in response:
  ```json
  {
    "executionTimeMs": 245,
    "executedCount": 5
  }
  ```

### Scaling

- The cron endpoint queries all due schedules
- Executes them sequentially
- For high-volume scenarios, consider:
  - Reducing schedule frequency
  - Using message queues
  - Implementing batch processing

## Best Practices

1. **Use appropriate intervals:**
   - Minimum: Every 5 minutes (Vercel Cron limitation)
   - Avoid: Very frequent schedules (< 5 min)

2. **Set timezones explicitly:**
   - Always specify timezone for user-facing schedules
   - Default is 'America/Chicago'

3. **Monitor execution history:**
   - Check for failed executions
   - Review execution times
   - Set up alerts for failures

4. **Use start/end dates:**
   - For temporary schedules
   - Seasonal workflows
   - Campaign-based automation

5. **Test before deploying:**
   - Use workflow_dispatch to manually test
   - Verify cron expression with validation endpoint
   - Check next_run_at calculation

## Migration from GitHub Actions

If you're currently using GitHub Actions and want to switch to Vercel Cron:

1. ✅ Vercel Cron is already configured (done)
2. Deploy to Vercel
3. Verify Vercel Cron is working (check logs)
4. Disable GitHub Actions schedule (already done in updated workflow)
5. (Optional) Remove CRON_SECRET environment variable

## Support

For issues or questions:
- Check Vercel Logs for execution errors
- Review workflow execution history in database
- Check TriggerSystem health status
- Use manual trigger via workflow_dispatch for testing

---

Last Updated: 2025-01-14
