import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Notion OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/integrations?error=no_code', request.url)
      )
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.NOTION_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Notion token exchange error:', errorData)
      return NextResponse.redirect(
        new URL('/integrations?error=token_exchange_failed', request.url)
      )
    }

    const tokenData = await tokenResponse.json()

    // Get user from Supabase
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get user's organization
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id, joined_at')
      .eq('user_id', user.id)

    const membership = (memberships || []).find(m => m.joined_at !== null)

    if (!membership) {
      return NextResponse.redirect(
        new URL('/integrations?error=no_organization', request.url)
      )
    }

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from('integrations')
      .select('id')
      .eq('provider', 'notion')
      .eq('organization_id', membership.organization_id)
      .maybeSingle()

    const integrationData = {
      organization_id: membership.organization_id,
      user_id: user.id,
      provider: 'notion',
      status: 'connected' as const,
      credentials: {
        access_token: tokenData.access_token,
        workspace_id: tokenData.workspace_id,
        workspace_name: tokenData.workspace_name,
        workspace_icon: tokenData.workspace_icon,
        bot_id: tokenData.bot_id,
        owner: tokenData.owner,
      },
      settings: {
        duplicated_template_id: tokenData.duplicated_template_id,
      },
      last_synced_at: new Date().toISOString(),
    }

    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from('integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)

      if (updateError) {
        console.error('Error updating Notion integration:', updateError)
        return NextResponse.redirect(
          new URL('/integrations?error=database_error', request.url)
        )
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabase
        .from('integrations')
        .insert(integrationData)

      if (insertError) {
        console.error('Error saving Notion integration:', insertError)
        return NextResponse.redirect(
          new URL('/integrations?error=database_error', request.url)
        )
      }
    }

    // Redirect to integrations page with success message
    return NextResponse.redirect(
      new URL('/integrations?success=notion_connected', request.url)
    )
  } catch (error: any) {
    console.error('Notion callback error:', error)
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }
}
