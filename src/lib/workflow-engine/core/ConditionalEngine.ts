export interface Condition {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'in' | 'and' | 'or'
  value: any
  conditions?: Condition[] // For nested conditions
}

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

export class ConditionalEngine {
  async evaluateCondition(
    conditionConfig: any, 
    context: WorkflowExecutionContext
  ): Promise<{ condition: boolean; result: any }> {
    const condition = conditionConfig.condition || conditionConfig
    const result = this.evaluateConditionRecursive(condition, context)
    
    return {
      condition: result,
      result: {
        conditionId: conditionConfig.id,
        evaluated: result,
        context: context.variables
      }
    }
  }

  private evaluateConditionRecursive(condition: Condition, context: WorkflowExecutionContext): boolean {
    const { field, operator, value, conditions } = condition

    switch (operator) {
      case 'and':
        return conditions?.every(c => this.evaluateConditionRecursive(c, context)) ?? false
        
      case 'or':
        return conditions?.some(c => this.evaluateConditionRecursive(c, context)) ?? false
        
      default:
        return this.evaluateSimpleCondition(field, operator, value, context)
    }
  }

  private evaluateSimpleCondition(
    field: string,
    operator: string,
    value: any,
    context: WorkflowExecutionContext
  ): boolean {
    const fieldValue = this.getFieldValue(field, context)
    const resolvedValue = this.resolveValue(value, context)

    switch (operator) {
      case 'equals':
        return fieldValue === resolvedValue
        
      case 'not_equals':
        return fieldValue !== resolvedValue
        
      case 'contains':
        return String(fieldValue || '').includes(String(resolvedValue))
        
      case 'greater_than':
        return Number(fieldValue) > Number(resolvedValue)
        
      case 'less_than':
        return Number(fieldValue) < Number(resolvedValue)
        
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
        
      case 'in':
        return Array.isArray(resolvedValue) && resolvedValue.includes(fieldValue)
        
      default:
        throw new Error(`Unknown condition operator: ${operator}`)
    }
  }

  private getFieldValue(field: string, context: WorkflowExecutionContext): any {
    // Handle nested field access like "user.email" or "step_1.result.id"
    const keys = field.split('.')
    let value = context.variables
    
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

  // Helper method to create complex conditions
  createAndCondition(conditions: Condition[]): Condition {
    return {
      id: `and_${Date.now()}`,
      field: '',
      operator: 'and',
      value: null,
      conditions
    }
  }

  createOrCondition(conditions: Condition[]): Condition {
    return {
      id: `or_${Date.now()}`,
      field: '',
      operator: 'or', 
      value: null,
      conditions
    }
  }

  // Helper method to create simple conditions
  createSimpleCondition(
    field: string, 
    operator: Condition['operator'], 
    value: any, 
    id?: string
  ): Condition {
    return {
      id: id || `condition_${Date.now()}`,
      field,
      operator,
      value
    }
  }
}