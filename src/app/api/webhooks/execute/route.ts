import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workflowId, triggerData, debugMode } = await request.json()

    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID required' }, { status: 400 })
    }

    // Fetch workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Create execution log
    const startTime = new Date().toISOString()
    const { data: execution, error: executionError } = await supabase
      .from('execution_logs')
      .insert({
        workflow_id: workflowId,
        status: 'running',
        trigger_type: 'manual',
        trigger_data: triggerData || {},
        started_at: startTime
      })
      .select()
      .single()

    if (executionError) {
      return NextResponse.json({ error: 'Failed to create execution log' }, { status: 500 })
    }

    // Simulate workflow execution (replace with actual execution logic)
    const executionResult = await executeWorkflowLogic(workflow, triggerData, execution.id, supabase, debugMode)

    // Update execution log
    const completedTime = new Date().toISOString()
    const duration = new Date(completedTime).getTime() - new Date(startTime).getTime()

    await supabase
      .from('execution_logs')
      .update({
        status: executionResult.status,
        completed_at: completedTime,
        duration_ms: duration,
        execution_data: executionResult.output,
        error_details: executionResult.error || null
      })
      .eq('id', execution.id)

    return NextResponse.json({
      success: true,
      executionId: execution.id,
      status: executionResult.status,
      output: executionResult.output,
      duration
    })

  } catch (error: any) {
    console.error('Execution error:', error)
    return NextResponse.json(
      { error: error.message || 'Execution failed' },
      { status: 500 }
    )
  }
}

// Workflow execution logic
async function executeWorkflowLogic(
  workflow: any, 
  triggerData: any, 
  executionId: string,
  supabase: any,
  debugMode: boolean
) {
  try {
    // Get workflow actions
    const actions = workflow.actions || []
    
    // Execute each action
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      const stepStartTime = new Date().toISOString()

      // Create execution step
      const { data: step } = await supabase
        .from('execution_steps')
        .insert({
          execution_id: executionId,
          step_index: i,
          action_type: action.type || 'unknown',
          status: 'running',
          input_data: { ...triggerData, ...action },
          started_at: stepStartTime
        })
        .select()
        .single()

      // Simulate action execution
      await new Promise(resolve => setTimeout(resolve, debugMode ? 2000 : 500))

      const stepCompletedTime = new Date().toISOString()
      const stepDuration = new Date(stepCompletedTime).getTime() - new Date(stepStartTime).getTime()

      // Update step
      await supabase
        .from('execution_steps')
        .update({
          status: 'completed',
          output_data: { success: true, message: `Action ${i + 1} completed` },
          completed_at: stepCompletedTime,
          duration_ms: stepDuration
        })
        .eq('id', step.id)
    }

    return {
      status: 'completed',
      output: {
        message: 'Workflow executed successfully',
        steps_completed: actions.length,
        trigger_data: triggerData
      }
    }

  } catch (error: any) {
    return {
      status: 'failed',
      output: {},
      error: {
        message: error.message,
        stack: error.stack
      }
    }
  }
}