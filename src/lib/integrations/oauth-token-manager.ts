import { createClient } from '@/lib/supabase/server'

export interface TokenRefreshResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  error?: string
}

export class OAuthTokenManager {
  /**
   * Check if access token is expired or about to expire (within 5 minutes)
   */
  static isTokenExpired(expiresAt: string | Date): boolean {
    const expiryDate = new Date(expiresAt)
    const now = new Date()
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

    return expiryDate <= fiveMinutesFromNow
  }

  /**
   * Refresh OAuth token for a given integration
   */
  static async refreshToken(
    integrationId: string,
    provider: string,
    currentRefreshToken: string
  ): Promise<TokenRefreshResult> {
    try {
      console.log(`Refreshing token for integration: ${integrationId}`)

      let newTokens: any

      switch (provider) {
        case 'google':
          newTokens = await this.refreshGoogleToken(currentRefreshToken)
          break

        case 'microsoft':
          newTokens = await this.refreshMicrosoftToken(currentRefreshToken)
          break

        case 'slack':
          newTokens = await this.refreshSlackToken(currentRefreshToken)
          break

        case 'github':
          // GitHub tokens don't expire, no refresh needed
          return {
            success: true,
            accessToken: currentRefreshToken,
          }

        default:
          throw new Error(`Unsupported provider: ${provider}`)
      }

      // Update token in database
      const supabase = await createClient()
      const { error: updateError } = await supabase
        .from('integrations')
        .update({
          access_token: newTokens.accessToken,
          refresh_token: newTokens.refreshToken || currentRefreshToken,
          token_expires_at: newTokens.expiresAt?.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', integrationId)

      if (updateError) {
        throw new Error(`Failed to update tokens: ${updateError.message}`)
      }

      console.log(`Token refreshed successfully for integration: ${integrationId}`)

      return {
        success: true,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: newTokens.expiresAt,
      }
    } catch (error: any) {
      console.error('Token refresh error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  static async getValidAccessToken(integration: any): Promise<string | null> {
    // Check if token needs refresh
    if (integration.token_expires_at && this.isTokenExpired(integration.token_expires_at)) {
      console.log('Token expired, refreshing...')

      const refreshResult = await this.refreshToken(
        integration.id,
        integration.provider,
        integration.refresh_token
      )

      if (!refreshResult.success || !refreshResult.accessToken) {
        console.error('Failed to refresh token:', refreshResult.error)
        return null
      }

      return refreshResult.accessToken
    }

    return integration.access_token
  }

  private static async refreshGoogleToken(refreshToken: string) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Google token refresh failed: ${error.error_description || error.error}`)
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Google might not return new refresh token
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  }

  private static async refreshMicrosoftToken(refreshToken: string) {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'offline_access https://graph.microsoft.com/.default',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Microsoft token refresh failed: ${error.error_description || error.error}`)
    }

    const data = await response.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  }

  private static async refreshSlackToken(refreshToken: string) {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      throw new Error(`Slack token refresh failed: ${data.error}`)
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    }
  }
}
