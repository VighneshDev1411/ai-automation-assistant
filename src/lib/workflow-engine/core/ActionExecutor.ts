// src/lib/workflow-engine/core/ActionExecutor.ts

import { SupabaseClient } from '@supabase/supabase-js'

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

export class ActionExecutor {
  private supabase: SupabaseClient<any>  // ✅ FIXED: Use any instead of Database
  private integrations = new Map<string, any>()

  constructor(supabase: SupabaseClient<any>) {  // ✅ FIXED: Use any instead of Database
    this.supabase = supabase
  }

  async executeAction(actionConfig: any, context: WorkflowExecutionContext): Promise<any> {
    const { type, config, id } = actionConfig

    try {
      let result: any

      switch (type) {
        case 'http':
          result = await this.executeHttpAction(config, context)
          break
        case 'email':
          result = await this.executeEmailAction(config, context)
          break
        case 'database':
          result = await this.executeDatabaseAction(config, context)
          break
        case 'ai':
          result = await this.executeAIAction(config, context)
          break
        case 'transform':
          result = await this.executeTransformAction(config, context)
          break
        case 'integration':
          result = await this.executeIntegrationAction(config, context)
          break
        case 'delay':
          result = await this.executeDelayAction(config, context)
          break
        case 'webhook':
          result = await this.executeWebhookAction(config, context)
          break
        default:
          throw new Error(`Unknown action type: ${type}`)
      }

      return {
        actionId: id,
        actionType: type,
        status: 'completed',
        result,
        executedAt: new Date().toISOString()
      }

    } catch (error) {
      throw new Error(`Action ${id} (${type}) failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async executeHttpAction(config: any, context: WorkflowExecutionContext): Promise<any> {
    const url = this.resolveTemplate(config.url, context)
    const method = config.method || 'GET'
    const headers = this.resolveTemplate(config.headers || {}, context)
    const body = config.body ? this.resolveTemplate(config.body, context) : undefined
    const timeout = config.timeout || 30000

    // Validate URL
    try {
      new URL(url)
    } catch {
      throw new Error(`Invalid URL: ${url}`)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WorkflowEngine/1.0',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type')
      let responseData

      if (contentType?.includes('application/json')) {
        responseData = await response.json()
      } else if (contentType?.includes('text/')) {
        responseData = await response.text()
      } else {
        responseData = await response.arrayBuffer()
      }

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData,
        url,
        method
      }

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`HTTP request timeout after ${timeout}ms`)
      }
      
      throw error
    }
  }

  private async executeEmailAction(config: any, context: WorkflowExecutionContext): Promise<any> {
    // Get Gmail integration
    const emailIntegration = await this.getIntegration('gmail', context.orgId)
    
    const emailData = {
      to: this.resolveTemplate(config.to, context),
      subject: this.resolveTemplate(config.subject, context),
      body: this.resolveTemplate(config.body || config.content, context),
      cc: config.cc ? this.resolveTemplate(config.cc, context) : undefined,
      bcc: config.bcc ? this.resolveTemplate(config.bcc, context) : undefined,
      attachments: config.attachments ? this.resolveTemplate(config.attachments, context) : undefined
    }

    // Validate email addresses
    const emailFields: (keyof typeof emailData)[] = ['to', 'cc', 'bcc']
    for (const field of emailFields) {
      const emailValue = emailData[field]
      if (emailValue && !this.isValidEmail(emailValue)) {
        throw new Error(`Invalid ${field} email address: ${emailValue}`)
      }
    }

    const result = await emailIntegration.sendEmail(emailData)
    
    return {
      messageId: result.messageId,
      to: emailData.to,
      subject: emailData.subject,
      sentAt: new Date().toISOString()
    }
  }

  private async executeDatabaseAction(config: any, context: WorkflowExecutionContext): Promise<any> {
    const { operation, table, data, filter, columns } = config

    const resolvedData = data ? this.resolveTemplate(data, context) : undefined
    const resolvedFilter = filter ? this.resolveTemplate(filter, context) : undefined

    switch (operation.toLowerCase()) {
      case 'insert':
        const { data: insertResult, error: insertError } = await this.supabase
          .from(table)
          .insert(resolvedData as any)  // ✅ FIXED: Type assertion
          .select()
        
        if (insertError) throw new Error(`Database insert failed: ${insertError.message}`)
        return {
          operation: 'insert',
          table,
          insertedRows: insertResult?.length || 0,
          data: insertResult
        }

      case 'update':
        const { data: updateResult, error: updateError } = await this.supabase
          .from(table)
          .update(resolvedData as any)  // ✅ FIXED: Type assertion
          .match(resolvedFilter as any)  // ✅ FIXED: Type assertion
          .select()
        
        if (updateError) throw new Error(`Database update failed: ${updateError.message}`)
        return {
          operation: 'update',
          table,
          updatedRows: updateResult?.length || 0,
          data: updateResult
        }

      case 'select':
        const { data: selectResult, error: selectError } = await this.supabase
          .from(table)
          .select(columns || '*')
          .match((resolvedFilter || {}) as any)  // ✅ FIXED: Type assertion
          .limit(config.limit || 100)
        
        if (selectError) throw new Error(`Database select failed: ${selectError.message}`)
        return {
          operation: 'select',
          table,
          rowCount: selectResult?.length || 0,
          data: selectResult
        }

      case 'delete':
        if (!resolvedFilter || Object.keys(resolvedFilter).length === 0) {
          throw new Error('Delete operation requires filter conditions')
        }
        
        const { data: deleteResult, error: deleteError } = await this.supabase
          .from(table)
          .delete()
          .match(resolvedFilter as any)  // ✅ FIXED: Type assertion
          .select()
        
        if (deleteError) throw new Error(`Database delete failed: ${deleteError.message}`)
        return {
          operation: 'delete',
          table,
          deletedRows: deleteResult?.length || 0,
          data: deleteResult
        }

      default:
        throw new Error(`Unknown database operation: ${operation}`)
    }
  }

  private async executeAIAction(config: any, context: WorkflowExecutionContext): Promise<any> {
    const prompt = this.resolveTemplate(config.prompt, context)
    const model = config.model || 'gpt-4'
    const maxTokens = config.maxTokens || 1000
    const temperature = config.temperature || 0.7

    // This would integrate with actual AI service
    // For now, return a mock response
    const mockResponse = {
      response: `AI response for prompt: ${prompt.substring(0, 50)}...`,
      model,
      tokensUsed: Math.floor(Math.random() * maxTokens),
      finishReason: 'completed',
      executedAt: new Date().toISOString()
    }

    // Track AI usage
    await this.trackAIUsage(context.orgId, context.userId, model, mockResponse.tokensUsed)

    return mockResponse
  }

  private async executeTransformAction(config: any, context: WorkflowExecutionContext): Promise<any> {
    const inputData = this.resolveTemplate(config.input, context)
    const transformation = config.transformation

    if (!transformation || !transformation.type) {
      throw new Error('Transformation configuration is required')
    }

    switch (transformation.type) {
      case 'map':
        return this.mapTransformation(inputData, transformation.mapping)
      case 'filter':
        return this.filterTransformation(inputData, transformation.condition)
      case 'aggregate':
        return this.aggregateTransformation(inputData, transformation.operation)
      case 'sort':
        return this.sortTransformation(inputData, transformation.field, transformation.order)
      case 'group':
        return this.groupTransformation(inputData, transformation.groupBy)
      case 'flatten':
        return this.flattenTransformation(inputData)
      case 'unique':
        return this.uniqueTransformation(inputData, transformation.field)
      default:
        throw new Error(`Unknown transformation type: ${transformation.type}`)
    }
  }

  private async executeIntegrationAction(config: any, context: WorkflowExecutionContext): Promise<any> {
    const integration = await this.getIntegration(config.provider, context.orgId)
    
    if (!integration) {
      throw new Error(`Integration not found or not connected: ${config.provider}`)
    }

    const resolvedParameters = this.resolveTemplate(config.parameters, context)
    
    const result = await integration.executeAction(config.action, resolvedParameters)
    
    return {
      provider: config.provider,
      action: config.action,
      parameters: resolvedParameters,
      result,
      executedAt: new Date().toISOString()
    }
  }

  private async executeDelayAction(config: any, context: WorkflowExecutionContext): Promise<any> {
    const delay = this.resolveTemplate(config.delay, context)
    const delayMs = typeof delay === 'number' ? delay : parseInt(delay) || 1000

    if (delayMs < 0 || delayMs > 300000) { // Max 5 minutes
      throw new Error('Delay must be between 0 and 300000 milliseconds')
    }

    await new Promise(resolve => setTimeout(resolve, delayMs))
    
    return {
      delayMs,
      executedAt: new Date().toISOString(),
      message: `Delayed execution by ${delayMs}ms`
    }
  }

  private async executeWebhookAction(config: any, context: WorkflowExecutionContext): Promise<any> {
    const url = this.resolveTemplate(config.url, context)
    const payload = this.resolveTemplate(config.payload || {}, context)
    const headers = this.resolveTemplate(config.headers || {}, context)
    const method = config.method || 'POST'

    // Add webhook signature if secret is provided
    if (config.secret) {
      const signature = await this.generateWebhookSignature(payload, config.secret)
      headers['X-Webhook-Signature'] = signature
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(),
        source: 'workflow-engine'
      })
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
    }

    return {
      url,
      status: response.status,
      sentAt: new Date().toISOString(),
      payload
    }
  }

  // Template resolution
  private resolveTemplate(template: any, context: WorkflowExecutionContext): any {
    if (typeof template === 'string') {
      return template.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
        const trimmedName = variableName.trim()
        return this.getNestedValue(context.variables, trimmedName) ?? match
      })
    }
    
    if (Array.isArray(template)) {
      return template.map(item => this.resolveTemplate(item, context))
    }
    
    if (typeof template === 'object' && template !== null) {
      const resolved: any = {}
      for (const [key, value] of Object.entries(template)) {
        resolved[key] = this.resolveTemplate(value, context)
      }
      return resolved
    }
    
    return template
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

  // Transformation methods
  private mapTransformation(data: any[], mapping: any): any[] {
    if (!Array.isArray(data)) {
      throw new Error('Map transformation requires array input')
    }

    return data.map(item => {
      const mapped: any = {}
      for (const [targetKey, sourceKey] of Object.entries(mapping)) {
        if (typeof sourceKey === 'string') {
          mapped[targetKey] = this.getNestedValue(item, sourceKey)
        } else {
          mapped[targetKey] = sourceKey
        }
      }
      return mapped
    })
  }

  private filterTransformation(data: any[], condition: any): any[] {
    if (!Array.isArray(data)) {
      throw new Error('Filter transformation requires array input')
    }

    return data.filter(item => {
      const { field, operator, value } = condition
      const fieldValue = this.getNestedValue(item, field)

      switch (operator) {
        case 'equals':
          return fieldValue === value
        case 'not_equals':
          return fieldValue !== value
        case 'contains':
          return String(fieldValue || '').includes(String(value))
        case 'greater_than':
          return Number(fieldValue) > Number(value)
        case 'less_than':
          return Number(fieldValue) < Number(value)
        case 'greater_than_or_equal':
          return Number(fieldValue) >= Number(value)
        case 'less_than_or_equal':
          return Number(fieldValue) <= Number(value)
        case 'exists':
          return fieldValue !== undefined && fieldValue !== null
        case 'in':
          return Array.isArray(value) && value.includes(fieldValue)
        case 'not_in':
          return Array.isArray(value) && !value.includes(fieldValue)
        case 'starts_with':
          return String(fieldValue || '').startsWith(String(value))
        case 'ends_with':
          return String(fieldValue || '').endsWith(String(value))
        default:
          return true
      }
    })
  }

  private aggregateTransformation(data: any[], operation: any): any {
    if (!Array.isArray(data)) {
      throw new Error('Aggregate transformation requires array input')
    }

    const { type, field } = operation

    switch (type) {
      case 'count':
        return { count: data.length }
        
      case 'sum':
        const sum = data.reduce((acc, item) => {
          const value = field ? this.getNestedValue(item, field) : item
          return acc + (Number(value) || 0)
        }, 0)
        return { sum }
        
      case 'average':
        const total = data.reduce((acc, item) => {
          const value = field ? this.getNestedValue(item, field) : item
          return acc + (Number(value) || 0)
        }, 0)
        return { average: data.length > 0 ? total / data.length : 0 }
        
      case 'max':
        const max = data.reduce((acc, item) => {
          const value = field ? this.getNestedValue(item, field) : item
          return Math.max(acc, Number(value) || -Infinity)
        }, -Infinity)
        return { max: max === -Infinity ? null : max }
        
      case 'min':
        const min = data.reduce((acc, item) => {
          const value = field ? this.getNestedValue(item, field) : item
          return Math.min(acc, Number(value) || Infinity)
        }, Infinity)
        return { min: min === Infinity ? null : min }
        
      case 'distinct':
        const distinctValues = [...new Set(data.map(item => 
          field ? this.getNestedValue(item, field) : item
        ))]
        return { distinct: distinctValues, count: distinctValues.length }
        
      default:
        throw new Error(`Unknown aggregation type: ${type}`)
    }
  }

  private sortTransformation(data: any[], field: string, order: 'asc' | 'desc' = 'asc'): any[] {
    if (!Array.isArray(data)) {
      throw new Error('Sort transformation requires array input')
    }

    return [...data].sort((a, b) => {
      const aValue = this.getNestedValue(a, field)
      const bValue = this.getNestedValue(b, field)

      if (aValue === bValue) return 0
      
      const comparison = aValue < bValue ? -1 : 1
      return order === 'desc' ? -comparison : comparison
    })
  }

  private groupTransformation(data: any[], groupBy: string): any {
    if (!Array.isArray(data)) {
      throw new Error('Group transformation requires array input')
    }

    const grouped = data.reduce((acc, item) => {
      const key = this.getNestedValue(item, groupBy)
      const groupKey = String(key)
      
      if (!acc[groupKey]) {
        acc[groupKey] = []
      }
      acc[groupKey].push(item)
      
      return acc
    }, {} as Record<string, any[]>)

    return {
      groups: grouped,
      groupCount: Object.keys(grouped).length,
      groupBy
    }
  }

  private flattenTransformation(data: any): any[] {
    if (!Array.isArray(data)) {
      throw new Error('Flatten transformation requires array input')
    }

    const flatten = (arr: any[]): any[] => {
      return arr.reduce((flat, item) => {
        if (Array.isArray(item)) {
          return flat.concat(flatten(item))
        }
        return flat.concat(item)
      }, [])
    }

    return flatten(data)
  }

  private uniqueTransformation(data: any[], field?: string): any[] {
    if (!Array.isArray(data)) {
      throw new Error('Unique transformation requires array input')
    }

    if (field) {
      const seen = new Set()
      return data.filter(item => {
        const value = this.getNestedValue(item, field)
        if (seen.has(value)) {
          return false
        }
        seen.add(value)
        return true
      })
    } else {
      return [...new Set(data)]
    }
  }

  // ✅ FIXED: Integration management with proper error handling
  private async getIntegration(provider: string, orgId: string): Promise<any> {
    const cacheKey = `${provider}_${orgId}`
    
    if (this.integrations.has(cacheKey)) {
      return this.integrations.get(cacheKey)
    }

    try {
      // ✅ FIXED: Proper query structure and type assertion
      const { data: integration, error } = await this.supabase
        .from('integrations')
        .select('*')
        .eq('provider', provider)
        .eq('organization_id', orgId)
        .eq('status', 'connected')
        .single()

      if (error || !integration) {
        throw new Error(`Integration not found or not connected: ${provider}`)
      }

      // ✅ FIXED: Safe access to credentials with type assertion
      const integrationInstance = await this.createIntegrationInstance(
        provider, 
        (integration as any).credentials || {}
      )
      this.integrations.set(cacheKey, integrationInstance)

      return integrationInstance
    } catch (error) {
      // ✅ FIXED: Better error handling
      console.error(`Failed to get integration ${provider}:`, error)
      throw new Error(`Integration not found or not connected: ${provider}`)
    }
  }

  private async createIntegrationInstance(provider: string, credentials: any): Promise<any> {
    // This would dynamically load the appropriate integration provider
    switch (provider) {
      case 'gmail':
        // Return Gmail integration instance
        return {
          sendEmail: async (emailData: any) => ({
            messageId: `msg_${Date.now()}`,
            status: 'sent'
          })
        }
      case 'slack':
        // Return Slack integration instance
        return {
          sendMessage: async (messageData: any) => ({
            messageId: `slack_${Date.now()}`,
            channel: messageData.channel
          })
        }
      default:
        throw new Error(`Provider not implemented: ${provider}`)
    }
  }

  // Utility methods
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private async generateWebhookSignature(payload: any, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(payload) + secret)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return 'sha256=' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async trackAIUsage(
    orgId: string, 
    userId: string, 
    model: string, 
    tokensUsed: number
  ): Promise<void> {
    try {
      await this.supabase
        .from('api_usage')
        .insert([{
          organization_id: orgId,
          user_id: userId,
          service: 'openai',
          endpoint: model,
          tokens_used: tokensUsed,
          cost_cents: Math.ceil(tokensUsed * 0.002), // Rough cost calculation
          metadata: {
            model,
            timestamp: new Date().toISOString()
          }
        }] as any)  // ✅ FIXED: Type assertion
    } catch (error) {
      console.error('Failed to track AI usage:', error)
    }
  }

  // Action execution with timeout
  async executeActionWithTimeout(
    actionConfig: any, 
    context: WorkflowExecutionContext, 
    timeoutMs: number = 300000 // 5 minutes default
  ): Promise<any> {
    return Promise.race([
      this.executeAction(actionConfig, context),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Action timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ])
  }

  // Batch action execution
  async executeActionsBatch(
    actions: any[], 
    context: WorkflowExecutionContext
  ): Promise<any[]> {
    const promises = actions.map(action => 
      this.executeAction(action, context).catch(error => ({
        actionId: action.id,
        error: error.message,
        status: 'failed'
      }))
    )
    
    return Promise.all(promises)
  }
}