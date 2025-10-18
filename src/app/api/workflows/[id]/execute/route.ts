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
  const executed = new Set<string>()

  // Build adjacency map for efficient edge lookup
  const edgeMap = new Map<string, Array<{ target: string; sourceHandle?: string }>>()
  for (const edge of edges) {
    if (!edgeMap.has(edge.source)) {
      edgeMap.set(edge.source, [])
    }
    edgeMap.get(edge.source)!.push({
      target: edge.target,
      sourceHandle: edge.sourceHandle
    })
  }

  // Find trigger node (starting point)
  const triggerNode = nodes.find((n: any) => n.type === 'trigger')
  if (!triggerNode) {
    throw new Error('No trigger node found in workflow')
  }

  // Recursive function to execute nodes following edges
  const executeNode = async (nodeId: string): Promise<void> => {
    // Skip if already executed
    if (executed.has(nodeId)) {
      console.log(`⏭️ Skipping already executed node: ${nodeId}`)
      return
    }

    const node = nodes.find((n: any) => n.id === nodeId)
    if (!node) {
      console.warn(`⚠️ Node ${nodeId} not found, skipping`)
      return
    }

    executed.add(nodeId)

    try {
      console.log(`▶️ Executing node: ${node.id} (${node.type})`)

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

      console.log(`✅ Node ${node.id} completed successfully`)

      // Find and execute next nodes based on edges
      const outgoingEdges = edgeMap.get(node.id) || []

      if (node.type === 'condition' && results[node.id]) {
        // For condition nodes, only follow the branch that matches the result
        const conditionResult = results[node.id].result
        const branchToFollow = conditionResult ? 'true' : 'false'

        console.log(`🔀 Condition result: ${conditionResult}, following ${branchToFollow} branch`)

        // Filter edges to only the matching branch
        const branchEdges = outgoingEdges.filter(edge => {
          // Edge sourceHandle indicates which branch (e.g., 'true' or 'false')
          return edge.sourceHandle === branchToFollow
        })

        console.log(`📍 Following ${branchEdges.length} edge(s) on ${branchToFollow} branch`)

        // Execute next nodes in the selected branch
        for (const edge of branchEdges) {
          await executeNode(edge.target)
        }
      } else {
        // For non-condition nodes, execute all connected nodes
        console.log(`📍 Following ${outgoingEdges.length} outgoing edge(s)`)

        for (const edge of outgoingEdges) {
          await executeNode(edge.target)
        }
      }
    } catch (error: any) {
      console.error(`❌ Node ${node.id} failed:`, error)

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

  // Start execution from trigger node
  await executeNode(triggerNode.id)

  return results
}

async function executeActionNode(
  node: any,
  previousResults: Record<string, any>,
  workflow: any,
  supabase: any
) {
  const config = node.data?.config || {}
  let actionType = node.data?.actionType

  // Migrate legacy action types
  const legacyMigrations: Record<string, string> = {
    'sendEmail': 'sendGmail',
    'queryNotion': 'queryNotionDatabase',
  }

  if (actionType && actionType in legacyMigrations) {
    console.log(`⚠️ Migrating legacy action type: ${actionType} -> ${legacyMigrations[actionType]}`)
    actionType = legacyMigrations[actionType]
  }

  console.log(`Executing action node:`, { actionType, config, nodeData: node.data })

  // Helper function to replace template variables
  const replaceTemplateVariables = (text: string): string => {
    if (!text) return text

    let result = text

    // Replace with actual results from previous nodes
    for (const [nodeId, nodeResult] of Object.entries(previousResults)) {
      // Escape special regex characters in node ID
      const escapedNodeId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Match patterns like:
      // - {{step_1.result.count}}
      // - {{step_1.result.pages}}
      // - {{$actions.nodeId.result.response}}
      // - {{$prev.nodeId.response}}

      // Helper function to safely extract nested property
      const getNestedProperty = (obj: any, path: string): any => {
        return path.split('.').reduce((current, prop) => current?.[prop], obj)
      }

      // Replace all {{nodeId.path.to.value}} patterns
      const variablePattern = new RegExp(`\\{\\{${escapedNodeId}\\.([^}]+)\\}\\}`, 'g')
      result = result.replace(variablePattern, (_match, path) => {
        let value = getNestedProperty(nodeResult, path)

        // If path starts with "result.", try replacing with "data." as fallback
        if (value === undefined && path.startsWith('result.')) {
          const dataPath = path.replace(/^result\./, 'data.')
          value = getNestedProperty(nodeResult, dataPath)
        }

        // Format the value appropriately
        if (value === undefined || value === null) return ''
        if (Array.isArray(value)) {
          // Format array of tickets/items nicely
          return value.map((item, idx) => {
            if (typeof item === 'object') {
              return `${idx + 1}. ${JSON.stringify(item, null, 2)}`
            }
            return `${idx + 1}. ${item}`
          }).join('\n')
        }
        if (typeof value === 'object') return JSON.stringify(value, null, 2)
        return String(value)
      })

      // Legacy patterns for backward compatibility
      const legacyPatterns = [
        new RegExp(`\\{\\{\\$actions\\.${escapedNodeId}\\.result\\.response\\}\\}`, 'g'),
        new RegExp(`\\{\\{\\$actions\\.${escapedNodeId}\\.response\\}\\}`, 'g'),
        new RegExp(`\\{\\{\\$prev\\.${escapedNodeId}\\.response\\}\\}`, 'g'),
      ]

      const replacement = (nodeResult as any)?.response ||
                        (nodeResult as any)?.data?.response ||
                        JSON.stringify(nodeResult)

      legacyPatterns.forEach(pattern => {
        result = result.replace(pattern, replacement)
      })
    }

    // Support common variables
    result = result.replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
    result = result.replace(/\{\{datetime\}\}/g, new Date().toLocaleString())
    result = result.replace(/\{\{timestamp\}\}/g, new Date().toISOString())

    // Handle generic step_X references by matching to actual node results
    // This allows {{step_1.result.count}} to work even if node ID is "action-xyz"
    const stepPattern = /\{\{step_(\d+)\.([^}]+)\}\}/g
    result = result.replace(stepPattern, (_match, stepNum, path) => {
      // Get the Nth action node (step_1 = first action, step_2 = second action, etc.)
      const actionNodes = Object.entries(previousResults)
        .filter(([id, _]) => id.startsWith('action-'))
        .sort((a, b) => a[0].localeCompare(b[0])) // Sort by node ID for consistency

      const stepIndex = parseInt(stepNum) - 1
      if (stepIndex >= 0 && stepIndex < actionNodes.length) {
        const [_, nodeResult] = actionNodes[stepIndex]

        // Helper function to safely extract nested property
        const getNestedProperty = (obj: any, path: string): any => {
          return path.split('.').reduce((current, prop) => current?.[prop], obj)
        }

        let value = getNestedProperty(nodeResult, path)

        // If path starts with "result.", try replacing with "data." as fallback
        if (value === undefined && path.startsWith('result.')) {
          const dataPath = path.replace(/^result\./, 'data.')
          value = getNestedProperty(nodeResult, dataPath)
        }

        // Format the value
        if (value === undefined || value === null) return ''
        if (Array.isArray(value)) {
          return value.map((item, idx) => {
            if (typeof item === 'object') {
              return `${idx + 1}. ${JSON.stringify(item, null, 2)}`
            }
            return `${idx + 1}. ${item}`
          }).join('\n')
        }
        if (typeof value === 'object') return JSON.stringify(value, null, 2)
        return String(value)
      }

      return '' // Return empty if step not found
    })

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
      console.log('📝 Attempting to query Notion database...')
      console.log('📝 Config:', JSON.stringify(config, null, 2))

      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('credentials')
        .eq('provider', 'notion')
        .eq('organization_id', workflow.organization_id)
        .eq('status', 'connected')
        .maybeSingle()

      console.log('📝 Integration lookup result:', {
        found: !!integration,
        error: integrationError?.message,
        provider: 'notion',
        orgId: workflow.organization_id
      })

      if (integrationError || !integration) {
        throw new Error('Notion integration not connected. Please connect Notion in integrations page.')
      }

      console.log('📝 Integration credentials structure:', {
        hasCredentials: !!integration.credentials,
        credentialsKeys: integration.credentials ? Object.keys(integration.credentials) : [],
        hasAccessToken: !!(integration.credentials as any)?.access_token,
        accessTokenLength: (integration.credentials as any)?.access_token?.length
      })

      const notion = new NotionIntegration(integration.credentials)

      // Parse filter from JSON string if needed
      let filter
      if (typeof config.filter === 'string') {
        try {
          filter = JSON.parse(config.filter)
        } catch (e) {
          console.warn('Failed to parse filter JSON, using default')
          filter = {
            property: 'Status',
            select: { equals: 'Open' }
          }
        }
      } else {
        filter = config.filter || {
          property: config.filterProperty || 'Status',
          select: { equals: config.filterValue || 'Open' }
        }
      }

      console.log('📝 Querying Notion with:', {
        databaseId: config.databaseId,
        filter,
        pageSize: config.pageSize || 100
      })

      const tickets = await notion.queryDatabase({
        databaseId: config.databaseId,
        filter,
        pageSize: config.pageSize || 100
      })

      console.log('✅ Notion database queried successfully:', { ticketCount: tickets.length })

      return {
        success: true,
        data: {
          tickets,
          pages: tickets,  // Alias for backwards compatibility
          count: tickets.length
        },
        integration: 'notion',
        action: 'query_database'
      }
    } catch (error: any) {
      console.error('❌ Notion query failed:', error)
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
      console.log('📧 Attempting to send Gmail...')
      console.log('📧 Config:', JSON.stringify(config, null, 2))
      console.log('📧 Workflow org ID:', workflow.organization_id)

      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('credentials')
        .eq('provider', 'google')
        .eq('organization_id', workflow.organization_id)
        .eq('status', 'connected')
        .maybeSingle()

      console.log('📧 Integration lookup result:', {
        found: !!integration,
        error: integrationError?.message,
        provider: 'google',
        orgId: workflow.organization_id
      })

      if (integrationError || !integration) {
        throw new Error('Gmail integration not connected. Please connect Gmail in integrations page.')
      }

      const gmail = new GmailIntegration(integration.credentials)

      // Replace template variables in email body
      const emailBody = replaceTemplateVariables(config.body || '')
      const emailSubject = replaceTemplateVariables(config.subject || '')

      console.log('📧 Sending email with:', {
        to: config.to,
        subject: emailSubject,
        bodyLength: emailBody.length,
        isHtml: config.isHtml !== false
      })

      const result = await gmail.sendEmail({
        to: config.to,
        subject: emailSubject,
        body: emailBody,
        cc: config.cc,
        bcc: config.bcc,
        isHtml: config.isHtml !== false
      })

      console.log('✅ Gmail sent successfully:', { messageId: result.id })

      return {
        success: true,
        data: result,
        integration: 'gmail',
        action: 'send_email'
      }
    } catch (error: any) {
      console.error('❌ Gmail send failed:', error)
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

    // Get custom prompt from node config or use default
    const agentConfig = node.data?.config || {}
    const customPrompt = agentConfig.customPrompt || node.data?.prompt || ''

    console.log('🤖 AI Agent - Custom prompt:', customPrompt)
    console.log('🤖 AI Agent - Previous results:', JSON.stringify(previousResults, null, 2))

    // Replace template variables in the prompt with actual data from previous results
    const replaceTemplateVariables = (text: string): string => {
      if (!text) return text
      let result = text

      // Helper to extract nested properties
      const getNestedProperty = (obj: any, path: string): any => {
        return path.split('.').reduce((current, prop) => current?.[prop], obj)
      }

      // Replace {{step_X.path}} patterns
      const stepPattern = /\{\{step_(\d+)\.?([^}]*)\}\}/g
      result = result.replace(stepPattern, (_match, stepNum, path) => {
        const actionNodes = Object.entries(previousResults)
          .filter(([id, _]) => id.startsWith('action-'))
          .sort((a, b) => a[0].localeCompare(b[0]))

        const stepIndex = parseInt(stepNum) - 1
        if (stepIndex >= 0 && stepIndex < actionNodes.length) {
          const [_, nodeResult] = actionNodes[stepIndex]

          // If no path specified (just {{step_1}}), return the whole result
          if (!path) {
            return JSON.stringify(nodeResult, null, 2)
          }

          let value = getNestedProperty(nodeResult, path)

          // Fallback 1: try data. if result. doesn't work
          if (value === undefined && path.startsWith('result.')) {
            const dataPath = path.replace(/^result\./, 'data.')
            value = getNestedProperty(nodeResult, dataPath)
          }

          // Fallback 2: if just "result" with no suffix, try "data"
          if (value === undefined && path === 'result') {
            value = nodeResult.data
          }

          // Format the value as JSON for AI consumption
          if (value === undefined || value === null) return ''
          if (typeof value === 'object') return JSON.stringify(value, null, 2)
          return String(value)
        }
        return ''
      })

      // Replace {{nodeId.path}} patterns for direct node references
      for (const [nodeId, nodeResult] of Object.entries(previousResults)) {
        const escapedNodeId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = new RegExp(`\\{\\{${escapedNodeId}\\.([^}]+)\\}\\}`, 'g')

        result = result.replace(pattern, (_match, path) => {
          let value = getNestedProperty(nodeResult, path)
          if (value === undefined && path.startsWith('result.')) {
            const dataPath = path.replace(/^result\./, 'data.')
            value = getNestedProperty(nodeResult, dataPath)
          }
          if (value === undefined || value === null) return ''
          if (typeof value === 'object') return JSON.stringify(value, null, 2)
          return String(value)
        })
      }

      return result
    }

    const processedPrompt = replaceTemplateVariables(customPrompt)
    console.log('🤖 AI Agent - Processed prompt:', processedPrompt)

    // Build the prompt - use custom prompt or fallback to generic
    const systemPrompt = agentConfig.systemPrompt || 'You are a helpful AI assistant.'
    const userPrompt = processedPrompt || 'Please help with the task.'

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
  const config = node.data?.config || {}
  let conditionType = node.data?.conditionType
  const condition = node.data?.condition || 'true'

  // Auto-detect condition type from config if not explicitly set
  if (!conditionType) {
    if (config.field && config.operator) {
      conditionType = 'comparison'
    } else if (config.sourceNodeId) {
      conditionType = 'dataExists'
    } else {
      conditionType = 'simple'
    }
  }

  console.log('Evaluating condition:', { conditionType, condition, config, nodeId: node.id })

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
        // Field can be in format "nodeId.path.to.field" or just "field"
        let sourceNodeId = node.data?.sourceNodeId || config.sourceNodeId
        let field = config.field || node.data?.field || 'count'
        const operator = config.operator || node.data?.operator || '>'
        let value = config.value || node.data?.value || 0

        // Convert string numbers to actual numbers for comparison
        if (typeof value === 'string' && !isNaN(Number(value))) {
          value = Number(value)
        }

        // Helper function to extract nested property
        const getNestedProperty = (obj: any, path: string): any => {
          return path.split('.').reduce((current, prop) => current?.[prop], obj)
        }

        // Check if field contains a node ID reference (e.g., "step_1.result.count")
        // If field starts with "step_", extract the step number and convert to actual node
        if (field.startsWith('step_')) {
          const stepMatch = field.match(/^step_(\d+)\.(.+)$/)
          if (stepMatch) {
            const stepNum = parseInt(stepMatch[1])
            const fieldPath = stepMatch[2] // e.g., "result.count" or "data.count"

            // Get the Nth action node
            const actionNodes = Object.entries(previousResults)
              .filter(([id, _]) => id.startsWith('action-'))
              .sort((a, b) => a[0].localeCompare(b[0]))

            const stepIndex = stepNum - 1
            if (stepIndex >= 0 && stepIndex < actionNodes.length) {
              sourceNodeId = actionNodes[stepIndex][0]
              field = fieldPath // Update field to the path without step_X prefix

              console.log('🔍 Mapped step reference:', {
                original: `step_${stepNum}.${fieldPath}`,
                mappedNodeId: sourceNodeId,
                mappedField: field
              })
            }
          }
        }

        // Check if field contains a node ID reference (e.g., "nodeId.result.count")
        // Extract the actual node ID from previousResults by trying all node IDs
        if (!sourceNodeId && field.includes('.')) {
          // Try to find a matching node by checking if field starts with any node ID
          for (const [nodeId, nodeResult] of Object.entries(previousResults)) {
            // Skip trigger nodes
            if ((nodeResult as any).triggered) continue

            // Try to extract value using the full field path
            const fieldValue = getNestedProperty(nodeResult, field)
            if (fieldValue !== undefined) {
              sourceNodeId = nodeId
              // Field path is relative to the node result, not the node ID
              // So we keep the field as is
              break
            }
          }
        }

        // If we still don't have a source node, try to match field to most recent action node
        if (!sourceNodeId) {
          const actionResults = Object.entries(previousResults)
            .filter(([id, _]) => id.startsWith('action-'))
            .reverse()

          if (actionResults.length > 0) {
            sourceNodeId = actionResults[0][0]
          }
        }

        if (sourceNodeId && previousResults[sourceNodeId]) {
          const nodeResult = previousResults[sourceNodeId]
          let fieldValue

          // Extract field value from result using nested path
          fieldValue = getNestedProperty(nodeResult, field)

          // If field starts with "result.", try replacing with "data." as fallback
          if (fieldValue === undefined && field.startsWith('result.')) {
            const dataPath = field.replace(/^result\./, 'data.')
            fieldValue = getNestedProperty(nodeResult, dataPath)
            console.log(`🔄 Tried fallback path: ${field} -> ${dataPath}, found: ${fieldValue}`)
          }

          // Also try without the field path in case it's already at root
          if (fieldValue === undefined) {
            if (nodeResult.data && field in nodeResult.data) {
              fieldValue = nodeResult.data[field]
            } else if (field in nodeResult) {
              fieldValue = nodeResult[field]
            }
          }

          console.log('🔍 Comparison values:', {
            sourceNodeId,
            field,
            fieldValue,
            operator,
            compareValue: value,
            nodeResult: JSON.stringify(nodeResult, null, 2)
          })

          // Perform comparison
          switch (operator) {
            case '>':
            case 'greater_than':
              result = fieldValue > value
              break
            case '>=':
            case 'greater_than_or_equal':
              result = fieldValue >= value
              break
            case '<':
            case 'less_than':
              result = fieldValue < value
              break
            case '<=':
            case 'less_than_or_equal':
              result = fieldValue <= value
              break
            case '==':
            case '===':
            case 'equals':
              result = fieldValue === value
              break
            case '!=':
            case '!==':
            case 'not_equals':
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
