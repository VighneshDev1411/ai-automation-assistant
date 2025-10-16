// API endpoint to fetch Slack channels dynamically
import { NextRequest, NextResponse } from 'next/server'
import { SlackIntegration } from '@/lib/integrations/providers/slack/SlackIntegration'

export async function GET(request: NextRequest) {
  try {
    // Configure Slack integration with actual credentials
    const slackConfig = {
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/slack/callback`,
      scopes: ['chat:write', 'channels:read', 'im:write', 'groups:read']
    }

    const slackCredentials = {
      access_token: process.env.SLACK_BOT_TOKEN || '',
      team_id: process.env.SLACK_TEAM_ID || '',
      team_name: process.env.SLACK_TEAM_NAME || 'Your Workspace',
      user_id: process.env.SLACK_USER_ID || '',
      scope: 'chat:write,channels:read,im:write,groups:read',
      bot_user_id: process.env.SLACK_BOT_USER_ID || ''
    }

    if (!slackCredentials.access_token || slackCredentials.access_token === 'undefined') {
      return NextResponse.json({
        error: 'Slack bot token not configured',
        channels: [],
        workspaces: []
      }, { status: 400 })
    }

    // Initialize Slack integration
    const slack = new SlackIntegration(slackConfig, slackCredentials)

    // Fetch channels
    try {
      const channelData = await slack.executeAction('list_channels', {})
      const channels = channelData?.channels || []

      // Format channels for dropdown
      const formattedChannels = channels.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        display: `#${ch.name}`,
        isMember: ch.is_member,
        isPrivate: ch.is_private
      }))

      // For now, workspace is just the one from env
      const workspaces = [{
        id: slackCredentials.team_id,
        name: slackCredentials.team_name,
        display: slackCredentials.team_name
      }]

      return NextResponse.json({
        channels: formattedChannels,
        workspaces: workspaces,
        success: true
      })
    } catch (slackError: any) {
      console.error('Slack API error:', slackError.message)

      return NextResponse.json({
        error: slackError.message,
        channels: [],
        workspaces: [{
          id: slackCredentials.team_id,
          name: slackCredentials.team_name,
          display: slackCredentials.team_name
        }]
      }, { status: 200 }) // Return 200 with empty channels rather than error
    }

  } catch (error: any) {
    console.error('Error fetching Slack data:', error)
    return NextResponse.json({
      error: error.message || 'Internal server error',
      channels: [],
      workspaces: []
    }, { status: 500 })
  }
}
