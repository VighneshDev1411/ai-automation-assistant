// src/lib/ai/AIAgentFramework.ts

import { AgentOrchestrator, AgentWorkflow, AgentTask } from './AgentOrchestrator'
import { AgentMemorySystem, AgentSession } from './AgentMemorySystem'
import { SpecializedAgentFactory, BaseSpecializedAgent, AgentSkill } from './SpecializedAgents'
import { AgentSkillLibrary, SkillDefinition } from './AgentSkillLibrary'
import { AgentPerformanceManager, PerformanceMetrics } from './AgentPerformanceManager'
import { AIAgentManager, AIAgent } from './AIAgentManager'

export interface FrameworkConfig {
  organizationId: string
  defaultModel: string
  maxConcurrentAgents: number
  enableMemory: boolean
  enablePerformanceTracking: boolean
  costBudget?: {
    daily: number
    monthly: number
  }
  skillLibraryConfig?: {
    enableCustomSkills: boolean
    allowJavaScriptExecution: boolean
  }
}

export interface AgentExecutionRequest {
  agentId: string
  prompt: string
  sessionId?: string
  context?: Record<string, any>
  requiredSkills?: string[]
  priority?: 'low' | 'medium' | 'high' | 'critical'
  timeout?: number
  maxRetries?: number
}

export interface AgentExecutionResponse {
  requestId: string
  agentId: string
  sessionId: string
  response: any
  usedSkills: string[]
  performance: {
    responseTime: number
    tokenUsage: { input: number; output: number; total: number }
    cost: { input: number; output: number; total: number }
  }
  quality?: {
    confidence: number
    relevance: number
    completeness: number
  }
  metadata: Record<string, any>
}

/**
 * Main AI Agent Framework class that integrates all components
 */
export class AIAgentFramework {
  private config: FrameworkConfig
  private agentManager!: AIAgentManager
  private orchestrator!: AgentOrchestrator
  private memorySystem!: AgentMemorySystem
  private skillLibrary!: AgentSkillLibrary
  private performanceManager!: AgentPerformanceManager
  private specializedAgents: Map<string, BaseSpecializedAgent> = new Map()
  private activeSessions: Map<string, AgentSession> = new Map()

  constructor(config: FrameworkConfig) {
    this.config = config
    this.initializeComponents()
    this.setupEventHandlers()
    
    console.log(`🚀 AI Agent Framework initialized for organization: ${config.organizationId}`)
  }

  /**
   * Execute a single agent request
   */
  async executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    const startTime = Date.now()
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
    
    console.log(`🎯 Executing agent request: ${requestId}`)

