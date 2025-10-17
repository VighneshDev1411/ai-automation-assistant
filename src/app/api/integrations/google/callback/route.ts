import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/integrations?error=no_code', request.url)
      )
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/integrations?error=no_tokens', request.url)
      )
    }

    // Set credentials to get user info
    oauth2Client.setCredentials(tokens)

    // Get user's Gmail profile
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })

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
      .eq('provider', 'google')
      .eq('organization_id', membership.organization_id)
      .maybeSingle()

    const integrationData = {
      organization_id: membership.organization_id,
      user_id: user.id,
      provider: 'google',
      status: 'connected' as const,
      credentials: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        scope: tokens.scope,
        token_type: tokens.token_type,
        email: profile.data.emailAddress,
      },
      settings: {
        email_address: profile.data.emailAddress,
        messages_total: profile.data.messagesTotal,
        threads_total: profile.data.threadsTotal,
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
        console.error('Error updating Google integration:', updateError)
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
        console.error('Error saving Google integration:', insertError)
        return NextResponse.redirect(
          new URL('/integrations?error=database_error', request.url)
        )
      }
    }

    // Redirect to integrations page with success message
    return NextResponse.redirect(
      new URL('/integrations?success=google_connected', request.url)
    )
  } catch (error: any) {
    console.error('Google callback error:', error)
    return NextResponse.redirect(
      new URL(`/integrations?error=${encodeURIComponent(error.message)}`, request.url)
    )
  }
}
