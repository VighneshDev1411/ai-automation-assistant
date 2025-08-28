import { createClient } from '@/lib/supabase/client'

export interface IntegrationConfig {
  id: string
  name: string
  description: string
  icon: string
  category: string
  authType: 'oauth2' | 'apikey' | 'basic'
  scopes?: string[]
  endpoints: {
    auth?: string
    token?: string
    refresh?: string
    api: string
  }
  rateLimit: {
    requests: number
    per: 'second' | 'minute' | 'hour' | 'day'
  }
  actions: IntegrationAction[]
  triggers: IntegrationTrigger[]
}

export interface IntegrationAction {
  id: string
  name: string
  description: string
  inputs: ActionInput[]
  outputs: ActionOutput[]
  requiresAuth: boolean
}

export interface IntegrationTrigger {
  id: string
  name: string
  description: string
  type: 'webhook' | 'polling' | 'realtime'
  outputs: ActionOutput[]
}

export interface ActionInput {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  description: string
  default?: any
}

export interface ActionOutput {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
}

export interface IntegrationCredentials {
  access_token?: string
  refresh_token?: string
  api_key?: string
  expires_at?: number
  scope?: string
  [key: string]: any
}

export abstract class BaseIntegration {
  protected config: IntegrationConfig
  protected credentials: IntegrationCredentials | null = null
  protected supabase = createClient()

  constructor(config: IntegrationConfig) {
    this.config = config
  }

  // Abstract methods that each integration must implement
  abstract authenticate(params: any): Promise<IntegrationCredentials>
  abstract refreshToken(): Promise<IntegrationCredentials>
  abstract executeAction(actionId: string, inputs: any): Promise<any>
  abstract validateCredentials(): Promise<boolean>

  // Common methods
  getConfig(): IntegrationConfig {
    return this.config
  }

  setCredentials(credentials: IntegrationCredentials): void {
    this.credentials = credentials
  }

  getCredentials(): IntegrationCredentials | null {
    return this.credentials
  }

  async makeRequest(url: string, options: RequestInit = {}): Promise<any> {
    // ✅ FIX: Properly type the headers object
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    // Add authentication header based on auth type
    if (this.credentials) {
      if (this.config.authType === 'oauth2' && this.credentials.access_token) {
        headers['Authorization'] = `Bearer ${this.credentials.access_token}`
      } else if (this.config.authType === 'apikey' && this.credentials.api_key) {
        headers['Authorization'] = `Bearer ${this.credentials.api_key}`
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    lastCheck: Date
    error?: string
  }> {
    try {
      const isValid = await this.validateCredentials()
      return {
        status: isValid ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        error: isValid ? undefined : 'Credentials validation failed',
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}
