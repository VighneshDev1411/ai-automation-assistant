// src/lib/ai/AgentSkillLibrary.ts

export interface SkillParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  description: string
  defaultValue?: any
  validation?: {
    min?: number
    max?: number
    pattern?: string
    options?: any[]
  }
}

export interface SkillExecution {
  id: string
  skillId: string
  agentId: string
  inputs: Record<string, any>
  outputs: Record<string, any>
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: Date
  endTime?: Date
  duration?: number
  error?: string
  metadata: Record<string, any>
}

export interface SkillDefinition {
  id: string
  name: string
  description: string
  category: 'core' | 'integration' | 'analysis' | 'communication' | 'automation' | 'custom'
  version: string
  author: string
  parameters: SkillParameter[]
  returns: {
    type: string
    description: string
  }
  dependencies: string[]
  examples: {
    input: Record<string, any>
    output: any
    description: string
  }[]
  implementation: SkillImplementation
  tags: string[]
  isActive: boolean
  usage: {
    totalExecutions: number
    successRate: number
    averageDuration: number
    lastUsed?: Date
  }
}

export interface SkillImplementation {
  type: 'javascript' | 'api' | 'workflow' | 'llm'
  code?: string
  endpoint?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  workflowId?: string
  model?: string
  prompt?: string
}

export class AgentSkillLibrary {
  private skills: Map<string, SkillDefinition> = new Map()
  private executionHistory: SkillExecution[] = []
  private skillExecutors: Map<string, SkillExecutor> = new Map()

  constructor() {
    this.initializeCoreSkills()
    this.setupExecutors()
  }

  /**
   * Register a new skill in the library
   */
  registerSkill(skill: SkillDefinition): void {
    // Validate skill definition
    this.validateSkillDefinition(skill)
    
    // Check dependencies
    for (const dep of skill.dependencies) {
      if (!this.skills.has(dep)) {
        throw new Error(`Missing dependency: ${dep}`)
      }
    }

    this.skills.set(skill.id, skill)
    console.log(`📚 Registered skill: ${skill.name} (${skill.id})`)
  }

  /**
   * Execute a skill with given parameters
   */
  async executeSkill(
    skillId: string,
    inputs: Record<string, any>,
    agentId: string,
    metadata: Record<string, any> = {}
  ): Promise<SkillExecution> {
    const skill = this.skills.get(skillId)
    if (!skill) {
      throw new Error(`Skill not found: ${skillId}`)
    }

    if (!skill.isActive) {
      throw new Error(`Skill is inactive: ${skillId}`)
    }

    // Validate inputs
    this.validateInputs(skill, inputs)

    const execution: SkillExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      skillId,
      agentId,
      inputs,
      outputs: {},
      status: 'pending',
      startTime: new Date(),
      metadata
    }

    this.executionHistory.push(execution)

