# 📋 **WORKFLOW GUIDE: Slack Daily Standup Summarizer**

## **Prerequisites (Setup First)**

Before creating the workflow, ensure:

### 1. **Slack Integration Setup**
```
Navigate to: /integrations page
```

**Steps:**
1. Click on **Slack** integration card
2. Click **"Connect"** button
3. Authorize Slack OAuth with these scopes:
   - `channels:read` (to fetch messages)
   - `channels:history` (to read channel history)
   - `chat:write` (to post messages)
4. Select your workspace
5. Verify connection shows "Connected" status

**Environment Variables Needed:**
```bash
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-secret
SLACK_TEAM_ID=your-team-id
SLACK_USER_ID=your-user-id
```

### 2. **OpenAI API Key Setup**
```
Navigate to: /settings or /ai-agents
```

**Steps:**
1. Add your OpenAI API key to environment variables:
```bash
OPENAI_API_KEY=sk-your-openai-key
```
2. Verify AI agents page shows available models

---

## **STEP-BY-STEP: Creating the Workflow**

### **Step 1: Navigate to Workflow Builder**

1. Go to **Dashboard** (`/dashboard`)
2. Click **"Create Workflow"** button OR
3. Navigate directly to **Workflow Builder** (`/workflow-builder`)

---

### **Step 2: Set Workflow Name & Description**

**In the workflow builder header:**
1. Click on the workflow name field (default: "Untitled Workflow")
2. Enter: **"Slack Daily Standup Summarizer"**
3. Add description: **"Automatically summarizes daily standup messages from #engineering-daily and posts to #daily-summary every weekday at 9 AM"**

---

### **Step 3: Add Schedule Trigger**

**From the left sidebar:**

1. **Drag "Schedule Trigger" node** onto the canvas
   - Or click **"Add Trigger"** → Select **"Schedule"**

2. **Configure the trigger:**
   ```
   Trigger Type: Schedule (Cron)
   Cron Expression: 0 9 * * 1-5
   Description: Every weekday at 9 AM (Mon-Fri)
   Timezone: Your timezone (e.g., America/New_York)
   ```

3. **Click "Save Trigger"**

**Your canvas now shows:**
```
[Schedule Trigger]
    ↓
```

---

### **Step 4: Add Slack Fetch Messages Action**

**From the left sidebar:**

1. **Drag "Action Node"** onto the canvas below the trigger
2. **Connect** the trigger to this action node (draw a line)

3. **Configure the action:**
   ```
   Node Name: Fetch Standup Messages
   Integration: Slack
   Action: list_channels OR get_channel_history
   ```

4. **Action Configuration:**
   ```json
   {
     "channel": "#engineering-daily",
     "limit": 100,
     "oldest": "{{$trigger.timestamp - 86400}}"
   }
   ```

   **Explanation:**
   - `channel`: The Slack channel to fetch from
   - `limit`: Max number of messages (100 should cover 24h)
   - `oldest`: Unix timestamp for 24 hours ago (86400 seconds)

5. **Click "Save Action"**

**Your canvas now shows:**
```
[Schedule Trigger]
    ↓
[Fetch Standup Messages]
    ↓
```

---

### **Step 5: Add AI Summarizer Action**

**From the left sidebar:**

1. **Drag "AI Agent Node"** onto the canvas below the Slack fetch action
2. **Connect** the Slack action to this AI node

3. **Configure the AI Agent:**
   ```
   Node Name: Summarize Standup
   Agent Type: Text Generation
   Model: GPT-4 (gpt-4-turbo)
   ```

4. **Prompt Configuration:**
   ```
   Prompt Template:

   Summarize the following standup updates in bullet points grouped by person.

   Messages:
   {{$prev.messages}}

   Instructions:
   - Group by person (use @username)
   - Extract key points: what they did, what they're working on, blockers
   - Keep it concise (max 3 bullets per person)
   - Format as markdown
   ```

5. **Advanced Settings:**
   ```
   Temperature: 0.3 (for consistent summaries)
   Max Tokens: 1000
   ```

