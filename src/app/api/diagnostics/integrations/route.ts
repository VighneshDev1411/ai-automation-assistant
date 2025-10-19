import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, joined_at')
      .eq('user_id', user.id)

    const membership = (memberships || []).find(m => m.joined_at !== null)

    if (!membership) {
      return NextResponse.json({
        error: 'No organization found',
        userId: user.id,
        hasOrganization: false,
      })
    }

    // Get all integrations for the organization
    const { data: integrations, error: integrationsError } = await supabase
      .from('integrations')
      .select('provider, status, created_at, last_synced_at')
      .eq('organization_id', membership.organization_id)

    // Check environment variables (don't expose actual values)
    const envVars = {
      googleClientId: !!process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      notionClientId: !!process.env.NOTION_CLIENT_ID,
      notionClientSecret: !!process.env.NOTION_CLIENT_SECRET,
      slackClientId: !!process.env.SLACK_CLIENT_ID,
      slackClientSecret: !!process.env.SLACK_CLIENT_SECRET,
      openaiApiKey: !!process.env.OPENAI_API_KEY,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      organization: {
        id: membership.organization_id,
        joined_at: membership.joined_at,
      },
      integrations: integrations || [],
      integrationsError: integrationsError?.message,
      environmentVariables: envVars,
      summary: {
        totalIntegrations: integrations?.length || 0,
        connectedIntegrations: integrations?.filter(i => i.status === 'connected').length || 0,
        missingEnvVars: Object.entries(envVars).filter(([_, exists]) => !exists).map(([key]) => key),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
