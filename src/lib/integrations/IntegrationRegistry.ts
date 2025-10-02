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

    // For demo purposes, create a mock workspace
    const slackCredentials = {
      access_token: process.env.SLACK_BOT_TOKEN || 'xoxb-demo-token',
      team_id: 'T1234567890',
      team_name: 'Demo Workspace',
      user_id: 'U1234567890',
      scope: 'chat:write,channels:read',
      bot_user_id: 'B1234567890'
    }

    const slackIntegration = new SlackIntegration(slackConfig, slackCredentials)

    this.integrations.set('slack', {
      id: 'slack',
      name: 'Slack',
      icon: '💬',
      instance: slackIntegration,
      isConfigured: !!process.env.SLACK_BOT_TOKEN,
      workspaces: [{
        id: 'T1234567890',
        name: 'Demo Workspace',
        status: 'connected'
      }]
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
      workspaces: [{
        id: 'demo-tenant',
        name: 'Demo Organization',
        status: 'connected'
      }]
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

  // For demo: Get Slack channels
  getSlackChannels(): Array<{id: string, name: string}> {
    return [
      { id: 'C1234567890', name: '#general' },
      { id: 'C1234567891', name: '#random' },
      { id: 'C1234567892', name: '#demo-workflow' },
      { id: 'C1234567893', name: '#notifications' }
    ]
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