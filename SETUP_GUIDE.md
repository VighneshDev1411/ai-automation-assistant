# 🚀 CogniFlow - Complete Setup Guide

## Quick Start (5 Minutes)

### Prerequisites
- Node.js 20+ installed
- Redis running locally OR Redis Cloud account
- At least ONE AI provider API key (OpenAI or Anthropic)

### 1. Clone & Install
```bash
cd /Users/vigneshmac/ai-automation-assistant
npm install
```

### 2. Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your API keys
# At minimum, you need:
# - Supabase credentials (already configured)
# - OPENAI_API_KEY or ANTHROPIC_API_KEY
# - REDIS_URL (for job queue)
# - RESEND_API_KEY (for email sending)
# - SLACK_BOT_TOKEN (for Slack messages)
```

### 3. Start Redis (if not running)
```bash
# macOS with Homebrew
brew services start redis

# Or run in foreground
redis-server
```

### 4. Start the Application
```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start background workers
npm run worker:dev
```

### 5. Test!
Visit `http://localhost:3000` and login!

---

## 📋 Detailed Setup Instructions

### 🤖 **AI Providers** (Choose at least ONE)

#### Option 1: OpenAI (Recommended for GPT-4)
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Add to `.env.local`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

**Cost**: ~$0.03 per 1K tokens for GPT-4, ~$0.002 for GPT-3.5

#### Option 2: Anthropic (Claude 3)
1. Go to https://console.anthropic.com/
2. Create an API key
3. Copy the key (starts with `sk-ant-`)
4. Add to `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

**Cost**: ~$0.015 per 1K tokens for Claude Sonnet

#### Option 3: Google AI (Gemini) - Optional
1. Go to https://ai.google.dev/
2. Get an API key
3. Add to `.env.local`:
   ```
   GOOGLE_AI_API_KEY=your-key-here
   ```

---

### 📧 **Email Provider** (Choose ONE)

#### Option 1: Resend (Recommended - Easy Setup)
1. Go to https://resend.com
2. Sign up for free account (3,000 emails/month free)
3. Create API key
4. Verify your domain OR use their test domain
5. Add to `.env.local`:
   ```
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_your_key_here
   EMAIL_FROM_ADDRESS=noreply@yourdomain.com
   EMAIL_FROM_NAME=CogniFlow
   ```

**Cost**: FREE for 3,000 emails/month, then $20/month for 50K

#### Option 2: SendGrid
1. Go to https://sendgrid.com
2. Create API key
3. Verify sender email
4. Add to `.env.local`:
   ```
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.your-key-here
   EMAIL_FROM_ADDRESS=noreply@yourdomain.com
   ```

#### Option 3: Gmail SMTP
1. Enable 2FA on your Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Add to `.env.local`:
   ```
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   EMAIL_FROM_ADDRESS=your-email@gmail.com
   ```

---

### 💬 **Slack Integration** (For Slack workflows)

#### Setup Steps:
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "CogniFlow" and select your workspace
4. Go to **OAuth & Permissions**
5. Add these Bot Token Scopes:
   - `chat:write`
   - `channels:read`
   - `users:read`
6. Click "Install to Workspace"
7. Copy the "Bot User OAuth Token" (starts with `xoxb-`)
8. Add to `.env.local`:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token-here
   ```
9. **Invite the bot to your channels**:
   - In Slack, type `/invite @CogniFlow` in each channel you want to use

**Test it**: Try sending a message to `#general` from a workflow!

---

### 🔴 **Redis Setup** (Required for job queue)

#### Option 1: Local Redis (Development)
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Check if running
redis-cli ping  # Should return "PONG"
```

Add to `.env.local`:
```
REDIS_URL=redis://localhost:6379
```

#### Option 2: Redis Cloud (Production)
1. Go to https://redis.com/try-free/
2. Create free account (30MB free tier)
3. Create database
4. Copy connection string
5. Add to `.env.local`:
   ```
   REDIS_URL=rediss://default:password@your-redis.cloud.redislabs.com:12345
   ```

---

### 📅 **Google Calendar/Gmail** (Optional - for triggers)

1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable APIs:
   - Gmail API
   - Google Calendar API
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Application type: Web application
6. Authorized redirect URIs:
   - http://localhost:3000/api/integrations/google/callback
   - https://yourapp.vercel.app/api/integrations/google/callback
7. Copy Client ID and Client Secret
8. Add to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-secret-here
   ```

