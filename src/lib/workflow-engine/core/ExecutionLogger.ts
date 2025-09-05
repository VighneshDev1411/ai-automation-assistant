// src/lib/workflow-engine/core/ExecutionLogger.ts

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

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  message: string
  metadata?: any
  stepIndex?: number
  actionId?: string
}

export class ExecutionLogger {
  private supabase: SupabaseClient<any>  // ✅ FIXED: Use any instead of Database

  constructor(supabase: SupabaseClient<any>) {  // ✅ FIXED: Use any instead of Database
    this.supabase = supabase
  }

  async startExecution(context: WorkflowExecutionContext): Promise<void> {
    const { error } = await this.supabase
      .from('execution_logs')
      .insert({
        id: context.executionId,
        workflow_id: context.workflowId,
        organization_id: context.orgId,
        triggered_by: context.userId,
        status: 'running',
        trigger_data: context.triggerData,
        started_at: context.executionStartTime.toISOString(),
        parent_execution_id: context.parentExecutionId,
        execution_data: {
          variables: context.variables,
          currentStepIndex: context.currentStepIndex,
          startedAt: context.executionStartTime.toISOString()
        },
        logs: [{
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Workflow execution started',
          metadata: {
            workflowId: context.workflowId,
            triggerData: context.triggerData,
            userId: context.userId
          }
        }]
      } as any)  // ✅ FIXED: Type assertion

    if (error) {
      console.error('Failed to start execution logging:', error)
      throw new Error(`Failed to start execution logging: ${error.message}`)
    }
  }

  async completeExecution(executionId: string, finalResult?: any): Promise<void> {
    const completedAt = new Date()
    
    // Get execution to calculate duration
    const { data: execution } = await this.supabase
      .from('execution_logs')
      .select('started_at, logs')
      .eq('id', executionId)
      .single()

    let duration = null
    if (execution?.started_at) {
      duration = completedAt.getTime() - new Date(execution.started_at).getTime()
    }

    const currentLogs = execution?.logs || []
    const completionLog: LogEntry = {
      timestamp: completedAt.toISOString(),
      level: 'info',
      message: 'Workflow execution completed successfully',
      metadata: {
        finalResult,
        durationMs: duration,
        completedAt: completedAt.toISOString()
      }
    }

    const { error } = await this.supabase
      .from('execution_logs')
      .update({
        status: 'completed',
        completed_at: completedAt.toISOString(),
        duration_ms: duration,
        execution_data: finalResult ? { 
          finalResult,
          completedAt: completedAt.toISOString()
        } : undefined,
        logs: [...currentLogs, completionLog]
      } as any)  // ✅ FIXED: Type assertion
      .eq('id', executionId)

    if (error) {
      console.error('Failed to complete execution logging:', error)
      throw new Error(`Failed to complete execution logging: ${error.message}`)
    }
  }

  async failExecution(executionId: string, error: any): Promise<void> {
    const completedAt = new Date()
    
    // Get execution to calculate duration
    const { data: execution } = await this.supabase
      .from('execution_logs')
      .select('started_at, logs')
      .eq('id', executionId)
      .single()

    let duration = null
    if (execution?.started_at) {
      duration = completedAt.getTime() - new Date(execution.started_at).getTime()
    }

    const currentLogs = execution?.logs || []
    const errorLog: LogEntry = {
      timestamp: completedAt.toISOString(),
      level: 'error',
      message: 'Workflow execution failed',
      metadata: {
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack
        },
        durationMs: duration,
        failedAt: completedAt.toISOString()
      }
    }

    const { error: updateError } = await this.supabase
      .from('execution_logs')
      .update({
        status: 'failed',
        completed_at: completedAt.toISOString(),
        duration_ms: duration,
        error_details: {
          message: error.message,
          name: error.name,
          stack: error.stack,
          timestamp: completedAt.toISOString()
        },
        logs: [...currentLogs, errorLog]
      } as any)  // ✅ FIXED: Type assertion
      .eq('id', executionId)

