import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GmailIntegration } from '@/lib/integrations/providers/google/GmailIntegration'

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

    // Fetch Google integration credentials from database
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'google')
      .eq('organization_id', membership.organization_id)
      .eq('status', 'connected')
      .single()

    if (error || !integration) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Google integration not found. Please connect Google integration first.',
          instructions:
            'Go to Settings > Integrations > Google and complete OAuth flow',
        },
        { status: 404 }
      )
    }

    // Initialize Google integration
    const googleConfig = {
      clientId:
        process.env.GOOGLE_CLIENT_ID ||
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI ||
        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`,
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
      ],
    }

    const gmailIntegration = new GmailIntegration(
      googleConfig,
      (integration as any).credentials
    )

    // Test: Send a test email (you can customize this)
    if (!user.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'User email not found. Cannot send test email.',
        },
        { status: 400 }
      )
    }

    const testResult = await gmailIntegration.sendEmail({
      to: user.email,
      subject: 'Test Email from Workflow Engine',
      body: 'This is a test email to verify Gmail integration is working correctly.',
    })

    return NextResponse.json({
      success: true,
      message: 'Google integration test successful',
      integration: {
        provider: 'google',
        status: 'connected',
        organizationId: membership.organization_id,
      },
      testResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Google integration test error:', error)
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
