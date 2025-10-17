import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WorkflowService } from '@/lib/supabase/services'
import { executeWorkflowSchema } from '@/lib/validations/workflow.schema'
import {
  workflowErrorHandler,
  NodeExecutionError,
  IntegrationError,
  AIAgentError,
  DEFAULT_RECOVERY_STRATEGIES,
  WorkflowExecutionError,
} from '@/lib/workflow/error-handler'
import { IntegrationRegistry } from '@/lib/integrations/IntegrationRegistry'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = executeWorkflowSchema.parse({
      workflow_id: id,
      trigger_data: body.trigger_data,
    })

    const service = new WorkflowService(supabase)
    const workflow = await service.findById(id)

    // Handle case where findById returns an error object
    if (!workflow || (workflow as any).status === undefined) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    // Check access - either through organization or if user created it
    let hasAccess = false

    if ((workflow as any).organization_id) {
      // Check organization membership if workflow has an org
      const { data: accessCheck } = await supabase.rpc('check_organization_membership', {
        org_id: (workflow as any).organization_id,
        user_id: user.id,
      })
      hasAccess = !!accessCheck
    }

    // Also allow access if user created the workflow
    if (!hasAccess && (workflow as any).created_by === user.id) {
      hasAccess = true
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Allow execution for active or draft workflows (draft for testing)
    const allowedStatuses = ['active', 'draft']
    if (!allowedStatuses.includes((workflow as any).status)) {
      return NextResponse.json(
        {
          error: `Workflow status is '${(workflow as any).status}'. Only active or draft workflows can be executed.`,
        },
        { status: 400 }
      )
    }

    const executionId = crypto.randomUUID()

    try {
      // Execute workflow with error handling
      const result = await executeWorkflowWithErrorHandling(workflow, executionId, supabase)

      // Track successful execution
      await supabase.rpc('track_api_usage', {
        service_name: 'workflow_execution',
        endpoint_name: `/workflows/${id}/execute`,
        tokens: 0,
        cost_in_cents: 10,
        usage_metadata: { workflow_id: id, execution_id: executionId },
      })

      return NextResponse.json(
        {
          success: true,
          execution_id: executionId,
          result,
        },
        { status: 202 }
      )
    } catch (error: any) {
      // Handle workflow execution errors
      const handlingResult = await workflowErrorHandler.handleError(
        error,
        id,
        executionId,
        DEFAULT_RECOVERY_STRATEGIES.integration
      )

      if (handlingResult.recovered) {
        // Log recovered execution to database
        await supabase.from('workflow_executions').insert({
          id: executionId,
          workflow_id: id,
          status: 'completed_with_warnings',
          result: handlingResult.result,
          completed_at: new Date().toISOString(),
        })

        return NextResponse.json(
          {
            success: true,
            execution_id: executionId,
            result: handlingResult.result,
            recovered: true,
            warning: 'Workflow completed with recovery from errors',
          },
          { status: 202 }
        )
      }

      // Log failed execution to database
      await supabase.from('workflow_executions').insert({
        id: executionId,
        workflow_id: id,
        status: 'failed',
        error: handlingResult.finalError?.message,
        completed_at: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          error: handlingResult.finalError?.message || 'Workflow execution failed',
          execution_id: executionId,
          recoverable:
            error instanceof WorkflowExecutionError ? error.recoverable : false,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Workflow execution error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function executeWorkflowWithErrorHandling(
  workflow: any,
  executionId: string,
  supabase: any
) {
  const nodes = workflow.trigger_config?.nodes || []
  const edges = workflow.trigger_config?.edges || []

  const results: Record<string, any> = {}

  // Execute nodes in order
  for (const node of nodes) {
    try {
      console.log(`Executing node: ${node.id} (${node.type})`)

      // Execute based on node type
      switch (node.type) {
        case 'trigger':
          results[node.id] = { triggered: true }
          break

        case 'action':
          results[node.id] = await executeActionNode(node, results)
          break

        case 'aiAgent':
          results[node.id] = await executeAIAgentNode(node, results, workflow, executionId, supabase)
          break

        case 'condition':
          results[node.id] = await executeConditionNode(node, results)
          break

        default:
          throw new NodeExecutionError(
            `Unknown node type: ${node.type}`,
            node.id,
            node.type
          )
      }

      console.log(`Node ${node.id} completed successfully`)
    } catch (error: any) {
      console.error(`Node ${node.id} failed:`, error)

      // Wrap in appropriate error type
      if (!(error instanceof NodeExecutionError)) {
        throw new NodeExecutionError(
          error.message,
          node.id,
          node.type,
          true, // Most node errors are recoverable
          { originalError: error }
        )
      }
      throw error
    }
  }

  return results
}

async function executeActionNode(node: any, previousResults: Record<string, any>) {
  const config = node.data?.config || {}
  const actionType = node.data?.actionType

  console.log(`Executing action node:`, { actionType, config, nodeData: node.data })

  // Map ActionNode types to integration actions
  if (actionType === 'sendSlack') {
    try {
      const inputs = {
        channel: config.channel || '#general',
        text: config.message || 'Test message',
        username: config.asBot ? 'Workflow Bot' : undefined,
        thread_ts: config.threadReply || undefined
      }

      console.log('Executing Slack send_message with inputs:', inputs)
      const result = await IntegrationRegistry.executeAction('slack', 'send_message', inputs)
      console.log('Slack message sent successfully:', result)

      return {
        success: true,
        data: result,
        integration: 'slack',
        action: 'send_message'
      }
    } catch (error: any) {
      console.error('Slack message failed:', error)
      throw new IntegrationError(
        `Failed to send Slack message: ${error.message}`,
        'slack',
        true,
        { nodeId: node.id, error: error.message }
      )
    }
  }

  if (actionType === 'fetchSlackHistory') {
    try {
      // Calculate timestamp for "oldest" if "From (Hours Ago)" is provided
      const hoursAgo = config.oldest || 24
      const oldestTimestamp = Math.floor((Date.now() - (hoursAgo * 60 * 60 * 1000)) / 1000)

      const inputs = {
        channel: config.channel || '#general',
        limit: config.limit || 100,
        oldest: String(oldestTimestamp)
      }

      console.log('Executing Slack get_channel_history with inputs:', inputs)
      const result = await IntegrationRegistry.executeAction('slack', 'get_channel_history', inputs)
      console.log('Slack history fetched successfully:', { messageCount: result.count })

      return {
        success: true,
        data: result,
        integration: 'slack',
        action: 'get_channel_history'
      }
    } catch (error: any) {
      console.error('Slack fetch history failed:', error)
      throw new IntegrationError(
        `Failed to fetch Slack history: ${error.message}`,
        'slack',
        true,
        { nodeId: node.id, error: error.message }
      )
    }
  }

  // Add more action type mappings here as needed
  // For now, simulate other actions
  console.log('Action type not yet implemented, simulating:', actionType)
  await new Promise(resolve => setTimeout(resolve, 500))
  return {
    success: true,
    data: { message: `Action ${actionType} completed (simulated)` },
    actionType
  }
}

async function executeAIAgentNode(
  node: any,
  previousResults: Record<string, any>,
  workflow: any,
  workflowExecutionId: string,
  supabase: any
) {
  const startTime = Date.now()
  let status: 'success' | 'error' = 'success'
  let errorMessage: string | undefined
  let responseContent = ''
  let inputTokens = 0
  let outputTokens = 0
  let totalTokens = 0
  let cost = 0

  try {
    // Simulate AI agent execution
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Example: might throw AIAgentError (3% chance for testing)
    if (Math.random() > 0.97) {
      throw new AIAgentError(
        'AI agent timeout or rate limit exceeded',
        node.data?.agentId || 'unknown',
        true,
        { nodeId: node.id }
      )
    }

    // Simulate token usage
    inputTokens = Math.floor(Math.random() * 100) + 50
    outputTokens = Math.floor(Math.random() * 150) + 100
    totalTokens = inputTokens + outputTokens
    cost = (totalTokens / 1000) * 0.002 // Simulated cost

    responseContent = `AI agent response from ${node.data?.name || 'AI Agent'}. This is a simulated response for workflow execution.`

    return {
      success: true,
      response: responseContent,
      tokensUsed: totalTokens,
      cost,
    }
  } catch (error: any) {
    status = 'error'
    errorMessage = error.message
    throw error
  } finally {
    const duration = Date.now() - startTime

    // Log execution to database
    try {
      await supabase.from('ai_execution_logs').insert({
        organization_id: workflow.organization_id,
        agent_id: node.data?.agentId || null,
        agent_name: node.data?.name || 'Unknown AI Agent',
        agent_type: node.data?.type || 'general',
        model: node.data?.model || 'gpt-4',
        status,
        duration,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost: cost.toString(),
        request_prompt: node.data?.prompt || 'Workflow execution prompt',
        request_parameters: node.data?.parameters || {},
        response_content: responseContent,
        response_metadata: {
          nodeId: node.id,
          workflowId: workflow.id,
          workflowExecutionId,
        },
        error_message: errorMessage,
      })

      console.log(`AI execution logged for node: ${node.id}`)
    } catch (logError) {
      console.error('Failed to log AI execution:', logError)
      // Don't throw - logging failure shouldn't break workflow
    }
  }
}

async function executeConditionNode(node: any, previousResults: Record<string, any>) {
  // Evaluate condition
  const condition = node.data?.condition || 'true'

  try {
    // In production, use safe eval or a proper expression evaluator
    // For now, basic condition evaluation
    const result = condition === 'true' || condition === true

    return { result, branch: result ? 'true' : 'false' }
  } catch (error: any) {
    throw new NodeExecutionError(
      `Failed to evaluate condition: ${error.message}`,
      node.id,
      'condition',
      false,
      { condition, error: error.message }
    )
  }
}