    if (updateError) {
      console.error('Failed to log execution failure:', updateError)
      // Don't throw here to avoid masking the original error
    }
  }

  async startStep(
    executionId: string,
    stepIndex: number,
    actionType: string,
    inputData: any
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('execution_steps')
      .insert({
        execution_id: executionId,
        step_index: stepIndex,
        action_type: actionType,
        status: 'running',
        input_data: inputData,
        started_at: new Date().toISOString()
      } as any)  // ✅ FIXED: Type assertion
      .select('id')
      .single()

    if (error) {
      console.error('Failed to start step logging:', error)
      throw new Error(`Failed to start step logging: ${error.message}`)
    }

    // Log step start
    await this.logInfo(executionId, `Started step ${stepIndex}: ${actionType}`, {
      stepIndex,
      actionType,
      inputData
    })

    return (data as any)?.id || `${executionId}_step_${stepIndex}`  // ✅ FIXED: Safe access
  }

  async completeStep(
    executionId: string,
    stepIndex: number,
    outputData: any
  ): Promise<void> {
    const completedAt = new Date()

    // Get step to calculate duration
    const { data: step } = await this.supabase
      .from('execution_steps')
      .select('started_at')
      .eq('execution_id', executionId)
      .eq('step_index', stepIndex)
      .single()

    let duration = null
    if (step?.started_at) {
      duration = completedAt.getTime() - new Date(step.started_at).getTime()
    }

    const { error } = await this.supabase
      .from('execution_steps')
      .update({
        status: 'completed',
        output_data: outputData,
        completed_at: completedAt.toISOString(),
        duration_ms: duration
      } as any)  // ✅ FIXED: Type assertion
      .eq('execution_id', executionId)
      .eq('step_index', stepIndex)

    if (error) {
      console.error('Failed to complete step logging:', error)
      throw new Error(`Failed to complete step logging: ${error.message}`)
    }

    // Log step completion
    await this.logInfo(executionId, `Completed step ${stepIndex}`, {
      stepIndex,
      outputData,
      durationMs: duration
    })
  }

  async failStep(
    executionId: string,
    stepIndex: number,
    error: any
  ): Promise<void> {
    const completedAt = new Date()

    // Get step to calculate duration
    const { data: step } = await this.supabase
      .from('execution_steps')
      .select('started_at')
      .eq('execution_id', executionId)
      .eq('step_index', stepIndex)
      .single()

    let duration = null
    if (step?.started_at) {
      duration = completedAt.getTime() - new Date(step.started_at).getTime()
    }

    const { error: updateError } = await this.supabase
      .from('execution_steps')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: completedAt.toISOString(),
        duration_ms: duration
      } as any)  // ✅ FIXED: Type assertion
      .eq('execution_id', executionId)
      .eq('step_index', stepIndex)

    if (updateError) {
      console.error('Failed to log step failure:', updateError)
    }

    // Log step failure
    await this.logError(executionId, `Step ${stepIndex} failed: ${error.message}`, {
      stepIndex,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack
      },
      durationMs: duration
    })
  }

  async logInfo(executionId: string, message: string, metadata?: any): Promise<void> {
    await this.logMessage(executionId, 'info', message, metadata)
  }

  async logWarning(executionId: string, message: string, metadata?: any): Promise<void> {
    await this.logMessage(executionId, 'warning', message, metadata)
  }

  async logError(executionId: string, message: string, metadata?: any): Promise<void> {
    await this.logMessage(executionId, 'error', message, metadata)
  }

  async logDebug(executionId: string, message: string, metadata?: any): Promise<void> {
    await this.logMessage(executionId, 'debug', message, metadata)
  }

  private async logMessage(
    executionId: string,
    level: 'info' | 'warning' | 'error' | 'debug',
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Get current logs
      const { data: execution } = await this.supabase
        .from('execution_logs')
        .select('logs')
        .eq('id', executionId)
        .single()

      const currentLogs = execution?.logs || []
      const newLog: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        metadata
      }

      // Limit log size to prevent database bloat
      const maxLogs = 1000
      const updatedLogs = [...currentLogs, newLog]
      if (updatedLogs.length > maxLogs) {
        updatedLogs.splice(0, updatedLogs.length - maxLogs)
      }

      // Update logs
      const { error } = await this.supabase
        .from('execution_logs')
        .update({
          logs: updatedLogs
        } as any)  // ✅ FIXED: Type assertion
        .eq('id', executionId)

      if (error) {
        console.error('Failed to write log entry:', error)
      }
    } catch (error) {
      console.error('Failed to log message:', error)
    }
  }

  async getExecutionLogs(
    executionId: string,
    level?: 'info' | 'warning' | 'error' | 'debug'
  ): Promise<LogEntry[]> {
    const { data, error } = await this.supabase
      .from('execution_logs')
      .select('logs')
      .eq('id', executionId)
      .single()

    if (error) {
      console.error('Failed to get execution logs:', error)
      return []
    }

    const logs = data?.logs || []
    
    if (level) {
      return logs.filter((log: LogEntry) => log.level === level)
    }
    
    return logs
  }

  async getExecutionStats(workflowId: string, timeRange?: string): Promise<any> {
    let query = this.supabase
      .from('execution_logs')
      .select('status, duration_ms, created_at, error_details')
      .eq('workflow_id', workflowId)

    if (timeRange) {
      const date = new Date()
      switch (timeRange) {
        case '1h':
          date.setHours(date.getHours() - 1)
          break
        case '24h':
          date.setHours(date.getHours() - 24)
          break
        case '7d':
          date.setDate(date.getDate() - 7)
          break
        case '30d':
          date.setDate(date.getDate() - 30)
          break
      }
      query = query.gte('created_at', date.toISOString())
    }

    const { data: executions, error } = await query

    if (error) {
      console.error('Failed to get execution stats:', error)
      return null
    }

    if (!executions || executions.length === 0) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        averageDurationMs: 0,
        timeRange: timeRange || 'all',
        errorBreakdown: {}
      }
    }

    const total = executions.length
    const completed = executions.filter(e => e.status === 'completed').length
    const failed = executions.filter(e => e.status === 'failed').length
    const running = executions.filter(e => e.status === 'running').length
    const pending = executions.filter(e => e.status === 'pending').length

    const completedExecutions = executions.filter(e => e.duration_ms)
    const avgDuration = completedExecutions.length > 0
      ? completedExecutions.reduce((acc, e) => acc + (e.duration_ms || 0), 0) / completedExecutions.length
      : 0

    // Error breakdown
    const errorBreakdown: Record<string, number> = {}
    executions
      .filter(e => e.status === 'failed' && e.error_details?.message)
      .forEach(e => {
        const errorType = this.categorizeError(e.error_details.message)
        errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1
      })

    return {
      totalExecutions: total,
      successfulExecutions: completed,
      failedExecutions: failed,
      runningExecutions: running,
      pendingExecutions: pending,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
      averageDurationMs: avgDuration,
      timeRange: timeRange || 'all',
      errorBreakdown
    }
  }

  async getDetailedExecutionReport(executionId: string): Promise<any> {
    // Get main execution data
    const { data: execution, error: executionError } = await this.supabase
      .from('execution_logs')
      .select('*')
      .eq('id', executionId)
      .single()

    if (executionError) {
      throw new Error(`Failed to get execution: ${executionError.message}`)
    }

    // Get execution steps
    const { data: steps, error: stepsError } = await this.supabase
      .from('execution_steps')
      .select('*')
      .eq('execution_id', executionId)
      .order('step_index', { ascending: true })

    if (stepsError) {
      console.error('Failed to get execution steps:', stepsError)
    }

    // Get child executions (for parallel processing)
    const { data: childExecutions, error: childError } = await this.supabase
      .from('execution_logs')
      .select('*')
      .eq('parent_execution_id', executionId)

    if (childError) {
      console.error('Failed to get child executions:', childError)
    }

    return {
      execution,
      steps: steps || [],
      childExecutions: childExecutions || [],
      logs: execution?.logs || [],
      summary: {
        totalSteps: steps?.length || 0,
        completedSteps: steps?.filter(s => s.status === 'completed').length || 0,
        failedSteps: steps?.filter(s => s.status === 'failed').length || 0,
        totalDuration: execution?.duration_ms || 0,
        hasChildExecutions: (childExecutions?.length || 0) > 0
      }
    }
  }

  async exportExecutionLogs(
    workflowId: string,
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    const { data: executions, error } = await this.supabase
      .from('execution_logs')
      .select('*')
      .eq('workflow_id', workflowId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to export logs: ${error.message}`)
    }

    if (format === 'csv') {
      return this.convertToCsv(executions || [])
    }

    return executions || []
  }

  private convertToCsv(executions: any[]): string {
    if (executions.length === 0) return ''

    const headers = [
      'Execution ID',
      'Workflow ID',
      'Status',
      'Started At',
      'Completed At',
      'Duration (ms)',
      'Error Message'
    ]

    const rows = executions.map(execution => [
      execution.id,
      execution.workflow_id,
      execution.status,
      execution.started_at || '',
      execution.completed_at || '',
      execution.duration_ms || '',
      execution.error_details?.message || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return csvContent
  }

  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase()
    
    if (message.includes('timeout') || message.includes('network')) {
      return 'Network/Timeout'
    } else if (message.includes('auth') || message.includes('unauthorized')) {
      return 'Authentication'
    } else if (message.includes('rate limit') || message.includes('quota')) {
      return 'Rate Limiting'
    } else if (message.includes('validation') || message.includes('invalid')) {
      return 'Validation'
    } else if (message.includes('not found') || message.includes('404')) {
      return 'Not Found'
    } else if (message.includes('permission') || message.includes('forbidden')) {
      return 'Permission'
    } else {
      return 'Other'
    }
  }

  // Real-time monitoring methods
  async getActiveExecutions(organizationId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('execution_logs')
      .select(`
        *,
        workflows!inner(
          name,
          organization_id
        )
      `)
      .eq('workflows.organization_id', organizationId)
      .in('status', ['running', 'pending'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to get active executions:', error)
      return []
    }

    return data || []
  }

  async getExecutionMetrics(organizationId: string, timeRange: string = '24h'): Promise<any> {
    const date = new Date()
    switch (timeRange) {
      case '1h':
        date.setHours(date.getHours() - 1)
        break
      case '24h':
        date.setHours(date.getHours() - 24)
        break
      case '7d':
        date.setDate(date.getDate() - 7)
        break
      case '30d':
        date.setDate(date.getDate() - 30)
        break
    }

    const { data: executions, error } = await this.supabase
      .from('execution_logs')
      .select(`
        status,
        duration_ms,
        created_at,
        workflows!inner(
          organization_id
        )
      `)
      .eq('workflows.organization_id', organizationId)
      .gte('created_at', date.toISOString())

    if (error) {
      console.error('Failed to get execution metrics:', error)
      return null
    }

    const total = executions?.length || 0
    const completed = executions?.filter(e => e.status === 'completed').length || 0
    const failed = executions?.filter(e => e.status === 'failed').length || 0

    return {
      totalExecutions: total,
      successfulExecutions: completed,
      failedExecutions: failed,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      averageDuration: total > 0 
        ? (executions?.reduce((acc, e) => acc + (e.duration_ms || 0), 0) || 0) / total 
        : 0,
      timeRange
    }
  }

  // Cleanup old logs
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const { data, error } = await this.supabase
      .from('execution_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id')

    if (error) {
      console.error('Failed to cleanup old logs:', error)
      return 0
    }

    return data?.length || 0
  }

  // ✅ ADDED: Helper methods for better error handling
  async safeLogMessage(executionId: string, level: LogEntry['level'], message: string, metadata?: any): Promise<boolean> {
    try {
      await this.logMessage(executionId, level, message, metadata)
      return true
    } catch (error) {
      console.error('Failed to log message safely:', error)
      return false
    }
  }

  async getBatchExecutionLogs(executionIds: string[]): Promise<Record<string, LogEntry[]>> {
    const results: Record<string, LogEntry[]> = {}
    
    for (const executionId of executionIds) {
      try {
        results[executionId] = await this.getExecutionLogs(executionId)
      } catch (error) {
        console.error(`Failed to get logs for execution ${executionId}:`, error)
        results[executionId] = []
      }
    }
    
    return results
  }

  // ✅ ADDED: Performance monitoring
  async getPerformanceMetrics(workflowId: string, timeRange: string = '24h'): Promise<any> {
    const stats = await this.getExecutionStats(workflowId, timeRange)
    
    if (!stats) return null

    return {
      ...stats,
      performanceGrade: this.calculatePerformanceGrade(stats.successRate, stats.averageDurationMs),
      recommendations: this.generatePerformanceRecommendations(stats)
    }
  }

  private calculatePerformanceGrade(successRate: number, avgDuration: number): string {
    if (successRate >= 95 && avgDuration < 5000) return 'A'
    if (successRate >= 90 && avgDuration < 10000) return 'B'
    if (successRate >= 80 && avgDuration < 30000) return 'C'
    if (successRate >= 70) return 'D'
    return 'F'
  }

  private generatePerformanceRecommendations(stats: any): string[] {
    const recommendations: string[] = []
    
    if (stats.successRate < 90) {
      recommendations.push('Consider reviewing error patterns and adding better error handling')
    }
    
    if (stats.averageDurationMs > 30000) {
      recommendations.push('Workflow execution time is high - consider optimizing action performance')
    }
    
    if (stats.failedExecutions > stats.successfulExecutions * 0.1) {
      recommendations.push('High failure rate detected - review workflow logic and conditions')
    }
    
    return recommendations
  }
}