// src/lib/ai/AgentPerformanceManager.ts

export interface PerformanceMetrics {
  agentId: string
  sessionId: string
  timestamp: Date
  requestId: string
  
  // Response metrics
  responseTime: number
  tokenUsage: {
    input: number
    output: number
    total: number
  }
  
  // Cost metrics
  cost: {
    input: number
    output: number
    total: number
  }
  
  // Quality metrics
  responseQuality?: number // 0-1 score
  userSatisfaction?: number // 0-1 score
  taskCompletion: boolean
  
  // Technical metrics
  model: string
  temperature: number
  maxTokens: number
  retryCount: number
  cacheHit: boolean
  
  // Context metrics
  contextSize: number
  memoryUsed: number
  skillsUsed: string[]
  
  metadata: Record<string, any>
}

export interface CostBudget {
  organizationId: string
  period: 'daily' | 'weekly' | 'monthly'
  limit: number
  current: number
  alerts: {
    warning: number // Percentage threshold for warning
    critical: number // Percentage threshold for critical alert
  }
  restrictions?: {
    maxRequestsPerHour?: number
    maxTokensPerRequest?: number
    allowedModels?: string[]
  }
}

export interface AgentPerformanceSummary {
  agentId: string
  period: {
    start: Date
    end: Date
  }
  
  // Usage statistics
  totalRequests: number
  totalTokens: number
  totalCost: number
  averageResponseTime: number
  
  // Quality metrics
  averageQuality: number
  satisfactionScore: number
  completionRate: number
  
  // Performance trends
  trends: {
    responseTime: number[] // Daily averages
    tokenUsage: number[]
    cost: number[]
    quality: number[]
  }
  
  // Cost breakdown
  costByModel: Record<string, number>
  costByCategory: Record<string, number>
  
  // Top skills used
  topSkills: { skillId: string; usage: number; cost: number }[]
  
  // Issues and recommendations
  issues: PerformanceIssue[]
  recommendations: PerformanceRecommendation[]
}

export interface PerformanceIssue {
  type: 'high_cost' | 'slow_response' | 'low_quality' | 'frequent_retries' | 'budget_exceeded'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  occurrences: number
  firstSeen: Date
  lastSeen: Date
  affectedSessions: string[]
}

export interface PerformanceRecommendation {
  type: 'model_optimization' | 'prompt_optimization' | 'caching_improvement' | 'skill_optimization'
  priority: 'low' | 'medium' | 'high'
  description: string
  expectedImpact: {
    costReduction?: number // Percentage
    speedImprovement?: number // Percentage
    qualityImprovement?: number // Percentage
  }
  implementation: string
}

export class AgentPerformanceManager {
  private metricsStore: PerformanceMetrics[] = []
  private budgets: Map<string, CostBudget> = new Map()
  private alertHandlers: ((alert: any) => void)[] = []
  private optimizationRules: OptimizationRule[] = []

  constructor() {
    this.initializeOptimizationRules()
  }

  /**
   * Record performance metrics for an agent execution
   */
  async recordMetrics(metrics: PerformanceMetrics): Promise<void> {
    this.metricsStore.push(metrics)
    
    // Update budget tracking
    await this.updateBudgetUsage(metrics)
    
    // Check for performance issues
    await this.detectPerformanceIssues(metrics)
    
    // Apply real-time optimizations
    await this.applyOptimizations(metrics)
    
    console.log(`📊 Recorded metrics for agent: ${metrics.agentId}`)
  }

