// src/lib/workflow/execution-engine.ts
/**
 * Workflow Execution Engine
 * Executes workflows by processing nodes in order and managing data flow
 */

import { createWorkerClient } from '@/lib/supabase/worker-client'

export interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'loop' | 'transform'
  position: { x: number; y: number }
  data: {
    label: string
    config: Record<string, any>
    [key: string]: any
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface ExecutionContext {
  workflowId: string
  executionId: string
  organizationId: string
  userId: string
  triggerData: any
  variables: Record<string, any>
  nodeResults: Record<string, any>
}

export interface ExecutionResult {
  success: boolean
  executionId: string
  completedNodes: string[]
  failedNode?: string
  error?: string
  duration: number
  result: any
}

/**
 * Main Workflow Execution Engine
 */
export class WorkflowExecutionEngine {
  private context: ExecutionContext
  private definition: WorkflowDefinition
  private supabase: any

  constructor(
    definition: WorkflowDefinition,
    context: ExecutionContext
  ) {
    this.definition = definition
    this.context = context
    this.supabase = createWorkerClient()
  }

  /**
   * Execute the entire workflow
   */
  async execute(): Promise<ExecutionResult> {
    const startTime = Date.now()
    const completedNodes: string[] = []

    try {
      console.log(`🚀 Starting workflow execution: ${this.context.workflowId}`)

      // Find the trigger node (starting point)
      const triggerNode = this.definition.nodes.find(node => node.type === 'trigger')
      
      if (!triggerNode) {
        throw new Error('No trigger node found in workflow')
      }

      // Store trigger data in context
      this.context.nodeResults[triggerNode.id] = {
        success: true,
        data: this.context.triggerData,
        timestamp: new Date().toISOString()
      }
      completedNodes.push(triggerNode.id)

      // Get nodes to execute (all nodes connected from trigger)
      const executionOrder = this.getExecutionOrder(triggerNode.id)
      
      console.log(`📋 Execution order: ${executionOrder.map(n => n.data.label).join(' → ')}`)

      // Execute nodes in order
      for (const node of executionOrder) {
        console.log(`⚙️ Executing node: ${node.data.label} (${node.type})`)
        
        const result = await this.executeNode(node)
        
        if (!result.success) {
          throw new Error(`Node "${node.data.label}" failed: ${result.error}`)
        }

        this.context.nodeResults[node.id] = result
        completedNodes.push(node.id)
        
        console.log(`✅ Node completed: ${node.data.label}`)
      }

      const duration = Date.now() - startTime

      return {
        success: true,
        executionId: this.context.executionId,
        completedNodes,
        duration,
        result: {
          message: 'Workflow executed successfully',
          nodesExecuted: completedNodes.length,
          finalOutput: this.context.nodeResults
        }
      }

    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error(`❌ Workflow execution failed:`, error)

      return {
        success: false,
        executionId: this.context.executionId,
        completedNodes,
        failedNode: completedNodes[completedNodes.length - 1],
        error: error.message,
        duration,
        result: null
      }
    }
  }

  /**
   * Get execution order of nodes (breadth-first traversal)
   */
  private getExecutionOrder(startNodeId: string): WorkflowNode[] {
    const visited = new Set<string>([startNodeId])
    const order: WorkflowNode[] = []
    const queue: string[] = [startNodeId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      
      // Get outgoing edges from current node
      const outgoingEdges = this.definition.edges.filter(
        edge => edge.source === currentId
      )

      // Add connected nodes to order
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target)
          const node = this.definition.nodes.find(n => n.id === edge.target)
          if (node) {
            order.push(node)
            queue.push(edge.target)
          }
        }
      }
    }

    return order
  }

  /**
   * Execute a single node based on its type
   */
  private async executeNode(node: WorkflowNode): Promise<any> {
    const startTime = Date.now()

    try {
      let result: any

      switch (node.type) {
        case 'action':
          result = await this.executeAction(node)
          break

        case 'condition':
          result = await this.executeCondition(node)
          break

        case 'transform':
          result = await this.executeTransform(node)
          break

        case 'loop':
          result = await this.executeLoop(node)
          break

        default:
          throw new Error(`Unknown node type: ${node.type}`)
      }

      return {
        success: true,
        data: result,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Execute an action node (API call, database operation, etc.)
   */
  private async executeAction(node: WorkflowNode): Promise<any> {
    const { config } = node.data
    const actionType = config.actionType || config.type

    console.log(`  → Action type: ${actionType}`)

    switch (actionType) {
      case 'http_request':
        return await this.executeHttpRequest(config)

      case 'database_query':
        return await this.executeDatabaseQuery(config)

      case 'send_email':
        return await this.executeSendEmail(config)

      case 'slack_message':
        return await this.executeSlackMessage(config)

      case 'log_message':
        return this.executeLogMessage(config)

      default:
        // Generic action execution
        return {
          success: true,
          message: `Executed action: ${actionType}`,
          config: config,
          output: this.resolveVariables(config.output || {})
        }
    }
  }

  /**
   * Execute condition node (if/else logic)
   */
  private async executeCondition(node: WorkflowNode): Promise<any> {
    const { config } = node.data
    const condition = config.condition || 'true'

    // Resolve variables in condition
    const resolvedCondition = this.resolveVariables(condition)

    // Evaluate condition (simple evaluation for now)
    const result = this.evaluateCondition(resolvedCondition)

    return {
      conditionMet: result,
      condition: resolvedCondition,
      message: result ? 'Condition passed' : 'Condition failed'
    }
  }

  /**
   * Execute transform node (data manipulation)
   */
  private async executeTransform(node: WorkflowNode): Promise<any> {
    const { config } = node.data
    const transformType = config.transformType || 'map'

    // Get input data from previous nodes
    const inputData = this.getInputData(node)

    switch (transformType) {
      case 'map':
        return this.transformMap(inputData, config)
      case 'filter':
        return this.transformFilter(inputData, config)
      case 'reduce':
        return this.transformReduce(inputData, config)
      default:
        return inputData
    }
  }

  /**
   * Execute loop node (iterate over array)
   */
  private async executeLoop(node: WorkflowNode): Promise<any> {
    const { config } = node.data
    const items = this.resolveVariables(config.items || [])

    const results = []
    for (const item of items) {
      // Execute loop body with current item
      results.push({
        item,
        processed: true,
        timestamp: new Date().toISOString()
      })
    }

    return {
      iterations: results.length,
      results
    }
  }

  /**
   * Execute HTTP request
   */
  private async executeHttpRequest(config: any): Promise<any> {
    const url = this.resolveVariables(config.url)
    const method = config.method || 'GET'
    const headers = this.resolveVariables(config.headers || {})
    const body = this.resolveVariables(config.body)

    console.log(`  → HTTP ${method} ${url}`)

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    })

    const data = await response.json()

    return {
      status: response.status,
      statusText: response.statusText,
      data
    }
  }

  /**
   * Execute database query
   */
  private async executeDatabaseQuery(config: any): Promise<any> {
    const table = config.table
    const operation = config.operation || 'select'
    const filters = this.resolveVariables(config.filters || {})

    console.log(`  → Database ${operation} on ${table}`)

    let query = this.supabase.from(table)

    switch (operation) {
      case 'select':
        const { data, error } = await query.select('*').match(filters)
        if (error) throw error
        return { records: data, count: data?.length || 0 }

      case 'insert':
        const insertData = this.resolveVariables(config.data)
        const { data: inserted, error: insertError } = await query.insert(insertData)
        if (insertError) throw insertError
        return { inserted }

      case 'update':
        const updateData = this.resolveVariables(config.data)
        const { data: updated, error: updateError } = await query.update(updateData).match(filters)
        if (updateError) throw updateError
        return { updated }

      default:
        throw new Error(`Unknown database operation: ${operation}`)
    }
  }

  /**
   * Send email
   */
  private async executeSendEmail(config: any): Promise<any> {
    const to = this.resolveVariables(config.to)
    const subject = this.resolveVariables(config.subject)
    const html = this.resolveVariables(config.html || config.body)
    const text = this.resolveVariables(config.text || config.body)
    const templateId = config.templateId

    console.log(`  → Sending email to ${to}`)

    try {
      // Import email service dynamically
      const emailModule = await import('@/lib/email/email-service')
      
      // Send email using the email service
      const result = await emailModule.sendEmail({
        to,
        subject,
        html,
        text,
        templateId,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email')
      }

      const messageId = result.messageId

      return {
        sent: true,
        to,
        subject,
        messageId,
        provider: result.provider || process.env.EMAIL_PROVIDER,
      }
    } catch (error: any) {
      console.error('Failed to send email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }
  }

  /**
   * Send Slack message
   */
  private async executeSlackMessage(config: any): Promise<any> {
    const channel = this.resolveVariables(config.channel)
    const message = this.resolveVariables(config.message)

    console.log(`  → Sending Slack message to ${channel}`)

    // TODO: Implement actual Slack API call
    return {
      sent: true,
      channel,
      message: 'Slack message sent (simulated)'
    }
  }

  /**
   * Log message (for debugging/testing)
   */
  private executeLogMessage(config: any): any {
    const message = this.resolveVariables(config.message || 'Log message')
    console.log(`  → Log: ${message}`)
    
    return {
      logged: true,
      message,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Get input data from previous nodes
   */
  private getInputData(node: WorkflowNode): any {
    // Find edges pointing to this node
    const incomingEdges = this.definition.edges.filter(
      edge => edge.target === node.id
    )

    if (incomingEdges.length === 0) {
      return this.context.triggerData
    }

    // Get data from previous node
    const previousNode = incomingEdges[0].source
    return this.context.nodeResults[previousNode]?.data || {}
  }

  /**
   * Resolve variables in strings (e.g., {{variable}})
   */
  private resolveVariables(value: any): any {
    if (typeof value === 'string') {
      // Replace {{variable}} with actual values
      return value.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
        const path = variable.trim().split('.')
        let result: any = this.context

        for (const key of path) {
          result = result?.[key]
        }

        return result !== undefined ? String(result) : match
      })
    }

    if (Array.isArray(value)) {
      return value.map(item => this.resolveVariables(item))
    }

    if (typeof value === 'object' && value !== null) {
      const resolved: any = {}
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveVariables(val)
      }
      return resolved
    }

    return value
  }

  /**
   * Evaluate a condition string
   */
  private evaluateCondition(condition: string): boolean {
    try {
      // Simple evaluation (can be enhanced with a proper expression evaluator)
      if (condition === 'true') return true
      if (condition === 'false') return false

      // Evaluate simple comparisons
      const match = condition.match(/^(.+?)\s*(==|!=|>|<|>=|<=)\s*(.+?)$/)
      if (match) {
        const [, left, operator, right] = match
        const leftVal = this.parseValue(left.trim())
        const rightVal = this.parseValue(right.trim())

        switch (operator) {
          case '==': return leftVal == rightVal
          case '!=': return leftVal != rightVal
          case '>': return leftVal > rightVal
          case '<': return leftVal < rightVal
          case '>=': return leftVal >= rightVal
          case '<=': return leftVal <= rightVal
        }
      }

      return false
    } catch (error) {
      console.error('Error evaluating condition:', error)
      return false
    }
  }

  /**
   * Parse a value from string
   */
  private parseValue(value: string): any {
    // Try to parse as number
    if (!isNaN(Number(value))) {
      return Number(value)
    }

    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1)
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1)
    }

    return value
  }

  /**
   * Transform: Map
   */
  private transformMap(data: any, config: any): any {
    if (!Array.isArray(data)) {
      data = [data]
    }

    const mapping = config.mapping || {}
    return data.map((item: any) => {
      const mapped: any = {}
      for (const [key, value] of Object.entries(mapping)) {
        mapped[key] = this.resolveVariables(value)
      }
      return mapped
    })
  }

  /**
   * Transform: Filter
   */
  private transformFilter(data: any, config: any): any {
    if (!Array.isArray(data)) {
      data = [data]
    }

    const filterCondition = config.filter || 'true'
    return data.filter((item: any) => {
      // Temporarily add item to context for filtering
      const originalVariables = this.context.variables
      this.context.variables = { ...originalVariables, item }
      const result = this.evaluateCondition(this.resolveVariables(filterCondition))
      this.context.variables = originalVariables
      return result
    })
  }

  /**
   * Transform: Reduce
   */
  private transformReduce(data: any, config: any): any {
    if (!Array.isArray(data)) {
      data = [data]
    }

    const operation = config.operation || 'sum'
    const field = config.field

    switch (operation) {
      case 'sum':
        return data.reduce((sum: number, item: any) => sum + (Number(item[field]) || 0), 0)
      case 'count':
        return data.length
      case 'average':
        const sum = data.reduce((s: number, item: any) => s + (Number(item[field]) || 0), 0)
        return sum / data.length
      default:
        return data
    }
  }
}

/**
 * Helper function to execute a workflow
 */
export async function executeWorkflow(
  workflow: any,
  context: Omit<ExecutionContext, 'variables' | 'nodeResults'>
): Promise<ExecutionResult> {
  const fullContext: ExecutionContext = {
    ...context,
    variables: {},
    nodeResults: {}
  }

  const definition: WorkflowDefinition = workflow.definition || {
    nodes: workflow.nodes || [],
    edges: workflow.edges || []
  }

  const engine = new WorkflowExecutionEngine(definition, fullContext)
  return await engine.execute()
}
