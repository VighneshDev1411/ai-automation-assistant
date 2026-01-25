// src/workers/processors/workflow-execution-processor.ts
/**
 * Workflow Execution Processor
 * Processes workflow execution jobs from the queue
 */

import { Job } from 'bullmq'
import { createWorkerClient } from '@/lib/supabase/worker-client'
import { WorkflowExecutionJobData } from '@/lib/queue/queue-manager'
import { updateScheduleNextRun } from '@/lib/queue/workflow-scheduler'
import { executeWorkflow } from '@/lib/workflow/execution-engine'

/**
 * Process workflow execution job
 */
export async function workflowExecutionProcessor(job: Job<WorkflowExecutionJobData>) {
  const { workflowId, organizationId, userId, triggerData, source } = job.data

  console.log(`🔄 Processing workflow execution: ${workflowId}`)

  try {
    // Update job progress
    await job.updateProgress(10)

    // Create Supabase client for worker
    const supabase = createWorkerClient()

    // Fetch workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('organization_id', organizationId)
      .single()

    if (workflowError || !workflow) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    await job.updateProgress(20)

    // Check if workflow is active or draft (allow draft for testing)
    if (!['active', 'draft'].includes(workflow.status)) {
      throw new Error(`Workflow is not active: ${workflow.status}`)
    }

    // Create execution log
    const executionId = crypto.randomUUID()

    const { error: logError } = await supabase
      .from('workflow_executions')
      .insert({
        id: executionId,
        workflow_id: workflowId,
        organization_id: organizationId,
        user_id: userId,
        status: 'running',
        trigger_data: triggerData || {},
        started_at: new Date().toISOString(),
        metadata: {
          source,
          job_id: job.id,
        },
      })

    if (logError) {
      console.error('Failed to create execution log:', logError)
    }

    await job.updateProgress(30)

    // Execute workflow using the execution engine
    console.log(`⚙️ Executing workflow: ${workflow.name}`)
    
    const executionResult = await executeWorkflow(workflow, {
      workflowId,
      executionId,
      organizationId,
      userId,
      triggerData: triggerData || {}
    })

    if (!executionResult.success) {
      throw new Error(executionResult.error || 'Workflow execution failed')
    }

    await job.updateProgress(90)

    // Update execution log with success
    await supabase
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: executionResult,
      })
      .eq('id', executionId)

    // If this was a scheduled execution, update the schedule
    if (source === 'scheduled') {
      await updateScheduleNextRun(workflowId, organizationId, supabase)
      
      // Increment success counter
      await supabase.rpc('increment_schedule_run_counter', {
        p_workflow_id: workflowId,
        p_success: true,
      })
    }

    await job.updateProgress(100)

    console.log(`✅ Workflow execution completed: ${workflowId}`)

    return {
      success: true,
      executionId,
      result: executionResult,
    }
  } catch (error) {
    console.error(`❌ Workflow execution failed: ${workflowId}`, error)

    // Update execution log with failure
    try {
      const supabase = createWorkerClient()
      
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('workflow_id', workflowId)
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1)

      // If this was a scheduled execution, increment failure counter
      if (source === 'scheduled') {
        await supabase.rpc('increment_schedule_run_counter', {
          p_workflow_id: workflowId,
          p_success: false,
        })
      }
    } catch (updateError) {
      console.error('Failed to update execution log:', updateError)
    }

    throw error
  }
}
