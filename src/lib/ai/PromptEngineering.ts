// Day 13: Prompt Engineering Framework & AI Configuration Interface
// src/lib/ai/PromptEngineering.ts

import { AI_MODELS } from "./AIAgentManager"

export interface PromptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  description: string
  defaultValue?: any
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    enum?: string[]
    min?: number
    max?: number
  }
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  version: string
  template: string
  variables: PromptVariable[]
  examples: {
    input: Record<string, any>
    expectedOutput: string
    description: string
  }[]
  metadata: {
    createdBy: string
    createdAt: string
    updatedAt: string
    usageCount: number
    averageRating: number
  }
}

class PromptEngineeringEngine {
  private templates: Map<string, PromptTemplate> = new Map()
  private variableResolvers: Map<string, (value: any, context: any) => any> = new Map()

  constructor() {
    this.initializeDefaultResolvers()
  }

  private initializeDefaultResolvers() {
    // Date/time resolvers
    this.variableResolvers.set('current_date', () => new Date().toLocaleDateString())
    this.variableResolvers.set('current_time', () => new Date().toLocaleTimeString())
    this.variableResolvers.set('current_datetime', () => new Date().toLocaleString())
    
    // Context resolvers
    this.variableResolvers.set('user_name', (_, context) => context.user?.name || 'User')
    this.variableResolvers.set('organization_name', (_, context) => context.organization?.name || 'Organization')
    
    // Data formatters
    this.variableResolvers.set('format_currency', (value) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
    )
    this.variableResolvers.set('format_number', (value) => 
      new Intl.NumberFormat().format(value)
    )
    this.variableResolvers.set('format_json', (value) => 
      JSON.stringify(value, null, 2)
    )
  }

  // Template Management
  registerTemplate(template: PromptTemplate): void {
    this.validateTemplate(template)
    this.templates.set(template.id, template)
  }

  getTemplate(id: string): PromptTemplate | null {
    return this.templates.get(id) || null
  }

  listTemplates(filters?: {
    category?: string
    tags?: string[]
    search?: string
  }): PromptTemplate[] {
    let templates = Array.from(this.templates.values())

    if (filters?.category) {
      templates = templates.filter(t => t.category === filters.category)
    }

    if (filters?.tags?.length) {
      templates = templates.filter(t => 
        filters.tags!.some(tag => t.tags.includes(tag))
      )
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase()
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.template.toLowerCase().includes(search)
      )
    }

