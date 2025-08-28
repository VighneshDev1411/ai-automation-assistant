// src/lib/integrations/index.ts

import { IntegrationRegistry } from './registry'
import { IntegrationManager } from './manager'

// Import other integrations as you create them

export function initializeIntegrations() {
  const registry = IntegrationRegistry.getInstance()
  
  // Register all available integrations
  // registry.register(new GoogleIntegration())
  // registry.register(new SlackIntegration())
  // registry.register(new GitHubIntegration())
  // registry.register(new MicrosoftIntegration())
  
  // Add more integrations here as you build them
  // registry.register(new GithubIntegration())
  // registry.register(new MicrosoftIntegration())
  
  return registry
}

// Export registry instance
export const integrationRegistry = initializeIntegrations()



// Export types
export type {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationAction,
  IntegrationTrigger
} from './base-integration'