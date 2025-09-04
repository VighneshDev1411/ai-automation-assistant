// src/lib/workflow-engine/advanced/FilterEngine.ts

import { WorkflowExecutionContext } from '../core/ActionExecutor'
import { ConditionalOperator } from './AdvancedConditionEngine'

export interface FilterGroup {
  id: string
  name: string
  description?: string
  operator: 'and' | 'or'
  filters: Filter[]
  subGroups?: FilterGroup[]
  enabled: boolean
  priority?: number
}

export interface Filter {
  id: string
  name: string
  field: string
  operator: ConditionalOperator
  value: any
  enabled: boolean
  priority?: number
  validation?: FilterValidation
  transformation?: FilterTransformation
}

export interface FilterValidation {
  required?: boolean
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
  minLength?: number
  maxLength?: number
  pattern?: string
  customValidator?: string
}

export interface FilterTransformation {
  type: 'lowercase' | 'uppercase' | 'trim' | 'normalize' | 'custom'
  customFunction?: string
  params?: Record<string, any>
}

export interface FilterResult {
  passed: boolean
  matchedFilters: string[]
  failedFilters: string[]
  executionTime: number
  details: FilterExecutionDetail[]
}

export interface FilterExecutionDetail {
  filterId: string
  filterName: string
  field: string
  operator: ConditionalOperator
  expectedValue: any
  actualValue: any
  passed: boolean
  error?: string
  transformedValue?: any
}

export class FilterEngine {
  private transformationFunctions: Map<string, Function> = new Map()
  private validationFunctions: Map<string, Function> = new Map()

  constructor() {
    this.initializeTransformationFunctions()
    this.initializeValidationFunctions()
  }

