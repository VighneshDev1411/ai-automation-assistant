// File: src/app/api/webhooks/demo-form/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { SlackIntegration } from '@/lib/integrations/providers/slack/SlackIntegration'

export async function POST(request: NextRequest) {
  console.log('🚀 Webhook triggered!')

  try {
    // Get form data
    const formData = await request.json()
    console.log('📝 Form data received:', formData)

    // Configure Slack integration with actual credentials
    if (!process.env.SLACK_BOT_TOKEN) {
      throw new Error('SLACK_BOT_TOKEN is not configured')
    }

    const slackConfig = {
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/slack/callback`,
      scopes: ['chat:write', 'channels:read', 'im:write', 'groups:write']
    }

    const slackCredentials = {
      access_token: process.env.SLACK_BOT_TOKEN,
      team_id: process.env.SLACK_TEAM_ID || '',
      team_name: process.env.SLACK_TEAM_NAME || 'Your Workspace',
      user_id: process.env.SLACK_USER_ID || '',
      scope: 'chat:write,channels:read,im:write,groups:write',
      bot_user_id: process.env.SLACK_BOT_USER_ID || ''
    }

    console.log('🔑 Using Slack token:', process.env.SLACK_BOT_TOKEN?.substring(0, 20) + '...')
    console.log('🏢 Team ID:', slackCredentials.team_id)

    // Initialize Slack integration
    const slack = new SlackIntegration(slackConfig, slackCredentials)

    // Try to list available channels to auto-detect
    console.log('📋 Attempting to fetch available channels...')
    let targetChannel = process.env.SLACK_DEFAULT_CHANNEL || 'general' // Use configured default channel

    try {
      const channelData = await slack.executeAction('list_channels', {})
      const channels = channelData?.channels || []

      if (channels.length > 0) {
        console.log('✅ Found', channels.length, 'channels')

        // Log all channels
        channels.forEach((ch: any) => {
          console.log(`  - ${ch.name} (ID: ${ch.id})${ch.is_member ? ' ✓ Bot is member' : ' ✗ Not member'}`)
        })

        // Try to find demo-workflow channel first
        const demoChannel = channels.find((ch: any) => ch.name === 'demo-workflow' && ch.is_member)
        if (demoChannel) {
          targetChannel = demoChannel.id
          console.log('✅ Using demo-workflow channel ID:', targetChannel)
        } else {
          // Fallback to any channel where bot is a member
          const memberChannel = channels.find((ch: any) => ch.is_member)
          if (memberChannel) {
            targetChannel = memberChannel.id
            console.log('✅ Using fallback channel:', memberChannel.name, 'ID:', targetChannel)
          } else {
            console.warn('⚠️ Bot is not a member of any channels!')
          }
        }
      }
    } catch (listError: any) {
      console.warn('⚠️ Could not list channels (error:', listError.message, ')')
      console.warn('⚠️ This usually means missing "channels:read" scope in your bot token')
      console.warn('⚠️ Will try to send to "demo-workflow" channel anyway...')
    }

    // Create rich Slack message
    const message = `🎉 *New Form Submission*

*Name:* ${formData.name}
*Email:* ${formData.email}
*Message:* ${formData.message}
*Time:* ${new Date(formData.timestamp).toLocaleString()}

_Automated via Workflow Platform_ ⚡`

    // Send to Slack
    console.log('📤 Sending to Slack channel:', targetChannel)
    // Use the channel ID we found (or default to 'general')
    const slackResult = await slack.executeAction('send_message', {
      channel: targetChannel,  // Channel ID (like C1234567890) works best
      text: message,
      username: 'Workflow Bot',
      icon_emoji: ':robot_face:'
    })
    
    console.log('✅ Slack message sent:', slackResult)
    
    return NextResponse.json({
      success: true,
      message: 'Workflow executed successfully!',
      steps: {
        webhook: 'received',
        slack: 'sent',
        messageId: slackResult.ts
      },
      data: formData
    })
    
  } catch (error) {
    console.error('❌ Webhook error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}