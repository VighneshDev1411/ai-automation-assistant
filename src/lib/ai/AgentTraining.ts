// src/lib/ai/AgentTraining.ts

export interface AgentPersonality {
  id: string
  name: string
  description: string
  systemPrompt: string
  traits: string[]
  examples: AgentExample[]
  createdAt: Date
  updatedAt: Date
}

export interface AgentExample {
  id: string
  userInput: string
  expectedResponse: string
  category: 'greeting' | 'task' | 'error' | 'clarification' | 'custom'
  notes?: string
}

export interface AgentCapabilities {
  availableTools: string[]
  maxToolsPerRequest: number
  allowChainedCalls: boolean
  timeoutMs: number
  retryAttempts: number
}

export interface AgentModelConfig {
  model: string
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  stopSequences: string[]
}

export interface TrainingDataset {
  id: string
  name: string
  description: string
  examples: AgentExample[]
  tags: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AgentTemplate {
  id: string
  name: string
  description: string
  category: 'assistant' | 'analyst' | 'automation' | 'specialist' | 'custom'
  personality: Partial<AgentPersonality>
  capabilities: Partial<AgentCapabilities>
  modelConfig: Partial<AgentModelConfig>
  isPublic: boolean
  usageCount: number
  rating?: number
  createdBy: string
  createdAt: Date
}

export interface AgentConfiguration {
  id: string
  name: string
  description: string
  personality: AgentPersonality
  capabilities: AgentCapabilities
  modelConfig: AgentModelConfig
  trainingDatasets: string[]
  isActive: boolean
  version: number
  parentId?: string
  organizationId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  lastTrained?: Date
  performance?: AgentPerformance
}

export interface AgentPerformance {
  totalInteractions: number
  successRate: number
  averageResponseTime: number
  averageTokensUsed: number
  toolUsageStats: Record<string, number>
  userSatisfactionScore?: number
  lastEvaluated: Date
}

export interface TrainingSession {
  id: string
  agentId: string
  datasetIds: string[]
  startTime: Date
  endTime?: Date
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  metrics?: {
    examplesProcessed: number
    successRate: number
    averageConfidence: number
    errorCount: number
  }
  logs: TrainingLog[]
}

export interface TrainingLog {
  timestamp: Date
  level: 'info' | 'warning' | 'error'
  message: string
  metadata?: Record<string, any>
}

export class AgentTrainingManager {
  private configurations: Map<string, AgentConfiguration> = new Map()
  private templates: Map<string, AgentTemplate> = new Map()
  private datasets: Map<string, TrainingDataset> = new Map()
  private sessions: Map<string, TrainingSession> = new Map()

  constructor() {
    this.initializeDefaultTemplates()
  }

  /**
   * Create a new agent configuration
   */
  createAgent(config: Omit<AgentConfiguration, 'id' | 'version' | 'createdAt' | 'updatedAt'>): string {
    const id = crypto.randomUUID()
    const now = new Date()
    
    const agentConfig: AgentConfiguration = {
      ...config,
      id,
      version: 1,
      createdAt: now,
      updatedAt: now
    }
    
    this.configurations.set(id, agentConfig)
    console.log(`Created agent configuration: ${config.name}`)
    
    return id
  }

  /**
   * Update an existing agent configuration
   */
  updateAgent(id: string, updates: Partial<AgentConfiguration>): boolean {
    const existing = this.configurations.get(id)
    if (!existing) {
      return false
    }

    const updated: AgentConfiguration = {
      ...existing,
      ...updates,
      id, // Preserve ID
      version: existing.version + 1,
      updatedAt: new Date()
    }

    this.configurations.set(id, updated)
    console.log(`Updated agent configuration: ${existing.name}`)
    
    return true
  }

  /**
   * Get agent configuration by ID
   */
  getAgent(id: string): AgentConfiguration | undefined {
    return this.configurations.get(id)
  }