  /**
   * Get performance summary for an agent
   */
  async getAgentPerformanceSummary(
    agentId: string,
    period: { start: Date; end: Date }
  ): Promise<AgentPerformanceSummary> {
    const agentMetrics = this.metricsStore.filter(m => 
      m.agentId === agentId &&
      m.timestamp >= period.start &&
      m.timestamp <= period.end
    )

    if (agentMetrics.length === 0) {
      throw new Error(`No metrics found for agent ${agentId} in specified period`)
    }

    // Calculate basic statistics
    const totalRequests = agentMetrics.length
    const totalTokens = agentMetrics.reduce((sum, m) => sum + m.tokenUsage.total, 0)
    const totalCost = agentMetrics.reduce((sum, m) => sum + m.cost.total, 0)
    const averageResponseTime = agentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests

    // Quality metrics
    const qualityScores = agentMetrics.filter(m => m.responseQuality !== undefined).map(m => m.responseQuality!)
    const satisfactionScores = agentMetrics.filter(m => m.userSatisfaction !== undefined).map(m => m.userSatisfaction!)
    const completedTasks = agentMetrics.filter(m => m.taskCompletion).length

    // Generate trends (daily aggregations)
    const trends = this.generateTrends(agentMetrics, period)

    // Cost breakdown
    const costByModel = this.aggregateCostByModel(agentMetrics)
    const costByCategory = this.aggregateCostByCategory(agentMetrics)

    // Top skills
    const topSkills = this.getTopSkills(agentMetrics)

    // Issues and recommendations
    const issues = await this.detectIssues(agentMetrics)
    const recommendations = await this.generateRecommendations(agentMetrics, issues)

    return {
      agentId,
      period,
      totalRequests,
      totalTokens,
      totalCost,
      averageResponseTime,
      averageQuality: qualityScores.length > 0 ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length : 0,
      satisfactionScore: satisfactionScores.length > 0 ? satisfactionScores.reduce((sum, s) => sum + s, 0) / satisfactionScores.length : 0,
      completionRate: completedTasks / totalRequests,
      trends,
      costByModel,
      costByCategory,
      topSkills,
      issues,
      recommendations
    }
  }

