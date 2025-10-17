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
import NotionIntegration from '@/lib/integrations/notion/NotionIntegration'
import GmailIntegration from '@/lib/integrations/gmail/GmailIntegration'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('🚀 EXECUTE ROUTE CALLED - Workflow ID:', id)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log('👤 User authenticated:', user?.id)

    if (!user) {
      console.log('❌ No user - returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = executeWorkflowSchema.parse({
      workflow_id: id,
      trigger_data: body.trigger_data,
    })

    const service = new WorkflowService(supabase)
    const workflow = await service.findById(id)

    console.log('📋 Workflow loaded:', {
      id: (workflow as any)?.id,
      name: (workflow as any)?.name,
      status: (workflow as any)?.status,
      hasNodes: !!(workflow as any)?.trigger_config?.nodes,
      nodesCount: (workflow as any)?.trigger_config?.nodes?.length || 0
    })

    // Handle case where findById returns an error object
    if (!workflow || (workflow as any).status === undefined) {
      console.log('❌ Workflow not found or invalid')
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

  console.log('=== WORKFLOW EXECUTION START ===')
  console.log('Workflow ID:', workflow.id)
  console.log('Nodes count:', nodes.length)
  console.log('Nodes:', JSON.stringify(nodes, null, 2))
  console.log('Edges:', JSON.stringify(edges, null, 2))

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
          results[node.id] = await executeActionNode(node, results, workflow, supabase)
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

async function executeActionNode(
  node: any,
  previousResults: Record<string, any>,
  workflow: any,
  supabase: any
) {
  const config = node.data?.config || {}
  const actionType = node.data?.actionType

  console.log(`Executing action node:`, { actionType, config, nodeData: node.data })

  // Helper function to replace template variables
  const replaceTemplateVariables = (text: string): string => {
    if (!text) return text

    let result = text

    // Replace with actual results from previous nodes
    for (const [nodeId, nodeResult] of Object.entries(previousResults)) {
      // Escape special regex characters in node ID
      const escapedNodeId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Match patterns like {{$actions.nodeId.result.response}} or {{$prev.nodeId.response}}
      const patterns = [
        new RegExp(`\\{\\{\\$actions\\.${escapedNodeId}\\.result\\.response\\}\\}`, 'g'),
        new RegExp(`\\{\\{\\$actions\\.${escapedNodeId}\\.response\\}\\}`, 'g'),
        new RegExp(`\\{\\{\\$prev\\.${escapedNodeId}\\.response\\}\\}`, 'g'),
      ]

      const replacement = (nodeResult as any)?.response ||
                        (nodeResult as any)?.data?.response ||
                        JSON.stringify(nodeResult)

      patterns.forEach(pattern => {
        result = result.replace(pattern, replacement)
      })
    }

    // Also support generic {{$prev.response}} - gets the most recent AI agent response
    const aiAgentResults = Object.entries(previousResults)
      .filter(([_, result]) => (result as any)?.response)
      .reverse()

    if (aiAgentResults.length > 0) {
      const latestAiResponse = (aiAgentResults[0][1] as any)?.response
      result = result.replace(/\{\{\$prev\.response\}\}/g, latestAiResponse || '')
    }

    return result
  }

  // Map ActionNode types to integration actions
  if (actionType === 'sendSlack') {
    try {
      console.log('📝 Original message template:', config.message)
      console.log('📋 Available results:', Object.keys(previousResults))
      console.log('🔍 Previous results data:', JSON.stringify(previousResults, null, 2))

      const messageText = replaceTemplateVariables(config.message || 'Test message')

      console.log('✅ Replaced message:', messageText)

      const inputs = {
        channel: config.channel || '#general',
        text: messageText,
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

  if (actionType === 'queryNotionDatabase') {
    try {
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('credentials')
        .eq('provider', 'notion')
        .eq('organization_id', workflow.organization_id)
        .eq('status', 'connected')
        .maybeSingle()

      if (integrationError || !integration) {
        throw new Error('Notion integration not connected. Please connect Notion in integrations page.')
      }

      const notion = new NotionIntegration(integration.credentials)

      // Build filter based on config
      const filter = config.filter || {
        property: config.filterProperty || 'Status',
        select: { equals: config.filterValue || 'Open' }
      }

      const tickets = await notion.queryDatabase({
        databaseId: config.databaseId,
        filter,
        pageSize: config.pageSize || 100
      })

      console.log('Notion database queried successfully:', { ticketCount: tickets.length })

      return {
        success: true,
        data: { tickets, count: tickets.length },
        integration: 'notion',
        action: 'query_database'
      }
    } catch (error: any) {
      console.error('Notion query failed:', error)
      throw new IntegrationError(
        `Failed to query Notion database: ${error.message}`,
        'notion',
        true,
        { nodeId: node.id, error: error.message }
      )
    }
  }

  if (actionType === 'sendGmail') {
    try {
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('credentials')
        .eq('provider', 'google')
        .eq('organization_id', workflow.organization_id)
        .eq('status', 'connected')
        .maybeSingle()

      if (integrationError || !integration) {
        throw new Error('Gmail integration not connected. Please connect Gmail in integrations page.')
      }

      const gmail = new GmailIntegration(integration.credentials)

      // Replace template variables in email body
      const emailBody = replaceTemplateVariables(config.body || '')
      const emailSubject = replaceTemplateVariables(config.subject || '')

      const result = await gmail.sendEmail({
        to: config.to,
        subject: emailSubject,
        body: emailBody,
        cc: config.cc,
        bcc: config.bcc,
        isHtml: config.isHtml !== false
      })

      console.log('Gmail sent successfully:', { messageId: result.id })

      return {
        success: true,
        data: result,
        integration: 'gmail',
        action: 'send_email'
      }
    } catch (error: any) {
      console.error('Gmail send failed:', error)
      throw new IntegrationError(
        `Failed to send Gmail: ${error.message}`,
        'gmail',
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
    // Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY

    if (!openaiApiKey) {
      throw new AIAgentError(
        'OpenAI API key not configured',
        node.data?.agentId || 'unknown',
        false,
        { nodeId: node.id }
      )
    }

    // Get the messages from previous Slack fetch action
    const slackMessages = Object.values(previousResults)
      .find((result: any) => result?.data?.messages)

    const messagesText = slackMessages?.data?.messages
      ?.map((msg: any) => msg.text)
      ?.join('\n\n') || 'No messages found'

    console.log('🤖 AI Agent - Messages to summarize:', messagesText)

    // Build the prompt
    const systemPrompt = 'You are a helpful assistant that summarizes team standup messages.'
    const userPrompt = `Summarize the following standup updates in bullet points grouped by person.

Messages:
${messagesText}

Instructions:
- Group by person (use @username)
- Extract key points: what they did, what they're working on, blockers
- Keep it concise (max 3 bullets per person)
- Format as markdown`

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: node.data?.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: node.data?.temperature || 0.7,
        max_tokens: node.data?.maxTokens || 1000
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()

    // Extract response and token usage
    responseContent = data.choices[0]?.message?.content || 'No response generated'
    inputTokens = data.usage?.prompt_tokens || 0
    outputTokens = data.usage?.completion_tokens || 0
    totalTokens = data.usage?.total_tokens || 0

    // Calculate cost (GPT-3.5-turbo pricing: $0.0015/1K input, $0.002/1K output)
    cost = (inputTokens / 1000) * 0.0015 + (outputTokens / 1000) * 0.002

    console.log('✅ AI Agent response:', responseContent)
    console.log('📊 Token usage:', { inputTokens, outputTokens, totalTokens, cost })

    return {
      success: true,
      response: responseContent,
      tokensUsed: totalTokens,
      cost,
    }
  } catch (error: any) {
    status = 'error'
    errorMessage = error.message
    console.error('❌ AI Agent failed:', error)
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
  const conditionType = node.data?.conditionType || 'simple'
  const condition = node.data?.condition || 'true'

  console.log('Evaluating condition:', { conditionType, condition, nodeId: node.id })

  try {
    let result = false

    switch (conditionType) {
      case 'checkExists':
      case 'dataExists': {
        // Check if data exists from a specific previous node
        const sourceNodeId = node.data?.sourceNodeId

        if (sourceNodeId && previousResults[sourceNodeId]) {
          const nodeResult = previousResults[sourceNodeId]

          // Check different data structures
          if (nodeResult.data) {
            // Check for arrays with data
            if (Array.isArray(nodeResult.data)) {
              result = nodeResult.data.length > 0
            }
            // Check for objects with count property
            else if (typeof nodeResult.data === 'object' && 'count' in nodeResult.data) {
              result = nodeResult.data.count > 0
            }
            // Check for objects with tickets/items/results arrays
            else if (typeof nodeResult.data === 'object') {
              const dataKeys = ['tickets', 'items', 'results', 'messages', 'records']
              for (const key of dataKeys) {
                if (Array.isArray(nodeResult.data[key])) {
                  result = nodeResult.data[key].length > 0
                  break
                }
              }
              // If no array found, just check if data object exists and is not empty
              if (!result) {
                result = Object.keys(nodeResult.data).length > 0
              }
            }
            // Fallback: check if data is truthy
            else {
              result = !!nodeResult.data
            }
          }
          // Check if result has success flag
          else if ('success' in nodeResult) {
            result = nodeResult.success === true
          }
          // Fallback: check if any result exists
          else {
            result = !!nodeResult
          }
        }

        console.log('Data existence check result:', {
          sourceNodeId,
          hasSource: !!sourceNodeId,
          hasResult: !!(sourceNodeId && previousResults[sourceNodeId]),
          result
        })
        break
      }

      case 'comparison': {
        // Support simple comparisons like "count > 0", "status == 'active'"
        const sourceNodeId = node.data?.sourceNodeId
        const field = node.data?.field || 'count'
        const operator = node.data?.operator || '>'
        const value = node.data?.value || 0

        if (sourceNodeId && previousResults[sourceNodeId]) {
          const nodeResult = previousResults[sourceNodeId]
          let fieldValue

          // Extract field value from result
          if (nodeResult.data && field in nodeResult.data) {
            fieldValue = nodeResult.data[field]
          } else if (field in nodeResult) {
            fieldValue = nodeResult[field]
          }

          // Perform comparison
          switch (operator) {
            case '>':
              result = fieldValue > value
              break
            case '>=':
              result = fieldValue >= value
              break
            case '<':
              result = fieldValue < value
              break
            case '<=':
              result = fieldValue <= value
              break
            case '==':
            case '===':
              result = fieldValue === value
              break
            case '!=':
            case '!==':
              result = fieldValue !== value
              break
            default:
              result = false
          }
        }

        console.log('Comparison check result:', { sourceNodeId, field, operator, value, result })
        break
      }

      case 'simple':
      default: {
        // Basic true/false evaluation
        result = condition === 'true' || condition === true
        console.log('Simple condition result:', result)
        break
      }
    }

    return {
      result,
      branch: result ? 'true' : 'false',
      conditionType,
      metadata: {
        evaluatedAt: new Date().toISOString(),
        sourceNodeId: node.data?.sourceNodeId
      }
    }
  } catch (error: any) {
    console.error('Condition evaluation error:', error)
    throw new NodeExecutionError(
      `Failed to evaluate condition: ${error.message}`,
      node.id,
      'condition',
      false,
      { condition, conditionType, error: error.message }
    )
  }
}
