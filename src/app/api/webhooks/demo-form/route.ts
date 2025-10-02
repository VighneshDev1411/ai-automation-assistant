// File: src/app/api/webhooks/demo-form/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { SlackIntegration } from '@/lib/integrations/providers/slack/SlackIntegration'

export async function POST(request: NextRequest) {
  console.log('🚀 Webhook triggered!')
  
  try {
    // Get form data
    const formData = await request.json()
    console.log('📝 Form data received:', formData)
    
    // Configure Slack integration
    const slackConfig = {
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
      signingSecret: process.env.SLACK_SIGNING_SECRET!,
      redirectUri: 'http://localhost:3000/auth/slack/callback',
      scopes: ['chat:write', 'channels:read']
    }

    const slackCredentials = {
      access_token: process.env.SLACK_BOT_TOKEN!,
      team_id: 'demo-team',
      team_name: 'Demo Workspace',
      user_id: 'demo-user',
      scope: 'chat:write,channels:read',
      bot_user_id: 'demo-bot'
    }

    // Initialize Slack integration
    const slack = new SlackIntegration(slackConfig, slackCredentials)
    
    // Create rich Slack message
    const message = `🎉 *New Form Submission*
    
*Name:* ${formData.name}
*Email:* ${formData.email}
*Message:* ${formData.message}
*Time:* ${new Date(formData.timestamp).toLocaleString()}

_Automated via Workflow Platform_ ⚡`

    // Send to Slack
    console.log('📤 Sending to Slack...')
    const slackResult = await slack.executeAction('send_message', {
      channel: '#general',  // Change to your channel
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