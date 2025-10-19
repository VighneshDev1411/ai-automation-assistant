# Deployment Guide - AI Automation Platform

## Critical Environment Variables for Production

### Required for Basic Functionality

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application Configuration (REQUIRED)
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NODE_ENV=production

# Timezone Configuration (OPTIONAL - defaults to America/Chicago)
DEFAULT_TIMEZONE=America/Chicago

# Cron Job Security (REQUIRED for scheduled workflows)
CRON_SECRET=your_random_secret_here_use_openssl_rand
```

### Required for Integrations

**IMPORTANT:** If you want Gmail, Notion, or Slack workflows to work in production, you MUST set these environment variables:

```bash
# Google/Gmail Integration (REQUIRED for Gmail workflows)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://your-domain.com/api/integrations/google/callback
NEXT_PUBLIC_GOOGLE_AUTH_URL=https://accounts.google.com/o/oauth2/v2/auth?...

# Notion Integration (REQUIRED for Notion workflows)
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NEXT_PUBLIC_NOTION_REDIRECT_URI=https://your-domain.com/api/integrations/notion/callback
NEXT_PUBLIC_NOTION_AUTH_URL=https://api.notion.com/v1/oauth/authorize?...

# Slack Integration (REQUIRED for Slack workflows)
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
```

### Required for AI Features

```bash
# OpenAI (REQUIRED for AI Agent nodes)
OPENAI_API_KEY=sk-your_openai_api_key

# Anthropic (OPTIONAL)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google AI (OPTIONAL)
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

## Deployment Platforms

### Vercel Deployment

1. **Set Environment Variables:**
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add ALL the environment variables listed above
   - Make sure to set them for "Production" environment

2. **Deploy:**
   ```bash
   vercel --prod
   ```

3. **Verify:**
   - Visit `https://your-domain.com/api/diagnostics/integrations`
   - Check that all required environment variables show as `true`
   - Verify integrations are connected

### Common Production Issues

#### Issue 1: "Gmail integration not connected" in production

**Cause:** Missing GOOGLE_CLIENT_SECRET or integration not reconnected in production

**Solution:**
1. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in production environment
2. Go to `/integrations` page in production
3. Click "Connect" on Gmail integration
4. Complete OAuth flow
5. Verify credentials are stored by visiting `/api/diagnostics/integrations`

#### Issue 2: "Notion integration not connected" in production

**Cause:** Missing NOTION_CLIENT_SECRET or integration not reconnected in production

**Solution:**
1. Ensure NOTION_CLIENT_ID and NOTION_CLIENT_SECRET are set in production environment
2. Go to `/integrations` page in production
3. Click "Connect" on Notion integration
4. Complete OAuth flow
5. Verify credentials are stored by visiting `/api/diagnostics/integrations`

#### Issue 3: "Workflow has no organization_id set"

**Cause:** Workflows created before organization membership was established

**Solution:**
1. Check user organization: `SELECT * FROM organization_members WHERE user_id = 'your_user_id'`
2. Update workflow: `UPDATE workflows SET organization_id = 'org_id' WHERE created_by = 'user_id'`
3. Or recreate the workflow after joining/creating an organization

#### Issue 4: Works in localhost but not production

**Cause:** Environment variables not synced between local and production

**Solution:**
1. Compare `.env.local` with production environment variables
2. Use `/api/diagnostics/integrations` endpoint to check what's missing
3. Update production environment variables
4. Redeploy the application
5. Reconnect integrations in production environment

## OAuth Callback URLs

Make sure these URLs are registered in your OAuth provider settings:

### Google OAuth Console
- Authorized redirect URIs: `https://your-domain.com/api/integrations/google/callback`

### Notion OAuth Settings
- Redirect URI: `https://your-domain.com/api/integrations/notion/callback`

### Slack OAuth Settings
- Redirect URI: `https://your-domain.com/api/integrations/slack/callback`

## Database Setup

Ensure your Supabase database has:
1. `integrations` table with columns: `id`, `provider`, `organization_id`, `credentials`, `status`, `created_at`, `last_synced_at`
2. `organization_members` table with columns: `user_id`, `organization_id`, `joined_at`
3. `workflows` table with `organization_id` column
4. Proper RLS policies for organization-based access

## Troubleshooting

### Check Integration Status
Visit: `https://your-domain.com/api/diagnostics/integrations`

This will show:
- Your user ID and organization
- All connected integrations
- Environment variable status (without exposing values)
- Missing configuration

### Check Workflow Execution Logs
Check browser console or Vercel logs for:
```
📝 Integration lookup result: { found: false, ... }
```

This will tell you exactly why the integration lookup failed.

### Test Individual Components

1. **Test Supabase Connection:**
   ```bash
   curl https://your-domain.com/api/test-supabase
   ```

2. **Test Integration:**
   ```bash
   curl https://your-domain.com/api/diagnostics/integrations \
     -H "Cookie: your-auth-cookie"
   ```

## Security Notes

- Never commit `.env` or `.env.local` files to git
- Use strong random values for CRON_SECRET: `openssl rand -base64 32`
- Rotate OAuth secrets periodically
- Use Supabase RLS policies to restrict access
- Keep SUPABASE_SERVICE_ROLE_KEY secret - it bypasses RLS

## Support

If workflows still don't work after following this guide:
1. Check `/api/diagnostics/integrations` output
2. Verify OAuth callbacks are correctly configured
3. Check Vercel/deployment platform logs
4. Ensure integrations are reconnected in production (not just localhost)