    try {
      // Validate agent exists
      const agent = await this.agentManager.getAgent(request.agentId)
      if (!agent) {
        throw new Error(`Agent not found: ${request.agentId}`)
      }

      // Get or create session
      const session = await this.getOrCreateSession(
        request.agentId,
        request.sessionId,
        request.context || {}
      )

      // Check budget constraints
      if (this.config.costBudget) {
        const estimatedCost = this.estimateRequestCost(request, agent)
        const budgetCheck = await this.performanceManager.canProceedWithRequest(
          this.config.organizationId,
          estimatedCost,
          1000 // Estimated tokens
        )
        
        if (!budgetCheck.allowed) {
          throw new Error(`Budget constraint: ${budgetCheck.reason}`)
        }
      }

      // Add context from memory
      const executionContext = await this.buildExecutionContext(session, request)

      // Execute with specialized agent if available
      const specializedAgent = this.specializedAgents.get(request.agentId)
      let response

      if (specializedAgent && request.requiredSkills?.length) {
        response = await specializedAgent.executeWithSkills(
          request.prompt,
          request.requiredSkills,
          executionContext
        )
      } else {
        // Execute with base agent
        response = await this.agentManager.executeAgent(
          request.agentId,
          request.prompt,
          {
              sessionId: session.id,
              variables: executionContext,
              metadata: { requestId, priority: request.priority },
              userId: '',
              organizationId: ''
          }
        )
      }

      // Record message in memory
      if (this.config.enableMemory) {
        await this.memorySystem.addMessage(session.id, 'user', request.prompt)
        await this.memorySystem.addMessage(session.id, 'assistant', response.content || JSON.stringify(response))
      }

      // Calculate performance metrics
      const endTime = Date.now()
      const performance = {
        responseTime: endTime - startTime,
        tokenUsage: response.usage || { input: 0, output: 0, total: 0 },
        cost: this.calculateCost(response.usage || { input: 0, output: 0, total: 0 }, agent.model)
      }

      // Record performance metrics
      if (this.config.enablePerformanceTracking) {
        const metrics: PerformanceMetrics = {
          agentId: request.agentId,
          sessionId: session.id,
          timestamp: new Date(),
          requestId,
          responseTime: performance.responseTime,
          tokenUsage: performance.tokenUsage,
          cost: performance.cost,
          taskCompletion: true,
          model: agent.model,
          temperature: agent.parameters?.temperature || 0.7,
          maxTokens: agent.parameters?.maxTokens || 1000,
          retryCount: 0,
          cacheHit: false,
          contextSize: JSON.stringify(executionContext).length,
          memoryUsed: 0,
          skillsUsed: response.usedSkills || request.requiredSkills || [],
          metadata: {
            organizationId: this.config.organizationId,
            priority: request.priority,
            prompt: request.prompt
          }
        }

        await this.performanceManager.recordMetrics(metrics)
      }

      const result: AgentExecutionResponse = {
        requestId,
        agentId: request.agentId,
        sessionId: session.id,
        response: response.content || response,
        usedSkills: response.usedSkills || request.requiredSkills || [],
        performance,
        quality: response.quality,
        metadata: {
          model: agent.model,
          capabilities: response.capabilities || [],
          executionTime: performance.responseTime
        }
      }

      console.log(`✅ Agent request completed: ${requestId}`)
      return result

    } catch (error) {
      console.error(`❌ Agent request failed: ${requestId}`, error)
      
      // Record failed metrics
      if (this.config.enablePerformanceTracking) {
        const metrics: PerformanceMetrics = {
          agentId: request.agentId,
          sessionId: request.sessionId || 'unknown',
          timestamp: new Date(),
          requestId,
          responseTime: Date.now() - startTime,
          tokenUsage: { input: 0, output: 0, total: 0 },
          cost: { input: 0, output: 0, total: 0 },
          taskCompletion: false,
          model: this.config.defaultModel,
          temperature: 0.7,
          maxTokens: 1000,
          retryCount: 0,
          cacheHit: false,
          contextSize: 0,
          memoryUsed: 0,
          skillsUsed: [],
          metadata: {
            organizationId: this.config.organizationId,
            error: error instanceof Error ? error.message : String(error)
          }
        }

        await this.performanceManager.recordMetrics(metrics)
      }

      throw error
    }
  }

  /**
   * Execute a workflow with multiple agents
   */
  async executeWorkflow(workflow: AgentWorkflow): Promise<any> {
    console.log(`🔄 Executing workflow: ${workflow.name}`)
    
    return await this.orchestrator.executeWorkflow(workflow)
  }

  /**
   * Create a new specialized agent
   */
  async createSpecializedAgent(
    baseAgentId: string,
    type: string,
    skills?: string[]
  ): Promise<string> {
    const baseAgent = await this.agentManager.getAgent(baseAgentId)
    if (!baseAgent) {
      throw new Error(`Base agent not found: ${baseAgentId}`)
    }

    const specializedAgent = SpecializedAgentFactory.createAgent(type, baseAgent)
    
    // Add custom skills if provided
    if (skills) {
      for (const skillId of skills) {
        const skillDef = this.skillLibrary.searchSkills(skillId)[0]
        if (skillDef) {
          // Convert SkillDefinition to AgentSkill
          const agentSkill: AgentSkill = {
            id: skillDef.id,
            name: skillDef.name,
            description: skillDef.description,
            category: skillDef.category as 'data' | 'communication' | 'document' | 'analysis' | 'automation',
            implementation: skillDef.implementation.code || skillDef.implementation.endpoint || '',
            parameters: skillDef.parameters.reduce((acc, param) => {
              acc[param.name] = param.defaultValue
              return acc
            }, {} as Record<string, any>),
            requiredTools: skillDef.dependencies || []
          }
          specializedAgent.addSkill(agentSkill)
        }
      }
    }

    this.specializedAgents.set(baseAgentId, specializedAgent)
    
    console.log(`🎭 Created specialized ${type} agent: ${baseAgentId}`)
    return baseAgentId
  }

  /**
   * Register a custom skill
   */
  async registerSkill(skill: SkillDefinition): Promise<void> {
    this.skillLibrary.registerSkill(skill)
    console.log(`📚 Registered custom skill: ${skill.name}`)
  }

  /**
   * Get agent performance summary
   */
  async getAgentPerformance(
    agentId: string,
    period: { start: Date; end: Date }
  ): Promise<any> {
    return await this.performanceManager.getAgentPerformanceSummary(agentId, period)
  }

  /**
   * Optimize agent configuration
   */
  async optimizeAgent(agentId: string): Promise<any> {
    return await this.performanceManager.optimizeAgentConfiguration(agentId)
  }

  /**
   * Enable agent-to-agent communication
   */
  async enableAgentCommunication(
    fromAgentId: string,
    toAgentId: string,
    message: string,
    context?: Record<string, any>
  ): Promise<any> {
    return await this.orchestrator.sendAgentMessage(
      fromAgentId,
      toAgentId,
      message,
      context || {}
    )
  }

  /**
   * Get skill recommendations for an agent
   */
  getSkillRecommendations(
    agentType: string,
    recentTasks: string[],
    limit?: number
  ): SkillDefinition[] {
    return this.skillLibrary.getSkillRecommendations(agentType, recentTasks, limit)
  }

  /**
   * Run performance test on an agent
   */
  async runPerformanceTest(
    agentId: string,
    scenarios: any[],
    concurrency?: number
  ): Promise<any> {
    return await this.performanceManager.runPerformanceTest(agentId, scenarios, concurrency)
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): AgentSession[] {
    return Array.from(this.activeSessions.values())
  }

  /**
   * Close a session
   */
  async closeSession(sessionId: string): Promise<void> {
    if (this.config.enableMemory) {
      await this.memorySystem.closeSession(sessionId)
    }
    this.activeSessions.delete(sessionId)
    console.log(`🔒 Closed session: ${sessionId}`)
  }

  /**
   * Get framework statistics
   */
  getFrameworkStats(): {
    totalAgents: number
    specializedAgents: number
    activeSessions: number
    totalSkills: number
    organizationId: string
    uptime: number
  } {
    return {
      totalAgents: this.specializedAgents.size,
      specializedAgents: this.specializedAgents.size,
      activeSessions: this.activeSessions.size,
      totalSkills: this.skillLibrary.getSkillsByCategory('core').length +
                   this.skillLibrary.getSkillsByCategory('integration').length +
                   this.skillLibrary.getSkillsByCategory('analysis').length +
                   this.skillLibrary.getSkillsByCategory('communication').length +
                   this.skillLibrary.getSkillsByCategory('automation').length +
                   this.skillLibrary.getSkillsByCategory('custom').length,
      organizationId: this.config.organizationId,
      uptime: Date.now() - this.startTime
    }
  }

  // Private methods

  private startTime = Date.now()

  private initializeComponents(): void {
    this.agentManager = new AIAgentManager()
    this.orchestrator = new AgentOrchestrator(this.agentManager)
    this.memorySystem = new AgentMemorySystem()
    this.skillLibrary = new AgentSkillLibrary()
    this.performanceManager = new AgentPerformanceManager()

    // Set up cost budgets if configured
    if (this.config.costBudget) {
      this.performanceManager.setCostBudget({
        organizationId: this.config.organizationId,
        period: 'daily',
        limit: this.config.costBudget.daily,
        current: 0,
        alerts: { warning: 80, critical: 95 }
      })
    }
  }

  private setupEventHandlers(): void {
    // Add performance alert handler
    this.performanceManager.addAlertHandler((alert) => {
      console.warn(`⚠️ Performance Alert:`, alert)
      // In production, this would integrate with notification systems
    })
  }

  private async getOrCreateSession(
    agentId: string,
    sessionId?: string,
    context: Record<string, any> = {}
  ): Promise<AgentSession> {
    if (sessionId && this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId)!
    }

    const session = await this.memorySystem.getOrCreateSession(
      agentId,
      context.userId || 'anonymous',
      this.config.organizationId,
      sessionId
    )

    this.activeSessions.set(session.id, session)
    return session
  }

  private async buildExecutionContext(
    session: AgentSession,
    request: AgentExecutionRequest
  ): Promise<Record<string, any>> {
    let context = { ...request.context }

    if (this.config.enableMemory) {
      const memoryContext = await this.memorySystem.getExecutionContext(session.id, true)
      context = {
        ...context,
        conversationHistory: memoryContext.messages.slice(-10),
        relevantMemories: memoryContext.relevantMemories,
        contextSummary: memoryContext.contextSummary
      }
    }

    return context
  }

  private estimateRequestCost(request: AgentExecutionRequest, agent: AIAgent): number {
    // Rough cost estimation based on prompt length and model
    const promptTokens = Math.ceil((request.prompt.length + JSON.stringify(request.context || {}).length) / 4)
    const estimatedOutputTokens = 500 // Conservative estimate
    
    // Get model pricing (simplified)
    const modelPricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    }

    const pricing = modelPricing[agent.model] || modelPricing['gpt-3.5-turbo']
    return (promptTokens * pricing.input + estimatedOutputTokens * pricing.output) / 1000
  }

  private calculateCost(
    tokenUsage: { input: number; output: number; total: number },
    model: string
  ): { input: number; output: number; total: number } {
    const modelPricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    }

    const pricing = modelPricing[model] || modelPricing['gpt-3.5-turbo']
    const inputCost = (tokenUsage.input * pricing.input) / 1000
    const outputCost = (tokenUsage.output * pricing.output) / 1000

    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost
    }
  }
}

