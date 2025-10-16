// File: src/lib/integrations/IntegrationRegistry.ts

import { SlackIntegration } from './providers/slack/SlackIntegration'
import { MicrosoftIntegration } from './providers/microsoft/MicrosoftIntegration'

export interface RegisteredIntegration {
  id: string
  name: string
  icon: string
  instance: any
  isConfigured: boolean
  workspaces?: Array<{
    id: string
    name: string
    status: 'connected' | 'disconnected'
  }>
}

class IntegrationRegistryClass {
  private integrations: Map<string, RegisteredIntegration> = new Map()

  constructor() {
    this.initializeIntegrations()
  }

  private initializeIntegrations() {
    // Initialize Slack
    const slackConfig = {
      clientId: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID || 'demo-client-id',
      clientSecret: process.env.SLACK_CLIENT_SECRET || 'demo-secret',
      signingSecret: process.env.SLACK_SIGNING_SECRET || 'demo-signing',
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/slack/callback`,
      scopes: ['chat:write', 'channels:read', 'users:read']
    }

    // Use actual Slack credentials from environment
    const slackCredentials = process.env.SLACK_BOT_TOKEN ? {
      access_token: process.env.SLACK_BOT_TOKEN,
      team_id: process.env.SLACK_TEAM_ID || '',
      team_name: process.env.SLACK_TEAM_NAME || 'Your Workspace',
      user_id: process.env.SLACK_USER_ID || '',
      scope: 'chat:write,channels:read',
      bot_user_id: process.env.SLACK_BOT_USER_ID || ''
    } : null

    const slackIntegration = slackCredentials
      ? new SlackIntegration(slackConfig, slackCredentials)
      : null

    this.integrations.set('slack', {
      id: 'slack',
      name: 'Slack',
      icon: '💬',
      instance: slackIntegration,
      isConfigured: !!process.env.SLACK_BOT_TOKEN && !!slackCredentials,
      workspaces: slackCredentials ? [{
        id: slackCredentials.team_id,
        name: slackCredentials.team_name,
        status: 'connected'
      }] : []
    })

    // Initialize Microsoft 365
    const microsoftConfig = {
      clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || 'demo-client-id',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'demo-secret',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'demo-tenant',
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/microsoft/callback`,
      scopes: ['Mail.Read', 'Mail.Send', 'Calendars.ReadWrite']
    }

    const microsoftIntegration = new MicrosoftIntegration(microsoftConfig)

    this.integrations.set('microsoft', {
      id: 'microsoft',
      name: 'Microsoft 365',
      icon: '🏢',
      instance: microsoftIntegration,
      isConfigured: !!process.env.MICROSOFT_CLIENT_ID,
      workspaces: process.env.MICROSOFT_TENANT_ID ? [{
        id: process.env.MICROSOFT_TENANT_ID,
        name: process.env.MICROSOFT_TENANT_NAME || 'Your Organization',
        status: 'connected'
      }] : []
    })
  }

  getIntegration(id: string): RegisteredIntegration | undefined {
    return this.integrations.get(id)
  }

  getAllIntegrations(): RegisteredIntegration[] {
    return Array.from(this.integrations.values())
  }

  getAvailableActions(integrationId: string): any[] {
    const integration = this.integrations.get(integrationId)
    if (!integration) return []
    
    return integration.instance.getActions()
  }

  getWorkspaces(integrationId: string): any[] {
    const integration = this.integrations.get(integrationId)
    if (!integration) return []
    
    return integration.workspaces || []
  }

  // Get Slack channels dynamically from API
  async getSlackChannels(): Promise<Array<{id: string, name: string}>> {
    const integration = this.integrations.get('slack')
    if (!integration || !integration.instance) {
      return []
    }

    try {
      const result = await integration.instance.executeAction('list_channels', {})
      return result?.channels?.map((ch: any) => ({
        id: ch.id,
        name: ch.name.startsWith('#') ? ch.name : `#${ch.name}`
      })) || []
    } catch (error) {
      console.error('Failed to fetch Slack channels:', error)
      return []
    }
  }

  // Execute action through integration
  async executeAction(integrationId: string, actionId: string, inputs: any): Promise<any> {
    const integration = this.integrations.get(integrationId)
    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`)
    }

    return integration.instance.executeAction(actionId, inputs)
  }
}

// Export singleton instance
export const IntegrationRegistry = new IntegrationRegistryClass()