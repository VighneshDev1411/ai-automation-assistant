// supabase/functions/oauth-handler/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface OAuthRequest {
  provider: string
  code: string
  state?: string
  organizationId: string
}

interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  scope?: string
}

// Provider configurations
const OAUTH_CONFIGS = {
  google: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly']
  },
  github: {
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['user:email', 'repo']
  },
  slack: {
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    userInfoUrl: 'https://slack.com/api/auth.test',
    scopes: ['channels:read', 'chat:write', 'users:read']
  },
  microsoft: {
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'profile', 'email', 'offline_access', 'https://graph.microsoft.com/mail.read']
  }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    const requestData: OAuthRequest = await req.json()
    const { provider, code, organizationId } = requestData

    if (!OAUTH_CONFIGS[provider as keyof typeof OAUTH_CONFIGS]) {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    const config = OAUTH_CONFIGS[provider as keyof typeof OAUTH_CONFIGS]

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(provider, code, config)
    
    // Get user info from the provider
    const userInfo = await getUserInfo(provider, tokenResponse.access_token, config)

    // Store the integration in database
    const { error: dbError } = await supabase
      .from('integrations')
      .upsert({
        organization_id: organizationId,
        user_id: user.id,
        provider,
        status: 'connected',
        credentials: {
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          expires_at: tokenResponse.expires_in 
            ? Date.now() + (tokenResponse.expires_in * 1000) 
            : null,
          token_type: tokenResponse.token_type,
          scope: tokenResponse.scope
        },
        settings: {
          user_info: userInfo,
          connected_at: new Date().toISOString()
        },
        last_synced_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error('Failed to store integration')
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider,
        user_info: userInfo,
        message: `${provider} integration connected successfully`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('OAuth error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function exchangeCodeForToken(
  provider: string, 
  code: string, 
  config: any
): Promise<OAuthTokenResponse> {
  const clientId = Deno.env.get(`${provider.toUpperCase()}_CLIENT_ID`)
  const clientSecret = Deno.env.get(`${provider.toUpperCase()}_CLIENT_SECRET`)
  const redirectUri = Deno.env.get(`${provider.toUpperCase()}_REDIRECT_URI`) || 
                     `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth-handler`

  if (!clientId || !clientSecret) {
    throw new Error(`Missing OAuth credentials for ${provider}`)
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  })

  // Special handling for different providers
  if (provider === 'microsoft') {
    params.set('scope', config.scopes.join(' '))
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  // GitHub requires Accept header
  if (provider === 'github') {
    headers['Accept'] = 'application/json'
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: params
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Token exchange failed for ${provider}:`, errorText)
    throw new Error(`Token exchange failed: ${response.status}`)
  }

  const tokenData = await response.json()
  
  // Handle different response formats
  if (tokenData.error) {
    throw new Error(`OAuth error: ${tokenData.error_description || tokenData.error}`)
  }

  return tokenData
}

async function getUserInfo(provider: string, accessToken: string, config: any): Promise<any> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`
  }

  // Slack uses different auth format
  if (provider === 'slack') {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(config.userInfoUrl, {
    method: 'GET',
    headers
  })

  if (!response.ok) {
    console.error(`User info request failed for ${provider}:`, response.status)
    throw new Error(`Failed to get user info: ${response.status}`)
  }

  const userInfo = await response.json()

  // Normalize user info across providers
  return normalizeUserInfo(provider, userInfo)
}

function normalizeUserInfo(provider: string, rawUserInfo: any): any {
  const baseInfo = {
    provider,
    raw: rawUserInfo
  }

  switch (provider) {
    case 'google':
      return {
        ...baseInfo,
        id: rawUserInfo.id,
        email: rawUserInfo.email,
        name: rawUserInfo.name,
        picture: rawUserInfo.picture,
        verified_email: rawUserInfo.verified_email
      }
    
    case 'github':
      return {
        ...baseInfo,
        id: rawUserInfo.id,
        login: rawUserInfo.login,
        name: rawUserInfo.name,
        email: rawUserInfo.email,
        avatar_url: rawUserInfo.avatar_url,
        html_url: rawUserInfo.html_url
      }
    
    case 'slack':
      return {
        ...baseInfo,
        ok: rawUserInfo.ok,
        user_id: rawUserInfo.user_id,
        team_id: rawUserInfo.team_id,
        team: rawUserInfo.team,
        user: rawUserInfo.user
      }
    
    case 'microsoft':
      return {
        ...baseInfo,
        id: rawUserInfo.id,
        displayName: rawUserInfo.displayName,
        mail: rawUserInfo.mail,
        userPrincipalName: rawUserInfo.userPrincipalName
      }
    
    default:
      return baseInfo
  }
}