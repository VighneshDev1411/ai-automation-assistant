# 🔧 Quick Fix: Schedule Your Workflow

## ❌ Error 400 - What Went Wrong?

The 400 error means the API is rejecting your request. Let's fix it!

## ✅ Corrected Console Command

Copy and paste this **improved version** into your browser console (F12):

```javascript
// Step 1: Get your workflow ID from the URL
const workflowId = new URLSearchParams(window.location.search).get('id') || 'YOUR_WORKFLOW_ID';
console.log('📋 Using Workflow ID:', workflowId);

// Step 2: Create the schedule with proper error handling
fetch(`/api/workflows/${workflowId}/schedule`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Every 5 Minutes Test',
    description: 'Testing cron scheduling system',
    cronExpression: '*/5 * * * *',  // Every 5 minutes
    timezone: 'America/New_York',   // Change to your timezone
    enabled: true
  })
})
.then(async response => {
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Error Response:', {
      status: response.status,
      statusText: response.statusText,
      error: data
    });
    throw new Error(data.error || 'Failed to create schedule');
  }
  
  return data;
})
.then(data => {
  console.log('✅ SUCCESS! Schedule created:', data);
  console.log('📅 Next runs:', data.schedule.next_runs);
  console.log('📝 Description:', data.schedule.description_text);
  alert('✅ Schedule created successfully!\n\nNext run: ' + new Date(data.schedule.next_run_at).toLocaleString());
})
.catch(error => {
  console.error('❌ FAILED:', error);
  alert('❌ Error: ' + error.message + '\n\nCheck the console (F12) for details.');
});
```

---

## 🔍 Troubleshooting Steps

### Issue 1: "No organization found"

**Problem**: You're not a member of an organization yet.

**Fix**: Check your organization membership:

```javascript
fetch('/api/organizations')
  .then(r => r.json())
  .then(data => console.log('Your organizations:', data))
```

If empty, you need to complete onboarding first.

---

### Issue 2: "Workflow not found"

**Problem**: The workflow ID is invalid or you don't have access.

**Fix**: List your workflows:

```javascript
fetch('/api/workflows')
  .then(r => r.json())
  .then(data => {
    console.log('✅ Your workflows:', data);
    if (data.workflows && data.workflows.length > 0) {
      console.log('📋 Use one of these IDs:', data.workflows.map(w => ({
        id: w.id,
        name: w.name
      })));
    }
  })
```

---

### Issue 3: "Invalid cron expression"

**Problem**: The cron expression syntax is wrong.

**Valid Examples**:
- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour
- `0 9 * * *` - Every day at 9 AM
- `0 9 * * 1-5` - Every weekday at 9 AM

**Test your cron**:

```javascript
fetch('/api/utils/validate-cron/route', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cronExpression: '*/5 * * * *',
    timezone: 'America/New_York'
  })
})
.then(r => r.json())
.then(data => console.log('Cron validation:', data))
```

---

## 🎯 Alternative: Use Database Directly

If the API keeps failing, insert directly into the database:

```bash
# Open terminal and run:
cd /Users/vigneshmac/ai-automation-platform

# Get your workflow and organization IDs
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
SELECT 
  w.id as workflow_id, 
  w.name as workflow_name,
  w.organization_id,
  om.user_id
FROM workflows w
JOIN organization_members om ON w.organization_id = om.organization_id
LIMIT 5;
"

# Then insert the schedule (replace the IDs):
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
INSERT INTO workflow_schedules (
  workflow_id,
  organization_id,
  created_by,
  name,
  cron_expression,
  timezone,
  enabled
) VALUES (
  'YOUR_WORKFLOW_ID',
  'YOUR_ORG_ID',
  'YOUR_USER_ID',
  'Every 5 Minutes Test',
  '*/5 * * * *',
  'America/New_York',
  true
)
ON CONFLICT (workflow_id) DO UPDATE SET
  cron_expression = EXCLUDED.cron_expression,
  timezone = EXCLUDED.timezone,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();
"
```

---

## 🚀 After Creating the Schedule

### 1. Verify in Database

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
SELECT 
  id,
  name,
  cron_expression,
  timezone,
  enabled,
  next_run_at,
  total_runs
FROM workflow_schedules;
"
```

### 2. Check Worker Logs

Go to the terminal where `npm run worker:dev` is running.

You should see logs every 5 minutes:
```
🔄 Processing job: workflow-abc123-schedule-xyz789
✅ Job completed: workflow-abc123-schedule-xyz789
```

### 3. Monitor Executions

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
SELECT 
  id,
  workflow_id,
  status,
  started_at,
  completed_at,
  duration_ms
FROM workflow_executions
ORDER BY started_at DESC
LIMIT 10;
"
```

---

## 📞 Still Having Issues?

Run this **diagnostic script** in the console:

```javascript
async function diagnoseScheduling() {
  console.log('🔍 Running diagnostics...\n');
  
  // 1. Check auth
  const authResp = await fetch('/api/auth/session');
  const auth = await authResp.json();
  console.log('1️⃣ Auth:', auth.user ? '✅ Logged in as ' + auth.user.email : '❌ Not logged in');
  
  // 2. Check organizations
  const orgResp = await fetch('/api/organizations');
  const orgs = await orgResp.json();
  console.log('2️⃣ Organizations:', orgs.length > 0 ? '✅ Found ' + orgs.length : '❌ None found');
  
  // 3. Check workflows
  const workflowResp = await fetch('/api/workflows');
  const workflows = await workflowResp.json();
  console.log('3️⃣ Workflows:', workflows.workflows?.length > 0 ? '✅ Found ' + workflows.workflows.length : '❌ None found');
  
  // 4. Check Redis
  console.log('4️⃣ Redis: Check terminal for worker logs');
  
  // 5. Check worker
  const queueResp = await fetch('/api/admin/queues');
  if (queueResp.ok) {
    const queues = await queueResp.json();
    console.log('5️⃣ Job Queues:', queues);
  } else {
    console.log('5️⃣ Job Queues: ⚠️ Admin endpoint not accessible');
  }
  
  console.log('\n✅ Diagnostics complete! Check results above.');
}

diagnoseScheduling();
```

---

## 💡 Tips

1. **Use `*/1 * * * *`** for quick testing (runs every minute)
2. **Check terminal logs** - worker shows real-time processing
3. **Wait 1-2 minutes** after creating schedule for first execution
4. **Disable schedule** when done testing to avoid spam:
   ```javascript
   fetch('/api/workflows/YOUR_WORKFLOW_ID/schedule', {
     method: 'PATCH',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ enabled: false })
   })
   ```

---

Good luck! 🎉
