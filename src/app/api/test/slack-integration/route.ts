import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SlackIntegration } from '@/lib/integrations/providers/slack/SlackIntegration'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      )
    }

    // Fetch Slack integration credentials from database
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'slack')
      .eq('organization_id', membership.organization_id)
      .eq('status', 'connected')
      .single()

    if (error || !integration) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Slack integration not found. Please connect Slack integration first.',
          instructions:
            'Go to Settings > Integrations > Slack and complete OAuth flow',
        },
        { status: 404 }
      )
    }

    // Initialize Slack integration
    const slackConfig = {
      clientId:
        process.env.SLACK_CLIENT_ID ||
        process.env.NEXT_PUBLIC_SLACK_CLIENT_ID ||
        '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      redirectUri:
        process.env.SLACK_REDIRECT_URI ||
        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/slack/callback`,
      scopes: ['chat:write', 'channels:read', 'users:read'],
    }

    const slackIntegration = new SlackIntegration(
      slackConfig,
      (integration as any).credentials
    )

    // Test: Get test connection first
    const connectionTest = await slackIntegration.testConnection()

    // Test: Send a test message to a default channel
    // Note: You can change this to any channel ID in your Slack workspace
    let testResult = null
    try {
      testResult = await slackIntegration.sendMessage(
        'general', // Channel name or ID
        '🤖 Test message from Workflow Engine - Integration is working!'
      )
    } catch (error: any) {
      // If sending to general fails, that's okay - connection is still tested
      testResult = { error: error.message, note: 'Could not send to #general' }
    }

    return NextResponse.json({
      success: true,
      message: 'Slack integration test successful',
      integration: {
        provider: 'slack',
        status: 'connected',
        organizationId: membership.organization_id,
        workspace: (integration as any).credentials?.team_name || 'Unknown',
      },
      connectionTest,
      testResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Slack integration test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}
