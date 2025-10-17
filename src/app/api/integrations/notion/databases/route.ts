import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import NotionIntegration from '@/lib/integrations/notion/NotionIntegration'

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get Notion integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('credentials')
      .eq('provider', 'notion')
      .eq('organization_id', membership.organization_id)
      .eq('status', 'connected')
      .maybeSingle()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Notion integration not connected' },
        { status: 404 }
      )
    }

    // List databases
    const notion = new NotionIntegration(integration.credentials)
    const databases = await notion.listDatabases()

    return NextResponse.json({ databases })
  } catch (error: any) {
    console.error('Error listing Notion databases:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to list databases' },
      { status: 500 }
    )
  }
}