6. **Input Mapping:**
   ```json
   {
     "messages": "{{$actions.fetch_standup_messages.result.messages}}"
   }
   ```

7. **Click "Save Agent"**

**Your canvas now shows:**
```
[Schedule Trigger]
    ↓
[Fetch Standup Messages]
    ↓
[Summarize Standup (AI)]
    ↓
```

---

### **Step 6: Add Slack Post Summary Action**

**From the left sidebar:**

1. **Drag "Action Node"** onto the canvas below the AI node
2. **Connect** the AI node to this action node

3. **Configure the action:**
   ```
   Node Name: Post Summary to Slack
   Integration: Slack
   Action: send_message
   ```

4. **Action Configuration:**
   ```json
   {
     "channel": "#daily-summary",
     "text": "📊 Daily Standup Summary - {{$trigger.date}}",
     "blocks": [
       {
         "type": "section",
         "text": {
           "type": "mrkdwn",
           "text": "{{$actions.summarize_standup.result.response}}"
         }
       }
     ]
   }
   ```

   **Explanation:**
   - `channel`: Target channel for posting
   - `text`: Fallback text (shown in notifications)
   - `blocks`: Formatted message using Slack Block Kit
   - `{{$actions.summarize_standup.result.response}}`: The AI-generated summary

5. **Click "Save Action"**

**Your final canvas shows:**
```
[Schedule Trigger (Cron: 0 9 * * 1-5)]
    ↓
[Fetch Standup Messages (Slack)]
    ↓
[Summarize Standup (GPT-4)]
    ↓
[Post Summary to Slack (#daily-summary)]
```

---

### **Step 7: Configure Error Handling**

**For each action node:**

1. Click on the node
2. Go to **"Error Handling"** tab
3. Configure:
   ```
   On Failure:
   - Retry: 3 times
   - Retry Delay: 5 seconds
   - On Final Failure: Send notification to #alerts
   ```

**Add Error Notification (Optional):**
1. Add a conditional branch after each critical step
2. If error occurs, send alert to admin channel

---

### **Step 8: Test the Workflow**

**Before scheduling, test manually:**

1. **Click "Test Workflow"** button (top right)
2. **Select test mode:**
   ```
   Test Mode: Manual Trigger
   Use Current Time: Yes
   Mock Data: No (use real Slack data)
   ```

3. **Click "Run Test"**

4. **Watch the execution:**
   - You'll see each node light up as it executes
   - Check the output panel for results
   - Verify the summary appears in #daily-summary

5. **Review execution logs:**
   - Navigate to: `/analytics` or workflow execution history
   - Check for:
     - ✅ Messages fetched from Slack
     - ✅ AI summary generated
     - ✅ Summary posted to Slack
     - ✅ Total execution time
     - ✅ Token usage and cost

---

### **Step 9: Activate the Workflow**

**Once testing is successful:**

1. Click **"Activate Workflow"** toggle (top right)
2. Confirm activation
3. Status changes to: **"Active - Scheduled"**

**The workflow will now run automatically:**
- Every weekday (Monday-Friday) at 9:00 AM
- In your configured timezone
- You'll receive execution notifications (if configured)

---

## **Expected Behavior & Output**

### **Execution Timeline:**

```
Monday-Friday at 9:00 AM:
├─ 9:00:00 - Cron trigger fires
├─ 9:00:01 - Fetch Slack messages (2-3 seconds)
├─ 9:00:04 - AI summarization (5-8 seconds)
├─ 9:00:12 - Post to Slack (1-2 seconds)
└─ 9:00:14 - Execution complete ✅
```

### **Sample Output in #daily-summary:**

```markdown
📊 Daily Standup Summary - January 16, 2025

**@john_doe**
• Completed API authentication refactor
• Working on user dashboard redesign
• Blocker: Waiting for design assets from UI team

**@jane_smith**
• Fixed critical bug in payment processing
• Starting work on notification system
• No blockers

**@mike_johnson**
• Deployed new feature to staging
• Reviewing pull requests from team
• Need clarification on database migration strategy

---
🤖 Generated by CogniFlow AI
```