  /**
   * List all agent configurations
   */
  listAgents(organizationId?: string): AgentConfiguration[] {
    const agents = Array.from(this.configurations.values())
    
    if (organizationId) {
      return agents.filter(agent => agent.organizationId === organizationId)
    }
    
    return agents
  }

  /**
   * Clone an agent configuration
   */
  cloneAgent(id: string, newName: string): string | null {
    const original = this.configurations.get(id)
    if (!original) {
      return null
    }

    const cloned = {
      ...original,
      name: newName,
      description: `Cloned from ${original.name}`,
      parentId: id
    }

    delete (cloned as any).id
    delete (cloned as any).version
    delete (cloned as any).createdAt
    delete (cloned as any).updatedAt

    return this.createAgent(cloned)
  }

  /**
   * Create agent from template
   */
  createFromTemplate(templateId: string, overrides: Partial<AgentConfiguration>): string | null {
    const template = this.templates.get(templateId)
    if (!template) {
      return null
    }

    const config: Omit<AgentConfiguration, 'id' | 'version' | 'createdAt' | 'updatedAt'> = {
      name: template.name,
      description: template.description,
      personality: {
        id: crypto.randomUUID(),
        name: template.personality.name || template.name,
        description: template.personality.description || template.description,
        systemPrompt: template.personality.systemPrompt || '',
        traits: template.personality.traits || [],
        examples: template.personality.examples || [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      capabilities: {
        availableTools: template.capabilities.availableTools || [],
        maxToolsPerRequest: template.capabilities.maxToolsPerRequest || 3,
        allowChainedCalls: template.capabilities.allowChainedCalls || false,
        timeoutMs: template.capabilities.timeoutMs || 30000,
        retryAttempts: template.capabilities.retryAttempts || 2
      },
      modelConfig: {
        model: template.modelConfig.model || 'gpt-3.5-turbo',
        temperature: template.modelConfig.temperature || 0.7,
        maxTokens: template.modelConfig.maxTokens || 1000,
        topP: template.modelConfig.topP || 1,
        frequencyPenalty: template.modelConfig.frequencyPenalty || 0,
        presencePenalty: template.modelConfig.presencePenalty || 0,
        stopSequences: template.modelConfig.stopSequences || []
      },
      trainingDatasets: [],
      isActive: true,
      organizationId: overrides.organizationId || 'default',
      createdBy: overrides.createdBy || 'system'
    }

    return this.createAgent({ ...config, ...overrides })
  }

  /**
   * Get available agent templates
   */
  getTemplates(): AgentTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: AgentTemplate[] = [
      {
        id: 'general-assistant',
        name: 'General Assistant',
        description: 'A helpful assistant for general tasks and questions',
        category: 'assistant',
        personality: {
          name: 'General Assistant',
          systemPrompt: 'You are a helpful, friendly, and professional assistant. Provide clear, accurate, and helpful responses.',
          traits: ['helpful', 'professional', 'clear']
        },
        capabilities: {
          availableTools: ['get_current_time', 'generate_uuid', 'calculate_math'],
          maxToolsPerRequest: 2
        },
        modelConfig: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000
        },
        isPublic: true,
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date()
      },
      {
        id: 'data-analyst',
        name: 'Data Analyst',
        description: 'Specialized in data analysis and formatting',
        category: 'analyst',
        personality: {
          name: 'Data Analyst',
          systemPrompt: 'You are a data analyst. Focus on accuracy, provide insights, and format data clearly.',
          traits: ['analytical', 'precise', 'detail-oriented']
        },
        capabilities: {
          availableTools: ['format_data', 'search_array', 'calculate_math'],
          maxToolsPerRequest: 3
        },
        modelConfig: {
          model: 'gpt-4',
          temperature: 0.3,
          maxTokens: 1500
        },
        isPublic: true,
        usageCount: 0,
        createdBy: 'system',
        createdAt: new Date()
      }
    ]

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }
}

// Export singleton instance
export const agentTrainingManager = new AgentTrainingManager()