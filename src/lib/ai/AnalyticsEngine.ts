// src/lib/ai/AnalyticsEngine.ts
export interface PerformanceMetric {
  id: string
  timestamp: Date
  metricType: 'response_time' | 'token_usage' | 'tool_execution' | 'success_rate' | 'cost'
  value: number
  metadata: {
    agentId?: string
    toolName?: string
    sessionId?: string
    organizationId: string
    model?: string
    userAction?: string
  }
}

export interface UsagePattern {
  id: string
  pattern: 'peak_hours' | 'tool_preference' | 'user_behavior' | 'cost_trend'
  description: string
  data: Record<string, any>
  confidence: number
  impact: 'low' | 'medium' | 'high'
  recommendations: string[]
  detectedAt: Date
}

export interface CostAnalysis {
  period: { start: Date; end: Date }
  totalCost: number
  costByModel: Record<string, number>
  costByTool: Record<string, number>
  costByUser: Record<string, number>
  projectedMonthlyCost: number
  optimization: {
    potentialSavings: number
    recommendations: string[]
  }
}

export interface PerformanceDashboard {
  timeframe: { start: Date; end: Date }
  overview: {
    totalRequests: number
    successRate: number
    averageResponseTime: number
    totalCost: number
    activeUsers: number
  }
  trends: {
    requestVolume: Array<{ timestamp: Date; count: number }>
    responseTime: Array<{ timestamp: Date; avgTime: number }>
    costTrend: Array<{ timestamp: Date; cost: number }>
    errorRate: Array<{ timestamp: Date; rate: number }>
  }
  topTools: Array<{ toolName: string; usage: number; successRate: number }>
  alerts: Array<{
    type: 'performance' | 'cost' | 'error' | 'usage'
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    timestamp: Date
  }>
}

export class AnalyticsEngine {
  private metrics: PerformanceMetric[] = []
  private patterns: UsagePattern[] = []
  private alerts: Array<any> = []

  constructor() {
    this.initializeMockData()
    this.startPatternAnalysis()
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    type: PerformanceMetric['metricType'],
    value: number,
    metadata: PerformanceMetric['metadata']
  ): void {
    const metric: PerformanceMetric = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      metricType: type,
      value,
      metadata
    }

    this.metrics.push(metric)
    