    try {
      execution.status = 'running'
      console.log(`🎯 Executing skill: ${skill.name} for agent: ${agentId}`)

      const executor = this.getExecutor(skill.implementation.type)
      const result = await executor.execute(skill, inputs, metadata)

      execution.outputs = result
      execution.status = 'completed'
      execution.endTime = new Date()
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime()

      // Update usage statistics
      this.updateSkillUsage(skillId, true, execution.duration)

      console.log(`✅ Skill execution completed: ${skillId}`)
      return execution

    } catch (error) {
      execution.status = 'failed'
      execution.error = error instanceof Error ? error.message : String(error)
      execution.endTime = new Date()
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime()

      // Update usage statistics
      this.updateSkillUsage(skillId, false, execution.duration)

      console.error(`❌ Skill execution failed: ${skillId}`, error)
      throw error
    }
  }

  /**
   * Get available skills by category
   */
  getSkillsByCategory(category: SkillDefinition['category']): SkillDefinition[] {
    return Array.from(this.skills.values())
      .filter(skill => skill.category === category && skill.isActive)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Search skills by keyword
   */
  searchSkills(query: string): SkillDefinition[] {
    const lowercaseQuery = query.toLowerCase()
    return Array.from(this.skills.values())
      .filter(skill => 
        skill.isActive && (
          skill.name.toLowerCase().includes(lowercaseQuery) ||
          skill.description.toLowerCase().includes(lowercaseQuery) ||
          skill.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
        )
      )
      .sort((a, b) => {
        // Prioritize name matches over description matches
        const aNameMatch = a.name.toLowerCase().includes(lowercaseQuery)
        const bNameMatch = b.name.toLowerCase().includes(lowercaseQuery)
        if (aNameMatch && !bNameMatch) return -1
        if (!aNameMatch && bNameMatch) return 1
        return a.name.localeCompare(b.name)
      })
  }

  /**
   * Get skill recommendations for an agent
   */
  getSkillRecommendations(
    agentType: string,
    recentTasks: string[],
    limit: number = 5
  ): SkillDefinition[] {
    const relevantSkills = Array.from(this.skills.values())
      .filter(skill => skill.isActive)
      .map(skill => ({
        skill,
        score: this.calculateRelevanceScore(skill, agentType, recentTasks)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.skill)

    return relevantSkills
  }

  /**
   * Get execution history for a skill
   */
  getSkillExecutionHistory(skillId: string, limit: number = 100): SkillExecution[] {
    return this.executionHistory
      .filter(exec => exec.skillId === skillId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit)
  }

  /**
   * Get skill performance metrics
   */
  getSkillMetrics(skillId: string): {
    totalExecutions: number
    successRate: number
    averageDuration: number
    lastUsed?: Date
    errorTypes: Record<string, number>
  } {
    const skill = this.skills.get(skillId)
    if (!skill) throw new Error(`Skill not found: ${skillId}`)

    const executions = this.executionHistory.filter(exec => exec.skillId === skillId)
    const successful = executions.filter(exec => exec.status === 'completed')
    const failed = executions.filter(exec => exec.status === 'failed')

    const errorTypes: Record<string, number> = {}
    failed.forEach(exec => {
      if (exec.error) {
        errorTypes[exec.error] = (errorTypes[exec.error] || 0) + 1
      }
    })

    return {
      totalExecutions: executions.length,
      successRate: executions.length > 0 ? successful.length / executions.length : 0,
      averageDuration: successful.length > 0 
        ? successful.reduce((sum, exec) => sum + (exec.duration || 0), 0) / successful.length 
        : 0,
      lastUsed: executions.length > 0 ? executions[0].startTime : undefined,
      errorTypes
    }
  }

  // Private helper methods

  private initializeCoreSkills(): void {
    const coreSkills: SkillDefinition[] = [
      {
        id: 'get_current_time',
        name: 'Get Current Time',
        description: 'Returns the current date and time in various formats',
        category: 'core',
        version: '1.0.0',
        author: 'system',
        parameters: [
          {
            name: 'format',
            type: 'string',
            required: false,
            description: 'Time format (iso, unix, readable)',
            defaultValue: 'iso',
            validation: { options: ['iso', 'unix', 'readable'] }
          },
          {
            name: 'timezone',
            type: 'string',
            required: false,
            description: 'Target timezone',
            defaultValue: 'UTC'
          }
        ],
        returns: {
          type: 'object',
          description: 'Current time in requested format'
        },
        dependencies: [],
        examples: [
          {
            input: { format: 'iso' },
            output: { time: '2024-01-15T10:30:00Z', timezone: 'UTC' },
            description: 'Get current time in ISO format'
          }
        ],
        implementation: {
          type: 'javascript',
          code: `
            function execute(inputs) {
              const now = new Date();
              const format = inputs.format || 'iso';
              const timezone = inputs.timezone || 'UTC';
              
              let time;
              switch (format) {
                case 'unix':
                  time = Math.floor(now.getTime() / 1000);
                  break;
                case 'readable':
                  time = now.toLocaleString('en-US', { timeZone: timezone });
                  break;
                default:
                  time = now.toISOString();
              }
              
              return { time, timezone, timestamp: now.getTime() };
            }
          `
        },
        tags: ['time', 'date', 'utility'],
        isActive: true,
        usage: { totalExecutions: 0, successRate: 1, averageDuration: 5 }
      },
      {
        id: 'web_search',
        name: 'Web Search',
        description: 'Search the internet for information',
        category: 'integration',
        version: '1.0.0',
        author: 'system',
        parameters: [
          {
            name: 'query',
            type: 'string',
            required: true,
            description: 'Search query'
          },
          {
            name: 'limit',
            type: 'number',
            required: false,
            description: 'Maximum number of results',
            defaultValue: 10,
            validation: { min: 1, max: 50 }
          }
        ],
        returns: {
          type: 'array',
          description: 'Search results with title, url, and snippet'
        },
        dependencies: [],
        examples: [
          {
            input: { query: 'AI automation tools', limit: 5 },
            output: [{ title: 'Top AI Tools', url: 'example.com', snippet: 'Best AI tools...' }],
            description: 'Search for AI automation tools'
          }
        ],
        implementation: {
          type: 'api',
          endpoint: '/api/search',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        tags: ['search', 'web', 'information'],
        isActive: true,
        usage: { totalExecutions: 0, successRate: 0.95, averageDuration: 1200 }
      },
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send emails to specified recipients',
        category: 'communication',
        version: '1.0.0',
        author: 'system',
        parameters: [
          {
            name: 'to',
            type: 'array',
            required: true,
            description: 'Email recipients'
          },
          {
            name: 'subject',
            type: 'string',
            required: true,
            description: 'Email subject'
          },
          {
            name: 'body',
            type: 'string',
            required: true,
            description: 'Email body content'
          },
          {
            name: 'cc',
            type: 'array',
            required: false,
            description: 'CC recipients'
          },
          {
            name: 'attachments',
            type: 'array',
            required: false,
            description: 'File attachments'
          }
        ],
        returns: {
          type: 'object',
          description: 'Email send result with message ID'
        },
        dependencies: [],
        examples: [
          {
            input: {
              to: ['user@example.com'],
              subject: 'Test Email',
              body: 'This is a test email.'
            },
            output: { messageId: 'msg_123', status: 'sent' },
            description: 'Send a simple email'
          }
        ],
        implementation: {
          type: 'api',
          endpoint: '/api/email/send',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        },
        tags: ['email', 'communication', 'notification'],
        isActive: true,
        usage: { totalExecutions: 0, successRate: 0.98, averageDuration: 800 }
      }
    ]

    coreSkills.forEach(skill => this.skills.set(skill.id, skill))
    console.log(`📚 Initialized ${coreSkills.length} core skills`)
  }

  private setupExecutors(): void {
    this.skillExecutors.set('javascript', new JavaScriptExecutor())
    this.skillExecutors.set('api', new ApiExecutor())
    this.skillExecutors.set('workflow', new WorkflowExecutor())
    this.skillExecutors.set('llm', new LLMExecutor())
  }

  private validateSkillDefinition(skill: SkillDefinition): void {
    if (!skill.id || !skill.name || !skill.description) {
      throw new Error('Skill must have id, name, and description')
    }

    if (!skill.implementation) {
      throw new Error('Skill must have implementation')
    }

    // Validate parameters
    for (const param of skill.parameters) {
      if (!param.name || !param.type) {
        throw new Error('Parameter must have name and type')
      }
    }
  }

  private validateInputs(skill: SkillDefinition, inputs: Record<string, any>): void {
    for (const param of skill.parameters) {
      const value = inputs[param.name]

      // Check required parameters
      if (param.required && (value === undefined || value === null)) {
        throw new Error(`Required parameter missing: ${param.name}`)
      }

      // Validate parameter value if provided
      if (value !== undefined && value !== null) {
        this.validateParameterValue(param, value)
      }
    }
  }

  private validateParameterValue(param: SkillParameter, value: any): void {
    // Type validation
    if (param.type === 'number' && typeof value !== 'number') {
      throw new Error(`Parameter ${param.name} must be a number`)
    }
    if (param.type === 'string' && typeof value !== 'string') {
      throw new Error(`Parameter ${param.name} must be a string`)
    }
    if (param.type === 'boolean' && typeof value !== 'boolean') {
      throw new Error(`Parameter ${param.name} must be a boolean`)
    }
    if (param.type === 'array' && !Array.isArray(value)) {
      throw new Error(`Parameter ${param.name} must be an array`)
    }

    // Additional validation
    if (param.validation) {
      const validation = param.validation
      
      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          throw new Error(`Parameter ${param.name} must be >= ${validation.min}`)
        }
        if (validation.max !== undefined && value > validation.max) {
          throw new Error(`Parameter ${param.name} must be <= ${validation.max}`)
        }
      }

      if (typeof value === 'string' && validation.pattern) {
        const regex = new RegExp(validation.pattern)
        if (!regex.test(value)) {
          throw new Error(`Parameter ${param.name} does not match required pattern`)
        }
      }

      if (validation.options && !validation.options.includes(value)) {
        throw new Error(`Parameter ${param.name} must be one of: ${validation.options.join(', ')}`)
      }
    }
  }

  private getExecutor(type: string): SkillExecutor {
    const executor = this.skillExecutors.get(type)
    if (!executor) {
      throw new Error(`No executor available for type: ${type}`)
    }
    return executor
  }

  private calculateRelevanceScore(
    skill: SkillDefinition,
    agentType: string,
    recentTasks: string[]
  ): number {
    let score = 0

    // Base score for category match
    const categoryMatches: Record<string, string[]> = {
      'document_processing': ['core', 'automation'],
      'data_analysis': ['analysis', 'core'],
      'communication': ['communication', 'integration'],
      'decision_making': ['analysis', 'core']
    }

    if (categoryMatches[agentType]?.includes(skill.category)) {
      score += 0.4
    }

    // Score based on recent task keywords
    const taskKeywords = recentTasks.join(' ').toLowerCase()
    const skillKeywords = [...skill.tags, skill.name.toLowerCase()].join(' ')
    
    let keywordMatches = 0
    skillKeywords.split(' ').forEach(keyword => {
      if (taskKeywords.includes(keyword)) {
        keywordMatches++
      }
    })
    
    score += (keywordMatches / skillKeywords.split(' ').length) * 0.3

    // Usage-based scoring
    score += Math.min(skill.usage.successRate * 0.2, 0.2)
    score += Math.min((skill.usage.totalExecutions / 1000) * 0.1, 0.1)

    return score
  }

  private updateSkillUsage(skillId: string, success: boolean, duration: number): void {
    const skill = this.skills.get(skillId)
    if (!skill) return

    skill.usage.totalExecutions++
    skill.usage.lastUsed = new Date()

    // Update success rate (exponential moving average)
    const alpha = 0.1
    const newSuccessRate = success ? 1 : 0
    skill.usage.successRate = skill.usage.successRate * (1 - alpha) + newSuccessRate * alpha

    // Update average duration (exponential moving average)
    skill.usage.averageDuration = skill.usage.averageDuration * (1 - alpha) + duration * alpha
  }
}