  // Main filter evaluation method
  async evaluateFilterGroup(
    filterGroup: FilterGroup,
    context: WorkflowExecutionContext,
    options: {
      stopOnFirstFailure?: boolean
      includeDetails?: boolean
      maxExecutionTime?: number
    } = {}
  ): Promise<FilterResult> {
    const startTime = performance.now()
    const details: FilterExecutionDetail[] = []
    const matchedFilters: string[] = []
    const failedFilters: string[] = []

    try {
      const result = await this.evaluateFilterGroupRecursive(
        filterGroup,
        context,
        details,
        matchedFilters,
        failedFilters,
        options
      )

      return {
        passed: result,
        matchedFilters,
        failedFilters,
        executionTime: performance.now() - startTime,
        details: options.includeDetails ? details : [],
      }
    } catch (error) {
      return {
        passed: false,
        matchedFilters,
        failedFilters,
        executionTime: performance.now() - startTime,
        details: [
          {
            filterId: filterGroup.id,
            filterName: filterGroup.name,
            field: '',
            operator: 'equals',
            expectedValue: null,
            actualValue: null,
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      }
    }
  }

  private async evaluateFilterGroupRecursive(
    filterGroup: FilterGroup,
    context: WorkflowExecutionContext,
    details: FilterExecutionDetail[],
    matchedFilters: string[],
    failedFilters: string[],
    options: any
  ): Promise<boolean> {
    if (!filterGroup.enabled) {
      return true
    }

    // Evaluate individual filters
    const filterResults: boolean[] = []
    const sortedFilters = this.sortFiltersByPriority(filterGroup.filters)

    for (const filter of sortedFilters) {
      if (!filter.enabled) continue

      const result = await this.evaluateFilter(filter, context, details)
      filterResults.push(result)

      if (result) {
        matchedFilters.push(filter.id)
      } else {
        failedFilters.push(filter.id)
        if (options.stopOnFirstFailure && filterGroup.operator === 'and') {
          return false
        }
      }
    }

    // Evaluate sub-groups
    const subGroupResults: boolean[] = []
    if (filterGroup.subGroups) {
      for (const subGroup of filterGroup.subGroups) {
        const result = await this.evaluateFilterGroupRecursive(
          subGroup,
          context,
          details,
          matchedFilters,
          failedFilters,
          options
        )
        subGroupResults.push(result)
      }
    }

    // Combine all results based on operator
    const allResults = [...filterResults, ...subGroupResults]

    switch (filterGroup.operator) {
      case 'and':
        return allResults.every(r => r)
      case 'or':
        return allResults.some(r => r)
      default:
        return false
    }
  }

  private async evaluateFilter(
    filter: Filter,
    context: WorkflowExecutionContext,
    details: FilterExecutionDetail[]
  ): Promise<boolean> {
    try {
      // Get and validate field value
      let fieldValue = this.getFieldValue(filter.field, context)

      // Validate if validation rules exist
      if (filter.validation) {
        const validationResult = this.validateFieldValue(
          fieldValue,
          filter.validation
        )
        if (!validationResult.isValid) {
          details.push({
            filterId: filter.id,
            filterName: filter.name,
            field: filter.field,
            operator: filter.operator,
            expectedValue: filter.value,
            actualValue: fieldValue,
            passed: false,
            error: `Validation failed: ${validationResult.errors.join(', ')}`,
          })
          return false
        }
      }

      // Apply transformations if they exist
      if (filter.transformation) {
        fieldValue = this.applyTransformation(fieldValue, filter.transformation)
      }

      // Resolve the expected value
      const resolvedValue = this.resolveValue(filter.value, context)

      // Evaluate the condition
      const passed = this.evaluateCondition(
        filter.operator,
        fieldValue,
        resolvedValue
      )

      // Record execution details
      details.push({
        filterId: filter.id,
        filterName: filter.name,
        field: filter.field,
        operator: filter.operator,
        expectedValue: resolvedValue,
        actualValue: fieldValue,
        passed,
        transformedValue: filter.transformation ? fieldValue : undefined,
      })

      return passed
    } catch (error) {
      details.push({
        filterId: filter.id,
        filterName: filter.name,
        field: filter.field,
        operator: filter.operator,
        expectedValue: filter.value,
        actualValue: null,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  private evaluateCondition(
    operator: ConditionalOperator,
    fieldValue: any,
    expectedValue: any
  ): boolean {
    // Reuse the condition evaluation logic from AdvancedConditionalEngine
    // This is a simplified version for filters
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue
      case 'not_equals':
        return fieldValue !== expectedValue
      case 'contains':
        return String(fieldValue || '').includes(String(expectedValue))
      case 'not_contains':
        return !String(fieldValue || '').includes(String(expectedValue))
      case 'starts_with':
        return String(fieldValue || '').startsWith(String(expectedValue))
      case 'ends_with':
        return String(fieldValue || '').endsWith(String(expectedValue))
      case 'matches_regex':
        return new RegExp(expectedValue).test(String(fieldValue))
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue)
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(expectedValue)
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue)
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(expectedValue)
      case 'between':
        return (
          Array.isArray(expectedValue) &&
          Number(fieldValue) >= Number(expectedValue[0]) &&
          Number(fieldValue) <= Number(expectedValue[1])
        )
      case 'in':
        return (
          Array.isArray(expectedValue) && expectedValue.includes(fieldValue)
        )
      case 'not_in':
        return (
          !Array.isArray(expectedValue) || !expectedValue.includes(fieldValue)
        )
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null
      case 'is_empty':
        return this.isEmpty(fieldValue)
      case 'is_not_empty':
        return !this.isEmpty(fieldValue)
      case 'array_length_equals':
        return (
          Array.isArray(fieldValue) &&
          fieldValue.length === Number(expectedValue)
        )
      case 'array_length_greater_than':
        return (
          Array.isArray(fieldValue) && fieldValue.length > Number(expectedValue)
        )
      case 'array_length_less_than':
        return (
          Array.isArray(fieldValue) && fieldValue.length < Number(expectedValue)
        )
      default:
        throw new Error(`Unsupported filter operator: ${operator}`)
    }
  }

  private validateFieldValue(
    value: any,
    validation: FilterValidation
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Required validation
    if (
      validation.required &&
      (value === undefined || value === null || value === '')
    ) {
      errors.push('Field is required')
    }

    // Data type validation
    if (value !== undefined && value !== null && validation.dataType) {
      switch (validation.dataType) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push('Field must be a string')
          }
          break
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push('Field must be a valid number')
          }
          break
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push('Field must be a boolean')
          }
          break
        case 'date':
          if (isNaN(new Date(value).getTime())) {
            errors.push('Field must be a valid date')
          }
          break
        case 'array':
          if (!Array.isArray(value)) {
            errors.push('Field must be an array')
          }
          break
        case 'object':
          if (typeof value !== 'object' || Array.isArray(value)) {
            errors.push('Field must be an object')
          }
          break
      }
    }

