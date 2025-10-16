// src/lib/integrations/index.ts

import { IntegrationRegistry } from './IntegrationRegistry'
import { IntegrationManager } from './manager'

// Export the singleton IntegrationRegistry instance
export { IntegrationRegistry } from './IntegrationRegistry'
export { IntegrationManager } from './manager'



// Export types
export type {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationAction,
  IntegrationTrigger
} from './base-integration'