---

## **Monitoring & Troubleshooting**

### **Check Execution Status:**

1. Navigate to: `/workflows`
2. Find **"Slack Daily Standup Summarizer"**
3. Click to view details
4. Check **"Execution History"** tab

### **View Detailed Logs:**

1. Navigate to: `/analytics`
2. Filter by workflow name
3. Check:
   - Success rate
   - Average execution time
   - Token usage
   - Error logs (if any)

### **Common Issues & Solutions:**

**Issue 1: "Slack authentication failed"**
```
Solution:
- Go to /integrations
- Reconnect Slack
- Verify bot token scopes
```

**Issue 2: "No messages fetched"**
```
Solution:
- Verify channel name is correct (#engineering-daily)
- Check bot is invited to the channel
- Verify time range (last 24h) is correct
```

**Issue 3: "AI summary failed"**
```
Solution:
- Check OpenAI API key is valid
- Verify API quota hasn't been exceeded
- Check if messages JSON is properly formatted
```

**Issue 4: "Post to Slack failed"**
```
Solution:
- Verify bot has write permissions to #daily-summary
- Check bot is invited to target channel
- Verify message formatting is valid
```

---

## **Advanced Enhancements (Optional)**

### **1. Add Conditional Logic:**
```
If no messages in last 24h:
  ↓
Skip AI processing
  ↓
Post: "No standup updates today"
```

### **2. Add Sentiment Analysis:**
```
After AI summary:
  ↓
Add sentiment check node
  ↓
Tag summary with: 😊 Positive / 😐 Neutral / 😟 Needs Attention
```

### **3. Store Summaries:**
```
After posting to Slack:
  ↓
Save to Google Sheets or Database
  ↓
Build weekly trend reports
```

### **4. Add Approval Step:**
```
After AI generates summary:
  ↓
Send to manager for approval (webhook)
  ↓
Wait for approval before posting
```

---

## **Testing Checklist**

Before going live, verify:

- [ ] Slack integration is connected
- [ ] Bot has access to #engineering-daily (source)
- [ ] Bot has access to #daily-summary (target)
- [ ] OpenAI API key is configured
- [ ] Cron schedule is correct (0 9 * * 1-5)
- [ ] Timezone is set properly
- [ ] Test execution completed successfully
- [ ] Sample summary posted to Slack
- [ ] Error handling is configured
- [ ] Execution logs are visible in analytics

---

## **Cost Estimation**

**Per Execution:**
- Slack API calls: Free (within rate limits)
- GPT-4 API: ~$0.03-0.05 (depending on message volume)
- Total per execution: **~$0.05**

**Monthly Cost (22 workdays):**
- 22 executions × $0.05 = **~$1.10/month**

---

## **Next Steps**

Once this workflow is running successfully, you can:

1. **Clone it** for other channels
2. **Modify the AI prompt** for different summary styles
3. **Add more integrations** (email, Teams, etc.)
4. **Build similar workflows** for different use cases

---

**That's it!** 🎉 You now have a fully automated daily standup summarizer running in CogniFlow. The workflow will execute every weekday at 9 AM, fetch Slack messages, generate an AI summary, and post it back to your team channel.

---

## **Workflow Structure Summary**

```
Workflow: Slack Daily Standup Summarizer
├── Trigger: Schedule (Cron: 0 9 * * 1-5)
├── Action 1: Fetch Slack Messages
│   └── Integration: Slack
│   └── Channel: #engineering-daily
│   └── Time Range: Last 24 hours
├── Action 2: AI Summarization
│   └── Model: GPT-4 Turbo
│   └── Temperature: 0.3
│   └── Max Tokens: 1000
└── Action 3: Post to Slack
    └── Integration: Slack
    └── Channel: #daily-summary
    └── Format: Markdown with Block Kit
```

---

**Document Version:** 1.0
**Last Updated:** January 16, 2025
**Platform:** CogniFlow AI Automation Platform