    // Length validation for strings and arrays
    if (value && (typeof value === 'string' || Array.isArray(value))) {
      if (
        validation.minLength !== undefined &&
        value.length < validation.minLength
      ) {
        errors.push(
          `Field must be at least ${validation.minLength} characters/items long`
        )
      }
      if (
        validation.maxLength !== undefined &&
        value.length > validation.maxLength
      ) {
        errors.push(
          `Field must be no more than ${validation.maxLength} characters/items long`
        )
      }
    }

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern)
      if (!regex.test(value)) {
        errors.push('Field does not match required pattern')
      }
    }

    // Custom validation
    if (
      validation.customValidator &&
      this.validationFunctions.has(validation.customValidator)
    ) {
      const customValidator = this.validationFunctions.get(
        validation.customValidator
      )!
      const customResult = customValidator(value)
      if (!customResult.isValid) {
        errors.push(...customResult.errors)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  private applyTransformation(
    value: any,
    transformation: FilterTransformation
  ): any {
    if (value === undefined || value === null) {
      return value
    }

    switch (transformation.type) {
      case 'lowercase':
        return String(value).toLowerCase()
      case 'uppercase':
        return String(value).toUpperCase()
      case 'trim':
        return String(value).trim()
      case 'normalize':
        return String(value).normalize().trim().toLowerCase()
      case 'custom':
        if (
          transformation.customFunction &&
          this.transformationFunctions.has(transformation.customFunction)
        ) {
          const customFunction = this.transformationFunctions.get(
            transformation.customFunction
          )!
          return customFunction(value, transformation.params)
        }
        return value
      default:
        return value
    }
  }

  private getFieldValue(field: string, context: WorkflowExecutionContext): any {
    const keys = field.split('.')
    let value: any = {
      ...context.triggerData,
      ...context.variables,
      _meta: {
        executionId: context.executionId,
        workflowId: context.workflowId,
        userId: context.userId,
        timestamp: context.executionStartTime,
      },
    }

    for (const key of keys) {
      value = value?.[key]
      if (value === undefined) break
    }

    return value
  }

  private resolveValue(value: any, context: WorkflowExecutionContext): any {
    if (
      typeof value === 'string' &&
      value.startsWith('{{') &&
      value.endsWith('}}')
    ) {
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

  private sortFiltersByPriority(filters: Filter[]): Filter[] {
    return [...filters].sort((a, b) => (b.priority || 0) - (a.priority || 0))
  }

  private initializeTransformationFunctions(): void {
    // Email normalization
    this.transformationFunctions.set('normalizeEmail', (value: string) => {
      return value.toLowerCase().trim()
    })

    // Phone number normalization
    this.transformationFunctions.set('normalizePhone', (value: string) => {
      return value.replace(/\D/g, '')
    })

    // Remove special characters
    this.transformationFunctions.set(
      'removeSpecialChars',
      (value: string, params: any) => {
        const pattern = params?.pattern || /[^a-zA-Z0-9\s]/g
        return value.replace(pattern, '')
      }
    )

    // Format currency
    this.transformationFunctions.set(
      'formatCurrency',
      (value: number, params: any) => {
        const currency = params?.currency || 'USD'
        const locale = params?.locale || 'en-US'
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
        }).format(value)
      }
    )

    // Extract domain from email
    this.transformationFunctions.set('extractDomain', (value: string) => {
      const emailMatch = value.match(/@([^@]+)$/)
      return emailMatch ? emailMatch[1].toLowerCase() : ''
    })
  }

  private initializeValidationFunctions(): void {
    // Email validation
    this.validationFunctions.set('isValidEmail', (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return {
        isValid: emailRegex.test(value),
        errors: emailRegex.test(value) ? [] : ['Invalid email format'],
      }
    })

    // Phone validation
    this.validationFunctions.set('isValidPhone', (value: string) => {
      const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
      return {
        isValid: phoneRegex.test(value),
        errors: phoneRegex.test(value) ? [] : ['Invalid phone number format'],
      }
    })

    // URL validation
    this.validationFunctions.set('isValidURL', (value: string) => {
      try {
        new URL(value)
        return { isValid: true, errors: [] }
      } catch {
        return { isValid: false, errors: ['Invalid URL format'] }
      }
    })

    // Credit card validation (basic Luhn algorithm)
    this.validationFunctions.set('isValidCreditCard', (value: string) => {
      const cleaned = value.replace(/\D/g, '')
      if (cleaned.length < 13 || cleaned.length > 19) {
        return { isValid: false, errors: ['Invalid credit card number length'] }
      }

      let sum = 0
      let alternate = false
      for (let i = cleaned.length - 1; i >= 0; i--) {
        let n = parseInt(cleaned.charAt(i), 10)
        if (alternate) {
          n *= 2
          if (n > 9) n = (n % 10) + 1
        }
        sum += n
        alternate = !alternate
      }

      return {
        isValid: sum % 10 === 0,
        errors: sum % 10 === 0 ? [] : ['Invalid credit card number'],
      }
    })
  }

  // Public methods for building filters
  public createFilter(
    name: string,
    field: string,
    operator: ConditionalOperator,
    value: any,
    options: {
      enabled?: boolean
      priority?: number
      validation?: FilterValidation
      transformation?: FilterTransformation
    } = {}
  ): Filter {
    return {
      id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      field,
      operator,
      value,
      enabled: options.enabled ?? true,
      priority: options.priority,
      validation: options.validation,
      transformation: options.transformation,
    }
  }

  public createFilterGroup(
    name: string,
    operator: 'and' | 'or',
    filters: Filter[],
    options: {
      description?: string
      enabled?: boolean
      priority?: number
      subGroups?: FilterGroup[]
    } = {}
  ): FilterGroup {
    return {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: options.description,
      operator,
      filters,
      subGroups: options.subGroups,
      enabled: options.enabled ?? true,
      priority: options.priority,
    }
  }

  // Register custom transformation function
  public registerTransformationFunction(name: string, fn: Function): void {
    this.transformationFunctions.set(name, fn)
  }

  // Register custom validation function
  public registerValidationFunction(name: string, fn: Function): void {
    this.validationFunctions.set(name, fn)
  }

  // Utility methods for common filter patterns
  public createEmailFilter(
    field: string,
    domains?: string[]
  ): Filter | FilterGroup {
    const filter = this.createFilter(
      'Email Validation',
      field,
      'matches_regex',
      '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+',
      {
        validation: {
          required: true,
          dataType: 'string',
          customValidator: 'isValidEmail',
        },
        transformation: {
          type: 'normalize',
        },
      }
    )

    if (domains && domains.length > 0) {
      const domainFilter = this.createFilter(
        'Domain Whitelist',
        field,
        'in',
        domains.map(d => `@${d}`),
        {
          transformation: {
            type: 'custom',
            customFunction: 'extractDomain',
          },
        }
      )
      return this.createFilterGroup('Email with Domain Check', 'and', [
        filter,
        domainFilter,
      ])
    }

    return filter
  }

  public createDateRangeFilter(
    field: string,
    startDate: Date,
    endDate: Date
  ): Filter {
    return this.createFilter(
      'Date Range Filter',
      field,
      'date_between',
      [startDate.toISOString(), endDate.toISOString()],
      {
        validation: {
          required: true,
          dataType: 'date',
        },
      }
    )
  }

  public createNumericRangeFilter(
    field: string,
    min: number,
    max: number
  ): Filter {
    return this.createFilter(
      'Numeric Range Filter',
      field,
      'between',
      [min, max],
      {
        validation: {
          required: true,
          dataType: 'number',
        },
      }
    )
  }

  public createTextLengthFilter(
    field: string,
    minLength: number,
    maxLength: number
  ): Filter {
    return this.createFilter('Text Length Filter', field, 'exists', true, {
      validation: {
        required: true,
        dataType: 'string',
        minLength,
        maxLength,
      },
    })
  }

  public createArraySizeFilter(
    field: string,
    minSize: number,
    maxSize?: number
  ): FilterGroup {
    const filters: Filter[] = [
      this.createFilter(
        'Array Min Size',
        field,
        'array_length_greater_than',
        minSize - 1
      ),
    ]

    if (maxSize !== undefined) {
      filters.push(
        this.createFilter(
          'Array Max Size',
          field,
          'array_length_less_than',
          maxSize + 1
        )
      )
    }

    return this.createFilterGroup('Array Size Filter', 'and', filters)
  }
}
