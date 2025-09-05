import { ConditionalEngine, WorkflowExecutionContext } from './ConditionalEngine'

export class WorkflowEngine {
  private supabase: any
  private conditionalEngine: ConditionalEngine

  constructor(supabase: any) {
    this.supabase = supabase
    this.conditionalEngine = new ConditionalEngine()
  }

  async executeWorkflow(
    workflowId: string,
    triggerData: any = {},
    userId: string,
    parentExecutionId?: string
  ): Promise<string> {
    const executionId = crypto.randomUUID()

    try {
      // 1. Load workflow definition
      const { data: workflow, error } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('status', 'active')
        .single()

      if (error || !workflow) {
        throw new Error(`Workflow not found or not active: ${workflowId}`)
      }

      // 2. Create execution context
      const context = await this.createExecutionContext(
        workflowId,
        workflow.organization_id,
        userId,
        triggerData,
        parentExecutionId
      )

      // 3. Start execution logging
      await this.startExecution(context)

      // 4. Process workflow steps
      await this.processWorkflowSteps(workflow, context)

      // 5. Mark as completed
      await this.completeExecution(context.executionId)

      return context.executionId

    } catch (error) {
      // 6. Handle execution failure
      await this.failExecution(executionId, error)
      throw error
    }
  }

  private async createExecutionContext(
    workflowId: string,
    organizationId: string,
    userId: string,
    triggerData: any,
    parentExecutionId?: string
  ): Promise<WorkflowExecutionContext> {
    return {
      executionId: crypto.randomUUID(),
      workflowId,
      orgId: organizationId,
      userId,
      triggerData,
      variables: { ...triggerData },
      currentStepIndex: 0,
      executionStartTime: new Date(),
      parentExecutionId
    }
  }

  private async startExecution(context: WorkflowExecutionContext): Promise<void> {
    const { error } = await this.supabase
      .from('workflow_executions')
      .insert({
        id: context.executionId,
        workflow_id: context.workflowId,
        status: 'running',
        trigger_data: context.triggerData,
        started_at: context.executionStartTime.toISOString(),
        user_id: context.userId
      })

    if (error) {
      throw new Error(`Failed to start execution: ${error.message}`)
    }
  }

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
      // Execute the action based on type
      let result: any

      switch (action.type) {
        case 'condition':
          result = await this.processCondition(action, context)
          break
          
        case 'http':
          result = await this.executeHttpAction(action.config, context)
          break
          
        case 'email':
          result = await this.executeEmailAction(action.config, context)
          break
          
        default:
          result = await this.executeGenericAction(action, context)
      }
      
      // Update context with results
      context.variables[`step_${action.id}`] = result
      context.variables.lastResult = result
      
    } catch (error) {
      console.error(`Action ${action.id} failed:`, error)
      throw error
    }
  }

  private async processCondition(conditionAction: any, context: WorkflowExecutionContext): Promise<any> {
    const conditionResult = await this.conditionalEngine.evaluateCondition(
      conditionAction.config,
      context
    )
    
    // Handle conditional branching
    if (conditionResult.condition && conditionAction.config.thenAction) {
      console.log(`Executing then branch: ${conditionAction.config.thenAction}`)
    } else if (!conditionResult.condition && conditionAction.config.elseAction) {
      console.log(`Executing else branch: ${conditionAction.config.elseAction}`)
    }

    return conditionResult
  }

  private async executeHttpAction(config: any, context: WorkflowExecutionContext): Promise<any> {
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: config.headers || { 'Content-Type': 'application/json' },
      body: config.body ? JSON.stringify(config.body) : undefined
    })

    return {
      status: response.status,
      data: await response.json(),
      timestamp: new Date().toISOString()
    }
  }

  private async executeEmailAction(config: any, context: WorkflowExecutionContext): Promise<any> {
    // Simulate email sending
    return {
      success: true,
      message: 'Email sent successfully',
      to: config.to,
      subject: config.subject,
      timestamp: new Date().toISOString()
    }
  }

  private async executeGenericAction(action: any, context: WorkflowExecutionContext): Promise<any> {
    // Generic action execution
    return {
      success: true,
      actionType: action.type,
      config: action.config,
      timestamp: new Date().toISOString()
    }
  }

  private async completeExecution(executionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', executionId)

    if (error) {
      console.error('Failed to complete execution:', error)
    }
  }

  private async failExecution(executionId: string, error: any): Promise<void> {
    await this.supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', executionId)
  }
}
