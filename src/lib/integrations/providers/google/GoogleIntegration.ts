// src/lib/integrations/providers/google/GoogleIntegration.ts

import { OAuth2Client } from 'google-auth-library'
import { BaseIntegration } from '../../base-integration'

export interface GoogleCredentials {
  access_token: string
  refresh_token: string
  expiry_date?: number
  scope: string
  token_type: string
  id_token?: string
}

export interface GoogleConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export class GoogleIntegration extends BaseIntegration {
  private oauth2Client: OAuth2Client
  private googleConfig: GoogleConfig

  constructor(config: GoogleConfig, credentials?: GoogleCredentials) {
    super({
      id: 'google',
      name: 'Google Workspace',
      description: 'Connect to Gmail, Google Drive, Sheets, Calendar and more',
      icon: '🔗',
      category: 'productivity',
      authType: 'oauth2',
      scopes: config.scopes,
      endpoints: {
        auth: 'https://accounts.google.com/o/oauth2/v2/auth',
        token: 'https://oauth2.googleapis.com/token',
        refresh: 'https://oauth2.googleapis.com/token',
        api: 'https://www.googleapis.com'
      },
      rateLimit: {
        requests: 100,
        per: 'minute'
      },
      actions: [],
      triggers: []
    })
    this.googleConfig = config
    this.oauth2Client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    )

    if (credentials) {
      this.oauth2Client.setCredentials(credentials)
      this.setCredentials(credentials)
    }
  }

  // Generate OAuth URL for user authorization
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    })
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<GoogleCredentials> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code)

      const credentials: GoogleCredentials = {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        expiry_date: tokens.expiry_date ?? undefined,
        scope: tokens.scope!,
        token_type: tokens.token_type || 'Bearer',
        id_token: tokens.id_token ?? undefined
      }

      this.oauth2Client.setCredentials(tokens)
      return credentials
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error}`)
    }
  }

  // Refresh access token if expired
  async refreshAccessToken(): Promise<GoogleCredentials> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()

      const refreshedCredentials: GoogleCredentials = {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token!,
        expiry_date: credentials.expiry_date ?? undefined,
        scope: credentials.scope!,
        token_type: credentials.token_type || 'Bearer',
        id_token: credentials.id_token ?? undefined
      }

      return refreshedCredentials
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error}`)
    }
  }

  // Check if token is expired and refresh if needed
  async ensureValidToken(): Promise<void> {
    const tokenInfo = await this.oauth2Client.getTokenInfo(
      this.oauth2Client.credentials.access_token!
    )

    // If token expires in less than 5 minutes, refresh it
    const expiryTime = this.oauth2Client.credentials.expiry_date || 0
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000)

    if (expiryTime < fiveMinutesFromNow) {
      await this.refreshAccessToken()
    }
  }

  // Make authenticated request to Google API
  async makeAuthenticatedRequest(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    await this.ensureValidToken()

    const headers = {
      'Authorization': `Bearer ${this.oauth2Client.credentials.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google API request failed: ${response.status} ${errorText}`)
    }

    return response
  }

  // Get current user info
  async getCurrentUser(): Promise<{
    id: string
    email: string
    name: string
    picture?: string
  }> {
    const response = await this.makeAuthenticatedRequest(
      'https://www.googleapis.com/oauth2/v2/userinfo'
    )

    const userInfo = await response.json()
    
    return {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.getCurrentUser()
      return true
    } catch (error) {
      console.error('Google connection test failed:', error)
      return false
    }
  }

  // BaseIntegration abstract methods implementation
  async authenticate(params: { code: string }): Promise<GoogleCredentials> {
    return this.exchangeCodeForTokens(params.code)
  }

  async refreshToken(): Promise<GoogleCredentials> {
    return this.refreshAccessToken()
  }

  async validateCredentials(): Promise<boolean> {
    return this.testConnection()
  }

  async executeAction(_actionId: string, _inputs: Record<string, any>): Promise<any> {
    throw new Error('Use specific Google service integrations')
  }
}

// Google-specific error handling
export class GoogleAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public googleError?: any
  ) {
    super(message)
    this.name = 'GoogleAPIError'
  }
}

// Utility functions for Google API responses
export const handleGoogleAPIError = (error: any): never => {
  if (error.response) {
    const { status, data } = error.response
    throw new GoogleAPIError(
      data.error?.message || 'Google API error',
      status,
      data.error
    )
  }
  throw new GoogleAPIError(error.message || 'Unknown Google API error')
}

// Rate limiting helper
export class GoogleRateLimiter {
  private requests: number[] = []
  private maxRequests: number
  private timeWindow: number

  constructor(maxRequests = 100, timeWindowMs = 60000) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindowMs
  }

  async checkRateLimit(): Promise<void> {
    const now = Date.now()
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = this.timeWindow - (now - oldestRequest)
      
      console.log(`Rate limit hit, waiting ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      
      // Recursively check again
      return this.checkRateLimit()
    }
    
    this.requests.push(now)
  }
}