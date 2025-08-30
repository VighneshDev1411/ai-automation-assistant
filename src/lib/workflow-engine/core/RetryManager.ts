// src/lib/workflow-engine/core/RetryManager.ts

export interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  exponentialBase: number
  jitter: boolean
  backoffMultiplier: number
}

export interface RetryAttempt {
  stepId: string
  attemptNumber: number
  lastAttemptAt: Date
  totalAttempts: number
  lastError?: string
}

export class RetryManager {
  private retryAttempts = new Map<string, RetryAttempt>()
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 60000, // 1 minute
    exponentialBase: 2,
    jitter: true,
    backoffMultiplier: 1.5
  }

  async shouldRetry(stepId: string, maxRetries?: number): Promise<boolean> {
    const attempt = this.retryAttempts.get(stepId)
    const limit = maxRetries || this.defaultConfig.maxRetries
    
    if (!attempt) {
      // First attempt
      this.retryAttempts.set(stepId, {
        stepId,
        attemptNumber: 1,
        lastAttemptAt: new Date(),
        totalAttempts: 1
      })
      return true
    }
    
    if (attempt.totalAttempts < limit) {
      // Update attempt count
      attempt.totalAttempts++
      attempt.attemptNumber++
      attempt.lastAttemptAt = new Date()
      this.retryAttempts.set(stepId, attempt)
      return true
    }
    
    return false
  }

  async getRetryDelay(stepId: string, config?: Partial<RetryConfig>): Promise<number> {
    const attempt = this.retryAttempts.get(stepId)
    if (!attempt) {
      return 0
    }

    const retryConfig = { ...this.defaultConfig, ...config }
    const attemptNumber = attempt.attemptNumber - 1 // Zero-based for calculation
    
    // Calculate exponential backoff
    let delay = retryConfig.initialDelay * Math.pow(retryConfig.exponentialBase, attemptNumber)
    
    // Apply backoff multiplier
    delay *= Math.pow(retryConfig.backoffMultiplier, attemptNumber)
    
    // Cap at maximum delay
    delay = Math.min(delay, retryConfig.maxDelay)
    
    // Add jitter to prevent thundering herd problem
    if (retryConfig.jitter) {
      const jitterRange = delay * 0.25 // ±25% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterRange
      delay += jitter
    }
    
    return Math.max(delay, 0)
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    stepId: string,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.defaultConfig, ...config }
    let lastError: Error

    // Reset retry state for this operation
    this.resetRetries(stepId)

    while (await this.shouldRetry(stepId, retryConfig.maxRetries)) {
      try {
        const result = await operation()
        
        // Success - clean up retry state
        this.resetRetries(stepId)
        return result
        
      } catch (error) {
        lastError = error as Error
        
        // Store error info
        const attempt = this.retryAttempts.get(stepId)
        if (attempt) {
          attempt.lastError = lastError.message
        }
        
        // Check if we should retry
        const shouldContinue = await this.shouldRetry(stepId, retryConfig.maxRetries)
        
        if (shouldContinue) {
          const delay = await this.getRetryDelay(stepId, retryConfig)
          console.log(`Retrying step ${stepId} in ${delay}ms (attempt ${attempt?.totalAttempts})`)
          await this.sleep(delay)
        } else {
          // Max retries reached
          break
        }
      }
    }

    // Clean up retry state
    this.resetRetries(stepId)
    throw lastError!
  }

  resetRetries(stepId: string): void {
    this.retryAttempts.delete(stepId)
  }

  getRetryInfo(stepId: string): RetryAttempt | null {
    return this.retryAttempts.get(stepId) || null
  }

  getAllRetryInfo(): Map<string, RetryAttempt> {
    return new Map(this.retryAttempts)
  }

  // Check if error is retryable based on error type
  isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    // Network errors are generally retryable
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('econnreset') ||
      message.includes('enotfound')
    ) {
      return true
    }

    // Rate limiting is retryable
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('quota exceeded') ||
      message.includes('429')
    ) {
      return true
    }

    // Server errors (5xx) are generally retryable
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('internal server error') ||
      message.includes('bad gateway') ||
      message.includes('service unavailable')
    ) {
      return true
    }

    // Temporary service unavailability
    if (
      message.includes('service unavailable') ||
      message.includes('temporarily unavailable') ||
      message.includes('maintenance')
    ) {
      return true
    }

    // Client errors (4xx) are generally NOT retryable
    if (
      message.includes('400') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('404') ||
      message.includes('bad request') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('not found')
    ) {
      return false
    }

    // Default to not retryable for safety
    return false
  }

  // Get recommended retry config based on error type
  getRetryConfigForError(error: Error): Partial<RetryConfig> {
    const message = error.message.toLowerCase()

    // Network/timeout errors - aggressive retry
    if (message.includes('timeout') || message.includes('network')) {
      return {
        maxRetries: 5,
        initialDelay: 2000,
        exponentialBase: 2,
        maxDelay: 30000
      }
    }

    // Rate limiting - longer delays
    if (message.includes('rate limit') || message.includes('429')) {
      return {
        maxRetries: 3,
        initialDelay: 5000,
        exponentialBase: 3,
        maxDelay: 300000 // 5 minutes
      }
    }

    // Server errors - moderate retry
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return {
        maxRetries: 4,
        initialDelay: 1000,
        exponentialBase: 2,
        maxDelay: 60000
      }
    }

    // Default config
    return this.defaultConfig
  }

  // Circuit breaker functionality
  private circuitBreakers = new Map<string, {
    failures: number
    lastFailureAt: Date
    state: 'closed' | 'open' | 'half-open'
  }>()

  isCircuitOpen(serviceId: string, failureThreshold: number = 5, timeWindow: number = 60000): boolean {
    const circuit = this.circuitBreakers.get(serviceId)
    
    if (!circuit) {
      return false
    }

    // Check if circuit should be reset (time window passed)
    if (Date.now() - circuit.lastFailureAt.getTime() > timeWindow) {
      circuit.state = 'half-open'
      circuit.failures = 0
    }

    return circuit.state === 'open'
  }

  recordFailure(serviceId: string, failureThreshold: number = 5): void {
    const circuit = this.circuitBreakers.get(serviceId) || {
      failures: 0,
      lastFailureAt: new Date(),
      state: 'closed' as const
    }

    circuit.failures++
    circuit.lastFailureAt = new Date()

    if (circuit.failures >= failureThreshold) {
      circuit.state = 'open'
    }

    this.circuitBreakers.set(serviceId, circuit)
  }

  recordSuccess(serviceId: string): void {
    const circuit = this.circuitBreakers.get(serviceId)
    if (circuit) {
      circuit.failures = 0
      circuit.state = 'closed'
      this.circuitBreakers.set(serviceId, circuit)
    }
  }

  // Utility methods
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Get retry statistics
  getRetryStatistics(): {
    totalRetryAttempts: number
    activeRetries: number
    retrySuccessRate: number
    averageRetryCount: number
  } {
    const attempts = Array.from(this.retryAttempts.values())
    
    return {
      totalRetryAttempts: attempts.reduce((sum, attempt) => sum + attempt.totalAttempts, 0),
      activeRetries: attempts.length,
      retrySuccessRate: 0, // Would need historical data to calculate
      averageRetryCount: attempts.length > 0 
        ? attempts.reduce((sum, attempt) => sum + attempt.totalAttempts, 0) / attempts.length 
        : 0
    }
  }

  // Cleanup expired retry attempts
  cleanupExpiredRetries(maxAge: number = 3600000): void { // 1 hour default
    const now = new Date()
    
    for (const [stepId, attempt] of this.retryAttempts.entries()) {
      if (now.getTime() - attempt.lastAttemptAt.getTime() > maxAge) {
        this.retryAttempts.delete(stepId)
      }
    }
  }

  // Get configuration for specific retry scenarios
  getNetworkRetryConfig(): RetryConfig {
    return {
      maxRetries: 5,
      initialDelay: 1000,
      maxDelay: 30000,
      exponentialBase: 2,
      jitter: true,
      backoffMultiplier: 1.5
    }
  }

  getRateLimitRetryConfig(): RetryConfig {
    return {
      maxRetries: 3,
      initialDelay: 10000,
      maxDelay: 300000,
      exponentialBase: 3,
      jitter: true,
      backoffMultiplier: 2
    }
  }

  getDefaultRetryConfig(): RetryConfig {
    return { ...this.defaultConfig }
  }
}