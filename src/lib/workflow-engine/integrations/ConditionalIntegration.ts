export class ConditionalIntegration {
  private static cache: Map<string, any> = new Map()
  private static cacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  }

  // ✅ FIXED: Static method executeConditionalAction
  static async executeConditionalAction(
    config: any, 
    context: any
  ): Promise<any> {
    const instance = new ConditionalIntegration()
    return await instance.processConditionalLogic(config, context)
  }

  // ✅ FIXED: Static method getCacheStats
  static getCacheStats(): any {
    return ConditionalIntegration.cacheStats
  }

  // ✅ FIXED: Static method clearCache
  static clearCache(): void {
    ConditionalIntegration.cache.clear()
    ConditionalIntegration.cacheStats = {
      hits: 0,
      misses: 0,
      totalRequests: 0
    }
  }

  private async processConditionalLogic(config: any, context: any): Promise<any> {
    const { condition, thenActions, elseActions, type = 'if-then-else' } = config

    ConditionalIntegration.cacheStats.totalRequests++

    // Generate cache key
    const cacheKey = this.generateCacheKey(config, context)
    
    // Check cache first
    if (ConditionalIntegration.cache.has(cacheKey)) {
      ConditionalIntegration.cacheStats.hits++
      return ConditionalIntegration.cache.get(cacheKey)
    }

    ConditionalIntegration.cacheStats.misses++

    let result: any

    try {
      switch (type) {
        case 'if-then-else':
          result = await this.executeIfThenElse(condition, thenActions, elseActions, context)
          break
        
        case 'switch-case':
          result = await this.executeSwitchCase(config, context)
          break
        
        case 'loop-while':
          result = await this.executeLoopWhile(config, context)
          break
        
        case 'loop-for':
          result = await this.executeForLoop(config, context)
          break
        
        default:
          result = await this.executeSimpleCondition(condition, context)
      }

      // Cache the result (with expiration)
      ConditionalIntegration.cache.set(cacheKey, result)
      
      // Clean cache if it gets too large
      if (ConditionalIntegration.cache.size > 1000) {
        const keysToDelete = Array.from(ConditionalIntegration.cache.keys()).slice(0, 100)
        keysToDelete.forEach(key => ConditionalIntegration.cache.delete(key))
      }

      return result

    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
        timestamp: new Date().toISOString()
      }
      
      // Don't cache errors
      return errorResult
    }
  }

  private async executeIfThenElse(
    condition: any, 
    thenActions: any[] = [], 
    elseActions: any[] = [], 
    context: any
  ): Promise<any> {
    const conditionResult = this.evaluateCondition(condition, context)

    const executedActions = conditionResult ? thenActions : elseActions
    const actionResults = await this.executeActions(executedActions, context)

    return {
      success: true,
      type: 'if-then-else',
      conditionMet: conditionResult,
      condition,
      executedBranch: conditionResult ? 'then' : 'else',
      executedActions: executedActions.length,
      actionResults,
      timestamp: new Date().toISOString()
    }
  }

  private async executeSwitchCase(config: any, context: any): Promise<any> {
    const { field, cases = [], defaultActions = [] } = config
    const fieldValue = this.getFieldValue(field, context)

    // Find matching case
    for (const caseItem of cases) {
      if (this.compareValues(caseItem.value, fieldValue)) {
        const actionResults = await this.executeActions(caseItem.actions || [], context)
        
        return {
          success: true,
          type: 'switch-case',
          field,
          fieldValue,
          matchedCase: caseItem.value,
          executedActions: (caseItem.actions || []).length,
          actionResults,
          timestamp: new Date().toISOString()
        }
      }
    }

    // Default case
    const actionResults = await this.executeActions(defaultActions, context)
    
    return {
      success: true,
      type: 'switch-case',
      field,
      fieldValue,
      matchedCase: 'default',
      executedActions: defaultActions.length,
      actionResults,
      timestamp: new Date().toISOString()
    }
  }

  private async executeLoopWhile(config: any, context: any): Promise<any> {
    const { condition, actions = [], maxIterations = 100 } = config
    const results = []
    let iteration = 0
    let currentContext = { ...context }

    while (this.evaluateCondition(condition, currentContext) && iteration < maxIterations) {
      const iterationResult = await this.executeActions(actions, {
        ...currentContext,
        iteration,
        loopContext: {
          currentIteration: iteration,
          totalIterations: iteration + 1
        }
      })
      
      results.push({
        iteration,
        result: iterationResult,
        timestamp: new Date().toISOString()
      })
      
      // Update context for next iteration
      currentContext.variables = { 
        ...currentContext.variables, 
        lastLoopResult: iterationResult,
        currentIteration: iteration
      }
      
      iteration++
    }

    return {
      success: true,
      type: 'loop-while',
      condition,
      totalIterations: iteration,
      maxIterations,
      stopped: iteration >= maxIterations ? 'max_iterations_reached' : 'condition_false',
      results,
      timestamp: new Date().toISOString()
    }
  }

  private async executeForLoop(config: any, context: any): Promise<any> {
    const { items, itemVariable = 'item', actions = [] } = config
    const results = []

    if (!Array.isArray(items)) {
      throw new Error('For loop requires items to be an array')
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const loopContext = {
        ...context,
        variables: {
          ...context.variables,
          [itemVariable]: item,
          index: i,
          isFirst: i === 0,
          isLast: i === items.length - 1
        }
      }

      const iterationResult = await this.executeActions(actions, loopContext)
      
      results.push({
        index: i,
        item,
        result: iterationResult,
        timestamp: new Date().toISOString()
      })
    }

    return {
      success: true,
      type: 'loop-for',
      totalItems: items.length,
      itemVariable,
      results,
      timestamp: new Date().toISOString()
    }
  }

  private async executeSimpleCondition(condition: any, context: any): Promise<any> {
    const result = this.evaluateCondition(condition, context)
    
    return {
      success: true,
      type: 'simple-condition',
      condition,
      result,
      timestamp: new Date().toISOString()
    }
  }

  private evaluateCondition(condition: any, context: any): boolean {
    if (condition === null || condition === undefined) {
      return false
    }

    if (typeof condition === 'boolean') {
      return condition
    }

    if (typeof condition === 'string') {
      return this.evaluateStringCondition(condition, context)
    }

    if (typeof condition === 'object') {
      const { field, operator, value, conditions } = condition

      // Handle logical operators
      if (operator === 'and' && Array.isArray(conditions)) {
        return conditions.every(c => this.evaluateCondition(c, context))
      }
      
      if (operator === 'or' && Array.isArray(conditions)) {
        return conditions.some(c => this.evaluateCondition(c, context))
      }
      
      if (operator === 'not' && conditions) {
        return !this.evaluateCondition(conditions, context)
      }

      // Handle field-based conditions
      if (field && operator) {
        const fieldValue = this.getFieldValue(field, context)
        return this.compareValues(fieldValue, value, operator)
      }
    }

    return Boolean(condition)
  }

  private evaluateStringCondition(condition: string, context: any): boolean {
    // Replace template variables
    const resolved = condition.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getFieldValue(path, context)
      return JSON.stringify(value)
    })

    try {
      // For safety, only allow simple comparisons
      if (resolved.includes('==') || resolved.includes('!=') || resolved.includes('>') || resolved.includes('<')) {
        return Boolean(eval(resolved))
      }
      return Boolean(resolved)
    } catch {
      return false
    }
  }

  private compareValues(fieldValue: any, compareValue: any, operator: string = 'equals'): boolean {
    switch (operator) {
      case 'equals':
      case '==':
      case '===':
        return fieldValue === compareValue
        
      case 'not_equals':
      case '!=':
      case '!==':
        return fieldValue !== compareValue
        
      case 'greater_than':
      case '>':
        return Number(fieldValue) > Number(compareValue)
        
      case 'less_than':
      case '<':
        return Number(fieldValue) < Number(compareValue)
        
      case 'greater_than_or_equal':
      case '>=':
        return Number(fieldValue) >= Number(compareValue)
        
      case 'less_than_or_equal':
      case '<=':
        return Number(fieldValue) <= Number(compareValue)
        
      case 'contains':
        return String(fieldValue || '').includes(String(compareValue))
        
      case 'starts_with':
        return String(fieldValue || '').startsWith(String(compareValue))
        
      case 'ends_with':
        return String(fieldValue || '').endsWith(String(compareValue))
        
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
        
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue)
        
      case 'not_in':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue)
        
      default:
        return fieldValue === compareValue
    }
  }

  private getFieldValue(field: string, context: any): any {
    if (!field) return undefined
    
    const keys = field.split('.')
    let value = context.variables || context
    
    for (const key of keys) {
      if (value === null || value === undefined) {
        return undefined
      }
      value = value[key]
    }
    
    return value
  }

  private async executeActions(actions: any[] = [], context: any): Promise<any> {
    const results: any = {}
    
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]
      const actionId = action.id || `action_${i}`
      
      try {
        // Simulate action execution based on type
        let actionResult: any
        
        switch (action.type) {
          case 'log':
            actionResult = {
              type: 'log',
              message: action.config?.message || 'Log message',
              timestamp: new Date().toISOString()
            }
            break
            
          case 'delay':
            const delay = action.config?.delay || 1000
            await new Promise(resolve => setTimeout(resolve, delay))
            actionResult = {
              type: 'delay',
              delay,
              timestamp: new Date().toISOString()
            }
            break
            
          case 'set_variable':
            const varName = action.config?.name
            const varValue = action.config?.value
            if (varName) {
              context.variables = context.variables || {}
              context.variables[varName] = varValue
            }
            actionResult = {
              type: 'set_variable',
              variable: varName,
              value: varValue,
              timestamp: new Date().toISOString()
            }
            break
            
          default:
            actionResult = {
              type: action.type || 'unknown',
              status: 'completed',
              config: action.config,
              timestamp: new Date().toISOString()
            }
        }
        
        results[actionId] = {
          success: true,
          result: actionResult
        }
        
      } catch (error) {
        results[actionId] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    
    return results
  }

  private generateCacheKey(config: any, context: any): string {
    const configStr = JSON.stringify(config, null, 0)
    const contextStr = JSON.stringify(context.variables || {}, null, 0)
    const combined = `${configStr}__${contextStr}`
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return `cache_${Math.abs(hash)}`
  }
}