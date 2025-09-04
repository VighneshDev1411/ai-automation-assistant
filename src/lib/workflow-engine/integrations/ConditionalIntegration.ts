// src/lib/workflow-engine/integrations/ConditionalIntegration.ts

import { AdvancedConditionalEngine, AdvancedCondition, ConditionalResult } from '../advanced/AdvancedConditionEngine'
import { FilterEngine, FilterGroup, FilterResult } from '../advanced/FilterEngine'
import { WorkflowExecutionContext } from '../core/WorkflowEngine'

export interface ConditionalActionConfig {
  id: string
  type: 'conditional'
  name: string
  description?: string
  conditions: AdvancedCondition[]
  filters?: FilterGroup[]
  onTrue: ConditionalBranch
  onFalse?: ConditionalBranch
  onError?: ConditionalBranch
  options: {
    evaluationMode: 'all' | 'any' | 'sequential'
    stopOnFirstFailure: boolean
    timeout: number
    cacheResults: boolean
    logLevel: 'none' | 'basic' | 'detailed'
  }
}

export interface ConditionalBranch {
  actionIds: string[]
  continueWorkflow: boolean
  setVariables?: Record<string, any>
  metadata?: {
    description?: string
    tags?: string[]
  }
}

export interface ConditionalExecutionResult {
  success: boolean
  conditionsPassed: boolean
  filtersPassed?: boolean
  branch: 'onTrue' | 'onFalse' | 'onError'
  executionTime: number
  conditionResults: ConditionalResult[]
  filterResults?: FilterResult[]
  nextActionIds: string[]
  variables: Record<string, any>
  errors?: string[]
  metadata: {
    evaluationMode: string
    totalConditions: number
    passedConditions: number
    totalFilters?: number
    passedFilters?: number
  }
}

export class ConditionalIntegration {
  private conditionalEngine: AdvancedConditionalEngine
  private filterEngine: FilterEngine
  private cache: Map<string, any> = new Map()

  constructor() {
    this.conditionalEngine = new AdvancedConditionalEngine()
    this.filterEngine = new FilterEngine()
    this.initializeCustomFunctions()
  }

  // Main execution method for conditional actions
  async executeConditionalAction(
    config: ConditionalActionConfig,
    context: WorkflowExecutionContext
  ): Promise<ConditionalExecutionResult> {
    const startTime = performance.now()
    
    try {
      // Validate configuration
      this.validateConfig(config)

      // Execute conditions based on evaluation mode
      const conditionResults = await this.evaluateConditions(config, context)
      const conditionsPassed = this.determineConditionsResult(conditionResults, config.options.evaluationMode)

      // Execute filters if configured
      let filterResults: FilterResult[] | undefined
      let filtersPassed = true

      if (config.filters && config.filters.length > 0) {
        filterResults = await this.evaluateFilters(config.filters, context)
        filtersPassed = filterResults.every(result => result.passed)
      }

      // Determine which branch to execute
      const finalResult = conditionsPassed && filtersPassed
      const branch = this.determineBranch(finalResult, config)
      const branchConfig = this.getBranchConfig(branch, config)

      // Prepare execution result
      const executionResult: ConditionalExecutionResult = {
        success: true,
        conditionsPassed,
        filtersPassed,
        branch,
        executionTime: performance.now() - startTime,
        conditionResults,
        filterResults,
        nextActionIds: branchConfig.actionIds,
        variables: {
          ...context.variables,
          ...(branchConfig.setVariables || {}),
          // Add conditional result metadata
          _conditional: {
            conditionsPassed,
            filtersPassed,
            branch,
            executionId: context.executionId,
            timestamp: new Date().toISOString()
          }
        },
        metadata: {
          evaluationMode: config.options.evaluationMode,
          totalConditions: config.conditions.length,
          passedConditions: conditionResults.filter(r => r.result).length,
          totalFilters: config.filters?.reduce((sum, group) => sum + group.filters.length, 0),
          passedFilters: filterResults?.reduce((sum, result) => sum + result.matchedFilters.length, 0)
        }
      }

      // Log execution if enabled
      if (config.options.logLevel !== 'none') {
        await this.logExecution(config, executionResult, context)
      }

      return executionResult

    } catch (error) {
      // Handle error case
      const errorBranch = config.onError || { actionIds: [], continueWorkflow: false }
      
      return {
        success: false,
        conditionsPassed: false,
        branch: 'onError',
        executionTime: performance.now() - startTime,
        conditionResults: [],
        nextActionIds: errorBranch.actionIds,
        variables: context.variables,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metadata: {
          evaluationMode: config.options.evaluationMode,
          totalConditions: config.conditions.length,
          passedConditions: 0
        }
      }
    }
  }

