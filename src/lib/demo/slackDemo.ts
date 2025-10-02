import { SlackIntegration } from '@/lib/integrations/providers/slack/SlackIntegration'

export async function testSlackIntegration() {
  const slackConfig = {
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
    redirectUri: 'http://localhost:3000/auth/slack/callback',
    scopes: ['chat:write', 'channels:read']
  }

  const slackCredentials = {
    access_token: process.env.SLACK_BOT_TOKEN!,
    team_id: 'your-team-id',
    team_name: 'Your Workspace',
    user_id: 'your-user-id',
    scope: 'chat:write,channels:read',
    bot_user_id: 'bot-user-id',
    app_id: 'your-app-id'
  }

  const slack = new SlackIntegration(slackConfig, slackCredentials)

  // Test message
  const result = await slack.sendMessage('#demo-workflow', 'Hello from your workflow automation platform! 🚀', {
    username: 'Workflow Bot',
    icon_emoji: ':robot_face:'
  })

  console.log('Message sent:', result)
  return result
}