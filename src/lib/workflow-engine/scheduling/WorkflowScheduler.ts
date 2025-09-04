// src/lib/workflow-engine/scheduling/WorkflowScheduler.ts

import cron from 'node-cron'
import { EventEmitter } from 'events'
import { WorkflowExecutionContext } from '../core/WorkflowEngine'
import { ConditionalIntegration } from '../integrations/ConditionalIntegration'

export interface ScheduleConfig {
  id: string
  workflowId: string
  name: string
  description?: string
  scheduleType: 'cron' | 'interval' | 'delay' | 'once' | 'event'
  schedule: CronSchedule | IntervalSchedule | DelaySchedule | OnceSchedule | EventSchedule
  timezone: string
  enabled: boolean
  maxExecutions?: number
  executionCount: number
  lastExecuted?: Date
  nextExecution?: Date
  conditions?: ScheduleCondition[]
  retryPolicy?: RetryPolicy
  metadata: {
    createdBy: string
    createdAt: Date
    updatedAt: Date
    tags?: string[]
    priority?: number
  }
}

export interface CronSchedule {
  type: 'cron'
  expression: string // e.g., '0 9 * * 1-5' (9 AM, Mon-Fri)
  description?: string
  skipHolidays?: boolean
  skipWeekends?: boolean
}

export interface IntervalSchedule {
  type: 'interval'
  intervalMs: number // milliseconds
  startTime?: Date
  endTime?: Date
  maxRuns?: number
}

export interface DelaySchedule {
  type: 'delay'
  delayMs: number // delay from trigger
  fromEvent?: string // event that triggers the delay
}

export interface OnceSchedule {
  type: 'once'
  executeAt: Date
  executed?: boolean
}

export interface EventSchedule {
  type: 'event'
  eventName: string
  eventFilter?: Record<string, any>
  debounceMs?: number // prevent duplicate rapid executions
}

export interface ScheduleCondition {
  id: string
  name: string
  type: 'time' | 'data' | 'system' | 'custom'
  condition: any // Advanced condition from our conditional engine
  blockExecution: boolean // if true, blocks execution when condition fails
}

export interface RetryPolicy {
  maxRetries: number
  retryDelayMs: number
  backoffMultiplier?: number // exponential backoff
  retryConditions?: string[] // which error types to retry
}

export interface ScheduledExecution {
  id: string
  scheduleId: string
  workflowId: string
  scheduledTime: Date
  actualStartTime?: Date
  completedTime?: Date
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped'
  executionId?: string
  result?: any
  error?: string
  retryCount: number
  nextRetry?: Date
  metadata: {
    triggeredBy: 'schedule' | 'manual' | 'retry'
    conditions?: any[]
  }
}

export interface ScheduleStats {
  totalSchedules: number
  activeSchedules: number
  executionsToday: number
  executionsThisWeek: number
  executionsThisMonth: number
  successRate: number
  averageExecutionTime: number
  nextScheduledExecutions: ScheduledExecution[]
}

export class WorkflowScheduler extends EventEmitter {
  private schedules: Map<string, ScheduleConfig> = new Map()
  private cronJobs: Map<string, cron.ScheduledTask> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private timeouts: Map<string, NodeJS.Timeout> = new Map()
  private pendingExecutions: Map<string, ScheduledExecution> = new Map()
  private executionHistory: ScheduledExecution[] = []
  private conditionalIntegration: ConditionalIntegration
  private isRunning: boolean = false

  constructor() {
    super()
    this.conditionalIntegration = new ConditionalIntegration()
    this.setupEventHandlers()
  }

