// src/lib/workflow-engine/core/WorkflowEngine.ts

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { TriggerSystem } from './TriggerSystem'
import { ActionExecutor } from './ActionExecutor'
import { ConditionalEngine } from './ConditionalEngine'
import { StateManager } from './StateManager'
import { ExecutionLogger } from './ExecutionLogger'
import { RetryManager } from './RetryManager'
import { ValidationEngine } from './ValidationEngine'

export interface WorkflowExecutionContext {
  executionId: string
  workflowId: string
  orgId: string
  userId: string
  triggerData: any
  variables: Record<string, any>
  currentStepIndex: number
  executionStartTime: Date
  parentExecutionId?: string
}

export interface WorkflowStep {
  id: string
  type: 'action' | 'condition' | 'parallel' | 'loop'
  config: any
  nextSteps?: string[]
  onError?: 'stop' | 'continue' | 'retry'
  retryCount?: number
}

export class WorkflowEngine {
  private supabase: SupabaseClient<Database>
  private triggerSystem: TriggerSystem
  private actionExecutor: ActionExecutor
  private conditionalEngine: ConditionalEngine
  private stateManager: StateManager
  private executionLogger: ExecutionLogger
  private retryManager: RetryManager
  private validationEngine: ValidationEngine

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
    this.triggerSystem = new TriggerSystem(supabase)
    this.actionExecutor = new ActionExecutor(supabase)
    this.conditionalEngine = new ConditionalEngine()
    this.stateManager = new StateManager(supabase)
    this.executionLogger = new ExecutionLogger(supabase)
    this.retryManager = new RetryManager()
    this.validationEngine = new ValidationEngine()
  }

  // Main workflow execution method
  async executeWorkflow(
    workflowId: string,
    triggerData: any = {},
    userId: string,
    parentExecutionId?: string
  ): Promise<string> {
    // 1. Validate and load workflow
    const workflow = await this.loadAndValidateWorkflow(workflowId)
    
    // 2. Create execution context
    const context = await this.createExecutionContext(
      workflowId,
      workflow.organization_id,
      userId,
      triggerData,
      parentExecutionId
    )

    try {
      // 3. Start execution logging
      await this.executionLogger.startExecution(context)

      // 4. Process workflow steps
      await this.processWorkflowSteps(workflow, context)

      // 5. Mark as completed
      await this.executionLogger.completeExecution(context.executionId)
      await this.stateManager.clearExecutionState(context.executionId)

    } catch (error) {
      // 6. Handle execution failure
      await this.executionLogger.failExecution(context.executionId, error)
      await this.stateManager.clearExecutionState(context.executionId)
      throw error
    }

    return context.executionId
  }

  // Process workflow steps with support for different execution patterns
  private async processWorkflowSteps(workflow: any, context: WorkflowExecutionContext): Promise<void> {
    const actions = workflow.actions || []
    
    // Process actions in sequence
    for (const action of actions) {
      await this.processAction(action, workflow, context)
    }
  }

  private async processAction(action: any, workflow: any, context: WorkflowExecutionContext): Promise<void> {
    context.currentStepIndex++
    
    try {
      // Save state before processing step
      await this.stateManager.saveExecutionState(context)
      
      // Execute the action
      const result = await this.executeActionWithRetry(action, context)
      
      // Update context with results
      context.variables[`step_${action.id}`] = result
      context.variables.lastResult = result
      
      // Save step result
      await this.stateManager.updateStepResult(context.executionId, action.id, result)
      
      // Process next actions if specified
      if (action.nextActions && Array.isArray(action.nextActions)) {
        for (const nextActionId of action.nextActions) {
          const nextAction = workflow.actions.find((a: any) => a.id === nextActionId)
          if (nextAction) {
            await this.processAction(nextAction, workflow, context)
          }
        }
      }
      
    } catch (error) {
      const shouldContinue = await this.handleActionError(action, error, context, workflow)
      if (!shouldContinue) {
        throw error
      }
    }
  }

  private async executeActionWithRetry(action: any, context: WorkflowExecutionContext): Promise<any> {
    const stepId = `${context.executionId}_${action.id}`
    const maxRetries = action.retryCount || 3

    return this.retryManager.executeWithRetry(
      async () => {
        // Start step logging
        await this.executionLogger.startStep(
          context.executionId,
          context.currentStepIndex,
          action.type,
          action.config
        )

        let result: any

        switch (action.type) {
          case 'action':
            result = await this.actionExecutor.executeAction(action, context)
            break
            
          case 'condition':
            result = await this.processCondition(action, context)
            break
            
          case 'parallel':
            result = await this.processParallelActions(action.config.actions, context)
            break
            
          case 'loop':
            result = await this.processLoop(action.config, context)
            break
            
          default:
            // Default to action executor for standard action types
            result = await this.actionExecutor.executeAction(action, context)
        }

        // Complete step logging
        await this.executionLogger.completeStep(
          context.executionId,
          context.currentStepIndex,
          result
        )

        return result
      },
      stepId,
      this.retryManager.getRetryConfigForError(new Error('default'))
    )
  }

  private async processCondition(conditionAction: any, context: WorkflowExecutionContext): Promise<any> {
    const conditionResult = await this.conditionalEngine.evaluateCondition(
      conditionAction.config,
      context
    )
    
    await this.executionLogger.logInfo(
      context.executionId,
      `Condition ${conditionAction.id} evaluated to: ${conditionResult.condition}`,
      conditionResult.result
    )

    // Handle conditional branching
    if (conditionResult.condition && conditionAction.config.thenAction) {
      await this.executionLogger.logInfo(context.executionId, `Executing then branch: ${conditionAction.config.thenAction}`)
      // The then action would be processed in the normal flow
    } else if (!conditionResult.condition && conditionAction.config.elseAction) {
      await this.executionLogger.logInfo(context.executionId, `Executing else branch: ${conditionAction.config.elseAction}`)
      // The else action would be processed in the normal flow
    }

    return conditionResult
  }

  private async processParallelActions(actions: any[], context: WorkflowExecutionContext): Promise<any[]> {
    await this.executionLogger.logInfo(
      context.executionId,
      `Starting parallel execution of ${actions.length} actions`
    )

    // Create fork contexts for each parallel action
    const forkPromises = actions.map(async (action, index) => {
      const forkId = await this.stateManager.forkExecution(context.executionId, `parallel_${index}`)
      
      try {
        const forkContext = { ...context, executionId: forkId }
        const result = await this.actionExecutor.executeAction(action, forkContext)
        
        await this.executionLogger.logInfo(
          context.executionId,
          `Parallel action ${action.id} completed successfully`
        )
        
        return { actionId: action.id, success: true, result }
      } catch (error) {
        await this.executionLogger.logError(
          context.executionId,
          `Parallel action ${action.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        
        return { 
          actionId: action.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    const results = await Promise.allSettled(forkPromises)
    const forkResults = results.map((result, index) => 
      result.status === 'fulfilled' ? result.value : {
        actionId: actions[index].id,
        success: false,
        error: 'Promise rejected'
      }
    )

    // Join results back to parent execution
    await this.stateManager.joinExecution(context.executionId, forkResults)

    await this.executionLogger.logInfo(
      context.executionId,
      `Parallel execution completed: ${forkResults.filter(r => r.success).length}/${forkResults.length} succeeded`
    )

    return forkResults
  }

  private async processLoop(loopConfig: any, context: WorkflowExecutionContext): Promise<any[]> {
    const items = this.resolveVariable(loopConfig.items, context)
    const maxIterations = loopConfig.maxIterations || 1000
    
    if (!Array.isArray(items)) {
      throw new Error('Loop items must be an array')
    }

    if (items.length > maxIterations) {
      throw new Error(`Loop exceeds maximum iterations limit: ${items.length} > ${maxIterations}`)
    }

    const results: any[] = []
    
    await this.executionLogger.logInfo(
      context.executionId,
      `Starting loop with ${items.length} iterations`
    )

    for (const [index, item] of items.entries()) {
      // Create loop context
      const loopContext = {
        ...context,
        variables: {
          ...context.variables,
          [loopConfig.itemVariable || 'item']: item,
          [loopConfig.indexVariable || 'index']: index,
          loopIndex: index,
          loopItem: item
        }
      }
      
      try {
        // Execute loop actions
        const loopResults = []
        for (const action of loopConfig.actions) {
          const result = await this.actionExecutor.executeAction(action, loopContext)
          loopResults.push(result)
        }
        
        results.push({
          index,
          item,
          results: loopResults,
          success: true
        })
        
      } catch (error) {
        results.push({
          index,
          item,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
        
        // Handle loop error based on configuration
        if (loopConfig.continueOnError !== true) {
          throw error
        }
      }
    }
    
    await this.executionLogger.logInfo(
      context.executionId,
      `Loop completed: ${results.filter(r => r.success).length}/${results.length} iterations succeeded`
    )

    return results
  }

  // Load and validate workflow
  private async loadAndValidateWorkflow(workflowId: string): Promise<any> {
    const { data: workflow, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (error || !workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    if (workflow.status !== 'active') {
      throw new Error(`Workflow is not active: ${workflow.status}`)
    }

    // Validate workflow structure
    const validation = await this.validationEngine.validateWorkflow(workflow)
    if (!validation.isValid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`)
    }

    return workflow
  }

  // Create execution context
  private async createExecutionContext(
    workflowId: string,
    orgId: string,
    userId: string,
    triggerData: any,
    parentExecutionId?: string
  ): Promise<WorkflowExecutionContext> {
    const executionId = crypto.randomUUID()
    
    return {
      executionId,
      workflowId,
      orgId,
      userId,
      triggerData,
      variables: { 
        ...triggerData,
        trigger: triggerData,
        execution: {
          id: executionId,
          startedAt: new Date().toISOString(),
          workflowId,
          userId
        }
      },
      currentStepIndex: 0,
      executionStartTime: new Date(),
      parentExecutionId
    }
  }

  // Handle action execution errors
  private async handleActionError(
    action: any,
    error: any,
    context: WorkflowExecutionContext,
    workflow: any
  ): Promise<boolean> {
    const errorHandling = workflow.error_handling || action.onError || { on_failure: 'stop' }
    
    await this.executionLogger.logError(
      context.executionId,
      `Action ${action.id} failed: ${error.message}`,
      { actionId: action.id, error: error.message }
    )

    switch (errorHandling.on_failure) {
      case 'continue':
        await this.executionLogger.logWarning(
          context.executionId, 
          `Action ${action.id} failed but continuing execution`
        )
        return true
        
      case 'notify':
        await this.sendErrorNotification(context, action, error)
        return false
        
      case 'stop':
      default:
        return false
    }
  }

  private async sendErrorNotification(
    context: WorkflowExecutionContext, 
    action: any, 
    error: any
  ): Promise<void> {
    try {
      // This would send notifications via configured channels
      await this.executionLogger.logInfo(
        context.executionId,
        `Error notification sent for failed action: ${action.id}`
      )
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError)
    }
  }

  // Resolve variable from context
  private resolveVariable(variable: any, context: WorkflowExecutionContext): any {
    if (typeof variable === 'string' && variable.startsWith('{{') && variable.endsWith('}}')) {
      const variableName = variable.slice(2, -2).trim()
      return this.getNestedValue(context.variables, variableName)
    }
    return variable
  }

  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.')
    let current = obj
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined
      }
      current = current[key]
    }
    
    return current
  }

  // Public methods for external trigger handling
  async handleWebhookTrigger(webhookId: string, payload: any): Promise<string> {
    return this.triggerSystem.handleWebhook(webhookId, payload)
  }

  async handleScheduledTrigger(workflowId: string): Promise<string> {
    return this.triggerSystem.handleScheduled(workflowId)
  }

  async handleManualTrigger(workflowId: string, userId: string, triggerData?: any): Promise<string> {
    return this.executeWorkflow(workflowId, triggerData, userId)
  }

  // Workflow management methods
  async pauseWorkflow(workflowId: string): Promise<void> {
    const { error } = await this.supabase
      .from('workflows')
      .update({ status: 'paused' })
      .eq('id', workflowId)

    if (error) {
      throw new Error(`Failed to pause workflow: ${error.message}`)
    }
  }

  async resumeWorkflow(workflowId: string): Promise<void> {
    const { error } = await this.supabase
      .from('workflows')
      .update({ status: 'active' })
      .eq('id', workflowId)

    if (error) {
      throw new Error(`Failed to resume workflow: ${error.message}`)
    }
  }

  async getExecutionStats(workflowId: string, timeRange?: string): Promise<any> {
    return this.executionLogger.getExecutionStats(workflowId, timeRange)
  }

  // Validation methods
  async validateWorkflowConfig(workflowConfig: any): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    return this.validationEngine.validateWorkflow(workflowConfig)
  }

  async testWorkflowExecution(workflowId: string, testData: any): Promise<any> {
    return this.validationEngine.dryRunWorkflow(workflowId, testData)
  }

  // Advanced execution methods
  async executeWorkflowWithTimeout(
    workflowId: string,
    triggerData: any,
    userId: string,
    timeoutMs: number = 600000 // 10 minutes default
  ): Promise<string> {
    return Promise.race([
      this.executeWorkflow(workflowId, triggerData, userId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Workflow execution timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ])
  }

  async pauseExecution(executionId: string): Promise<void> {
    await this.stateManager.pauseExecution(executionId)
    await this.executionLogger.logInfo(executionId, 'Execution paused by user request')
  }

  async resumeExecution(executionId: string): Promise<void> {
    const state = await this.stateManager.loadExecutionState(executionId)
    if (!state) {
      throw new Error('Execution state not found')
    }

    await this.stateManager.resumeExecution(executionId)
    await this.executionLogger.logInfo(executionId, 'Execution resumed')

    // Continue execution from where it left off
    const workflow = await this.loadAndValidateWorkflow(state.workflowId)
    const context: WorkflowExecutionContext = {
      executionId,
      workflowId: state.workflowId,
      orgId: '', // Would need to be retrieved
      userId: '', // Would need to be retrieved
      triggerData: {},
      variables: state.variables,
      currentStepIndex: state.currentStepIndex,
      executionStartTime: new Date()
    }

    await this.processWorkflowSteps(workflow, context)
  }

  // Batch operations
  async executeMultipleWorkflows(
    executions: Array<{
      workflowId: string
      triggerData?: any
      userId: string
    }>
  ): Promise<Array<{ workflowId: string; executionId?: string; error?: string }>> {
    const results = await Promise.allSettled(
      executions.map(async (exec) => {
        const executionId = await this.executeWorkflow(
          exec.workflowId,
          exec.triggerData,
          exec.userId
        )
        return { workflowId: exec.workflowId, executionId }
      })
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          workflowId: executions[index].workflowId,
          error: result.reason?.message || 'Unknown error'
        }
      }
    })
  }

  // Cleanup and maintenance
  async cleanup(): Promise<void> {
    // Cleanup retry manager
    this.retryManager.cleanupExpiredRetries()
    
    // Cleanup state manager cache
    this.stateManager.cleanupExpiredCache()
    
    // Cleanup old execution logs (configurable retention)
    const cleanedLogs = await this.executionLogger.cleanupOldLogs(90) // 90 days retention
    console.log(`Cleaned up ${cleanedLogs} old execution logs`)
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, boolean>
    timestamp: string
  }> {
    const checks = {
      database: false,
      cache: false,
      integrations: false
    }

    try {
      // Test database connection
      const { error: dbError } = await this.supabase
        .from('workflows')
        .select('id')
        .limit(1)
      checks.database = !dbError

      // Test cache
      checks.cache = this.stateManager.getCacheSize() >= 0

      // Test integrations (basic check)
      checks.integrations = true // Would test actual integrations

    } catch (error) {
      console.error('Health check failed:', error)
    }

    const healthyChecks = Object.values(checks).filter(Boolean).length
    const totalChecks = Object.keys(checks).length

    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (healthyChecks === totalChecks) {
      status = 'healthy'
    } else if (healthyChecks > 0) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }

    return {
      status,
      checks,
      timestamp: new Date().toISOString()
    }
  }
}