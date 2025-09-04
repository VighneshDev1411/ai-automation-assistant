// src/lib/workflow-engine/advanced/AdvancedConditionalEngine.ts

import { WorkflowExecutionContext } from "../core/ActionExecutor"

export interface AdvancedCondition {
  id: string
  type: 'simple' | 'complex' | 'filter' | 'custom'
  field?: string
  operator: ConditionalOperator
  value: any
  conditions?: AdvancedCondition[]
  customFunction?: string
  filters?: FilterConfig[]
  metadata?: {
    name?: string
    description?: string
    priority?: number
    tags?: string[]
  }
}

export type ConditionalOperator = 
  // Basic operators
  | 'equals' | 'not_equals' | 'contains' | 'not_contains'
  | 'starts_with' | 'ends_with' | 'matches_regex'
  | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal'
  | 'between' | 'not_between'
  
  // Array/List operators
  | 'in' | 'not_in' | 'includes_any' | 'includes_all'
  | 'array_length_equals' | 'array_length_greater_than' | 'array_length_less_than'
  
  // Existence operators
  | 'exists' | 'not_exists' | 'is_null' | 'is_not_null'
  | 'is_empty' | 'is_not_empty'
  
  // Type operators
  | 'is_string' | 'is_number' | 'is_boolean' | 'is_array' | 'is_object'
  
  // Date/Time operators
  | 'date_equals' | 'date_after' | 'date_before' | 'date_between'
  | 'date_is_today' | 'date_is_yesterday' | 'date_is_this_week'
  | 'date_is_this_month' | 'date_is_this_year'
  | 'time_between' | 'day_of_week' | 'hour_of_day'
  
  // Logical operators
  | 'and' | 'or' | 'not' | 'xor'
  
  // Advanced operators
  | 'fuzzy_match' | 'similarity_score' | 'sentiment_analysis'
  | 'json_path_exists' | 'json_path_equals'
  | 'xpath_exists' | 'xpath_equals'

export interface FilterConfig {
  id: string
  name: string
  field: string
  operator: ConditionalOperator
  value: any
  enabled: boolean
  priority?: number
}

export interface ConditionalResult {
  success: boolean
  result: boolean
  executionTime: number
  metadata: {
    conditionId: string
    operator: ConditionalOperator
    field?: string
    evaluatedValue?: any
    actualValue?: any
    subResults?: ConditionalResult[]
  }
  errors?: string[]
}

export class AdvancedConditionalEngine {
  private customFunctions: Map<string, Function> = new Map()
  private cache: Map<string, any> = new Map()

  constructor() {
    this.initializeCustomFunctions()
  }

  // Main evaluation method
  async evaluateCondition(
    condition: AdvancedCondition,
    context: WorkflowExecutionContext,
    options: {
      useCache?: boolean
      timeout?: number
      debugMode?: boolean
    } = {}
  ): Promise<ConditionalResult> {
    const startTime = performance.now()
    const cacheKey = this.generateCacheKey(condition, context)

    // Check cache if enabled
    if (options.useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    try {
      const result = await this.evaluateConditionRecursive(condition, context, options)
      const executionTime = performance.now() - startTime

      const conditionalResult: ConditionalResult = {
        success: true,
        result,
        executionTime,
        metadata: {
          conditionId: condition.id,
          operator: condition.operator,
          field: condition.field
        }
      }

      // Cache result if enabled
      if (options.useCache) {
        this.cache.set(cacheKey, conditionalResult)
      }

      return conditionalResult
    } catch (error) {
      return {
        success: false,
        result: false,
        executionTime: performance.now() - startTime,
        metadata: {
          conditionId: condition.id,
          operator: condition.operator,
          field: condition.field
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Recursive evaluation with advanced operators
  private async evaluateConditionRecursive(
    condition: AdvancedCondition,
    context: WorkflowExecutionContext,
    options: any
  ): Promise<boolean> {
    const { type, operator, field, value, conditions, customFunction, filters } = condition

    switch (type) {
      case 'custom':
        return this.evaluateCustomFunction(customFunction!, context, value)
        
      case 'filter':
        return this.evaluateFilters(filters!, context)
        
      case 'complex':
        return this.evaluateLogicalOperator(operator, conditions!, context, options)
        
      case 'simple':
      default:
        return this.evaluateSimpleCondition(field!, operator, value, context)
    }
  }

  // Enhanced simple condition evaluation
  private evaluateSimpleCondition(
    field: string,
    operator: ConditionalOperator,
    value: any,
    context: WorkflowExecutionContext
  ): boolean {
    const fieldValue = this.getFieldValue(field, context)
    const resolvedValue = this.resolveValue(value, context)

    switch (operator) {
      // Basic operators
      case 'equals':
        return fieldValue === resolvedValue
      case 'not_equals':
        return fieldValue !== resolvedValue
      case 'contains':
        return String(fieldValue || '').includes(String(resolvedValue))
      case 'not_contains':
        return !String(fieldValue || '').includes(String(resolvedValue))
      case 'starts_with':
        return String(fieldValue || '').startsWith(String(resolvedValue))
      case 'ends_with':
        return String(fieldValue || '').endsWith(String(resolvedValue))
      case 'matches_regex':
        return new RegExp(resolvedValue).test(String(fieldValue))

      // Numeric operators
      case 'greater_than':
        return Number(fieldValue) > Number(resolvedValue)
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(resolvedValue)
      case 'less_than':
        return Number(fieldValue) < Number(resolvedValue)
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(resolvedValue)
      case 'between':
        return Array.isArray(resolvedValue) && 
               Number(fieldValue) >= Number(resolvedValue[0]) &&
               Number(fieldValue) <= Number(resolvedValue[1])
      case 'not_between':
        return !Array.isArray(resolvedValue) || 
               Number(fieldValue) < Number(resolvedValue[0]) ||
               Number(fieldValue) > Number(resolvedValue[1])

      // Array operators
      case 'in':
        return Array.isArray(resolvedValue) && resolvedValue.includes(fieldValue)
      case 'not_in':
        return !Array.isArray(resolvedValue) || !resolvedValue.includes(fieldValue)
      case 'includes_any':
        return Array.isArray(fieldValue) && Array.isArray(resolvedValue) &&
               resolvedValue.some(item => fieldValue.includes(item))
      case 'includes_all':
        return Array.isArray(fieldValue) && Array.isArray(resolvedValue) &&
               resolvedValue.every(item => fieldValue.includes(item))
      case 'array_length_equals':
        return Array.isArray(fieldValue) && fieldValue.length === Number(resolvedValue)
      case 'array_length_greater_than':
        return Array.isArray(fieldValue) && fieldValue.length > Number(resolvedValue)
      case 'array_length_less_than':
        return Array.isArray(fieldValue) && fieldValue.length < Number(resolvedValue)

      // Existence operators
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null
      case 'is_null':
        return fieldValue === null
      case 'is_not_null':
        return fieldValue !== null
      case 'is_empty':
        return this.isEmpty(fieldValue)
      case 'is_not_empty':
        return !this.isEmpty(fieldValue)

      // Type operators
      case 'is_string':
        return typeof fieldValue === 'string'
      case 'is_number':
        return typeof fieldValue === 'number' && !isNaN(fieldValue)
      case 'is_boolean':
        return typeof fieldValue === 'boolean'
      case 'is_array':
        return Array.isArray(fieldValue)
      case 'is_object':
        return typeof fieldValue === 'object' && fieldValue !== null && !Array.isArray(fieldValue)

      // Date operators
      case 'date_equals':
        return this.compareDates(fieldValue, resolvedValue, 'equals')
      case 'date_after':
        return this.compareDates(fieldValue, resolvedValue, 'after')
      case 'date_before':
        return this.compareDates(fieldValue, resolvedValue, 'before')
      case 'date_between':
        return this.isDateBetween(fieldValue, resolvedValue)
      case 'date_is_today':
        return this.isToday(fieldValue)
      case 'date_is_yesterday':
        return this.isYesterday(fieldValue)
      case 'date_is_this_week':
        return this.isThisWeek(fieldValue)
      case 'date_is_this_month':
        return this.isThisMonth(fieldValue)
      case 'date_is_this_year':
        return this.isThisYear(fieldValue)

      // Advanced operators
      case 'fuzzy_match':
        return this.fuzzyMatch(String(fieldValue), String(resolvedValue))
      case 'similarity_score':
        return this.calculateSimilarity(String(fieldValue), String(resolvedValue)) >= Number(value.threshold || 0.8)
      case 'json_path_exists':
        return this.jsonPathExists(fieldValue, resolvedValue)
      case 'json_path_equals':
        return this.jsonPathEquals(fieldValue, resolvedValue, value.expected)

      default:
        throw new Error(`Unknown operator: ${operator}`)
    }
  }

  // Logical operator evaluation
  private async evaluateLogicalOperator(
    operator: ConditionalOperator,
    conditions: AdvancedCondition[],
    context: WorkflowExecutionContext,
    options: any
  ): Promise<boolean> {
    switch (operator) {
      case 'and':
        for (const condition of conditions) {
          if (!(await this.evaluateConditionRecursive(condition, context, options))) {
            return false
          }
        }
        return true

      case 'or':
        for (const condition of conditions) {
          if (await this.evaluateConditionRecursive(condition, context, options)) {
            return true
          }
        }
        return false

      case 'not':
        return !(await this.evaluateConditionRecursive(conditions[0], context, options))

      case 'xor':
        let trueCount = 0
        for (const condition of conditions) {
          if (await this.evaluateConditionRecursive(condition, context, options)) {
            trueCount++
          }
        }
        return trueCount === 1

      default:
        throw new Error(`Unknown logical operator: ${operator}`)
    }
  }

  // Filter evaluation
  private evaluateFilters(filters: FilterConfig[], context: WorkflowExecutionContext): boolean {
    const enabledFilters = filters.filter(f => f.enabled)
    
    // Sort by priority (higher priority first)
    enabledFilters.sort((a, b) => (b.priority || 0) - (a.priority || 0))

    return enabledFilters.every(filter => 
      this.evaluateSimpleCondition(filter.field, filter.operator, filter.value, context)
    )
  }

  // Custom function evaluation
  private evaluateCustomFunction(functionName: string, context: WorkflowExecutionContext, params: any): boolean {
    const customFunction = this.customFunctions.get(functionName)
    if (!customFunction) {
      throw new Error(`Custom function not found: ${functionName}`)
    }
    
    return customFunction(context, params)
  }

  // Helper methods
  private getFieldValue(field: string, context: WorkflowExecutionContext): any {
    const keys = field.split('.')
    let value: any = {
      ...context.triggerData,
      ...context.variables,
      _meta: {
        executionId: context.executionId,
        workflowId: context.workflowId,
        userId: context.userId,
        timestamp: context.executionStartTime
      }
    }
    
    for (const key of keys) {
      value = value?.[key]
      if (value === undefined) break
    }
    
    return value
  }

  private resolveValue(value: any, context: WorkflowExecutionContext): any {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const variableName = value.slice(2, -2).trim()
      return this.getFieldValue(variableName, context)
    }
    return value
  }

  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.length === 0
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  }

  private compareDates(date1: any, date2: any, comparison: 'equals' | 'after' | 'before'): boolean {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false
    
    switch (comparison) {
      case 'equals':
        return d1.getTime() === d2.getTime()
      case 'after':
        return d1.getTime() > d2.getTime()
      case 'before':
        return d1.getTime() < d2.getTime()
      default:
        return false
    }
  }

  private isDateBetween(date: any, range: [any, any]): boolean {
    const d = new Date(date)
    const start = new Date(range[0])
    const end = new Date(range[1])
    
    return d.getTime() >= start.getTime() && d.getTime() <= end.getTime()
  }

  private isToday(date: any): boolean {
    const d = new Date(date)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }

  private isYesterday(date: any): boolean {
    const d = new Date(date)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return d.toDateString() === yesterday.toDateString()
  }

  private isThisWeek(date: any): boolean {
    const d = new Date(date)
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    return d >= startOfWeek && d <= endOfWeek
  }

  private isThisMonth(date: any): boolean {
    const d = new Date(date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }

  private isThisYear(date: any): boolean {
    const d = new Date(date)
    const now = new Date()
    return d.getFullYear() === now.getFullYear()
  }

  private fuzzyMatch(str1: string, str2: string, threshold: number = 0.8): boolean {
    const similarity = this.calculateSimilarity(str1, str2)
    return similarity >= threshold
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  private jsonPathExists(data: any, path: string): boolean {
    try {
      // Simple JSON path implementation
      const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.')
      let current = data
      
      for (const key of keys) {
        if (current === null || current === undefined) return false
        current = current[key]
      }
      
      return current !== undefined
    } catch {
      return false
    }
  }

  private jsonPathEquals(data: any, path: string, expected: any): boolean {
    try {
      const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.')
      let current = data
      
      for (const key of keys) {
        if (current === null || current === undefined) return false
        current = current[key]
      }
      
      return current === expected
    } catch {
      return false
    }
  }

  private generateCacheKey(condition: AdvancedCondition, context: WorkflowExecutionContext): string {
    return `${condition.id}_${JSON.stringify(context.variables)}_${context.currentStepIndex}`
  }

  // Initialize custom functions
  private initializeCustomFunctions(): void {
    // Email validation
    this.customFunctions.set('isValidEmail', ({context, params}:any) => {
      const email = this.getFieldValue(params.field, context)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    })

    // Business hours check
    this.customFunctions.set('isBusinessHours', ({context, params}:any) => {
      const now = new Date()
      const hour = now.getHours()
      const day = now.getDay()
      
      const startHour = params.startHour || 9
      const endHour = params.endHour || 17
      const workDays = params.workDays || [1, 2, 3, 4, 5] // Mon-Fri
      
      return workDays.includes(day) && hour >= startHour && hour < endHour
    })

    // Rate limiting check
    this.customFunctions.set('checkRateLimit', ({context, params}:any) => {
      // Implementation would depend on your rate limiting storage
      // This is a placeholder
      return true
    })
  }

  // Public methods for condition building
  public createSimpleCondition(
    field: string,
    operator: ConditionalOperator,
    value: any,
    metadata?: AdvancedCondition['metadata']
  ): AdvancedCondition {
    return {
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'simple',
      field,
      operator,
      value,
      metadata
    }
  }

  public createComplexCondition(
    operator: 'and' | 'or' | 'not' | 'xor',
    conditions: AdvancedCondition[],
    metadata?: AdvancedCondition['metadata']
  ): AdvancedCondition {
    return {
      id: `complex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'complex',
      operator,
      value: null,
      conditions,
      metadata
    }
  }

  public createFilterCondition(
    filters: FilterConfig[],
    metadata?: AdvancedCondition['metadata']
  ): AdvancedCondition {
    return {
      id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'filter',
      operator: 'and',
      value: null,
      filters,
      metadata
    }
  }

  // Register custom function
  public registerCustomFunction(name: string, fn: Function): void {
    this.customFunctions.set(name, fn)
  }

  // Clear cache
  public clearCache(): void {
    this.cache.clear()
  }
}