  /**
   * Set cost budget for an organization
   */
  setCostBudget(budget: CostBudget): void {
    this.budgets.set(budget.organizationId, budget)
    console.log(`💰 Set budget for organization: ${budget.organizationId}`)
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(organizationId: string): CostBudget | null {
    return this.budgets.get(organizationId) || null
  }

  /**
   * Check if request can proceed within budget
   */
  async canProceedWithRequest(
    organizationId: string,
    estimatedCost: number,
    estimatedTokens: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const budget = this.budgets.get(organizationId)
    if (!budget) {
      return { allowed: true } // No budget set
    }

    // Check budget limit
    if (budget.current + estimatedCost > budget.limit) {
      return {
        allowed: false,
        reason: `Request would exceed budget limit. Current: $${budget.current.toFixed(2)}, Limit: $${budget.limit.toFixed(2)}`
      }
    }

    // Check restrictions
    if (budget.restrictions) {
      const restrictions = budget.restrictions
      
      if (restrictions.maxTokensPerRequest && estimatedTokens > restrictions.maxTokensPerRequest) {
        return {
          allowed: false,
          reason: `Token count exceeds per-request limit: ${estimatedTokens} > ${restrictions.maxTokensPerRequest}`
        }
      }

      // Check hourly rate limit
      if (restrictions.maxRequestsPerHour) {
        const hourlyCount = this.getHourlyRequestCount(organizationId)
        if (hourlyCount >= restrictions.maxRequestsPerHour) {
          return {
            allowed: false,
            reason: `Hourly request limit exceeded: ${hourlyCount} >= ${restrictions.maxRequestsPerHour}`
          }
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Optimize agent configuration based on performance data
   */
  async optimizeAgentConfiguration(agentId: string): Promise<{
    recommendedModel: string
    recommendedTemperature: number
    recommendedMaxTokens: number
    estimatedImprovements: {
      costReduction: number
      speedImprovement: number
      qualityChange: number
    }
  }> {
    const recentMetrics = this.metricsStore
      .filter(m => m.agentId === agentId)
      .slice(-100) // Last 100 requests

    if (recentMetrics.length < 10) {
      throw new Error('Insufficient data for optimization')
    }

    // Analyze current performance
    const currentPerf = this.analyzeCurrentPerformance(recentMetrics)
    
    // Find optimal configuration
    const optimizedConfig = await this.findOptimalConfiguration(recentMetrics, currentPerf)
    
    return optimizedConfig
  }

  /**
   * Add alert handler for budget and performance alerts
   */
  addAlertHandler(handler: (alert: any) => void): void {
    this.alertHandlers.push(handler)
  }

  /**
   * Run performance testing simulation
   */
  async runPerformanceTest(
    agentId: string,
    testScenarios: TestScenario[],
    concurrency: number = 5
  ): Promise<PerformanceTestResults> {
    console.log(`🧪 Running performance test for agent: ${agentId}`)
    
    const results: PerformanceTestResults = {
      agentId,
      startTime: new Date(),
      endTime: new Date(),
      scenarios: [],
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        totalCost: 0,
        averageCost: 0,
        throughput: 0
      }
    }

    for (const scenario of testScenarios) {
      console.log(`📋 Running scenario: ${scenario.name}`)
      const scenarioResult = await this.runTestScenario(agentId, scenario, concurrency)
      results.scenarios.push(scenarioResult)
    }

    results.endTime = new Date()
    results.summary = this.calculateTestSummary(results.scenarios)

    console.log(`✅ Performance test completed for agent: ${agentId}`)
    return results
  }

  // Private helper methods

  private async updateBudgetUsage(metrics: PerformanceMetrics): Promise<void> {
    // This would typically get organizationId from the metrics metadata
    const organizationId = metrics.metadata.organizationId
    if (!organizationId) return

    const budget = this.budgets.get(organizationId)
    if (!budget) return

    budget.current += metrics.cost.total

    // Check for budget alerts
    const usagePercentage = (budget.current / budget.limit) * 100

    if (usagePercentage >= budget.alerts.critical) {
      this.sendAlert({
        type: 'budget_critical',
        organizationId,
        usage: budget.current,
        limit: budget.limit,
        percentage: usagePercentage
      })
    } else if (usagePercentage >= budget.alerts.warning) {
      this.sendAlert({
        type: 'budget_warning',
        organizationId,
        usage: budget.current,
        limit: budget.limit,
        percentage: usagePercentage
      })
    }
  }

  private async detectPerformanceIssues(metrics: PerformanceMetrics): Promise<void> {
    // High response time
    if (metrics.responseTime > 10000) { // 10 seconds
      this.sendAlert({
        type: 'high_response_time',
        agentId: metrics.agentId,
        responseTime: metrics.responseTime,
        threshold: 10000
      })
    }

    // High cost per request
    if (metrics.cost.total > 1.0) { // $1 per request
      this.sendAlert({
        type: 'high_cost_per_request',
        agentId: metrics.agentId,
        cost: metrics.cost.total,
        threshold: 1.0
      })
    }

    // Low quality score
    if (metrics.responseQuality && metrics.responseQuality < 0.7) {
      this.sendAlert({
        type: 'low_quality_response',
        agentId: metrics.agentId,
        quality: metrics.responseQuality,
        threshold: 0.7
      })
    }
  }

  private async applyOptimizations(metrics: PerformanceMetrics): Promise<void> {
    for (const rule of this.optimizationRules) {
      if (rule.condition(metrics)) {
        await rule.action(metrics)
      }
    }
  }

  private generateTrends(metrics: PerformanceMetrics[], period: { start: Date; end: Date }): any {
    // Group metrics by day and calculate averages
    const dailyGroups = new Map<string, PerformanceMetrics[]>()
    
    metrics.forEach(metric => {
      const day = metric.timestamp.toISOString().split('T')[0]
      if (!dailyGroups.has(day)) {
        dailyGroups.set(day, [])
      }
      dailyGroups.get(day)!.push(metric)
    })

    const responseTime: number[] = []
    const tokenUsage: number[] = []
    const cost: number[] = []
    const quality: number[] = []

    Array.from(dailyGroups.values()).forEach(dayMetrics => {
      responseTime.push(dayMetrics.reduce((sum, m) => sum + m.responseTime, 0) / dayMetrics.length)
      tokenUsage.push(dayMetrics.reduce((sum, m) => sum + m.tokenUsage.total, 0) / dayMetrics.length)
      cost.push(dayMetrics.reduce((sum, m) => sum + m.cost.total, 0) / dayMetrics.length)
      
      const qualityScores = dayMetrics.filter(m => m.responseQuality !== undefined).map(m => m.responseQuality!)
      quality.push(qualityScores.length > 0 ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length : 0)
    })

    return { responseTime, tokenUsage, cost, quality }
  }

  private aggregateCostByModel(metrics: PerformanceMetrics[]): Record<string, number> {
    const costByModel: Record<string, number> = {}
    metrics.forEach(metric => {
      costByModel[metric.model] = (costByModel[metric.model] || 0) + metric.cost.total
    })
    return costByModel
  }

  private aggregateCostByCategory(metrics: PerformanceMetrics[]): Record<string, number> {
    const costByCategory: Record<string, number> = {}
    metrics.forEach(metric => {
      const category = metric.metadata.category || 'general'
      costByCategory[category] = (costByCategory[category] || 0) + metric.cost.total
    })
    return costByCategory
  }

  private getTopSkills(metrics: PerformanceMetrics[]): { skillId: string; usage: number; cost: number }[] {
    const skillUsage: Record<string, { usage: number; cost: number }> = {}
    
    metrics.forEach(metric => {
      metric.skillsUsed.forEach(skillId => {
        if (!skillUsage[skillId]) {
          skillUsage[skillId] = { usage: 0, cost: 0 }
        }
        skillUsage[skillId].usage++
        skillUsage[skillId].cost += metric.cost.total / metric.skillsUsed.length
      })
    })

    return Object.entries(skillUsage)
      .map(([skillId, data]) => ({ skillId, ...data }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10)
  }

  private async detectIssues(metrics: PerformanceMetrics[]): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = []

    // High cost detection
    const highCostMetrics = metrics.filter(m => m.cost.total > 0.5)
    if (highCostMetrics.length > metrics.length * 0.1) {
      issues.push({
        type: 'high_cost',
        severity: 'medium',
        description: `${highCostMetrics.length} requests exceeded $0.50 cost threshold`,
        occurrences: highCostMetrics.length,
        firstSeen: highCostMetrics[0].timestamp,
        lastSeen: highCostMetrics[highCostMetrics.length - 1].timestamp,
        affectedSessions: [...new Set(highCostMetrics.map(m => m.sessionId))]
      })
    }

    // Slow response detection
    const slowMetrics = metrics.filter(m => m.responseTime > 5000)
    if (slowMetrics.length > 0) {
      issues.push({
        type: 'slow_response',
        severity: slowMetrics.length > metrics.length * 0.05 ? 'high' : 'medium',
        description: `${slowMetrics.length} requests took longer than 5 seconds`,
        occurrences: slowMetrics.length,
        firstSeen: slowMetrics[0].timestamp,
        lastSeen: slowMetrics[slowMetrics.length - 1].timestamp,
        affectedSessions: [...new Set(slowMetrics.map(m => m.sessionId))]
      })
    }

    // Low quality detection
    const lowQualityMetrics = metrics.filter(m => m.responseQuality !== undefined && m.responseQuality < 0.6)
    if (lowQualityMetrics.length > 0) {
      issues.push({
        type: 'low_quality',
        severity: 'high',
        description: `${lowQualityMetrics.length} requests had quality scores below 0.6`,
        occurrences: lowQualityMetrics.length,
        firstSeen: lowQualityMetrics[0].timestamp,
        lastSeen: lowQualityMetrics[lowQualityMetrics.length - 1].timestamp,
        affectedSessions: [...new Set(lowQualityMetrics.map(m => m.sessionId))]
      })
    }

    return issues
  }

  private async generateRecommendations(
    metrics: PerformanceMetrics[],
    issues: PerformanceIssue[]
  ): Promise<PerformanceRecommendation[]> {
    const recommendations: PerformanceRecommendation[] = []

    // Model optimization recommendations
    const modelCosts = this.aggregateCostByModel(metrics)
    const mostExpensiveModel = Object.entries(modelCosts).sort((a, b) => b[1] - a[1])[0]
    
    if (mostExpensiveModel && mostExpensiveModel[1] > 10) {
      recommendations.push({
        type: 'model_optimization',
        priority: 'high',
        description: `Consider switching from ${mostExpensiveModel[0]} to a more cost-effective model for routine tasks`,
        expectedImpact: {
          costReduction: 30,
          speedImprovement: 15,
          qualityImprovement: -5
        },
        implementation: 'Update agent configuration to use GPT-3.5-turbo for simple tasks and GPT-4 only for complex reasoning'
      })
    }

    // Caching recommendations
    const duplicatePrompts = this.findDuplicatePrompts(metrics)
    if (duplicatePrompts > 10) {
      recommendations.push({
        type: 'caching_improvement',
        priority: 'medium',
        description: `Implement response caching for ${duplicatePrompts} duplicate requests`,
        expectedImpact: {
          costReduction: 25,
          speedImprovement: 80
        },
        implementation: 'Add Redis-based response caching with 1-hour TTL for identical prompts'
      })
    }

    // Prompt optimization
    const avgTokenUsage = metrics.reduce((sum, m) => sum + m.tokenUsage.total, 0) / metrics.length
    if (avgTokenUsage > 2000) {
      recommendations.push({
        type: 'prompt_optimization',
        priority: 'medium',
        description: 'Optimize prompts to reduce token usage',
        expectedImpact: {
          costReduction: 20,
          speedImprovement: 10
        },
        implementation: 'Review and shorten system prompts, use more concise examples'
      })
    }

    return recommendations
  }

  private findDuplicatePrompts(metrics: PerformanceMetrics[]): number {
    const promptCounts = new Map<string, number>()
    metrics.forEach(metric => {
      const prompt = metric.metadata.prompt || ''
      promptCounts.set(prompt, (promptCounts.get(prompt) || 0) + 1)
    })
    
    return Array.from(promptCounts.values()).filter(count => count > 1).reduce((sum, count) => sum + count - 1, 0)
  }

  private getHourlyRequestCount(organizationId: string): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    return this.metricsStore.filter(m => 
      m.metadata.organizationId === organizationId &&
      m.timestamp >= oneHourAgo
    ).length
  }

  private analyzeCurrentPerformance(metrics: PerformanceMetrics[]): any {
    return {
      avgResponseTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length,
      avgCost: metrics.reduce((sum, m) => sum + m.cost.total, 0) / metrics.length,
      avgQuality: metrics.filter(m => m.responseQuality !== undefined)
        .reduce((sum, m) => sum + m.responseQuality!, 0) / metrics.filter(m => m.responseQuality !== undefined).length,
      mostUsedModel: this.getMostUsedModel(metrics),
      avgTemperature: metrics.reduce((sum, m) => sum + m.temperature, 0) / metrics.length
    }
  }

  private getMostUsedModel(metrics: PerformanceMetrics[]): string {
    const modelCounts = new Map<string, number>()
    metrics.forEach(m => {
      modelCounts.set(m.model, (modelCounts.get(m.model) || 0) + 1)
    })
    
    return Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])[0][0]
  }

  private async findOptimalConfiguration(metrics: PerformanceMetrics[], currentPerf: any): Promise<any> {
    // Simplified optimization logic
    // In production, this would use more sophisticated ML techniques
    
    let recommendedModel = currentPerf.mostUsedModel
    let recommendedTemperature = currentPerf.avgTemperature
    let recommendedMaxTokens = 1000

    // Cost optimization
    if (currentPerf.avgCost > 0.1) {
      if (currentPerf.mostUsedModel.includes('gpt-4')) {
        recommendedModel = 'gpt-3.5-turbo'
      }
    }

    // Quality optimization
    if (currentPerf.avgQuality < 0.8) {
      if (currentPerf.mostUsedModel.includes('gpt-3.5')) {
        recommendedModel = 'gpt-4'
      }
      recommendedTemperature = Math.max(0.1, currentPerf.avgTemperature - 0.1)
    }

    // Speed optimization
    if (currentPerf.avgResponseTime > 5000) {
      recommendedMaxTokens = Math.max(500, recommendedMaxTokens - 200)
    }

    return {
      recommendedModel,
      recommendedTemperature,
      recommendedMaxTokens,
      estimatedImprovements: {
        costReduction: recommendedModel !== currentPerf.mostUsedModel ? 30 : 0,
        speedImprovement: recommendedMaxTokens < 1000 ? 15 : 0,
        qualityChange: recommendedModel.includes('gpt-4') && !currentPerf.mostUsedModel.includes('gpt-4') ? 10 : 0
      }
    }
  }

  private sendAlert(alert: any): void {
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert)
      } catch (error) {
        console.error('Alert handler error:', error)
      }
    })
  }

  private initializeOptimizationRules(): void {
    this.optimizationRules = [
      {
        name: 'Cache frequently used responses',
        condition: (metrics: PerformanceMetrics) => {
          // Check if this exact prompt was used recently
          const recentSimilar = this.metricsStore.filter(m => 
            m.metadata.prompt === metrics.metadata.prompt &&
            m.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
          )
          return recentSimilar.length > 2
        },
        action: async (metrics: PerformanceMetrics) => {
          console.log(`💾 Caching opportunity detected for prompt: ${metrics.metadata.prompt?.slice(0, 50)}...`)
          // Implementation would enable caching for this prompt pattern
        }
      },
      {
        name: 'Switch to faster model for simple tasks',
        condition: (metrics: PerformanceMetrics) => {
          return metrics.responseTime > 8000 && 
                 metrics.tokenUsage.total < 500 &&
                 metrics.model.includes('gpt-4')
        },
        action: async (metrics: PerformanceMetrics) => {
          console.log(`⚡ Recommending model switch for agent: ${metrics.agentId}`)
          // Implementation would suggest model change
        }
      }
    ]
  }

  private async runTestScenario(
    agentId: string,
    scenario: TestScenario,
    concurrency: number
  ): Promise<TestScenarioResult> {
    const results: TestScenarioResult = {
      name: scenario.name,
      description: scenario.description,
      requestCount: scenario.requestCount,
      concurrency,
      duration: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      costs: [],
      errors: []
    }

    const startTime = Date.now()
    const batches = Math.ceil(scenario.requestCount / concurrency)

    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(concurrency, scenario.requestCount - (batch * concurrency))
      const promises = Array.from({ length: batchSize }, () => this.executeTestRequest(agentId, scenario))
      
      const batchResults = await Promise.allSettled(promises)
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.successfulRequests++
          results.responseTimes.push(result.value.responseTime)
          results.costs.push(result.value.cost)
        } else {
          results.failedRequests++
          results.errors.push(result.reason.message)
        }
      })
    }

    results.duration = Date.now() - startTime
    return results
  }

  private async executeTestRequest(agentId: string, scenario: TestScenario): Promise<any> {
    const startTime = Date.now()
    
    try {
      // This would call your actual agent execution
      // For now, simulate the response
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500))
      
      const responseTime = Date.now() - startTime
      const cost = Math.random() * 0.1 + 0.01
      
      return { responseTime, cost }
    } catch (error) {
      throw error
    }
  }

  private calculateTestSummary(scenarios: TestScenarioResult[]): any {
    const totalRequests = scenarios.reduce((sum, s) => sum + s.requestCount, 0)
    const successfulRequests = scenarios.reduce((sum, s) => sum + s.successfulRequests, 0)
    const failedRequests = scenarios.reduce((sum, s) => sum + s.failedRequests, 0)
    const allResponseTimes = scenarios.flatMap(s => s.responseTimes)
    const allCosts = scenarios.flatMap(s => s.costs)
    const totalDuration = Math.max(...scenarios.map(s => s.duration))

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: allResponseTimes.reduce((sum, t) => sum + t, 0) / allResponseTimes.length,
      medianResponseTime: this.calculateMedian(allResponseTimes),
      p95ResponseTime: this.calculatePercentile(allResponseTimes, 95),
      totalCost: allCosts.reduce((sum, c) => sum + c, 0),
      averageCost: allCosts.reduce((sum, c) => sum + c, 0) / allCosts.length,
      throughput: (successfulRequests / totalDuration) * 1000 * 60 // requests per minute
    }
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = [...numbers].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[index]
  }
}

// Supporting interfaces and types

interface OptimizationRule {
  name: string
  condition: (metrics: PerformanceMetrics) => boolean
  action: (metrics: PerformanceMetrics) => Promise<void>
}

export interface TestScenario {
  name: string
  description: string
  requestCount: number
  prompts: string[]
  expectedResponseTime?: number
  expectedCost?: number
}

export interface TestScenarioResult {
  name: string
  description: string
  requestCount: number
  concurrency: number
  duration: number
  successfulRequests: number
  failedRequests: number
  responseTimes: number[]
  costs: number[]
  errors: string[]
}

export interface PerformanceTestResults {
  agentId: string
  startTime: Date
  endTime: Date
  scenarios: TestScenarioResult[]
  summary: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    medianResponseTime: number
    p95ResponseTime: number
    totalCost: number
    averageCost: number
    throughput: number
  }
}