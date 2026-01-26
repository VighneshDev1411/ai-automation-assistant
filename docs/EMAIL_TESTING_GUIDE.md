# 📧 Email Testing Guide

Quick guide to test the email functionality in your CogniFlow platform.

---

## ✅ Prerequisites

1. ✅ SendGrid account created
2. ✅ API key generated and added to `.env.local`
3. ✅ Sender email verified in SendGrid
4. ✅ Docker running (for Supabase and Redis)
5. ✅ Next.js dev server running (`npm run dev`)
6. ✅ Worker running (`npm run worker:dev`)

---

## 🧪 Test 1: Simple Email Workflow

### Step 1: Create a Test Workflow

1. Go to **Workflows** page in your app
2. Click **"New Workflow"**
3. Name it: **"Email Test Workflow"**
4. Click **"Create"**

### Step 2: Build the Workflow

Open the workflow editor and add these nodes:

**Node 1: Schedule Trigger**
```json
{
  "type": "trigger",
  "label": "Schedule Trigger"
}
```

**Node 2: Send Email Action**
```json
{
  "type": "action",
  "label": "Send Test Email",
  "config": {
    "actionType": "send_email",
    "to": "YOUR-EMAIL@gmail.com",  // Replace with your email
    "subject": "🎉 Test Email from CogniFlow Workflow",
    "html": "<h1>Success!</h1><p>Your email workflow is working perfectly!</p><p><strong>Timestamp:</strong> {{triggerData.timestamp}}</p>",
    "text": "Success! Your email workflow is working perfectly!"
  }
}
```

Connect the nodes: **Schedule Trigger → Send Email**

### Step 3: Schedule the Workflow

1. Click the **3-dot menu** on your workflow
2. Select **"Schedule"**
3. Set cron: **`*/5 * * * *`** (every 5 minutes)
4. Timezone: **Your timezone**
5. Click **"Create Schedule"**

### Step 4: Wait & Verify

- Wait 5 minutes
- Check your email inbox
- You should receive a beautiful HTML email! 📬

---

## 🧪 Test 2: Manual Workflow Trigger (Coming Soon)

Currently, workflows are triggered by schedules. Manual trigger UI is coming in the next phase!

For now, you can test by:
1. Creating a schedule with a short interval (e.g., 1 minute)
2. Watching the worker logs for execution
3. Checking email logs in database

---

## 🧪 Test 3: Check Email Logs in Database

### Using psql:
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### Query email logs:
```sql
-- View all sent emails
SELECT 
  id,
  recipient_email,
  subject,
  status,
  provider_message_id,
  sent_at
FROM email_logs
ORDER BY sent_at DESC
LIMIT 10;

-- View email stats
SELECT 
  status,
  COUNT(*) as count
FROM email_logs
GROUP BY status;
```

---

## 🧪 Test 4: Email with Dynamic Variables

### Create a workflow with variables:

**Node 2: Send Dynamic Email**
```json
{
  "type": "action",
  "label": "Send Dynamic Email",
  "config": {
    "actionType": "send_email",
    "to": "YOUR-EMAIL@gmail.com",
    "subject": "Workflow Executed at {{triggerData.timestamp}}",
    "html": `
      <h1>Workflow Execution Report</h1>
      <ul>
        <li><strong>Execution ID:</strong> {{executionId}}</li>
        <li><strong>Workflow ID:</strong> {{workflowId}}</li>
        <li><strong>Organization:</strong> {{organizationId}}</li>
        <li><strong>Triggered At:</strong> {{triggerData.timestamp}}</li>
      </ul>
      <p>This email demonstrates variable interpolation in CogniFlow!</p>
    `
  }
}
```

Variables are automatically replaced with actual values from the workflow context!

---

## 🧪 Test 5: Test Error Handling

### Send to invalid email:
```json
{
  "to": "invalid-email-address",
  "subject": "Test",
  "html": "<p>Test</p>"
}
```

**Expected:**
- Workflow fails gracefully
- Error logged to `email_logs` with status `'failed'`
- Error details captured in `error_details` column

---

## 📊 Monitor Workflow Execution

### Check worker logs:
```bash
# Terminal where worker is running should show:
🔄 Processing job: X
🔄 Processing workflow execution: workflow-id
⚙️ Executing workflow nodes for: Email Test Workflow
  → Action type: send_email
  → Sending email to your-email@gmail.com
✅ Email sent successfully!
✅ Workflow execution completed
```

### Check Next.js logs:
```bash
# Should see successful execution logs
GET /api/workflows 200
GET /api/schedules 200
```

---

## 🎯 Success Criteria

✅ **Email received in inbox**  
✅ **HTML renders correctly**  
✅ **Variables replaced with actual values**  
✅ **Email logged in database with status 'sent'**  
✅ **Provider message ID captured**  
✅ **Worker logs show successful execution**  

---

## 🐛 Troubleshooting

### Email not received?

1. **Check SendGrid Dashboard:**
   - Go to https://app.sendgrid.com/activity
   - Look for your email in the activity feed
   - Check for any errors or blocks

2. **Check Worker Logs:**
   ```bash
   # Look for errors in terminal running: npm run worker:dev
   ```

3. **Check Email Logs:**
   ```sql
   SELECT * FROM email_logs 
   WHERE status = 'failed' 
   ORDER BY sent_at DESC;
   ```

4. **Verify Configuration:**
   ```bash
   # Check .env.local has all required values
   grep EMAIL .env.local
   ```

### Common Issues:

**Issue:** "SENDGRID_API_KEY is not set"  
**Fix:** Add API key to `.env.local` and restart dev server

**Issue:** "Sender email not verified"  
**Fix:** Verify sender in SendGrid dashboard

**Issue:** "Email in spam"  
**Fix:** 
- Verify your domain in SendGrid
- Add SPF and DKIM records
- Use verified sender email

---

## 🎉 Success!

If all tests pass, your email system is working perfectly! 🚀

**Next steps:**
- Integrate email into your production workflows
- Create custom email templates
- Build email analytics dashboard
- Add email template editor UI

---

## 📝 Need Help?

Refer to:
- [Phase 1.1.2 Complete Documentation](./PHASE_1.1.2_COMPLETE.md)
- [Workflow Execution Test Guide](../WORKFLOW_EXECUTION_TEST_GUIDE.md)
- SendGrid Documentation: https://docs.sendgrid.com/