    return templates.sort((a, b) => b.metadata.usageCount - a.metadata.usageCount)
  }

  // Prompt Generation
  generatePrompt(
    templateId: string,
    variables: Record<string, any>,
    context: any = {}
  ): string {
    const template = this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Validate required variables
    this.validateVariables(template, variables)

    // Resolve variables
    const resolvedVariables = this.resolveVariables(template, variables, context)

    // Generate prompt
    let prompt = template.template

    // Replace variables using different bracket styles
    prompt = this.replaceVariables(prompt, resolvedVariables)

    // Post-process prompt
    prompt = this.postProcessPrompt(prompt)

    // Update usage statistics
    this.updateUsageStats(templateId)

    return prompt
  }

  private validateTemplate(template: PromptTemplate): void {
    if (!template.id || !template.name || !template.template) {
      throw new Error('Template must have id, name, and template content')
    }

    if (!template.variables || !Array.isArray(template.variables)) {
      throw new Error('Template must have variables array')
    }

    // Check for undefined variables in template
    const variableNames = template.variables.map(v => v.name)
    const templateVariables = this.extractTemplateVariables(template.template)
    
    const undefinedVars = templateVariables.filter(v => !variableNames.includes(v))
    if (undefinedVars.length > 0) {
      throw new Error(`Template contains undefined variables: ${undefinedVars.join(', ')}`)
    }
  }

  private validateVariables(template: PromptTemplate, variables: Record<string, any>): void {
    const errors: string[] = []

    for (const varDef of template.variables) {
      const value = variables[varDef.name]

      // Check required variables
      if (varDef.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required variable '${varDef.name}' is missing`)
        continue
      }

      // Skip validation if optional and not provided
      if (!varDef.required && (value === undefined || value === null)) {
        continue
      }

      // Type validation
      if (!this.validateVariableType(value, varDef.type)) {
        errors.push(`Variable '${varDef.name}' must be of type ${varDef.type}`)
      }

      // Additional validation rules
      if (varDef.validation) {
        const validationErrors = this.validateVariableRules(value, varDef.validation, varDef.name)
        errors.push(...validationErrors)
      }
    }

    if (errors.length > 0) {
      throw new Error(`Variable validation failed:\n${errors.join('\n')}`)
    }
  }

  private validateVariableType(value: any, type: string): boolean {
    switch (type) {
      case 'string': return typeof value === 'string'
      case 'number': return typeof value === 'number' && !isNaN(value)
      case 'boolean': return typeof value === 'boolean'
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value)
      case 'array': return Array.isArray(value)
      default: return true
    }
  }

  private validateVariableRules(value: any, rules: any, varName: string): string[] {
    const errors: string[] = []

    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      errors.push(`Variable '${varName}' must be at least ${rules.minLength} characters`)
    }

    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      errors.push(`Variable '${varName}' must be no more than ${rules.maxLength} characters`)
    }

    if (rules.pattern && typeof value === 'string' && !new RegExp(rules.pattern).test(value)) {
      errors.push(`Variable '${varName}' does not match required pattern`)
    }

    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`Variable '${varName}' must be one of: ${rules.enum.join(', ')}`)
    }

    if (rules.min && typeof value === 'number' && value < rules.min) {
      errors.push(`Variable '${varName}' must be at least ${rules.min}`)
    }

    if (rules.max && typeof value === 'number' && value > rules.max) {
      errors.push(`Variable '${varName}' must be no more than ${rules.max}`)
    }

    return errors
  }

  private resolveVariables(
    template: PromptTemplate,
    variables: Record<string, any>,
    context: any
  ): Record<string, any> {
    const resolved: Record<string, any> = {}

    for (const varDef of template.variables) {
      let value = variables[varDef.name]

      // Use default value if not provided
      if (value === undefined && varDef.defaultValue !== undefined) {
        value = varDef.defaultValue
      }

      // Apply custom resolvers
      if (this.variableResolvers.has(varDef.name)) {
        const resolver = this.variableResolvers.get(varDef.name)!
        value = resolver(value, context)
      }

      // Format based on type
      resolved[varDef.name] = this.formatVariable(value, varDef.type)
    }

    return resolved
  }

  private formatVariable(value: any, type: string): string {
    if (value === null || value === undefined) return ''

    switch (type) {
      case 'string':
        return String(value)
      case 'number':
        return String(value)
      case 'boolean':
        return value ? 'true' : 'false'
      case 'object':
        return JSON.stringify(value, null, 2)
      case 'array':
        if (Array.isArray(value)) {
          return value.map(item => 
            typeof item === 'object' ? JSON.stringify(item) : String(item)
          ).join('\n- ')
        }
        return String(value)
      default:
        return String(value)
    }
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    // Support multiple variable syntax styles
    let result = template

    // {{variable}} style
    result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? variables[varName] : match
    })

    // {variable} style
    result = result.replace(/\{(\w+)\}/g, (match, varName) => {
      return variables[varName] !== undefined ? variables[varName] : match
    })

    // $variable style
    result = result.replace(/\$(\w+)/g, (match, varName) => {
      return variables[varName] !== undefined ? variables[varName] : match
    })

    return result
  }

  private extractTemplateVariables(template: string): string[] {
    const variables = new Set<string>()

    // Extract {{variable}} style
    const doubleVars = template.match(/\{\{(\w+)\}\}/g)
    if (doubleVars) {
      doubleVars.forEach(match => {
        const varName = match.replace(/\{\{|\}\}/g, '')
        variables.add(varName)
      })
    }

    // Extract {variable} style
    const singleVars = template.match(/\{(\w+)\}/g)
    if (singleVars) {
      singleVars.forEach(match => {
        const varName = match.replace(/\{|\}/g, '')
        variables.add(varName)
      })
    }

    // Extract $variable style
    const dollarVars = template.match(/\$(\w+)/g)
    if (dollarVars) {
      dollarVars.forEach(match => {
        const varName = match.replace('$', '')
        variables.add(varName)
      })
    }

    return Array.from(variables)
  }

  private postProcessPrompt(prompt: string): string {
    // Remove extra whitespace
    prompt = prompt.replace(/\n\s*\n\s*\n/g, '\n\n')
    
    // Trim leading/trailing whitespace
    prompt = prompt.trim()
    
    // Ensure proper spacing around sections
    prompt = prompt.replace(/([.!?])\s*\n([A-Z])/g, '$1\n\n$2')
    
    return prompt
  }

  private updateUsageStats(templateId: string): void {
    const template = this.templates.get(templateId)
    if (template) {
      template.metadata.usageCount++
      template.metadata.updatedAt = new Date().toISOString()
    }
  }

  // Advanced Prompt Engineering Features
  generateVariations(
    templateId: string,
    variables: Record<string, any>,
    count: number = 3
  ): string[] {
    const template = this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    const variations: string[] = []
    const basePrompt = this.generatePrompt(templateId, variables)

    // Generate variations by modifying prompt structure
    variations.push(basePrompt) // Original

    // Variation 1: Add emphasis
    variations.push(this.addEmphasis(basePrompt))

    // Variation 2: Restructure for clarity
    variations.push(this.restructureForClarity(basePrompt))

    // Variation 3: Add examples
    if (template.examples.length > 0) {
      variations.push(this.addExamples(basePrompt, template.examples[0]))
    }

    return variations.slice(0, count)
  }

  private addEmphasis(prompt: string): string {
    return `IMPORTANT: ${prompt}\n\nPlease pay special attention to the requirements above and provide a detailed, accurate response.`
  }

  private restructureForClarity(prompt: string): string {
    const sections = prompt.split('\n\n')
    return sections.map((section, index) => 
      `${index + 1}. ${section}`
    ).join('\n\n')
  }

  private addExamples(prompt: string, example: any): string {
    return `${prompt}\n\nExample:\nInput: ${JSON.stringify(example.input, null, 2)}\nExpected Output: ${example.expectedOutput}`
  }

  // Prompt optimization
  optimizePrompt(prompt: string, goals: {
    clarity?: boolean
    brevity?: boolean
    specificity?: boolean
    examples?: boolean
  }): string {
    let optimized = prompt

    if (goals.clarity) {
      optimized = this.improveClarity(optimized)
    }

    if (goals.brevity) {
      optimized = this.improveBrevity(optimized)
    }

    if (goals.specificity) {
      optimized = this.improveSpecificity(optimized)
    }

    return optimized
  }

  private improveClarity(prompt: string): string {
    // Add structure and clear instructions
    const sections = prompt.split('\n\n')
    return sections.map(section => {
      if (section.includes('?')) {
        return `QUESTION: ${section}`
      } else if (section.includes(':')) {
        return `INSTRUCTION: ${section}`
      }
      return section
    }).join('\n\n')
  }

  private improveBrevity(prompt: string): string {
    // Remove redundant words and phrases
    return prompt
      .replace(/\b(please|kindly|if you would|if possible)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()
  }

  private improveSpecificity(prompt: string): string {
    // Add specific formatting requirements
    return `${prompt}\n\nFORMAT REQUIREMENTS:\n- Provide specific, actionable responses\n- Use bullet points for lists\n- Include concrete examples where relevant\n- Be precise with numbers and measurements`
  }

  // Template testing and validation
  testTemplate(
    templateId: string,
    testCases: { variables: Record<string, any>; expectedPatterns: string[] }[]
  ): { passed: number; failed: number; results: any[] } {
    const template = this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    const results = []
    let passed = 0
    let failed = 0

    for (const testCase of testCases) {
      try {
        const prompt = this.generatePrompt(templateId, testCase.variables)
        const testResult = {
          variables: testCase.variables,
          prompt,
          passed: testCase.expectedPatterns.every(pattern => 
            new RegExp(pattern, 'i').test(prompt)
          ),
          patterns: testCase.expectedPatterns.map(pattern => ({
            pattern,
            found: new RegExp(pattern, 'i').test(prompt)
          }))
        }

        if (testResult.passed) {
          passed++
        } else {
          failed++
        }

        results.push(testResult)
      } catch (error) {
        failed++
        results.push({
          variables: testCase.variables,
          error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error),
          passed: false
        })
      }
    }

    return { passed, failed, results }
  }
}

// AI Response Validation and Safety
class AIResponseValidator {
  private safetyRules: SafetyRule[] = []
  private contentFilters: ContentFilter[] = []

  constructor() {
    this.initializeDefaultRules()
  }

  private initializeDefaultRules() {
    // Content safety rules
    this.safetyRules.push({
      id: 'no-harmful-content',
      name: 'No Harmful Content',
      description: 'Reject responses containing harmful or offensive content',
      validator: (response: string) => {
        const harmfulPatterns = [
          /\b(kill|murder|suicide|self-harm)\b/i,
          /\b(hack|exploit|illegal)\b/i,
          /\b(discriminat|racist|sexist)\b/i
        ]
        return !harmfulPatterns.some(pattern => pattern.test(response))
      },
      severity: 'critical'
    })

    // Quality rules
    this.safetyRules.push({
      id: 'minimum-length',
      name: 'Minimum Response Length',
      description: 'Response must be at least 10 characters',
      validator: (response: string) => response.trim().length >= 10,
      severity: 'warning'
    })

    this.safetyRules.push({
      id: 'no-personal-info',
      name: 'No Personal Information',
      description: 'Response should not contain personal information',
      validator: (response: string) => {
        const personalInfoPatterns = [
          /\b\d{3}-\d{2}-\d{4}\b/, // SSN
          /\b\d{16}\b/, // Credit card
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email
        ]
        return !personalInfoPatterns.some(pattern => pattern.test(response))
      },
      severity: 'high'
    })
  }

  validateResponse(response: string, context: any = {}): ValidationResult {
    const violations: SafetyViolation[] = []
    const warnings: SafetyViolation[] = []

    for (const rule of this.safetyRules) {
      try {
        const isValid = rule.validator(response, context)
        if (!isValid) {
          const violation: SafetyViolation = {
            ruleId: rule.id,
            ruleName: rule.name,
            description: rule.description,
            severity: rule.severity,
            detectedAt: new Date().toISOString()
          }

          if (rule.severity === 'critical' || rule.severity === 'high') {
            violations.push(violation)
          } else {
            warnings.push(violation)
          }
        }
      } catch (error) {
        warnings.push({
          ruleId: rule.id,
          ruleName: rule.name,
          description: `Rule validation failed: ${typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)}`,
          severity: 'warning',
          detectedAt: new Date().toISOString()
        })
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      score: this.calculateSafetyScore(violations, warnings),
      response: violations.length === 0 ? response : this.sanitizeResponse(response, violations)
    }
  }

  private calculateSafetyScore(violations: SafetyViolation[], warnings: SafetyViolation[]): number {
    let score = 100
    
    violations.forEach(v => {
      switch (v.severity) {
        case 'critical': score -= 50; break
        case 'high': score -= 25; break
        case 'medium': score -= 10; break
        case 'low': score -= 5; break
      }
    })

    warnings.forEach(w => {
      score -= 2
    })

    return Math.max(0, score)
  }

  private sanitizeResponse(response: string, violations: SafetyViolation[]): string {
    let sanitized = response

    // Apply basic sanitization based on violations
    for (const violation of violations) {
      if (violation.ruleId === 'no-personal-info') {
        sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]')
        sanitized = sanitized.replace(/\b\d{16}\b/g, '[REDACTED-CARD]')
        sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED-EMAIL]')
      }
    }

    return sanitized
  }

  addSafetyRule(rule: SafetyRule): void {
    this.safetyRules.push(rule)
  }

  removeSafetyRule(ruleId: string): void {
    this.safetyRules = this.safetyRules.filter(rule => rule.id !== ruleId)
  }
}

// Type definitions
interface SafetyRule {
  id: string
  name: string
  description: string
  validator: (response: string, context?: any) => boolean
  severity: 'critical' | 'high' | 'medium' | 'low' | 'warning'
}

interface SafetyViolation {
  ruleId: string
  ruleName: string
  description: string
  severity: string
  detectedAt: string
}

interface ValidationResult {
  isValid: boolean
  violations: SafetyViolation[]
  warnings: SafetyViolation[]
  score: number
  response: string
}

interface ContentFilter {
  id: string
  name: string
  pattern: RegExp
  replacement: string
  enabled: boolean
}

// Cost optimization utilities
class AICostOptimizer {
  private readonly costThresholds = {
    low: 0.01,    // $0.01
    medium: 0.10, // $0.10
    high: 1.00    // $1.00
  }

  estimateRequestCost(
    modelId: string,
    inputText: string,
    expectedOutputTokens: number = 500
  ): CostEstimate {
    const model = AI_MODELS[modelId]
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    const inputTokens = this.estimateTokens(inputText)
    const inputCost = (inputTokens / 1000) * model.inputCostPer1K
    const outputCost = (expectedOutputTokens / 1000) * model.outputCostPer1K
    const totalCost = inputCost + outputCost

    return {
      modelId,
      inputTokens,
      outputTokens: expectedOutputTokens,
      inputCost,
      outputCost,
      totalCost,
      costLevel: this.getCostLevel(totalCost),
      recommendations: this.getCostOptimizationRecommendations(modelId, totalCost)
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }

  private getCostLevel(cost: number): 'low' | 'medium' | 'high' | 'very-high' {
    if (cost <= this.costThresholds.low) return 'low'
    if (cost <= this.costThresholds.medium) return 'medium'
    if (cost <= this.costThresholds.high) return 'high'
    return 'very-high'
  }

  private getCostOptimizationRecommendations(modelId: string, cost: number): string[] {
    const recommendations: string[] = []

    if (cost > this.costThresholds.medium) {
      recommendations.push('Consider using a smaller model for this task')
      recommendations.push('Reduce the maximum token limit if possible')
      recommendations.push('Optimize your prompt to be more concise')
    }

    if (modelId.includes('gpt-4') && cost > this.costThresholds.low) {
      recommendations.push('Consider using GPT-3.5-turbo for cost savings')
    }

    if (cost > this.costThresholds.high) {
      recommendations.push('Implement response caching for similar requests')
      recommendations.push('Consider batch processing multiple requests')
    }

    return recommendations
  }

  suggestOptimalModel(requirements: {
    taskType: 'simple' | 'complex' | 'reasoning' | 'creative'
    maxCost?: number
    minQuality?: number
    capabilities?: string[]
  }): string[] {
    const suitableModels = Object.values(AI_MODELS).filter(model => {
      // Filter by capabilities
      if (requirements.capabilities) {
        const hasAllCapabilities = requirements.capabilities.every(cap =>
          model.capabilities.includes(cap)
        )
        if (!hasAllCapabilities) return false
      }

      // Filter by cost (using average cost)
      if (requirements.maxCost) {
        const avgCost = (model.inputCostPer1K + model.outputCostPer1K) / 2
        if (avgCost > requirements.maxCost) return false
      }

      return true
    })

    // Sort by cost-effectiveness for task type
    return suitableModels
      .sort((a, b) => {
        const aCost = a.inputCostPer1K + a.outputCostPer1K
        const bCost = b.inputCostPer1K + b.outputCostPer1K
        
        // For simple tasks, prioritize cost
        if (requirements.taskType === 'simple') {
          return aCost - bCost
        }
        
        // For complex tasks, balance cost and capabilities
        const aScore = a.capabilities.length / aCost
        const bScore = b.capabilities.length / bCost
        return bScore - aScore
      })
      .map(model => model.id)
  }
}

interface CostEstimate {
  modelId: string
  inputTokens: number
  outputTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  costLevel: string
  recommendations: string[]
}

// Export the main classes
export { PromptEngineeringEngine, AIResponseValidator, AICostOptimizer }