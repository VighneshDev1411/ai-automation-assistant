import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MicrosoftIntegration } from '@/lib/integrations/providers/microsoft/MicrosoftIntegration'

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

    // Fetch Microsoft integration credentials from database
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('provider', 'microsoft')
      .eq('organization_id', membership.organization_id)
      .eq('status', 'connected')
      .single()

    if (error || !integration) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Microsoft integration not found. Please connect Microsoft 365 integration first.',
          instructions:
            'Go to Settings > Integrations > Microsoft 365 and complete OAuth flow',
        },
        { status: 404 }
      )
    }

    // Initialize Microsoft integration
    const microsoftConfig = {
      clientId:
        process.env.MICROSOFT_CLIENT_ID ||
        process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID ||
        '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
      redirectUri:
        process.env.MICROSOFT_REDIRECT_URI ||
        `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/microsoft/callback`,
      scopes: ['Mail.Send', 'Mail.Read', 'Calendars.ReadWrite'],
    }

    const microsoftIntegration = new MicrosoftIntegration(
      microsoftConfig,
      (integration as any).credentials
    )

    // Test: Send a test email
    const testResult = await microsoftIntegration.sendEmail({
      to: user.email || 'test@example.com',
      subject: 'Test Email from Workflow Engine',
      body: 'This is a test email to verify Microsoft 365 integration is working correctly.',
    })

    // Test: Get calendar events (next 7 days)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)

    const calendarEvents = await microsoftIntegration.getCalendarEvents({
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      maxResults: 10,
    })

    return NextResponse.json({
      success: true,
      message: 'Microsoft 365 integration test successful',
      integration: {
        provider: 'microsoft',
        status: 'connected',
        organizationId: membership.organization_id,
      },
      testResults: {
        email: testResult,
        upcomingEvents: calendarEvents.events.slice(0, 5), // First 5 events
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Microsoft integration test error:', error)
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
