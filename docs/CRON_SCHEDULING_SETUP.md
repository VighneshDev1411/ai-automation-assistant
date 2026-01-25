# 🔧 Cron Scheduling System - Setup Guide

## ✅ **What We've Built**

A production-ready cron scheduling system for CogniFlow with:
- ✅ BullMQ job queue for reliable job processing
- ✅ Redis-based queue management
- ✅ Timezone-aware cron scheduling
- ✅ Admin UI for monitoring schedules
- ✅ API endpoints for schedule management
- ✅ Worker process for background job execution
- ✅ Execution history tracking
- ✅ Retry logic with exponential backoff

---

## 📦 **Installation**

### Step 1: Install Dependencies

```bash
npm install
```

New dependencies added:
- `bullmq` - Job queue system
- `ioredis` - Redis client
- `tsx` - TypeScript execution for workers

### Step 2: Set Up Redis

You have two options:

#### Option A: Local Redis (Development)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

#### Option B: Upstash Redis (Production - Recommended)

1. Go to [upstash.com](https://upstash.com)
2. Create a free Redis database
3. Copy the REST URL and Token
4. Add to your `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

### Step 3: Run Database Migration

```bash
# Apply the new workflow_schedules table migration
npx supabase migration up
```

Or manually run the SQL in `/supabase/migrations/20250125000001_create_workflow_schedules.sql`

### Step 4: Add Environment Variables

Add to your `.env.local`:

```bash
# Redis Configuration (choose one)
REDIS_URL=redis://localhost:6379

# OR for Upstash
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Default timezone (optional)
DEFAULT_TIMEZONE=America/New_York

# Cron secret for API security
CRON_SECRET=your_random_secret
```

---

## 🚀 **Running the System**

### Development Mode

You need **TWO terminals**:

**Terminal 1: Next.js Application**
```bash
npm run dev
```

**Terminal 2: Worker Process**
```bash
npm run worker:dev
```

### Production Mode

```bash
# Build application
npm run build

# Terminal 1: Start Next.js
npm run start

# Terminal 2: Start Worker
npm run worker
```

---

## 📖 **How to Use**

### 1. Schedule a Workflow

**Via UI:**
1. Go to Workflow Builder
2. Open a workflow
3. Click "Schedule" button
4. Select a cron preset or enter custom expression
5. Choose timezone
6. Save

**Via API:**
```bash
curl -X POST http://localhost:3000/api/workflows/{workflow_id}/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "cronExpression": "0 9 * * 1-5",
    "timezone": "America/New_York",
    "enabled": true,
    "name": "Daily Morning Report"
  }'
```

### 2. Monitor Schedules

**UI:** Navigate to `/schedules` page

**API:**
```bash
# Get all schedules
curl http://localhost:3000/api/schedules

# Get specific workflow schedule
curl http://localhost:3000/api/workflows/{workflow_id}/schedule
```

### 3. Manage Schedules

**Enable/Disable:**
```bash
curl -X PATCH http://localhost:3000/api/workflows/{workflow_id}/schedule \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

**Delete:**
```bash
curl -X DELETE http://localhost:3000/api/workflows/{workflow_id}/schedule
```

---

## 🗓️ **Cron Expression Guide**

Common patterns:

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `0 * * * *` | Every hour |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * *` | Every day at midnight |
| `0 9 * * *` | Every day at 9 AM |
| `0 17 * * *` | Every day at 5 PM |
| `0 9 * * 1-5` | Weekdays at 9 AM |
| `0 0 * * 0` | Every Sunday at midnight |
| `0 0 1 * *` | First day of month |

Format: `minute hour day month weekday`

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────┐
│         Next.js Application                 │
│  (API Routes + UI)                          │
└────────────────┬────────────────────────────┘
                 │
                 ├──> Creates schedules in DB
                 ├──> Adds jobs to Redis Queue
                 │
        ┌────────▼─────────┐
        │   Redis Queue    │
        │   (BullMQ)       │
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │  Worker Process  │
        │  (Background)    │
        └────────┬─────────┘
                 │
                 ├──> Processes jobs
                 ├──> Executes workflows
                 └──> Updates execution logs
```

---

## 🔍 **Troubleshooting**

### Issue: "Redis connection error"

**Solution:**
- Verify Redis is running: `redis-cli ping` (should return "PONG")
- Check REDIS_URL in `.env.local`
- For Upstash, verify URL and token

### Issue: "Scheduled jobs not executing"

**Solution:**
- Ensure worker process is running: `npm run worker:dev`
- Check worker console for errors
- Verify schedule is enabled in UI
- Check Redis queue: Visit `/api/admin/queues`

### Issue: "Cron expression invalid"

**Solution:**
- Use the built-in validator: POST to `/api/utils/validate-cron`
- Test at [crontab.guru](https://crontab.guru)
- Check format: `minute hour day month weekday`

### Issue: "Workflow not executing"

**Solution:**
- Check execution logs in `/workflows/{id}/executions`
- Verify workflow is in "active" or "draft" status
- Check worker logs for errors
- Ensure all integrations are connected

---

## 📊 **Monitoring**

### Check Queue Status

```bash
curl http://localhost:3000/api/admin/queues
```

Returns:
```json
{
  "queues": [
    {
      "name": "workflow-execution",
      "waiting": 0,
      "active": 1,
      "completed": 150,
      "failed": 2,
      "delayed": 0,
      "total": 153
    }
  ],
  "scheduled": 5,
  "scheduledJobs": [...]
}
```

### View Job Details

```bash
curl http://localhost:3000/api/admin/queues/workflow-execution
```

---

## 🎯 **Next Steps**

Now that cron scheduling is fixed, you can:

1. ✅ Schedule workflows with confidence
2. ✅ Monitor execution history
3. ✅ Track success/failure rates
4. ✅ Manage schedules via API or UI

**Continue to Phase 1, Task 1.1.2: HTML Email Support** 📧

---

## 📚 **File Structure**

```
src/
├── lib/
│   ├── redis/
│   │   └── client.ts                    # Redis connection
│   └── queue/
│       ├── queue-manager.ts             # BullMQ queue management
│       └── workflow-scheduler.ts        # Cron scheduling logic
├── workers/
│   ├── index.ts                         # Worker entry point
│   └── processors/
│       └── workflow-execution-processor.ts  # Job processor
├── app/
│   ├── (dashboard)/
│   │   └── schedules/
│   │       └── page.tsx                 # Schedules monitoring UI
│   └── api/
│       ├── workflows/[id]/schedule/
│       │   └── route.ts                 # Schedule CRUD API
│       ├── schedules/
│       │   └── route.ts                 # List schedules API
│       ├── admin/queues/
│       │   └── route.ts                 # Queue monitoring API
│       └── utils/validate-cron/
│           └── route.ts                 # Cron validation API
├── components/
│   └── workflows/
│       └── ScheduleDialog.tsx           # Schedule creation UI
└── supabase/
    └── migrations/
        └── 20250125000001_create_workflow_schedules.sql
```

---

## ✨ **Features Delivered**

✅ Production-ready job queue with BullMQ  
✅ Redis-based persistence  
✅ Timezone-aware scheduling  
✅ Retry logic with exponential backoff  
✅ Admin monitoring dashboard  
✅ Complete API for schedule management  
✅ UI for creating/managing schedules  
✅ Execution history tracking  
✅ Real-time job monitoring  
✅ Worker process for background execution  

**Status: CRON SCHEDULING SYSTEM COMPLETE! 🎉**
