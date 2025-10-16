import { SlackIntegration } from '@/lib/integrations/providers/slack/SlackIntegration'

export async function testSlackIntegration(channelId?: string) {
  if (!process.env.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is not configured')
  }

  const slackConfig = {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/slack/callback`,
    scopes: ['chat:write', 'channels:read']
  }

  const slackCredentials = {
    access_token: process.env.SLACK_BOT_TOKEN,
    team_id: process.env.SLACK_TEAM_ID || '',
    team_name: process.env.SLACK_TEAM_NAME || 'Your Workspace',
    user_id: process.env.SLACK_USER_ID || '',
    scope: 'chat:write,channels:read',
    bot_user_id: process.env.SLACK_BOT_USER_ID || '',
    app_id: process.env.SLACK_APP_ID || ''
  }

  const slack = new SlackIntegration(slackConfig, slackCredentials)

  // Use provided channel ID or get from environment, default to 'general'
  const targetChannel = channelId || process.env.SLACK_DEFAULT_CHANNEL || 'general'

  // Test message
  const result = await slack.sendMessage(targetChannel, 'Hello from your workflow automation platform! 🚀', {
    username: 'Workflow Bot',
    icon_emoji: ':robot_face:'
  })

  console.log('Message sent:', result)
  return result
}