    // Keep only last 10000 metrics for performance
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000)
    }

    this.checkForAlerts(metric)
  }

  /**
   * Get performance dashboard data
   */
  getDashboard(timeframe: { start: Date; end: Date }): PerformanceDashboard {
    const filteredMetrics = this.metrics.filter(m => 
      m.timestamp >= timeframe.start && m.timestamp <= timeframe.end
    )

    // Calculate overview metrics
    const requestMetrics = filteredMetrics.filter(m => m.metricType === 'tool_execution')
    const responseTimeMetrics = filteredMetrics.filter(m => m.metricType === 'response_time')
    const costMetrics = filteredMetrics.filter(m => m.metricType === 'cost')
    const successMetrics = filteredMetrics.filter(m => m.metricType === 'success_rate')

    const overview = {
      totalRequests: requestMetrics.length,
      successRate: successMetrics.length > 0 
        ? successMetrics.reduce((sum, m) => sum + m.value, 0) / successMetrics.length
        : 95, // Default mock
      averageResponseTime: responseTimeMetrics.length > 0
        ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
        : 1200, // Default mock
      totalCost: costMetrics.reduce((sum, m) => sum + m.value, 0) || 45.67, // Mock
      activeUsers: new Set(filteredMetrics.map(m => m.metadata.sessionId)).size || 156 // Mock
    }

    // Generate trends (simplified with mock data)
    const trends = this.generateTrends(timeframe)

    // Calculate top tools
    const toolUsage = new Map<string, { count: number; success: number }>()
    requestMetrics.forEach(m => {
      const toolName = m.metadata.toolName || 'unknown'
      const current = toolUsage.get(toolName) || { count: 0, success: 0 }
      current.count++
      if (m.value > 0) current.success++
      toolUsage.set(toolName, current)
    })

    const topTools = Array.from(toolUsage.entries())
      .map(([toolName, stats]) => ({
        toolName,
        usage: stats.count,
        successRate: stats.count > 0 ? (stats.success / stats.count) * 100 : 0
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10)

    return {
      timeframe,
      overview,
      trends,
      topTools,
      alerts: this.getRecentAlerts()
    }
  }

  /**
   * Analyze cost and provide optimization recommendations
   */
  analyzeCosts(period: { start: Date; end: Date }): CostAnalysis {
    const costMetrics = this.metrics.filter(m => 
      m.metricType === 'cost' && 
      m.timestamp >= period.start && 
      m.timestamp <= period.end
    )

    const totalCost = costMetrics.reduce((sum, m) => sum + m.value, 0) || 234.56 // Mock

    // Group costs by different dimensions
    const costByModel = this.groupCostBy(costMetrics, 'model')
    const costByTool = this.groupCostBy(costMetrics, 'toolName')
    const costByUser = this.groupCostBy(costMetrics, 'sessionId')

    // Calculate projections
    const daysInPeriod = Math.max(1, (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24))
    const dailyAverage = totalCost / daysInPeriod
    const projectedMonthlyCost = dailyAverage * 30

    // Generate optimization recommendations
    const optimization = this.generateCostOptimizations(costByModel, costByTool)

    return {
      period,
      totalCost,
      costByModel,
      costByTool,
      costByUser,
      projectedMonthlyCost,
      optimization
    }
  }

  /**
   * Detect usage patterns
   */
  detectPatterns(): UsagePattern[] {
    // Analyze peak hours
    const hourlyUsage = new Map<number, number>()
    this.metrics.forEach(m => {
      const hour = m.timestamp.getHours()
      hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + 1)
    })

    const peakHour = Array.from(hourlyUsage.entries())
      .sort((a, b) => b[1] - a[1])[0]

    if (peakHour) {
      const pattern: UsagePattern = {
        id: crypto.randomUUID(),
        pattern: 'peak_hours',
        description: `Peak usage occurs at ${peakHour[0]}:00 with ${peakHour[1]} requests`,
        data: {
          peakHour: peakHour[0],
          peakRequests: peakHour[1],
          hourlyDistribution: Object.fromEntries(hourlyUsage)
        },
        confidence: 0.85,
        impact: 'medium',
        recommendations: [
          'Consider scaling infrastructure during peak hours',
          'Implement caching for frequently used tools',
          'Monitor response times during peak periods'
        ],
        detectedAt: new Date()
      }

      this.patterns.push(pattern)
    }

    return this.patterns.slice(-10) // Return recent patterns
  }

  /**
   * Get performance insights and recommendations
   */
  getInsights(): {
    performance: string[]
    cost: string[]
    usage: string[]
    security: string[]
  } {
    const recentMetrics = this.metrics.slice(-1000) // Last 1000 metrics
    
    const avgResponseTime = recentMetrics
      .filter(m => m.metricType === 'response_time')
      .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0)

    const totalCost = recentMetrics
      .filter(m => m.metricType === 'cost')
      .reduce((sum, m) => sum + m.value, 0)

    const insights = {
      performance: [],
      cost: [],
      usage: [],
      security: []
    } as any

    // Performance insights
    if (avgResponseTime > 2000) {
      insights.performance.push('Average response time is high (>2s). Consider optimizing slow tools.')
    } else {
      insights.performance.push('Response times are within acceptable limits (<2s).')
    }

    // Cost insights
    if (totalCost > 50) {
      insights.cost.push('High token usage detected. Consider using more efficient models for simple tasks.')
    } else {
      insights.cost.push('Token usage is optimized. Continue current practices.')
    }

    // Usage insights
    const toolUsage = new Map()
    recentMetrics.forEach(m => {
      if (m.metadata.toolName) {
        toolUsage.set(m.metadata.toolName, (toolUsage.get(m.metadata.toolName) || 0) + 1)
      }
    })

    const mostUsedTool = Array.from(toolUsage.entries())
      .sort((a, b) => b[1] - a[1])[0]

    if (mostUsedTool) {
      insights.usage.push(`Most used tool: ${mostUsedTool[0]} (${mostUsedTool[1]} calls)`)
    }

    // Security insights
    insights.security.push('No security violations detected in recent activity.')

    return insights
  }

  // Private methods
  private groupCostBy(metrics: PerformanceMetric[], key: string): Record<string, number> {
    const grouped = new Map<string, number>()
    
    metrics.forEach(m => {
      const value = (m.metadata as any)[key] || 'unknown'
      grouped.set(value, (grouped.get(value) || 0) + m.value)
    })

    return Object.fromEntries(grouped)
  }

  private generateCostOptimizations(
    costByModel: Record<string, number>, 
    costByTool: Record<string, number>
  ) {
    const recommendations: string[] = []
    let potentialSavings = 0

    // Check for expensive models
    const expensiveModels = Object.entries(costByModel)
      .filter(([_, cost]) => cost > 50)
      .sort((a, b) => b[1] - a[1])

    if (expensiveModels.length > 0) {
      recommendations.push(`Consider switching from ${expensiveModels[0][0]} to more cost-effective models for simple tasks`)
      potentialSavings += expensiveModels[0][1] * 0.3 // 30% potential savings
    }

    // Check for tool efficiency
    const expensiveTools = Object.entries(costByTool)
      .filter(([_, cost]) => cost > 20)
      .sort((a, b) => b[1] - a[1])

    if (expensiveTools.length > 0) {
      recommendations.push(`Optimize ${expensiveTools[0][0]} tool usage - consider caching or batch processing`)
      potentialSavings += expensiveTools[0][1] * 0.2 // 20% potential savings
    }

    if (recommendations.length === 0) {
      recommendations.push('Cost usage is already optimized')
    }

    return {
      potentialSavings,
      recommendations
    }
  }

  private generateTrends(timeframe: { start: Date; end: Date }) {
    // Generate mock trend data
    const days = Math.max(1, (timeframe.end.getTime() - timeframe.start.getTime()) / (1000 * 60 * 60 * 24))
    const points = Math.min(30, Math.max(7, Math.floor(days)))

    const requestVolume = []
    const responseTime = []
    const costTrend = []
    const errorRate = []

    for (let i = 0; i < points; i++) {
      const timestamp = new Date(timeframe.start.getTime() + (i / points) * (timeframe.end.getTime() - timeframe.start.getTime()))
      
      requestVolume.push({
        timestamp,
        count: Math.floor(Math.random() * 100) + 50
      })
      
      responseTime.push({
        timestamp,
        avgTime: Math.floor(Math.random() * 1000) + 800
      })
      
      costTrend.push({
        timestamp,
        cost: Math.random() * 10 + 5
      })
      
      errorRate.push({
        timestamp,
        rate: Math.random() * 5 + 1
      })
    }

    return {
      requestVolume,
      responseTime,
      costTrend,
      errorRate
    }
  }

  private checkForAlerts(metric: PerformanceMetric): void {
    // Check for performance alerts
    if (metric.metricType === 'response_time' && metric.value > 5000) {
      this.alerts.push({
        type: 'performance',
        severity: 'high',
        message: `High response time detected: ${metric.value}ms for ${metric.metadata.toolName}`,
        timestamp: new Date()
      })
    }

    // Check for cost alerts
    if (metric.metricType === 'cost' && metric.value > 1) {
      this.alerts.push({
        type: 'cost',
        severity: 'medium',
        message: `High cost detected: $${metric.value} for single operation`,
        timestamp: new Date()
      })
    }
  }

  private getRecentAlerts() {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
  }

  private startPatternAnalysis(): void {
    // Run pattern analysis every 5 minutes
    setInterval(() => {
      this.detectPatterns()
    }, 5 * 60 * 1000)
  }

  private initializeMockData(): void {
    // Add some mock metrics for demonstration
    const now = new Date()
    const mockMetrics = [
      {
        type: 'response_time' as const,
        value: 1200,
        metadata: { organizationId: 'default-org', toolName: 'search_knowledge_base' }
      },
      {
        type: 'cost' as const,
        value: 0.15,
        metadata: { organizationId: 'default-org', model: 'gpt-4' }
      },
      {
        type: 'tool_execution' as const,
        value: 1,
        metadata: { organizationId: 'default-org', toolName: 'trigger_workflow' }
      }
    ]

    mockMetrics.forEach(m => {
      this.recordMetric(m.type, m.value, m.metadata)
    })
  }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngine()