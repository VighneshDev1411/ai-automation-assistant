import { BaseIntegration, IntegrationConfig } from './base-integration'

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
    this.integrations.set(integration.getConfig().id, integration)
  }

  get(providerId: string): BaseIntegration | undefined {
    return this.integrations.get(providerId)
  }

  getAll(): BaseIntegration[] {
    return Array.from(this.integrations.values())
  }

  getByCategory(category: string): BaseIntegration[] {
    return Array.from(this.integrations.values())
      .filter(integration => integration.getConfig().category === category)
  }

  getAvailable(): IntegrationConfig[] {
    return Array.from(this.integrations.values())
      .map(integration => integration.getConfig())
  }

  search(query: string): BaseIntegration[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.integrations.values())
      .filter(integration => {
        const config = integration.getConfig()
        return (
          config.name.toLowerCase().includes(lowerQuery) ||
          config.description.toLowerCase().includes(lowerQuery) ||
          config.category.toLowerCase().includes(lowerQuery)
        )
      })
  }
}