import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { BaseService } from './base.service'

type ExecutionLog = Database['public']['Tables']['execution_logs']['Row']
type ExecutionStatus = Database['public']['Enums']['execution_status']

export class ExecutionService extends BaseService<'execution_logs'> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'execution_logs')
  }

  async findByWorkflow(
    workflowId: string,
    options?: {
      status?: ExecutionStatus
      limit?: number
      offset?: number
    }
  ) {
    let query = this.supabase
      .from('execution_logs')
      .select('*')
      .eq('workflow_id', workflowId)

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(options?.limit || 50)

    if (error) throw error
    return data
  }

  async getExecutionSteps(executionId: string) {
    const { data, error } = await this.supabase
      .from('execution_steps')
      .select('*')
      .eq('execution_id', executionId)
      .order('step_index', { ascending: true })

    if (error) throw error
    return data
  }

  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    executionData?: any,
    errorDetails?: any
  ) {
    const updateData: any = { status }

    if (executionData) {
      updateData.execution_data = executionData
    }

    if (errorDetails) {
      updateData.error_details = errorDetails
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString()
      
      // Calculate duration
      const { data: execution } = await this.findById(executionId)
      if (execution?.started_at) {
        const duration = Date.now() - new Date(execution.started_at).getTime()
        updateData.duration_ms = duration
      }
    }

    return this.update(executionId, updateData)
  }

  async createExecutionStep(
    executionId: string,
    stepIndex: number,
    actionType: string,
    inputData: any
  ) {
    const { data, error } = await this.supabase
      .from('execution_steps')
      .insert({
        execution_id: executionId,
        step_index: stepIndex,
        action_type: actionType,
        status: 'pending',
        input_data: inputData,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateExecutionStep(
    executionId: string,
    stepIndex: number,
    status: ExecutionStatus,
    outputData?: any,
    errorMessage?: string
  ) {
    const updateData: any = { status }

    if (outputData) {
      updateData.output_data = outputData
    }

    if (errorMessage) {
      updateData.error_message = errorMessage
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('execution_steps')
      .update(updateData)
      .eq('execution_id', executionId)
      .eq('step_index', stepIndex)
      .select()
      .single()

    if (error) throw error
    return data
  }
}