---

## 🧪 Testing Your Setup

### 1. Test AI Integration
```bash
curl -X POST http://localhost:3000/api/ai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "prompt": "Say hello in 5 words"
  }'
```

### 2. Test Slack Integration
Go to `/workflows` → Click any workflow with Slack → Execute Now

### 3. Test Email
Create a simple workflow with email action → Execute

### 4. Test Full Workflow
1. Go to `/workflows`
2. Click "AI Email Triage → Slack Summary"
3. Click "Execute Now"
4. Check execution logs

---

## 🎬 Ready for Video Demo

### Checklist:
- [ ] Redis running (`redis-cli ping`)
- [ ] At least ONE AI API key configured
- [ ] Email provider configured (Resend recommended)
- [ ] Slack bot token configured
- [ ] Dev server running (`npm run dev`)
- [ ] Worker running (`npm run worker:dev`)
- [ ] Can login to http://localhost:3000
- [ ] Can see 3 demo workflows at `/workflows`

### Quick Test Flow:
1. Open http://localhost:3000
2. Login
3. Go to /workflows
4. Click "AI Email Triage → Slack Summary"
5. Click "Execute Now"
6. Should see: "Workflow Executing! Job ID: xxx"
7. Check worker terminal for execution logs

---

## 🐛 Troubleshooting

### "Cannot connect to Redis"
```bash
# Check if Redis is running
redis-cli ping

# Start Redis
brew services start redis
```

### "OpenAI API key not found"
```bash
# Check .env.local exists and has the key
cat .env.local | grep OPENAI_API_KEY

# Make sure to restart dev server after adding env vars
```

### "Slack message failed"
1. Check bot token starts with `xoxb-`
2. Make sure bot is invited to the channel: `/invite @CogniFlow`
3. Check scopes include `chat:write`

### "Email failed"
1. Check you selected the right provider in `EMAIL_PROVIDER`
2. Verify API key is correct
3. For Resend: Make sure sender domain is verified

### Worker not processing jobs
```bash
# Make sure worker is running
npm run worker:dev

# Check Redis connection
redis-cli ping

# Check for jobs in queue
redis-cli
> LLEN bullmq:workflow-execution:wait
```

---

## 🚀 Production Deployment

### Environment Variables for Production:
```bash
# Vercel deployment
vercel env add OPENAI_API_KEY
vercel env add RESEND_API_KEY
vercel env add SLACK_BOT_TOKEN
vercel env add REDIS_URL

# Redis Cloud for production
# Get from https://redis.com
```

### Deploy:
```bash
git push origin main  # Auto-deploys to Vercel

# Or manual
vercel --prod
```

---

## 💰 Cost Estimate (Monthly)

**Minimal Setup** (for demo/testing):
- Supabase: FREE (500MB database)
- Redis Cloud: FREE (30MB)
- Resend: FREE (3,000 emails)
- OpenAI: PAY-AS-YOU-GO (~$10-50/month depending on usage)
- Slack: FREE
- **Total: ~$10-50/month**

**Production Setup** (1K workflow executions/day):
- Supabase: FREE or $25/month (Pro)
- Redis Cloud: $5-10/month
- Resend: $20/month (50K emails)
- OpenAI: $100-200/month
- **Total: ~$150-250/month**

---

## 📚 Next Steps

1. ✅ Complete setup above
2. 📹 Record your demo video
3. 🎨 Customize workflow templates
4. 🔗 Add more integrations (Notion, GitHub, etc.)
5. 🚀 Deploy to production

## 🆘 Need Help?

- Check the logs: `npm run dev` and `npm run worker:dev`
- Review `.env.local` for missing variables
- Test individual components with curl commands above
- Check Redis: `redis-cli ping`

**Happy Automating! 🎉**
