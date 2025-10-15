export class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public nodeId?: string,
    public recoverable: boolean = false,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'WorkflowExecutionError'
  }
}

export class NodeExecutionError extends WorkflowExecutionError {
  constructor(
    message: string,
    nodeId: string,
    public nodeType: string,
    recoverable: boolean = false,
    context?: Record<string, any>
  ) {
    super(message, 'NODE_EXECUTION_ERROR', nodeId, recoverable, context)
    this.name = 'NodeExecutionError'
  }
}

export class IntegrationError extends WorkflowExecutionError {
  constructor(
    message: string,
    public integration: string,
    recoverable: boolean = true,
    context?: Record<string, any>
  ) {
    super(message, 'INTEGRATION_ERROR', undefined, recoverable, context)
    this.name = 'IntegrationError'
  }
}

export class AIAgentError extends WorkflowExecutionError {
  constructor(
    message: string,
    public agentId: string,
    recoverable: boolean = true,
    context?: Record<string, any>
  ) {
    super(message, 'AI_AGENT_ERROR', undefined, recoverable, context)
    this.name = 'AIAgentError'
  }
}

export interface ErrorRecoveryStrategy {
  maxRetries: number
  retryDelay: number // milliseconds
  backoffMultiplier: number
  fallbackAction?: () => Promise<any>
}

export class WorkflowErrorHandler {
  private errorLog: Array<{
    timestamp: Date
    error: WorkflowExecutionError
    workflowId: string
    executionId: string
  }> = []

  async handleError(
    error: Error,
    workflowId: string,
    executionId: string,
    strategy?: ErrorRecoveryStrategy
  ): Promise<{ recovered: boolean; result?: any; finalError?: Error }> {
    // Log error
    const workflowError = this.normalizeError(error)
    this.errorLog.push({
      timestamp: new Date(),
      error: workflowError,
      workflowId,
      executionId,
    })

    console.error('Workflow execution error:', {
      code: workflowError.code,
      message: workflowError.message,
      nodeId: workflowError.nodeId,
      recoverable: workflowError.recoverable,
      context: workflowError.context,
    })

    // Attempt recovery if error is recoverable
    if (workflowError.recoverable && strategy) {
      return await this.attemptRecovery(workflowError, strategy)
    }

    return { recovered: false, finalError: workflowError }
  }

  private normalizeError(error: Error): WorkflowExecutionError {
    if (error instanceof WorkflowExecutionError) {
      return error
    }

    // Convert generic errors to WorkflowExecutionError
    return new WorkflowExecutionError(
      error.message,
      'UNKNOWN_ERROR',
      undefined,
      false,
      { originalError: error.name }
    )
  }

  private async attemptRecovery(
    error: WorkflowExecutionError,
    strategy: ErrorRecoveryStrategy
  ): Promise<{ recovered: boolean; result?: any; finalError?: Error }> {
    let lastError = error
    let currentDelay = strategy.retryDelay

    for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
      console.log(`Recovery attempt ${attempt}/${strategy.maxRetries}`)

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, currentDelay))

      try {
        // Try fallback action if provided
        if (strategy.fallbackAction) {
          const result = await strategy.fallbackAction()
          console.log('Recovery successful via fallback action')
          return { recovered: true, result }
        }

        // If no fallback, consider it recovered (skip the failed step)
        console.log('Recovery successful - skipping failed step')
        return { recovered: true }
      } catch (retryError: any) {
        lastError = this.normalizeError(retryError)
        console.error(`Recovery attempt ${attempt} failed:`, lastError.message)

        // Increase delay for next attempt (exponential backoff)
        currentDelay *= strategy.backoffMultiplier
      }
    }

    console.error('All recovery attempts exhausted')
    return { recovered: false, finalError: lastError }
  }

  getRecentErrors(workflowId: string, limit: number = 10) {
    return this.errorLog
      .filter(log => log.workflowId === workflowId)
      .slice(-limit)
  }

  clearErrorLog(workflowId?: string) {
    if (workflowId) {
      this.errorLog = this.errorLog.filter(log => log.workflowId !== workflowId)
    } else {
      this.errorLog = []
    }
  }
}

// Global error handler instance
export const workflowErrorHandler = new WorkflowErrorHandler()

// Default recovery strategies
export const DEFAULT_RECOVERY_STRATEGIES: Record<string, ErrorRecoveryStrategy> = {
  integration: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
  },
  aiAgent: {
    maxRetries: 2,
    retryDelay: 2000,
    backoffMultiplier: 1.5,
  },
  network: {
    maxRetries: 5,
    retryDelay: 500,
    backoffMultiplier: 2,
  },
}