// Skill Executor Interfaces and Implementations

interface SkillExecutor {
  execute(skill: SkillDefinition, inputs: Record<string, any>, metadata: Record<string, any>): Promise<any>
}

class JavaScriptExecutor implements SkillExecutor {
  async execute(skill: SkillDefinition, inputs: Record<string, any>): Promise<any> {
    if (!skill.implementation.code) {
      throw new Error('JavaScript skill missing code implementation')
    }

    try {
      // Create a safe execution context
      const code = skill.implementation.code
      const executeFunction = new Function('inputs', 'metadata', code + '\n\nreturn execute(inputs, metadata);')
      
      return executeFunction(inputs, {})
    } catch (error) {
      throw new Error(`JavaScript execution error: ${error}`)
    }
  }
}

class ApiExecutor implements SkillExecutor {
  async execute(skill: SkillDefinition, inputs: Record<string, any>): Promise<any> {
    const impl = skill.implementation
    if (!impl.endpoint) {
      throw new Error('API skill missing endpoint')
    }

    try {
      const response = await fetch(impl.endpoint, {
        method: impl.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...impl.headers
        },
        body: JSON.stringify(inputs)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw new Error(`API execution error: ${error}`)
    }
  }
}

class WorkflowExecutor implements SkillExecutor {
  async execute(skill: SkillDefinition, inputs: Record<string, any>): Promise<any> {
    if (!skill.implementation.workflowId) {
      throw new Error('Workflow skill missing workflowId')
    }

    // This would integrate with your workflow engine
    throw new Error('Workflow executor not yet implemented')
  }
}

class LLMExecutor implements SkillExecutor {
  async execute(skill: SkillDefinition, inputs: Record<string, any>): Promise<any> {
    const impl = skill.implementation
    if (!impl.prompt || !impl.model) {
      throw new Error('LLM skill missing prompt or model')
    }

    // This would integrate with your AI agent manager
    throw new Error('LLM executor not yet implemented')
  }
}