  // Evaluate all conditions based on mode
  private async evaluateConditions(
    config: ConditionalActionConfig,
    context: WorkflowExecutionContext
  ): Promise<ConditionalResult[]> {
    const results: ConditionalResult[] = []
    
    switch (config.options.evaluationMode) {
      case 'all':
        // Evaluate all conditions regardless of individual results
        for (const condition of config.conditions) {
          const result = await this.conditionalEngine.evaluateCondition(condition, context, {
            useCache: config.options.cacheResults,
            timeout: config.options.timeout
          })
          results.push(result)
        }
        break

      case 'any':
        // Evaluate until first true condition (short-circuit)
        for (const condition of config.conditions) {
          const result = await this.conditionalEngine.evaluateCondition(condition, context, {
            useCache: config.options.cacheResults,
            timeout: config.options.timeout
          })
          results.push(result)
          
          if (result.result) {
            break // Short-circuit on first true condition
          }
        }
        break

      case 'sequential':
        // Evaluate conditions in sequence, stopping on first failure if configured
        for (const condition of config.conditions) {
          const result = await this.conditionalEngine.evaluateCondition(condition, context, {
            useCache: config.options.cacheResults,
            timeout: config.options.timeout
          })
          results.push(result)
          
          if (!result.result && config.options.stopOnFirstFailure) {
            break
          }
        }
        break
    }

    return results
  }

  // Evaluate filter groups
  private async evaluateFilters(
    filterGroups: FilterGroup[],
    context: WorkflowExecutionContext
  ): Promise<FilterResult[]> {
    const results: FilterResult[] = []
    
    for (const filterGroup of filterGroups) {
      const result = await this.filterEngine.evaluateFilterGroup(filterGroup, context, {
        stopOnFirstFailure: false,
        includeDetails: true,
        maxExecutionTime: 30000
      })
      results.push(result)
    }
    
    return results
  }

  // Determine overall conditions result based on evaluation mode
  private determineConditionsResult(results: ConditionalResult[], mode: string): boolean {
    if (results.length === 0) return true

    switch (mode) {
      case 'all':
        return results.every(r => r.success && r.result)
      case 'any':
        return results.some(r => r.success && r.result)
      case 'sequential':
        return results.every(r => r.success && r.result)
      default:
        return false
    }
  }

  // Determine which branch to execute
  private determineBranch(
    finalResult: boolean,
    config: ConditionalActionConfig
  ): 'onTrue' | 'onFalse' | 'onError' {
    if (finalResult) {
      return 'onTrue'
    } else if (config.onFalse) {
      return 'onFalse'
    } else {
      return 'onError'
    }
  }

  // Get branch configuration
  private getBranchConfig(
    branch: 'onTrue' | 'onFalse' | 'onError',
    config: ConditionalActionConfig
  ): ConditionalBranch {
    switch (branch) {
      case 'onTrue':
        return config.onTrue
      case 'onFalse':
        return config.onFalse || { actionIds: [], continueWorkflow: false }
      case 'onError':
        return config.onError || { actionIds: [], continueWorkflow: false }
    }
  }

  // Validate configuration
  private validateConfig(config: ConditionalActionConfig): void {
    if (!config.conditions || config.conditions.length === 0) {
      throw new Error('At least one condition is required')
    }

    if (!config.onTrue) {
      throw new Error('onTrue branch configuration is required')
    }

    if (config.options.timeout && config.options.timeout <= 0) {
      throw new Error('Timeout must be greater than 0')
    }

    // Validate conditions structure
    for (const condition of config.conditions) {
      this.validateCondition(condition)
    }
  }

