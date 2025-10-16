import { IntegrationRegistry } from './IntegrationRegistry'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'

export class IntegrationManager {
  private registry = IntegrationRegistry
  private supabase = createClient()

  async connectIntegration(
    providerId: string,
    organizationId: string,
    authParams: any
  ): Promise<void> {
    const integration = this.registry.getIntegration(providerId)
    if (!integration) {
      throw new Error(`Integration ${providerId} not found`)
    }

    try {
      // Authenticate with the provider
      if (!integration.instance) {
        throw new Error(`Integration ${providerId} is not initialized`)
      }

      const credentials = await integration.instance.authenticate(authParams)

      // Store the credentials in Supabase
      const { data, error } = await this.supabase.functions.invoke('integrations', {
        body: {
          action: 'connect',
          provider: providerId,
          organizationId,
          config: {
            credentials,
            settings: {},
          },
        },
      })

      if (error) throw error

      // Set credentials on the integration instance
      integration.instance.setCredentials(credentials)

      console.log(`Successfully connected ${providerId}`)
    } catch (error) {
      console.error(`Failed to connect ${providerId}:`, error)
      throw error
    }
  }

  async disconnectIntegration(
    providerId: string,
    organizationId: string
  ): Promise<void> {
    const { data, error } = await this.supabase.functions.invoke('integrations', {
      body: {
        action: 'disconnect',
        provider: providerId,
        organizationId,
      },
    })

    if (error) throw error
    console.log(`Successfully disconnected ${providerId}`)
  }

  async testIntegration(
    providerId: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.functions.invoke('integrations', {
        body: {
          action: 'test',
          provider: providerId,
          organizationId,
        },
      })

      if (error) throw error
      return data.success
    } catch (error) {
      console.error(`Failed to test ${providerId}:`, error)
      return false
    }
  }

  async executeAction(
    providerId: string,
    organizationId: string,
    actionId: string,
    inputs: any
  ): Promise<any> {
    const { data, error } = await this.supabase.functions.invoke('integrations', {
      body: {
        action: 'execute',
        provider: providerId,
        organizationId,
        actionType: actionId,
        actionData: inputs,
      },
    })

    if (error) throw error
    return data.result
  }

  async getConnectedIntegrations(organizationId: string) {
    const { data, error } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'connected')

    if (error) throw error
    return data || []
  }

  async getIntegrationHealth(
    providerId: string,
    organizationId: string
  ): Promise<any> {
    const integration = this.registry.getIntegration(providerId)
    if (!integration) return null

    return integration.instance?.healthCheck?.() || null
  }
}