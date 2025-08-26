import { createClient } from '../supabase/client'
import type { Database } from '@/types/database'

export interface IntegrationConfig {
  provider: string
  name: string
  description: string
  authType: 'oauth2' | 'api_key' | 'basic'
  scopes?: string[]
  endpoints: {
    auth?: string
    token?: string
    refresh?: string
    revoke?: string
  }
  rateLimit: {
    requests: number
    per: 'minute' | 'hour' | 'day'
  }
}

export interface IntegrationCredentials {
  access_token?: string
  refresh_token?: string
  expires_at?: number
  api_key?: string
  client_id?: string
  client_secret?: string
  scope?: string
  team_name?: string
  team_id?:string
  bot_user_id?:string
}

export interface IntegrationAction {
  id: string
  name: string
  description: string
  inputs: Record<string, any>
  outputs: Record<string, any>
}

export interface IntegrationTrigger {
  id: string
  name: string
  description: string
  webhook?: boolean
  polling?: {
    interval: number
    endpoint: string
  }
}

export abstract class BaseIntegration {
  protected config: IntegrationConfig
  protected credentials: IntegrationCredentials | null = null
  protected supabase = createClient()

  constructor(config: IntegrationConfig) {
    this.config = config
  }

  // Abstract methods that must be implemented by each integration
  abstract authenticate(
    params: Record<string, any>
  ): Promise<IntegrationCredentials>
  abstract refreshToken(): Promise<IntegrationCredentials>
  abstract validateCredentials(): Promise<boolean>
  abstract getActions(): IntegrationAction[]
  abstract getTriggers(): IntegrationTrigger[]
  abstract executeAction(
    actionId: string,
    inputs: Record<string, any>
  ): Promise<any>

  // Common methods for all integrations

  async setCredentials(credentials: IntegrationCredentials): Promise<void> {
    this.credentials = credentials

    // Storing encrypted credentials in Supabase

    const { error } = await this.supabase.from('integrations').upsert({
      provider: this.config.provider,
      credentials: credentials,
      status: 'connected',
      last_synced_at: new Date().toISOString(),
    })
    if (error) throw error
  }

  async revokeAccess(): Promise<void> {
    if (this.credentials?.access_token && this.config.endpoints.revoke) {
      await fetch(this.config.endpoints.revoke, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.credentials.access_token}`,
        },
      })
    }

    // Updating the database

    await this.supabase
      .from('integrations')
      .update({
        status: 'disconnected',
        credentials: null,
      })
      .eq('provider', this.config.provider)
  }

  // Rate limiting helper
  // private rateLimitKey = `rate_limit_${this.config.provider}`
  async checkRateLimit(): Promise<boolean> {
    // Implementation would check against Redis or Supabase
    // For now, return type
    return true
  }

  // Basic common error handling
  protected handleApiError(error: any): Error {
    if (error.response?.status === 401) {
      return new Error('Authentication failed - credentials may be expired')
    }
    if (error.response?.status === 429) {
      return new Error('Rate limit exceeded')
    }
    return new Error(error.message || 'Integration error occurred')
  }

  // Webhook signature verification
  protected verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    // Implementation depends on provider's signature method
    // Common methods: HMAC-SHA256, HMAC-SHA1
    return true // Placeholder
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

// Integration Registry

export class IntegrationRegistry {
  private static instance: IntegrationRegistry
  private integrations = new Map<string, BaseIntegration>()

  static getInstance(): IntegrationRegistry {
    if (!this.instance) {
      this.instance = new IntegrationRegistry()
    }
    return this.instance
  }

  register(integration: BaseIntegration): void {
    this.integrations.set(integration.config.provider, integration)
  }

  get(provider: string): BaseIntegration | undefined {
    return this.integrations.get(provider)
  }

  getAll(): BaseIntegration[] {
    return Array.from(this.integrations.values())
  }

  getAvailable(): IntegrationConfig[] {
    return Array.from(this.integrations.values()).map(i => i.config)
  }
}

export class IntegrationManager {
  private registry = IntegrationRegistry.getInstance()
  private supabase = createClient()

  async connectIntegration(
    provider: string,
    organizationId: string,
    userId: string,
    authParams: Record<string, any>
  ): Promise<void> {
    const integration = this.registry.get(provider)
    if (!integration) {
      throw new Error(`Integration ${provider} not found. `)
    }

    try {
      // Authenticate with the provider

      const credentials = await integration.authenticate(authParams)

      // Storing the connection

      const { error } = await this.supabase.from('integrations').upsert({
        organization_id: organizationId,
        user_id: userId,
        provider,
        credentials,
        status: 'connected',
        settings: {},
        last_synced_at: new Date().toISOString(),
      })
      if (error) throw error
      await integration.setCredentials(credentials)
    } catch (error) {
      // Log error and update status
      await this.supabase.from('integrations').upsert({
        organization_id: organizationId,
        user_id: userId,
        provider,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  }

  async disconnectIntegration(
    provider: string,
    organizationId: string
  ): Promise<void> {
    const integration = this.registry.get(provider)
    if (integration) {
      await integration.revokeAccess()
    }

    await this.supabase
      .from('integrations')
      .update({ status: 'disconnected' })
      .eq('provider', provider)
      .eq('organization_id', organizationId)
  }

  async getIntegrationStatus(provider: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('provider', provider)
      .eq('organization_id', organizationId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async executeAction(
    provider: string,
    actionId: string,
    inputs: Record<string, any>
  ): Promise<any> {
    const integration = this.registry.get(provider)
    if (!integration) {
      throw new Error(`Integration ${provider} not found`)
    }

    // Checking the rate limit

    const canProceed = await integration.checkRateLimit()
    if (!canProceed) {
      throw new Error('Rate limit exceeded')
    }
    return integration.executeAction(actionId, inputs)
  }

  async runHealthChecks(): Promise<Record<string, any>> {
    const results: Record<string, any> = {}

    for (const integration of this.registry.getAll()) {
      try {
        results[integration.config.provider] = await integration.healthCheck()
      } catch (error) {
        results[integration.config.provider] = {
          status: 'unhealthy',
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    return results
  }
}
