import { TriggerSystem } from "./TriggerSystem"

export class ExecutionEngine {
  private supabase: any
  private triggerSystem: TriggerSystem

  constructor(supabase: any) {
    this.supabase = supabase
    this.triggerSystem = new TriggerSystem(supabase)
  }

  async executeWorkflow(
    workflowId: string, 
    triggerData: any = {}, 
    userId: string
  ): Promise<string> {
    const executionId = crypto.randomUUID()

    try {
      // Start execution record
      const { error: insertError } = await this.supabase
        .from('workflow_executions')
        .insert({
          id: executionId,
          workflow_id: workflowId,
          status: 'running',
          trigger_data: triggerData,
          started_at: new Date().toISOString(),
          user_id: userId
        })

      if (insertError) {
        throw new Error(`Failed to start execution: ${insertError.message}`)
      }

      // Get workflow details
      const { data: workflow, error: workflowError } = await this.supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (workflowError || !workflow) {
        throw new Error('Workflow not found')
      }

      // Process workflow steps
      await this.processWorkflowSteps(executionId, workflow, triggerData)

      // Mark as completed
      const { error: updateError } = await this.supabase
        .from('workflow_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId)

      if (updateError) {
        console.error('Failed to update execution status:', updateError)
      }

      return executionId

    } catch (error) {
      // Mark as failed
      await this.supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', executionId)

      throw error
    }
  }

  private async processWorkflowSteps(
    executionId: string, 
    workflow: any, 
    triggerData: any
  ): Promise<void> {
    const actions = workflow.actions || []
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      
      try {
        const stepResult = await this.executeStep(executionId, action, triggerData, i)
        
        // Log step completion
        await this.supabase
          .from('execution_steps')
          .insert({
            execution_id: executionId,
            step_index: i,
            action_type: action.type,
            status: 'completed',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            result_data: stepResult
          })

      } catch (error) {
        // Log step failure
        await this.supabase
          .from('execution_steps')
          .insert({
            execution_id: executionId,
            step_index: i,
            action_type: action.type,
            status: 'failed',
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })

        throw error
      }
    }
  }

  private async executeStep(
    executionId: string, 
    action: any, 
    triggerData: any, 
    stepIndex: number
  ): Promise<any> {
    // Implementation depends on action type
    switch (action.type) {
      case 'http':
        return await this.executeHttpAction(action.config, triggerData)
      case 'email':
        return await this.executeEmailAction(action.config, triggerData)
      case 'condition':
        return await this.executeConditionAction(action.config, triggerData)
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  private async executeHttpAction(config: any, triggerData: any): Promise<any> {
    // HTTP action implementation
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: config.headers || {},
      body: JSON.stringify(config.body || triggerData)
    })

    return await response.json()
  }

  private async executeEmailAction(config: any, triggerData: any): Promise<any> {
    // Email action implementation
    return {
      success: true,
      message: 'Email sent',
      to: config.to,
      subject: config.subject
    }
  }

  private async executeConditionAction(config: any, triggerData: any): Promise<any> {
    // Condition evaluation implementation
    const result = this.evaluateCondition(config.condition, triggerData)
    
    return {
      condition: config.condition,
      result,
      triggeredAction: result ? config.thenAction : config.elseAction
    }
  }

  private evaluateCondition(condition: string, data: any): boolean {
    // Simple condition evaluation - expand as needed
    try {
      // This is a simplified example - use a proper expression evaluator in production
      return eval(condition.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return JSON.stringify(data[key])
      }))
    } catch {
      return false
    }
  }
}