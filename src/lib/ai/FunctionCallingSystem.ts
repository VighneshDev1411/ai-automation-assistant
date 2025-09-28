import { m } from 'framer-motion'

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required: boolean
  enum?: string[]
  properties?: Record<string, ToolParameter>
  items?: {
    type: 'string' | 'number' | 'boolean' | 'object'
    enum?: string[]
  }
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, ToolParameter>
  handler: (params: any) => Promise<any>
  category: 'utility' | 'data' | 'communication' | 'automation' | 'custom'
  enabled: boolean
  timeout?: number
  retries?: number
}

export interface ToolExecutionContext {
  userId?: string
  organizationId?: string
  sessionId: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface ToolExecutionResult {
  success: boolean
  result?: any
  error?: string
  executionTime: number
  tokensUsed?: number
  retryCount: number
}

export interface FunctionCall {
  id: string
  toolName: string
  parameters: Record<string, any>
  context: ToolExecutionContext
  result?: ToolExecutionResult
  status: 'pending' | 'executing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
}
export class FunctionCallingSystem {
  private tools: Map<string, ToolDefinition> = new Map()
  private executionHistory: FunctionCall[] = []
  private maxRetries: number = 3
  private defaultTimeout: number = 30000 // 30 seconds

  constructor(config?: { maxRetries?: number; defaultTimeout?: number }) {
    this.maxRetries = config?.maxRetries || 3
    this.defaultTimeout = config?.defaultTimeout || 30000
  }

  // Register a new Tool

  registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool)
    console.log(`Registered tool: ${tool.name}`)
  }

  // Get all registered tools

  getAvailableTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((tool: any) => tool.enabled)
  }

  // Get tool be name

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  // Execute a function call
  async executeFunction(
    toolName: string,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now()
    const functionCall: FunctionCall = {
      id: crypto.randomUUID(),
      toolName,
      parameters,
      context,
      status: 'pending',
      createdAt: new Date(),
    }

    this.executionHistory.push(functionCall)

    try {
      // Get tool definition
      const tool = this.tools.get(toolName)
      if (!tool) {
        throw new Error(`Tool '${toolName}' not found`)
      }

      if (!tool.enabled) {
        throw new Error(`Tool '${toolName}' is disabled`)
      }

      // Validate parameters
      this.validateParameters(parameters, tool.parameters)

      // Update status
      functionCall.status = 'executing'

      // Execute with timeout and retries
      const result = await this.executeWithRetries(tool, parameters, context)

      const executionTime = Date.now() - startTime
      const executionResult: ToolExecutionResult = {
        success: true,
        result,
        executionTime,
        retryCount: 0,
      }

      functionCall.result = executionResult
      functionCall.status = 'completed'
      functionCall.completedAt = new Date()

      console.log(
        `Tool '${toolName}' executed successfully in ${executionTime}ms`
      )
      return executionResult
    } catch (error) {
      const executionTime = Date.now() - startTime
      const executionResult: ToolExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        retryCount: 0,
      }

      functionCall.result = executionResult
      functionCall.status = 'failed'
      functionCall.completedAt = new Date()

      console.error(`Tool '${toolName}' execution failed:`, error)
      return executionResult
    }
  }

  // Get execution history
  getExecutionHistory(limit?: number): FunctionCall[] {
    const history = this.executionHistory.sort(
      (a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()
    )
    return limit ? history.slice(0, limit) : history
  }

  // Clear execution history
  clearHistory(): void {
    this.executionHistory = []
  }

  // Private methods

  private validateParameters(
    params: Record<string, any>,
    schema: Record<string, ToolParameter>
  ): void {
    // Check required parameters

    for (const [name, param] of Object.entries(schema)) {
      if (param.required && !(name in params)) {
        throw new Error(`Required parameter '${name}' is missing`)
      }
    }
    // Validate parameter types

    for (const [name, value] of Object.entries(params)) {
      const param = schema[name]
      if (!param) {
        throw new Error(`Unknown parameter '${name}'`)
      }
      if (!this.validateParameterType(value, param)) {
        throw new Error(
          `Parameter '${name}' has invalid type. Expected ${param.type}`
        )
      }
    }
  }
  private validateParameterType(value: any, param: ToolParameter): boolean {
    switch (param.type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number'
      case 'boolean':
        return typeof value === 'boolean'
      case 'object':
        return (
          typeof value === 'object' && value !== null && !Array.isArray(value)
        )
      case 'array':
        return Array.isArray(value)
      default:
        return false
    }
  }
  private async executeWithRetries(
    tool: ToolDefinition,
    parameters: Record<string, any>,
    context: ToolExecutionContext
  ): Promise<any> {
    const maxRetries = tool.retries || this.maxRetries
    const timeout = tool.timeout || this.defaultTimeout

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Execute with timeout
        const result = await this.executeWithTimeout(
          () => tool.handler(parameters),
          timeout
        )
        return result
      } catch (error) {
        if (attempt === maxRetries) {
          throw error
        }

        console.warn(
          `Tool '${tool.name}' attempt ${attempt + 1} failed, retrying...`
        )
        await this.delay(1000 * attempt) // Exponential backoff
      }
    }
  }
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeout}ms`))
      }, timeout)

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer))
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const functionCallingSystem = new FunctionCallingSystem()