  // Start the scheduler
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scheduler is already running')
    }

    this.isRunning = true
    
    // Initialize all schedules
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        await this.initializeSchedule(schedule)
      }
    }

    // Start cleanup routine
    this.startCleanupRoutine()

    this.emit('scheduler:started')
    console.log('WorkflowScheduler started successfully')
  }

  // Stop the scheduler
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    // Stop all cron jobs
    for (const [scheduleId, task] of this.cronJobs) {
      task.stop()
      task.destroy()
    }
    this.cronJobs.clear()

    // Clear all intervals
    for (const [scheduleId, interval] of this.intervals) {
      clearInterval(interval)
    }
    this.intervals.clear()

    // Clear all timeouts
    for (const [scheduleId, timeout] of this.timeouts) {
      clearTimeout(timeout)
    }
    this.timeouts.clear()

    this.emit('scheduler:stopped')
    console.log('WorkflowScheduler stopped')
  }

  // Create a new schedule
  async createSchedule(config: Omit<ScheduleConfig, 'id' | 'executionCount' | 'metadata'>): Promise<ScheduleConfig> {
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const schedule: ScheduleConfig = {
      ...config,
      id: scheduleId,
      executionCount: 0,
      metadata: {
        createdBy: 'system', // In real app, get from context
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: config.metadata?.tags || [],
        priority: config.metadata?.priority || 1
      }
    }

    // Validate schedule configuration
    await this.validateSchedule(schedule)

    // Calculate next execution time
    schedule.nextExecution = this.calculateNextExecution(schedule)

    // Store schedule
    this.schedules.set(scheduleId, schedule)

    // Initialize if scheduler is running and schedule is enabled
    if (this.isRunning && schedule.enabled) {
      await this.initializeSchedule(schedule)
    }

    this.emit('schedule:created', schedule)
    return schedule
  }

  // Update an existing schedule
  async updateSchedule(scheduleId: string, updates: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
    const existingSchedule = this.schedules.get(scheduleId)
    if (!existingSchedule) {
      throw new Error(`Schedule not found: ${scheduleId}`)
    }

    // Stop existing schedule
    await this.stopSchedule(scheduleId)

    // Update schedule
    const updatedSchedule: ScheduleConfig = {
      ...existingSchedule,
      ...updates,
      id: scheduleId, // Prevent ID changes
      metadata: {
        ...existingSchedule.metadata,
        updatedAt: new Date()
      }
    }

    // Validate updated configuration
    await this.validateSchedule(updatedSchedule)

    // Recalculate next execution
    updatedSchedule.nextExecution = this.calculateNextExecution(updatedSchedule)

    // Store updated schedule
    this.schedules.set(scheduleId, updatedSchedule)

    // Restart if enabled and scheduler is running
    if (this.isRunning && updatedSchedule.enabled) {
      await this.initializeSchedule(updatedSchedule)
    }

    this.emit('schedule:updated', updatedSchedule)
    return updatedSchedule
  }

  // Delete a schedule
  async deleteSchedule(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`)
    }

    // Stop the schedule
    await this.stopSchedule(scheduleId)

    // Remove from storage
    this.schedules.delete(scheduleId)

    // Cancel pending executions
    for (const [executionId, execution] of this.pendingExecutions) {
      if (execution.scheduleId === scheduleId) {
        execution.status = 'cancelled'
        this.pendingExecutions.delete(executionId)
      }
    }

    this.emit('schedule:deleted', { scheduleId })
  }

  // Enable/disable a schedule
  async toggleSchedule(scheduleId: string, enabled: boolean): Promise<ScheduleConfig> {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`)
    }

    if (schedule.enabled === enabled) {
      return schedule // No change needed
    }

    schedule.enabled = enabled
    schedule.metadata.updatedAt = new Date()

    if (enabled && this.isRunning) {
      await this.initializeSchedule(schedule)
    } else {
      await this.stopSchedule(scheduleId)
    }

    this.schedules.set(scheduleId, schedule)
    this.emit('schedule:toggled', { scheduleId, enabled })
    
    return schedule
  }

  // Execute a workflow immediately (manual trigger)
  async executeWorkflowNow(
    workflowId: string, 
    triggerData?: any,
    userId?: string
  ): Promise<ScheduledExecution> {
    const executionId = `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const execution: ScheduledExecution = {
      id: executionId,
      scheduleId: 'manual',
      workflowId,
      scheduledTime: new Date(),
      actualStartTime: new Date(),
      status: 'running',
      retryCount: 0,
      metadata: {
        triggeredBy: 'manual'
      }
    }

    this.pendingExecutions.set(executionId, execution)

    try {
      // Create execution context
      const context: WorkflowExecutionContext = {
        executionId,
        workflowId,
        orgId: 'default', // Should come from user context
        userId: userId || 'system',
        triggerData: triggerData || {},
        variables: {
          _scheduler: {
            triggeredBy: 'manual',
            scheduledTime: execution.scheduledTime,
            executionId
          }
        },
        currentStepIndex: 0,
        executionStartTime: new Date()
      }

      // Execute workflow (this would integrate with your workflow engine)
      const result = await this.executeWorkflow(context)

      execution.status = 'completed'
      execution.completedTime = new Date()
      execution.result = result
      execution.executionId = executionId

      this.emit('execution:completed', execution)

    } catch (error) {
      execution.status = 'failed'
      execution.completedTime = new Date()
      execution.error = error instanceof Error ? error.message : 'Unknown error'

      this.emit('execution:failed', execution)
    } finally {
      this.pendingExecutions.delete(executionId)
      this.executionHistory.push(execution)
      
      // Keep only last 1000 executions in memory
      if (this.executionHistory.length > 1000) {
        this.executionHistory = this.executionHistory.slice(-1000)
      }
    }

    return execution
  }

  // Get schedule by ID
  getSchedule(scheduleId: string): ScheduleConfig | undefined {
    return this.schedules.get(scheduleId)
  }

  // Get all schedules
  getAllSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values())
  }

  // Get schedules by workflow ID
  getSchedulesByWorkflow(workflowId: string): ScheduleConfig[] {
    return Array.from(this.schedules.values()).filter(s => s.workflowId === workflowId)
  }

  // Get pending executions
  getPendingExecutions(): ScheduledExecution[] {
    return Array.from(this.pendingExecutions.values())
  }

  // Get execution history
  getExecutionHistory(limit: number = 100): ScheduledExecution[] {
    return this.executionHistory.slice(-limit)
  }

  // Get scheduler statistics
  getStats(): ScheduleStats {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000))
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const executionsToday = this.executionHistory.filter(e => 
      e.scheduledTime >= today
    ).length

    const executionsThisWeek = this.executionHistory.filter(e => 
      e.scheduledTime >= thisWeek
    ).length

    const executionsThisMonth = this.executionHistory.filter(e => 
      e.scheduledTime >= thisMonth
    ).length

    const completedExecutions = this.executionHistory.filter(e => 
      e.status === 'completed'
    )

    const successRate = this.executionHistory.length > 0 
      ? (completedExecutions.length / this.executionHistory.length) * 100 
      : 0

    const averageExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => {
          if (e.actualStartTime && e.completedTime) {
            return sum + (e.completedTime.getTime() - e.actualStartTime.getTime())
          }
          return sum
        }, 0) / completedExecutions.length
      : 0

    // Get next 10 scheduled executions
    const nextExecutions = Array.from(this.schedules.values())
      .filter(s => s.enabled && s.nextExecution)
      .sort((a, b) => a.nextExecution!.getTime() - b.nextExecution!.getTime())
      .slice(0, 10)
      .map(s => ({
        id: `future_${s.id}`,
        scheduleId: s.id,
        workflowId: s.workflowId,
        scheduledTime: s.nextExecution!,
        status: 'pending' as const,
        retryCount: 0,
        metadata: {
          triggeredBy: 'schedule' as const
        }
      }))

    return {
      totalSchedules: this.schedules.size,
      activeSchedules: Array.from(this.schedules.values()).filter(s => s.enabled).length,
      executionsToday,
      executionsThisWeek,
      executionsThisMonth,
      successRate,
      averageExecutionTime,
      nextScheduledExecutions: nextExecutions
    }
  }

  // Private methods
  private async initializeSchedule(schedule: ScheduleConfig): Promise<void> {
    const { id, schedule: scheduleConfig } = schedule

    // Stop existing schedule first
    await this.stopSchedule(id)

    switch (scheduleConfig.type) {
      case 'cron':
        await this.initializeCronSchedule(schedule, scheduleConfig)
        break
      case 'interval':
        await this.initializeIntervalSchedule(schedule, scheduleConfig)
        break
      case 'delay':
        // Delay schedules are triggered by events, not initialized directly
        break
      case 'once':
        await this.initializeOnceSchedule(schedule, scheduleConfig)
        break
      case 'event':
        await this.initializeEventSchedule(schedule, scheduleConfig)
        break
    }
  }

  private async initializeCronSchedule(schedule: ScheduleConfig, cronConfig: CronSchedule): Promise<void> {
    try {
      const task = cron.schedule(cronConfig.expression, () => {
        this.executeScheduledWorkflow(schedule)
      }, {
        scheduled: false,
        timezone: schedule.timezone
      })

      task.start()
      this.cronJobs.set(schedule.id, task)

      console.log(`Cron schedule initialized: ${schedule.id} - ${cronConfig.expression}`)
    } catch (error) {
      throw new Error(`Failed to initialize cron schedule ${schedule.id}: ${error}`)
    }
  }

  private async initializeIntervalSchedule(schedule: ScheduleConfig, intervalConfig: IntervalSchedule): Promise<void> {
    const executeInterval = () => {
      // Check if we should still execute
      if (!schedule.enabled) return
      
      if (intervalConfig.endTime && new Date() > intervalConfig.endTime) {
        this.stopSchedule(schedule.id)
        return
      }

      if (intervalConfig.maxRuns && schedule.executionCount >= intervalConfig.maxRuns) {
        this.stopSchedule(schedule.id)
        return
      }

      this.executeScheduledWorkflow(schedule)
    }

    const startDelay = intervalConfig.startTime 
      ? Math.max(0, intervalConfig.startTime.getTime() - Date.now())
      : 0

    if (startDelay > 0) {
      setTimeout(() => {
        executeInterval()
        const interval = setInterval(executeInterval, intervalConfig.intervalMs)
        this.intervals.set(schedule.id, interval)
      }, startDelay)
    } else {
      const interval = setInterval(executeInterval, intervalConfig.intervalMs)
      this.intervals.set(schedule.id, interval)
    }
  }

  private async initializeOnceSchedule(schedule: ScheduleConfig, onceConfig: OnceSchedule): Promise<void> {
    if (onceConfig.executed) {
      return // Already executed
    }

    const delay = Math.max(0, onceConfig.executeAt.getTime() - Date.now())
    
    const timeout = setTimeout(() => {
      this.executeScheduledWorkflow(schedule)
      onceConfig.executed = true
    }, delay)

    this.timeouts.set(schedule.id, timeout)
  }

  private async initializeEventSchedule(schedule: ScheduleConfig, eventConfig: EventSchedule): Promise<void> {
    // Event schedules are handled by the event system
    // This would integrate with your event bus
    console.log(`Event schedule registered: ${schedule.id} - ${eventConfig.eventName}`)
  }

  private async stopSchedule(scheduleId: string): Promise<void> {
    // Stop cron job
    const cronJob = this.cronJobs.get(scheduleId)
    if (cronJob) {
      cronJob.stop()
      cronJob.destroy()
      this.cronJobs.delete(scheduleId)
    }

    // Clear interval
    const interval = this.intervals.get(scheduleId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(scheduleId)
    }

    // Clear timeout
    const timeout = this.timeouts.get(scheduleId)
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(scheduleId)
    }
  }

  private async executeScheduledWorkflow(schedule: ScheduleConfig): Promise<void> {
    try {
      // Check max executions
      if (schedule.maxExecutions && schedule.executionCount >= schedule.maxExecutions) {
        await this.toggleSchedule(schedule.id, false)
        return
      }

      // Check schedule conditions
      if (schedule.conditions && schedule.conditions.length > 0) {
        const conditionsPassed = await this.evaluateScheduleConditions(schedule)
        if (!conditionsPassed) {
          console.log(`Schedule conditions not met, skipping execution: ${schedule.id}`)
          return
        }
      }

      // Create execution record
      const executionId = `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const execution: ScheduledExecution = {
        id: executionId,
        scheduleId: schedule.id,
        workflowId: schedule.workflowId,
        scheduledTime: new Date(),
        actualStartTime: new Date(),
        status: 'running',
        retryCount: 0,
        metadata: {
          triggeredBy: 'schedule'
        }
      }

      this.pendingExecutions.set(executionId, execution)

      // Update schedule stats
      schedule.executionCount++
      schedule.lastExecuted = new Date()
      schedule.nextExecution = this.calculateNextExecution(schedule)

      this.emit('execution:started', execution)

      // Create execution context
      const context: WorkflowExecutionContext = {
        executionId,
        workflowId: schedule.workflowId,
        orgId: 'default',
        userId: 'scheduler',
        triggerData: {
          _schedule: {
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            scheduleType: schedule.scheduleType,
            scheduledTime: execution.scheduledTime
          }
        },
        variables: {
          _scheduler: {
            triggeredBy: 'schedule',
            scheduleId: schedule.id,
            executionCount: schedule.executionCount
          }
        },
        currentStepIndex: 0,
        executionStartTime: new Date()
      }

      // Execute workflow
      const result = await this.executeWorkflow(context)

      execution.status = 'completed'
      execution.completedTime = new Date()
      execution.result = result
      execution.executionId = executionId

      this.emit('execution:completed', execution)

    } catch (error) {
      const execution = Array.from(this.pendingExecutions.values())
        .find(e => e.scheduleId === schedule.id && e.status === 'running')

      if (execution) {
        execution.status = 'failed'
        execution.completedTime = new Date()
        execution.error = error instanceof Error ? error.message : 'Unknown error'

        // Handle retry logic
        if (schedule.retryPolicy && execution.retryCount < schedule.retryPolicy.maxRetries) {
          await this.scheduleRetry(schedule, execution)
        } else {
          this.emit('execution:failed', execution)
        }
      }
    } finally {
      // Clean up pending execution
      const execution = Array.from(this.pendingExecutions.values())
        .find(e => e.scheduleId === schedule.id)
      
      if (execution) {
        this.pendingExecutions.delete(execution.id)
        this.executionHistory.push(execution)
      }
    }
  }

  private async evaluateScheduleConditions(schedule: ScheduleConfig): Promise<boolean> {
    if (!schedule.conditions || schedule.conditions.length === 0) {
      return true
    }

    const context: WorkflowExecutionContext = {
      executionId: 'condition_check',
      workflowId: schedule.workflowId,
      orgId: 'default',
      userId: 'scheduler',
      triggerData: {},
      variables: {
        _schedule: schedule,
        _currentTime: new Date(),
        _timezone: schedule.timezone
      },
      currentStepIndex: 0,
      executionStartTime: new Date()
    }

    for (const scheduleCondition of schedule.conditions) {
      try {
        const result = await this.conditionalIntegration.executeConditionalAction({
          id: scheduleCondition.id,
          type: 'conditional',
          name: scheduleCondition.name,
          conditions: [scheduleCondition.condition],
          onTrue: { actionIds: [], continueWorkflow: true },
          options: {
            evaluationMode: 'all',
            stopOnFirstFailure: true,
            timeout: 5000,
            cacheResults: false,
            logLevel: 'none'
          }
        }, context)

        if (scheduleCondition.blockExecution && !result.conditionsPassed) {
          return false
        }
      } catch (error) {
        console.error(`Error evaluating schedule condition ${scheduleCondition.id}:`, error)
        if (scheduleCondition.blockExecution) {
          return false
        }
      }
    }

    return true
  }

  private async scheduleRetry(schedule: ScheduleConfig, execution: ScheduledExecution): Promise<void> {
    if (!schedule.retryPolicy) return

    execution.retryCount++
    const delay = schedule.retryPolicy.retryDelayMs * 
      Math.pow(schedule.retryPolicy.backoffMultiplier || 1, execution.retryCount - 1)

    execution.nextRetry = new Date(Date.now() + delay)
    execution.status = 'pending'

    setTimeout(() => {
      this.executeScheduledWorkflow(schedule)
    }, delay)

    this.emit('execution:retry_scheduled', execution)
  }

  private calculateNextExecution(schedule: ScheduleConfig): Date | undefined {
    const now = new Date()

    switch (schedule.schedule.type) {
      case 'cron':
        // This would use a cron parser library to calculate next execution
        // For now, return a placeholder
        return new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now

      case 'interval':
        const intervalConfig = schedule.schedule as IntervalSchedule
        if (intervalConfig.endTime && now > intervalConfig.endTime) {
          return undefined
        }
        return new Date(now.getTime() + intervalConfig.intervalMs)

      case 'once':
        const onceConfig = schedule.schedule as OnceSchedule
        return onceConfig.executed ? undefined : onceConfig.executeAt

      case 'delay':
      case 'event':
        return undefined // These are triggered by events

      default:
        return undefined
    }
  }

  private async validateSchedule(schedule: ScheduleConfig): Promise<void> {
    if (!schedule.workflowId) {
      throw new Error('Workflow ID is required')
    }

    if (!schedule.name || schedule.name.trim().length === 0) {
      throw new Error('Schedule name is required')
    }

    // Validate schedule configuration based on type
    switch (schedule.schedule.type) {
      case 'cron':
        const cronConfig = schedule.schedule as CronSchedule
        if (!cron.validate(cronConfig.expression)) {
          throw new Error(`Invalid cron expression: ${cronConfig.expression}`)
        }
        break

      case 'interval':
        const intervalConfig = schedule.schedule as IntervalSchedule
        if (intervalConfig.intervalMs <= 0) {
          throw new Error('Interval must be greater than 0')
        }
        if (intervalConfig.startTime && intervalConfig.endTime && 
            intervalConfig.startTime >= intervalConfig.endTime) {
          throw new Error('Start time must be before end time')
        }
        break

      case 'once':
        const onceConfig = schedule.schedule as OnceSchedule
        if (onceConfig.executeAt <= new Date()) {
          throw new Error('Execution time must be in the future')
        }
        break

      case 'delay':
        const delayConfig = schedule.schedule as DelaySchedule
        if (delayConfig.delayMs <= 0) {
          throw new Error('Delay must be greater than 0')
        }
        break

      case 'event':
        const eventConfig = schedule.schedule as EventSchedule
        if (!eventConfig.eventName) {
          throw new Error('Event name is required')
        }
        break
    }

    // Validate timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: schedule.timezone })
    } catch (error) {
      throw new Error(`Invalid timezone: ${schedule.timezone}`)
    }
  }

  private async executeWorkflow(context: WorkflowExecutionContext): Promise<any> {
    // This would integrate with your main workflow engine
    // For now, return a mock result
    return {
      success: true,
      executionId: context.executionId,
      completedSteps: 3,
      duration: Math.random() * 5000,
      result: 'Workflow completed successfully'
    }
  }

  private setupEventHandlers(): void {
    this.on('execution:failed', (execution) => {
      console.error(`Workflow execution failed: ${execution.id}`, execution.error)
    })

    this.on('execution:completed', (execution) => {
      console.log(`Workflow execution completed: ${execution.id}`)
    })
  }

  private startCleanupRoutine(): void {
    // Clean up old execution history every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      this.executionHistory = this.executionHistory.filter(e => e.scheduledTime > cutoff)
    }, 60 * 60 * 1000)
  }
}