  // Validate individual condition
  private validateCondition(condition: AdvancedCondition): void {
    if (!condition.id) {
      throw new Error('Condition ID is required')
    }

    if (!condition.operator) {
      throw new Error('Condition operator is required')
    }

    if (condition.type === 'simple' && !condition.field) {
      throw new Error('Field is required for simple conditions')
    }

    if (condition.type === 'complex' && (!condition.conditions || condition.conditions.length === 0)) {
      throw new Error('Sub-conditions are required for complex conditions')
    }
  }

  // Log execution details
  private async logExecution(
    config: ConditionalActionConfig,
    result: ConditionalExecutionResult,
    context: WorkflowExecutionContext
  ): Promise<void> {
    const logData = {
      timestamp: new Date().toISOString(),
      executionId: context.executionId,
      workflowId: context.workflowId,
      actionId: config.id,
      actionName: config.name,
      result: {
        success: result.success,
        branch: result.branch,
        executionTime: result.executionTime,
        conditionsPassed: result.conditionsPassed,
        filtersPassed: result.filtersPassed
      }
    }

    if (config.options.logLevel === 'detailed') {
      Object.assign(logData, {
        conditionResults: result.conditionResults,
        filterResults: result.filterResults,
        metadata: result.metadata
      })
    }

    console.log('Conditional Action Execution:', logData)
    // In a real implementation, you would send this to your logging service
  }

  // Initialize custom functions for conditions
  private initializeCustomFunctions(): void {
    // Register workflow-specific custom functions
    this.conditionalEngine.registerCustomFunction('isWorkflowStep', ({context, params}:any) => {
      return context.currentStepIndex === params.stepIndex
    })

    this.conditionalEngine.registerCustomFunction('hasExecutedAction', ({context, params}:any) => {
      return context.variables._executedActions?.includes(params.actionId) || false
    })

    this.conditionalEngine.registerCustomFunction('isRetryAttempt', ({context, params}:any) => {
      return (context.variables._retryCount || 0) > 0
    })

    this.conditionalEngine.registerCustomFunction('checkQuota', ({context, params}:any) => {
      const usage = context.variables._quotaUsage || 0
      const limit = params.limit || 1000
      return usage < limit
    })

    this.conditionalEngine.registerCustomFunction('timeBasedCondition', ({context, params}:any) => {
      const now = new Date()
      const hour = now.getHours()
      const dayOfWeek = now.getDay()
      
      if (params.businessHours) {
        return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 17
      }
      
      if (params.afterHours) {
        return dayOfWeek === 0 || dayOfWeek === 6 || hour < 9 || hour >= 17
      }
      
      return true
    })
  }

  // Utility methods for building conditions programmatically
  public createEmailValidationCondition(fieldPath: string): AdvancedCondition {
    return this.conditionalEngine.createSimpleCondition(
      fieldPath,
      'matches_regex',
      '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+',
      {
        name: 'Email Validation',
        description: `Validate email format for ${fieldPath}`,
        tags: ['validation', 'email']
      }
    )
  }

  public createDateRangeCondition(
    fieldPath: string,
    startDate: Date,
    endDate: Date
  ): AdvancedCondition {
    return this.conditionalEngine.createSimpleCondition(
      fieldPath,
      'date_between',
      [startDate.toISOString(), endDate.toISOString()],
      {
        name: 'Date Range Check',
        description: `Check if ${fieldPath} is between ${startDate.toDateString()} and ${endDate.toDateString()}`,
        tags: ['date', 'range']
      }
    )
  }

  public createBusinessLogicCondition(
    conditions: AdvancedCondition[],
    operator: 'and' | 'or' = 'and'
  ): AdvancedCondition {
    return this.conditionalEngine.createComplexCondition(
      operator,
      conditions,
      {
        name: 'Business Logic',
        description: `Complex business logic using ${operator.toUpperCase()} operator`,
        tags: ['business', 'logic', 'complex']
      }
    )
  }