/**
 * Factory function to create and configure the AI Agent Framework
 */
export function createAIAgentFramework(config: FrameworkConfig): AIAgentFramework {
  return new AIAgentFramework(config)
}

/**
 * Utility functions for framework management
 */
export class FrameworkUtils {
  /**
   * Create a simple workflow for sequential agent execution
   */
  static createSequentialWorkflow(
    name: string,
    agentTasks: { agentId: string; prompt: string; context?: Record<string, any> }[],
    organizationId: string,
    createdBy: string
  ): AgentWorkflow {
    const tasks: AgentTask[] = agentTasks.map((task, index) => ({
      id: `task_${index}`,
      type: 'sequential',
      agentId: task.agentId,
      prompt: task.prompt,
      context: task.context || {},
      dependencies: index > 0 ? [`task_${index - 1}`] : [],
      maxRetries: 3,
      timeout: 30000,
      priority: 'medium',
      status: 'pending',
      createdAt: new Date(),
      startedAt: undefined,
      completedAt: undefined
    }))

    return {
      id: `workflow_${Date.now()}`,
      name,
      description: `Sequential workflow with ${agentTasks.length} tasks`,
      tasks,
      globalContext: {},
      status: 'draft',
      createdBy,
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Create a parallel workflow for concurrent agent execution
   */
  static createParallelWorkflow(
    name: string,
    agentTasks: { agentId: string; prompt: string; context?: Record<string, any> }[],
    organizationId: string,
    createdBy: string
  ): AgentWorkflow {
    const tasks: AgentTask[] = agentTasks.map((task, index) => ({
      id: `task_${index}`,
      type: 'parallel',
      agentId: task.agentId,
      prompt: task.prompt,
      context: task.context || {},
      dependencies: [],
      maxRetries: 3,
      timeout: 30000,
      priority: 'medium',
      status: 'pending',
      createdAt: new Date(),
      startedAt: undefined,
      completedAt: undefined
    }))

    return {
      id: `workflow_${Date.now()}`,
      name,
      description: `Parallel workflow with ${agentTasks.length} concurrent tasks`,
      tasks,
      globalContext: {},
      status: 'draft',
      createdBy,
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Validate framework configuration
   */
  static validateConfig(config: FrameworkConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.organizationId) {
      errors.push('organizationId is required')
    }

    if (!config.defaultModel) {
      errors.push('defaultModel is required')
    }

    if (config.maxConcurrentAgents <= 0) {
      errors.push('maxConcurrentAgents must be greater than 0')
    }

    if (config.costBudget) {
      if (config.costBudget.daily <= 0) {
        errors.push('daily budget must be greater than 0')
      }
      if (config.costBudget.monthly <= 0) {
        errors.push('monthly budget must be greater than 0')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate performance test scenarios
   */
  static generateTestScenarios(agentType: string): any[] {
    const baseScenarios = [
      {
        name: 'Basic Functionality',
        description: 'Test basic agent responses',
        requestCount: 10,
        prompts: ['Hello', 'What can you do?', 'Help me with a task'],
        expectedResponseTime: 2000,
        expectedCost: 0.01
      },
      {
        name: 'Load Test',
        description: 'Test agent under load',
        requestCount: 50,
        prompts: ['Process this data', 'Analyze the following', 'Generate a report'],
        expectedResponseTime: 5000,
        expectedCost: 0.05
      }
    ]

    // Add specialized scenarios based on agent type
    switch (agentType) {
      case 'document_processing':
        baseScenarios.push({
          name: 'Document Processing',
          description: 'Test document analysis capabilities',
          requestCount: 20,
          prompts: [
            'Extract key information from this document',
            'Summarize the main points',
            'Classify this document type'
          ],
          expectedResponseTime: 3000,
          expectedCost: 0.02
        })
        break
      
      case 'data_analysis':
        baseScenarios.push({
          name: 'Data Analysis',
          description: 'Test data processing capabilities',
          requestCount: 30,
          prompts: [
            'Analyze this dataset for trends',
            'Create a visualization',
            'Generate insights from the data'
          ],
          expectedResponseTime: 4000,
          expectedCost: 0.03
        })
        break
      
      case 'communication':
        baseScenarios.push({
          name: 'Communication Tasks',
          description: 'Test communication capabilities',
          requestCount: 25,
          prompts: [
            'Compose a professional email',
            'Schedule a meeting',
            'Send a notification'
          ],
          expectedResponseTime: 2500,
          expectedCost: 0.015
        })
        break
    }

    return baseScenarios
  }
}

// Example usage and configuration templates

export const DEFAULT_FRAMEWORK_CONFIG: FrameworkConfig = {
  organizationId: 'default-org',
  defaultModel: 'gpt-3.5-turbo',
  maxConcurrentAgents: 10,
  enableMemory: true,
  enablePerformanceTracking: true,
  costBudget: {
    daily: 100,
    monthly: 2000
  },
  skillLibraryConfig: {
    enableCustomSkills: true,
    allowJavaScriptExecution: false
  }
}

export const ENTERPRISE_FRAMEWORK_CONFIG: FrameworkConfig = {
  organizationId: 'enterprise-org',
  defaultModel: 'gpt-4-turbo',
  maxConcurrentAgents: 50,
  enableMemory: true,
  enablePerformanceTracking: true,
  costBudget: {
    daily: 500,
    monthly: 10000
  },
  skillLibraryConfig: {
    enableCustomSkills: true,
    allowJavaScriptExecution: true
  }
}