// Factory functions for common schedule types
export class ScheduleBuilder {
  static dailyAt(hour: number, minute: number = 0): CronSchedule {
    return {
      type: 'cron',
      expression: `${minute} ${hour} * * *`,
      description: `Daily at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }
  }

  static weeklyOn(dayOfWeek: number, hour: number, minute: number = 0): CronSchedule {
    return {
      type: 'cron',
      expression: `${minute} ${hour} * * ${dayOfWeek}`,
      description: `Weekly on day ${dayOfWeek} at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }
  }

  static monthlyOn(dayOfMonth: number, hour: number, minute: number = 0): CronSchedule {
    return {
      type: 'cron',
      expression: `${minute} ${hour} ${dayOfMonth} * *`,
      description: `Monthly on day ${dayOfMonth} at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }
  }

  static businessHours(): CronSchedule {
    return {
      type: 'cron',
      expression: '0 9-17 * * 1-5',
      description: 'Every hour during business hours (9 AM - 5 PM, Mon-Fri)',
      skipWeekends: true,
      skipHolidays: true
    }
  }

  static everyHours(hours: number): IntervalSchedule {
    return {
      type: 'interval',
      intervalMs: hours * 60 * 60 * 1000
    }
  }

  static onceAt(date: Date): OnceSchedule {
    return {
      type: 'once',
      executeAt: date
    }
  }

  static onEvent(eventName: string, debounceMs?: number): EventSchedule {
    return {
      type: 'event',
      eventName,
      debounceMs
    }
  }

  static afterDelay(delayMs: number, fromEvent?: string): DelaySchedule {
    return {
      type: 'delay',
      delayMs,
      fromEvent
    }
  }
}

// Holiday and business day utilities
export class BusinessCalendar {
  private static holidays: Set<string> = new Set([
    '2024-01-01', // New Year's Day
    '2024-07-04', // Independence Day
    '2024-12-25', // Christmas Day
    // Add more holidays as needed
  ])

  static isHoliday(date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0]
    return this.holidays.has(dateStr)
  }

  static isWeekend(date: Date): boolean {
    const day = date.getDay()
    return day === 0 || day === 6 // Sunday or Saturday
  }

  static isBusinessDay(date: Date): boolean {
    return !this.isWeekend(date) && !this.isHoliday(date)
  }

  static getNextBusinessDay(date: Date): Date {
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)
    
    while (!this.isBusinessDay(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1)
    }
    
    return nextDay
  }
}Minutes(minutes: number): IntervalSchedule {
    return {
      type: 'interval',
      intervalMs: minutes * 60 * 1000
    }
  }

  static every