  // Helper methods for common conditional patterns
  public createUserPermissionCheck(
    userRole: string,
    requiredPermissions: string[]
  ): ConditionalActionConfig {
    const conditions: AdvancedCondition[] = [
      this.conditionalEngine.createSimpleCondition(
        'user.role',
        'equals',
        userRole,
        { name: 'Role Check' }
      )
    ]

    if (requiredPermissions.length > 0) {
      conditions.push(
        this.conditionalEngine.createSimpleCondition(
          'user.permissions',
          'includes_all',
          requiredPermissions,
          { name: 'Permission Check' }
        )
      )
    }

    return {
      id: `permission_check_${Date.now()}`,
      type: 'conditional',
      name: 'User Permission Check',
      description: `Check if user has role '${userRole}' and required permissions`,
      conditions,
      onTrue: {
        actionIds: ['continue_workflow'],
        continueWorkflow: true
      },
      onFalse: {
        actionIds: ['access_denied'],
        continueWorkflow: false,
        setVariables: {
          error: 'Insufficient permissions',
          errorCode: 'ACCESS_DENIED'
        }
      },
      options: {
        evaluationMode: 'all',
        stopOnFirstFailure: true,
        timeout: 5000,
        cacheResults: true,
        logLevel: 'basic'
      }
    }
  }

  public createDataValidationCheck(
    validationRules: Array<{ field: string; operator: string; value: any; message?: string }>
  ): ConditionalActionConfig {
    const conditions = validationRules.map(rule =>
      this.conditionalEngine.createSimpleCondition(
        rule.field,
        rule.operator as any,
        rule.value,
        { 
          name: `Validate ${rule.field}`,
          description: rule.message || `Validation for ${rule.field}`
        }
      )
    )

    return {
      id: `data_validation_${Date.now()}`,
      type: 'conditional',
      name: 'Data Validation',
      description: 'Validate input data according to business rules',
      conditions,
      onTrue: {
        actionIds: ['process_data'],
        continueWorkflow: true,
        setVariables: {
          validationStatus: 'passed'
        }
      },
      onFalse: {
        actionIds: ['validation_failed'],
        continueWorkflow: false,
        setVariables: {
          validationStatus: 'failed',
          error: 'Data validation failed'
        }
      },
      options: {
        evaluationMode: 'all',
        stopOnFirstFailure: false,
        timeout: 10000,
        cacheResults: false,
        logLevel: 'detailed'
      }
    }
  }

  public createApprovalWorkflow(
    approvalField: string,
    requiredApprovers: number,
    timeoutHours: number = 24
  ): ConditionalActionConfig {
    const conditions: AdvancedCondition[] = [
      this.conditionalEngine.createSimpleCondition(
        `${approvalField}.status`,
        'equals',
        'approved',
        { name: 'Approval Status Check' }
      ),
      this.conditionalEngine.createSimpleCondition(
        `${approvalField}.approvers`,
        'array_length_greater_than',
        requiredApprovers - 1,
        { name: 'Minimum Approvers Check' }
      ),
      this.conditionalEngine.createSimpleCondition(
        `${approvalField}.submittedAt`,
        'date_after',
        new Date(Date.now() - timeoutHours * 60 * 60 * 1000).toISOString(),
        { name: 'Timeout Check' }
      )
    ]

    return {
      id: `approval_workflow_${Date.now()}`,
      type: 'conditional',
      name: 'Approval Workflow',
      description: `Check approval status with ${requiredApprovers} required approvers`,
      conditions,
      onTrue: {
        actionIds: ['execute_approved_action'],
        continueWorkflow: true,
        setVariables: {
          approvalResult: 'approved',
          approvedAt: new Date().toISOString()
        }
      },
      onFalse: {
        actionIds: ['handle_pending_approval'],
        continueWorkflow: false,
        setVariables: {
          approvalResult: 'pending',
          reason: 'Insufficient approvals or timeout'
        }
      },
      options: {
        evaluationMode: 'all',
        stopOnFirstFailure: false,
        timeout: 15000,
        cacheResults: true,
        logLevel: 'detailed'
      }
    }
  }

  // Clear cache
  public clearCache(): void {
    this.cache.clear()
    this.conditionalEngine.clearCache()
  }

  // Get cache statistics
  public getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
      // In a real implementation, you would track hit rates
    }
  }
}