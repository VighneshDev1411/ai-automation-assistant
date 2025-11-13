// src/lib/workflow-engine/core/TriggerSystem.ts
import { createClient } from '@supabase/supabase-js'

export interface ScheduleConfig {
  id?: string
  workflowId: string
  cronExpression: string
  timezone?: string
  startDate?: string
  endDate?: string
  status?: 'active' | 'inactive'
  nextRunAt?: string
  lastRunAt?: string
  createdAt?: string
}

export interface TriggerConfig {
  id: string
  type: 'webhook' | 'schedule' | 'email' | 'form' | 'manual'
  config: any
  workflowId: string
  status: string
}

export interface WebhookConfig {
  id: string
  url: string
  events: string[]
  secret?: string
  status: 'active' | 'inactive'
  workflowId: string
}

export interface ExecutionStats {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  totalExecutionTime: number
}

export class TriggerSystem {
  private supabase: any
  private isRunning: boolean = false
  private startTime: number = Date.now()
  private executionStats: ExecutionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalExecutionTime: 0,
  }
  private webhookHandlers: Map<string, Function> = new Map()
  private scheduledJobs: Map<string, any> = new Map()

  constructor(supabase: any) {
    this.supabase = supabase
    this.startTime = Date.now()
    this.isRunning = true
    this.loadExecutionStats()
    this.loadActiveWebhooks()
    this.loadActiveSchedules()
  }

  // ==========================================
  // SYSTEM MANAGEMENT
  // ==========================================

  get isSystemRunning(): boolean {
    return this.isRunning
  }

  get systemStartTime(): number {
    return this.startTime
  }

  get systemUptime(): number {
    return Date.now() - this.startTime
  }

  async startSystem(): Promise<void> {
    this.isRunning = true
    this.startTime = Date.now()
    console.log('TriggerSystem started')
  }

  async stopSystem(): Promise<void> {
    this.isRunning = false
    console.log('TriggerSystem stopped')
  }

  // ==========================================
  // STATISTICS AND MONITORING
  // ==========================================

  async getStats(): Promise<any> {
    try {
      // Get recent executions for performance calculations
      const recentExecutions = await this.getExecutionHistory(null, 1000)

      // Calculate performance metrics
      const totalExecutions = recentExecutions.length
      const successfulExecutions = recentExecutions.filter(
        e => e.status === 'completed'
      ).length
      const failedExecutions = recentExecutions.filter(
        e => e.status === 'failed'
      ).length
      const averageExecutionTime =
        recentExecutions.length > 0
          ? recentExecutions.reduce((acc, e) => acc + (e.duration_ms || 0), 0) /
            recentExecutions.length
          : 0

      // Get upcoming scheduled executions
      const nextScheduledExecutions = await this.getUpcomingExecutions(50)

      // Get active schedules
      const activeSchedules = await this.getScheduledWorkflows('')

      // Get pending executions
      const pendingExecutions = await this.getPendingExecutions()

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate:
          totalExecutions > 0
            ? (successfulExecutions / totalExecutions) * 100
            : 0,
        averageExecutionTime: Math.round(averageExecutionTime),
        activeSchedules: activeSchedules.length,
        pendingExecutions: pendingExecutions.length,
        nextScheduledExecutions,
        systemStatus: {
          isRunning: this.isRunning,
          uptime: Date.now() - this.startTime,
          startTime: this.startTime,
        },
        performance: {
          executionsLast24h: recentExecutions.filter(
            e =>
              new Date(e.started_at).getTime() >
              Date.now() - 24 * 60 * 60 * 1000
          ).length,
          executionsLastHour: recentExecutions.filter(
            e => new Date(e.started_at).getTime() > Date.now() - 60 * 60 * 1000
          ).length,
        },
      }
    } catch (error) {
      console.error('Error getting stats:', error)
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 0,
        averageExecutionTime: 0,
        activeSchedules: 0,
        pendingExecutions: 0,
        nextScheduledExecutions: [],
        systemStatus: {
          isRunning: this.isRunning,
          uptime: Date.now() - this.startTime,
          startTime: this.startTime,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getUpcomingExecutions(limit: number = 50): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('workflow_schedules')
      .select(
        `
        id,
        workflow_id,
        next_run_at,
        cron_expression,
        timezone,
        workflows!inner(
          id,
          name
        )
      `
      )
      .eq('status', 'active')
      .not('next_run_at', 'is', null)
      .order('next_run_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error getting upcoming executions:', error)
      return []
    }

    return (data || []).map((schedule: any) => ({
      scheduleId: schedule.id,
      workflowId: schedule.workflow_id,
      workflowName: schedule.workflows.name,
      scheduledTime: new Date(schedule.next_run_at),
      cronExpression: schedule.cron_expression,
      timezone: schedule.timezone,
    }))
  }

  private async loadExecutionStats(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('workflow_executions')
        .select('status, duration_ms')
        .gte(
          'started_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        ) // Last 30 days

      if (!error && data) {
        this.executionStats = {
          totalExecutions: data.length,
          successfulExecutions: data.filter(
            (e: any) => e.status === 'completed'
          ).length,
          failedExecutions: data.filter((e: any) => e.status === 'failed')
            .length,
          totalExecutionTime: data.reduce(
            ({ acc, e }: any) => acc + (e.duration_ms || 0),
            0
          ),
        }
      }
    } catch (error) {
      console.error('Error loading execution stats:', error)
    }
  }

  // ==========================================
  // WEBHOOK TRIGGER HANDLING
  // ==========================================

  async createWebhook(workflowId: string, events: string[]): Promise<string> {
    const webhookId = crypto.randomUUID()
    const secret = this.generateSecret()

    const { error } = await this.supabase.from('webhooks').insert({
      id: webhookId,
      workflow_id: workflowId,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/${webhookId}`,
      events,
      secret,
      status: 'active',
      created_at: new Date().toISOString(),
    })

    if (error) {
      throw new Error(`Failed to create webhook: ${error.message}`)
    }

    return webhookId
  }

  async handleWebhook(webhookId: string, payload: any): Promise<string> {
    const webhook = await this.getWebhookConfig(webhookId)
    if (!webhook) {
      throw new Error('Webhook not found')
    }

    // Validate webhook signature if secret is provided
    if (webhook.secret) {
      // Implement signature validation logic here
    }

    // Log webhook event
    await this.logTriggerEvent(
      'webhook',
      webhookId,
      payload,
      webhook.workflowId
    )

    // Execute workflow
    const { WorkflowEngine } = await import('./WorkflowEngine')
    const workflowEngine = new WorkflowEngine(this.supabase)

    return workflowEngine.executeWorkflow(
      webhook.workflowId,
      { webhook: payload, trigger: 'webhook' },
      'system'
    )
  }

  private async getWebhookConfig(
    webhookId: string
  ): Promise<WebhookConfig | null> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      url: data.url,
      events: data.events,
      secret: data.secret,
      status: data.status,
      workflowId: data.workflow_id,
    }
  }

  private async loadActiveWebhooks(): Promise<void> {
    const { data: webhooks, error } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('status', 'active')

    if (error) {
      console.error('Failed to load active webhooks:', error)
      return
    }

    webhooks?.forEach((webhook: any) => {
      this.webhookHandlers.set(webhook.id, async (payload: any) => {
        return this.handleWebhook(webhook.id, payload)
      })
    })
  }

  // ==========================================
  // SCHEDULE TRIGGER HANDLING
  // ==========================================

  async scheduleWorkflow(
    workflowId: string,
    scheduleConfig: {
      cron: string
      timezone?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<string> {
    const scheduleId = crypto.randomUUID()

    // Validate cron expression
    if (!this.isValidCronExpression(scheduleConfig.cron)) {
      throw new Error('Invalid cron expression')
    }

    // Calculate next run time
    const nextRunAt = this.calculateNextRun(
      scheduleConfig.cron,
      scheduleConfig.timezone || 'America/Chicago'
    )

    const { error } = await this.supabase.from('workflow_schedules').insert({
      id: scheduleId,
      workflow_id: workflowId,
      cron_expression: scheduleConfig.cron,
      timezone: scheduleConfig.timezone || 'America/Chicago',
      start_date: scheduleConfig.startDate,
      end_date: scheduleConfig.endDate,
      next_run_at: nextRunAt,
      status: 'active',
      created_at: new Date().toISOString(),
    })

    if (error) {
      throw new Error(`Failed to schedule workflow: ${error.message}`)
    }

    return scheduleId
  }

  async unscheduleWorkflow(scheduleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('workflow_schedules')
      .update({ status: 'inactive' })
      .eq('id', scheduleId)

    if (error) {
      throw new Error(`Failed to unschedule workflow: ${error.message}`)
    }
  }

  async toggleSchedule(
scheduleId: string, enabled: boolean  ): Promise<{ status: string; message: string }> {
    // Get current schedule status
    const { data: schedule, error: fetchError } = await this.supabase
      .from('workflow_schedules')
      .select('status')
      .eq('id', scheduleId)
      .single()

    if (fetchError || !schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`)
    }

    const newStatus = schedule.status === 'active' ? 'inactive' : 'active'

    const { error: updateError } = await this.supabase
      .from('workflow_schedules')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)

    if (updateError) {
      throw new Error(`Failed to toggle schedule: ${updateError.message}`)
    }

    return {
      status: newStatus,
      message: `Schedule ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
    }
  }

  async getScheduledWorkflows(
    organizationId: string
  ): Promise<ScheduleConfig[]> {
    let query = this.supabase
      .from('workflow_schedules')
      .select(
        `
        *,
        workflows!inner(
          id,
          name,
          organization_id,
          status
        )
      `
      )
      .eq('status', 'active')
      .eq('workflows.status', 'active')

    if (organizationId) {
      query = query.eq('workflows.organization_id', organizationId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to get scheduled workflows: ${error.message}`)
    }

    return (data || []).map((schedule: any) => ({
      id: schedule.id,
      workflowId: schedule.workflow_id,
      cronExpression: schedule.cron_expression,
      timezone: schedule.timezone,
      startDate: schedule.start_date,
      endDate: schedule.end_date,
      status: schedule.status,
      nextRunAt: schedule.next_run_at,
      lastRunAt: schedule.last_run_at,
    }))
  }

  async getSchedule(scheduleId: string): Promise<any | null> {
    const { data: schedule, error } = await this.supabase
      .from('workflow_schedules')
      .select(
        `
        *,
        workflows!inner(
          id,
          name,
          organization_id,
          status
        )
      `
      )
      .eq('id', scheduleId)
      .single()

    if (error) {
      console.error('Failed to get schedule:', error)
      return null
    }

    return {
      id: schedule.id,
      workflowId: schedule.workflow_id,
      workflowName: schedule.workflows.name,
      cronExpression: schedule.cron_expression,
      timezone: schedule.timezone,
      status: schedule.status,
      nextRunAt: schedule.next_run_at,
      lastRunAt: schedule.last_run_at,
      startDate: schedule.start_date,
      endDate: schedule.end_date,
      createdAt: schedule.created_at,
    }
  }

  async handleScheduled(workflowId: string, scheduleId?: string): Promise<string> {
    const { data: workflow, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('status', 'active')
      .single()

    if (error || !workflow) {
      throw new Error(
        `Scheduled workflow not found or not active: ${workflowId}`
      )
    }

    // Log scheduled execution
    await this.logTriggerEvent(
      'schedule',
      scheduleId || workflowId,
      {
        scheduledAt: new Date().toISOString(),
        scheduleId,
        workflowId
      },
      workflowId
    )

    const { WorkflowEngine } = await import('./WorkflowEngine')
    const workflowEngine = new WorkflowEngine(this.supabase)

    return workflowEngine.executeWorkflow(
      workflowId,
      {
        scheduledAt: new Date().toISOString(),
        trigger: 'scheduled',
        scheduleId,
      },
      workflow.created_by
    )
  }

  private async loadActiveSchedules(): Promise<void> {
    const { data: schedules, error } = await this.supabase
      .from('workflow_schedules')
      .select('*')
      .eq('status', 'active')

    if (error) {
      console.error('Failed to load active schedules:', error)
      return
    }

    schedules?.forEach((schedule: any) => {
      this.scheduledJobs.set(schedule.id, {
        workflowId: schedule.workflow_id,
        cronExpression: schedule.cron_expression,
        timezone: schedule.timezone,
        nextRun: schedule.next_run_at,
      })
    })
  }

  private async updateScheduleLastRun(scheduleId: string, nextRunAt: string): Promise<void> {
    const now = new Date().toISOString()

    const { error } = await this.supabase
      .from('workflow_schedules')
      .update({
        last_run_at: now,
        next_run_at: nextRunAt,
        updated_at: now
      })
      .eq('id', scheduleId)

    if (error) {
      console.error('Failed to update schedule last run:', error)
    }
  }

  // ==========================================
  // EXECUTION MANAGEMENT
  // ==========================================

  async getExecutionHistory(
    workflowId: string | null = null,
    limit: number = 50
  ): Promise<any[]> {
    let query = this.supabase.from('workflow_executions').select(`
        id,
        workflow_id,
        status,
        trigger_data,
        started_at,
        completed_at,
        duration_ms,
        error_message,
        result_data,
        user_id
      `)

    if (workflowId) {
      query = query.eq('workflow_id', workflowId)
    }

    const { data, error } = await query
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get execution history: ${error.message}`)
    }

    return data || []
  }

  async getExecutionDetails(executionId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('workflow_executions')
      .select(
        `
        *,
        execution_steps (
          step_index,
          action_type,
          status,
          started_at,
          completed_at,
          result_data,
          error_message
        )
      `
      )
      .eq('id', executionId)
      .single()

    if (error) {
      throw new Error(`Failed to get execution details: ${error.message}`)
    }

    return data
  }

  async getPendingExecutions(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('workflow_executions')
      .select(
        `
        id,
        workflow_id,
        status,
        started_at,
        trigger_data,
        user_id,
        workflows!inner(
          id,
          name,
          organization_id
        )
      `
      )
      .in('status', ['running', 'pending', 'paused'])
      .order('started_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get pending executions: ${error.message}`)
    }

    return data || []
  }

  async getExecutions(
    filters: {
      workflowId?: string
      scheduleId?: string
      status?: string
      limit?: number
      organizationId?: string
    } = {}
  ): Promise<any[]> {
    let query = this.supabase.from('workflow_executions').select(`
        id,
        workflow_id,
        status,
        started_at,
        completed_at,
        duration_ms,
        trigger_data,
        error_message,
        user_id,
        workflows!inner(
          id,
          name,
          organization_id
        )
      `)

    if (filters.workflowId) {
      query = query.eq('workflow_id', filters.workflowId)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.organizationId) {
      query = query.eq('workflows.organization_id', filters.organizationId)
    }

    const { data, error } = await query
      .order('started_at', { ascending: false })
      .limit(filters.limit || 50)

    if (error) {
      throw new Error(`Failed to get executions: ${error.message}`)
    }

    let executions = data || []

    // Filter by schedule ID if provided (post-query filtering)
    if (filters.scheduleId) {
      executions = executions.filter(
        (e: any) =>
          e.trigger_data?.scheduleId === filters.scheduleId ||
          (e.trigger_data?.trigger === 'schedule' &&
            e.trigger_data?.scheduleId === filters.scheduleId)
      )
    }

    return executions
  }

  async executeWorkflowNow(
    workflowId: string,
    triggerData: any = {},
    userId: string
  ): Promise<any> {
    const executionId = crypto.randomUUID()

    try {
      // Validate workflow exists and is active
      const { data: workflow, error: workflowError } = await this.supabase
        .from('workflows')
        .select('id, name, organization_id, status')
        .eq('id', workflowId)
        .eq('status', 'active')
        .single()

      if (workflowError || !workflow) {
        throw new Error('Workflow not found or not active')
      }

      // Start execution record
      const { error: insertError } = await this.supabase
        .from('workflow_executions')
        .insert({
          id: executionId,
          workflow_id: workflowId,
          status: 'running',
          trigger_data: {
            ...triggerData,
            trigger: 'manual',
            triggeredBy: userId,
            executedAt: new Date().toISOString(),
          },
          started_at: new Date().toISOString(),
          user_id: userId,
        })

      if (insertError) {
        throw new Error(`Failed to start execution: ${insertError.message}`)
      }

      // Log trigger event
      await this.logTriggerEvent('manual', executionId, triggerData, workflowId)

      // Execute workflow asynchronously
      this.executeWorkflowAsync(workflowId, triggerData, userId, executionId)

      return {
        executionId,
        workflowId,
        workflowName: workflow.name,
        status: 'running',
        startedAt: new Date().toISOString(),
        triggerData,
      }
    } catch (error) {
      // Mark as failed if execution record was created
      await this.supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', executionId)

      throw error
    }
  }

  async handleManualTrigger(
    workflowId: string,
    triggerData: any,
    userId: string
  ): Promise<string> {
    const executionId = crypto.randomUUID()

    try {
      // Start execution record
      const { error: insertError } = await this.supabase
        .from('workflow_executions')
        .insert({
          id: executionId,
          workflow_id: workflowId,
          status: 'running',
          trigger_data: {
            ...triggerData,
            trigger: 'manual',
            triggeredBy: userId,
          },
          started_at: new Date().toISOString(),
          user_id: userId,
        })

      if (insertError) {
        throw new Error(`Failed to start execution: ${insertError.message}`)
      }

      // Log trigger event
      await this.logTriggerEvent('manual', executionId, triggerData, workflowId)

      // Execute workflow asynchronously
      this.executeWorkflowAsync(workflowId, triggerData, userId, executionId)

      return executionId
    } catch (error) {
      // Mark as failed
      await this.supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', executionId)

      throw error
    }
  }

  private async executeWorkflowAsync(
    workflowId: string,
    triggerData: any,
    userId: string,
    executionId: string
  ): Promise<void> {
    try {
      const startTime = Date.now()

      // Import and use WorkflowEngine for actual execution
      const { WorkflowEngine } = await import('./WorkflowEngine')
      const workflowEngine = new WorkflowEngine(this.supabase)

      // Execute the workflow using WorkflowEngine
      // The WorkflowEngine.executeWorkflow method handles:
      // 1. Loading workflow definition
      // 2. Executing each step
      // 3. Handling conditions and branching
      // 4. Processing integrations
      // 5. Handling errors and retries
      await workflowEngine.executeWorkflow(
        workflowId,
        triggerData,
        userId,
        executionId
      )

      const endTime = Date.now()
      const duration = endTime - startTime

      // Update execution with completion time and duration
      const { error: updateError } = await this.supabase
        .from('workflow_executions')
        .update({
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', executionId)

      if (updateError) {
        console.error('Failed to update execution completion time:', updateError)
      }
    } catch (error) {
      console.error('Error in async workflow execution:', error)

      // Mark as failed
      await this.supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', executionId)
    }
  }

  // ==========================================
  // CONDITIONAL LOGIC
  // ==========================================

  async getConditionalResults(executionId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('execution_steps')
      .select('*')
      .eq('execution_id', executionId)
      .eq('action_type', 'condition')
      .order('step_index', { ascending: true })

    if (error) {
      throw new Error(`Failed to get conditional results: ${error.message}`)
    }

    return data || []
  }

  // ==========================================
  // EMAIL TRIGGER HANDLING
  // ==========================================

  async handleEmailTrigger(emailData: {
    from: string
    to: string
    subject: string
    body: string
    messageId: string
  }): Promise<string[]> {
    // Find workflows triggered by email
    const { data: workflows, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('status', 'active')
      .contains('trigger_config', { type: 'email' })

    if (error) {
      throw new Error(
        `Failed to find email-triggered workflows: ${error.message}`
      )
    }

    const executionIds: string[] = []

    for (const workflow of workflows || []) {
      const triggerConfig = workflow.trigger_config

      // Check if email matches trigger criteria
      if (this.emailMatchesTrigger(emailData, triggerConfig.config)) {
        await this.logTriggerEvent(
          'email',
          emailData.messageId,
          emailData,
          workflow.id
        )

        const { WorkflowEngine } = await import('./WorkflowEngine')
        const workflowEngine = new WorkflowEngine(this.supabase)

        const executionId = await workflowEngine.executeWorkflow(
          workflow.id,
          { email: emailData, trigger: 'email' },
          workflow.created_by
        )

        executionIds.push(executionId)
      }
    }

    return executionIds
  }

  private emailMatchesTrigger(emailData: any, triggerConfig: any): boolean {
    // Implement email matching logic
    if (
      triggerConfig.fromEmail &&
      !emailData.from.includes(triggerConfig.fromEmail)
    ) {
      return false
    }

    if (
      triggerConfig.subject &&
      !emailData.subject.includes(triggerConfig.subject)
    ) {
      return false
    }

    return true
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  private isValidCronExpression(cron: string): boolean {
    // Basic cron validation - 5 parts separated by spaces
    const parts = cron.trim().split(/\s+/)
    if (parts.length !== 5) return false

    const ranges = [
      { min: 0, max: 59 }, // minute
      { min: 0, max: 23 }, // hour
      { min: 1, max: 31 }, // day
      { min: 1, max: 12 }, // month
      { min: 0, max: 6 }, // day of week
    ]

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]

      if (part === '*' || part === '?') continue
      if (part.includes('/') || part.includes('-') || part.includes(','))
        continue

      const num = parseInt(part)
      if (isNaN(num) || num < ranges[i].min || num > ranges[i].max) {
        return false
      }
    }

    return true
  }

  private calculateNextRun(
    cronExpression: string,
    timezone: string = 'America/Chicago'
  ): string {
    try {
      const cronParser = require('cron-parser')
      const interval = cronParser.parseExpression(cronExpression, {
        tz: timezone,
        currentDate: new Date()
      })
      const nextDate = interval.next().toDate()
      return nextDate.toISOString()
    } catch (error) {
      console.error('Error parsing cron expression:', error)
      // Fallback: add 1 day
      const now = new Date()
      now.setDate(now.getDate() + 1)
      return now.toISOString()
    }
  }

  private generateSecret(length: number = 32): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let secret = ''

    for (let i = 0; i < length; i++) {
      secret += charset.charAt(Math.floor(Math.random() * charset.length))
    }

    return secret
  }

  private async logTriggerEvent(
    triggerType: string,
    triggerId: string,
    triggerData: any,
    workflowId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('trigger_events').insert({
        id: crypto.randomUUID(),
        trigger_type: triggerType,
        trigger_id: triggerId,
        workflow_id: workflowId,
        trigger_data: triggerData,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error('Failed to log trigger event:', error)
      }
    } catch (error) {
      console.error('Failed to log trigger event:', error)
    }
  }

  // ==========================================
  // MANAGEMENT METHODS
  // ==========================================

  async getAllTriggers(organizationId: string): Promise<TriggerConfig[]> {
    const triggers: TriggerConfig[] = []

    // Get webhook triggers
    const { data: webhooks } = await this.supabase
      .from('webhooks')
      .select(
        `
        *,
        workflows!inner(organization_id)
      `
      )
      .eq('workflows.organization_id', organizationId)

    webhooks?.forEach((webhook: any) => {
      triggers.push({
        id: webhook.id,
        type: 'webhook',
        config: {
          url: webhook.url,
          events: webhook.events,
          secret: webhook.secret ? '***' : undefined,
        },
        workflowId: webhook.workflow_id,
        status: webhook.status,
      })
    })

    // Get schedule triggers
    const { data: schedules } = await this.supabase
      .from('workflow_schedules')
      .select(
        `
        *,
        workflows!inner(organization_id)
      `
      )
      .eq('workflows.organization_id', organizationId)

    schedules?.forEach((schedule: any) => {
      triggers.push({
        id: schedule.id,
        type: 'schedule',
        config: {
          cron: schedule.cron_expression,
          timezone: schedule.timezone,
          nextRun: schedule.next_run_at,
        },
        workflowId: schedule.workflow_id,
        status: schedule.status,
      })
    })

    return triggers
  }

  async getTriggerStats(
    organizationId: string,
    timeRange: string = '24h'
  ): Promise<any> {
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

    const { data: events, error } = await this.supabase
      .from('trigger_events')
      .select(
        `
        trigger_type,
        workflows!inner(organization_id)
      `
      )
      .eq('workflows.organization_id', organizationId)
      .gte('created_at', date.toISOString())

    if (error) {
      throw new Error(`Failed to get trigger stats: ${error.message}`)
    }

    const stats = {
      totalTriggers: events?.length || 0,
      webhookTriggers:
        events?.filter((e: any) => e.trigger_type === 'webhook').length || 0,
      scheduleTriggers:
        events?.filter((e: any) => e.trigger_type === 'schedule').length || 0,
      emailTriggers:
        events?.filter((e: any) => e.trigger_type === 'email').length || 0,
      formTriggers:
        events?.filter((e: any) => e.trigger_type === 'form').length || 0,
      timeRange,
    }

    return stats
  }

  // ==========================================
  // WEBHOOK SECURITY
  // ==========================================

  async rotateWebhookSecret(webhookId: string): Promise<string> {
    const newSecret = this.generateSecret()

    const { error } = await this.supabase
      .from('webhooks')
      .update({ secret: newSecret })
      .eq('id', webhookId)

    if (error) {
      throw new Error(`Failed to rotate webhook secret: ${error.message}`)
    }

    return newSecret
  }

  // ==========================================
  // MONITORING AND DEBUGGING
  // ==========================================

  async getRecentTriggerEvents(
    organizationId: string,
    limit: number = 50
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('trigger_events')
      .select(
        `
        *,
        workflows!inner(
          name,
          organization_id
        )
      `
      )
      .eq('workflows.organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to get recent trigger events: ${error.message}`)
    }

    return data || []
  }

  async testWebhook(webhookId: string, testPayload: any): Promise<any> {
    const webhook = await this.getWebhookConfig(webhookId)
    if (!webhook) {
      throw new Error('Webhook not found')
    }

    try {
      const executionId = await this.handleWebhook(webhookId, {
        payload: testPayload,
        headers: { 'x-test-webhook': 'true' },
      })

      return {
        success: true,
        executionId,
        message: 'Webhook test successful',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Webhook test failed',
      }
    }
  }

  // ==========================================
  // CLEANUP AND MAINTENANCE
  // ==========================================

  async cleanupInactiveTriggers(): Promise<number> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Cleanup inactive webhooks
    const { data: deletedWebhooks, error: webhookError } = await this.supabase
      .from('webhooks')
      .delete()
      .eq('status', 'inactive')
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('id')

    // Cleanup inactive schedules
    const { data: deletedSchedules, error: scheduleError } = await this.supabase
      .from('workflow_schedules')
      .delete()
      .eq('status', 'inactive')
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('id')

    const totalCleaned =
      (deletedWebhooks?.length || 0) + (deletedSchedules?.length || 0)

    if (webhookError) {
      console.error('Failed to cleanup webhooks:', webhookError)
    }

    if (scheduleError) {
      console.error('Failed to cleanup schedules:', scheduleError)
    }

    return totalCleaned
  }

  async validateAllActiveTriggers(): Promise<{
    valid: number
    invalid: number
    issues: string[]
  }> {
    const issues: string[] = []
    let valid = 0
    let invalid = 0

    // Validate webhooks
    const { data: webhooks } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('status', 'active')

    for (const webhook of webhooks || []) {
      try {
        // Check if associated workflow exists and is active
        const { data: workflow } = await this.supabase
          .from('workflows')
          .select('status')
          .eq('id', webhook.workflow_id)
          .single()

        if (!workflow || workflow.status !== 'active') {
          issues.push(
            `Webhook ${webhook.id} references inactive workflow ${webhook.workflow_id}`
          )
          invalid++
        } else {
          valid++
        }
      } catch (error) {
        issues.push(
          `Failed to validate webhook ${webhook.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        invalid++
      }
    }

    // Validate schedules
    const { data: schedules } = await this.supabase
      .from('workflow_schedules')
      .select('*')
      .eq('status', 'active')

    for (const schedule of schedules || []) {
      try {
        // Validate cron expression
        if (!this.isValidCronExpression(schedule.cron_expression)) {
          issues.push(
            `Schedule ${schedule.id} has invalid cron expression: ${schedule.cron_expression}`
          )
          invalid++
          continue
        }

        // Check if associated workflow exists and is active
        const { data: workflow } = await this.supabase
          .from('workflows')
          .select('status')
          .eq('id', schedule.workflow_id)
          .single()

        if (!workflow || workflow.status !== 'active') {
          issues.push(
            `Schedule ${schedule.id} references inactive workflow ${schedule.workflow_id}`
          )
          invalid++
        } else {
          valid++
        }
      } catch (error) {
        issues.push(
          `Failed to validate schedule ${schedule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        invalid++
      }
    }

    return { valid, invalid, issues }
  }

  // ==========================================
  // HEALTH CHECK AND STATUS
  // ==========================================

  async getSystemHealth(): Promise<any> {
    const health = {
      status: 'healthy',
      checks: {
        database: { status: 'unknown', latency: 0 },
        webhooks: { status: 'unknown', count: 0 },
        schedules: { status: 'unknown', count: 0 },
        executions: { status: 'unknown', pending: 0 },
      },
      timestamp: new Date().toISOString(),
      uptime: this.systemUptime,
    }

    try {
      // Database health check
      const dbStart = Date.now()
      const { error: dbError } = await this.supabase
        .from('workflows')
        .select('id')
        .limit(1)

      health.checks.database = {
        status: dbError ? 'error' : 'healthy',
        latency: Date.now() - dbStart,
      }

      // Webhooks health check
      const { data: webhooks, error: webhookError } = await this.supabase
        .from('webhooks')
        .select('id')
        .eq('status', 'active')

      health.checks.webhooks = {
        status: webhookError ? 'error' : 'healthy',
        count: webhooks?.length || 0,
      }

      // Schedules health check
      const { data: schedules, error: scheduleError } = await this.supabase
        .from('workflow_schedules')
        .select('id')
        .eq('status', 'active')

      health.checks.schedules = {
        status: scheduleError ? 'error' : 'healthy',
        count: schedules?.length || 0,
      }

      // Executions health check
      const { data: executions, error: executionError } = await this.supabase
        .from('workflow_executions')
        .select('id')
        .in('status', ['running', 'pending'])

      health.checks.executions = {
        status: executionError ? 'error' : 'healthy',
        pending: executions?.length || 0,
      }

      // Overall status
      const hasErrors = Object.values(health.checks).some(
        check => check.status === 'error'
      )
      health.status = hasErrors ? 'degraded' : 'healthy'
    } catch (error) {
      health.status = 'error'
      console.error('Health check failed:', error)
    }

    return health
  }

  // ==========================================
  // FORM TRIGGER HANDLING
  // ==========================================

  async handleFormTrigger(formData: {
    formId: string
    fields: Record<string, any>
    submittedBy?: string
    submissionId: string
  }): Promise<string[]> {
    // Find workflows triggered by form submission
    const { data: workflows, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('status', 'active')
      .contains('trigger_config', { type: 'form' })

    if (error) {
      throw new Error(
        `Failed to find form-triggered workflows: ${error.message}`
      )
    }

    const executionIds: string[] = []

    for (const workflow of workflows || []) {
      const triggerConfig = workflow.trigger_config

      // Check if form matches trigger criteria
      if (this.formMatchesTrigger(formData, triggerConfig.config)) {
        await this.logTriggerEvent(
          'form',
          formData.submissionId,
          formData,
          workflow.id
        )

        const { WorkflowEngine } = await import('./WorkflowEngine')
        const workflowEngine = new WorkflowEngine(this.supabase)

        const executionId = await workflowEngine.executeWorkflow(
          workflow.id,
          { form: formData, trigger: 'form' },
          formData.submittedBy || 'anonymous'
        )

        executionIds.push(executionId)
      }
    }

    return executionIds
  }

  private formMatchesTrigger(formData: any, triggerConfig: any): boolean {
    // Check if form ID matches
    if (triggerConfig.formId && triggerConfig.formId !== formData.formId) {
      return false
    }

    // Check if required fields are present
    if (triggerConfig.requiredFields) {
      for (const field of triggerConfig.requiredFields) {
        if (!formData.fields[field]) {
          return false
        }
      }
    }

    return true
  }

  // ==========================================
  // ERROR HANDLING AND RETRY LOGIC
  // ==========================================

  async retryFailedExecution(executionId: string): Promise<string> {
    // Get failed execution details
    const { data: execution, error } = await this.supabase
      .from('workflow_executions')
      .select('*')
      .eq('id', executionId)
      .eq('status', 'failed')
      .single()

    if (error || !execution) {
      throw new Error('Failed execution not found')
    }

    // Create new execution for retry
    const newExecutionId = crypto.randomUUID()

    const { error: insertError } = await this.supabase
      .from('workflow_executions')
      .insert({
        id: newExecutionId,
        workflow_id: execution.workflow_id,
        status: 'running',
        trigger_data: {
          ...execution.trigger_data,
          retryOf: executionId,
          retryCount: (execution.trigger_data?.retryCount || 0) + 1,
        },
        started_at: new Date().toISOString(),
        user_id: execution.user_id,
      })

    if (insertError) {
      throw new Error(
        `Failed to create retry execution: ${insertError.message}`
      )
    }

    // Execute workflow asynchronously
    this.executeWorkflowAsync(
      execution.workflow_id,
      execution.trigger_data,
      execution.user_id,
      newExecutionId
    )

    return newExecutionId
  }

  // ==========================================
  // PERFORMANCE MONITORING
  // ==========================================

  async getPerformanceMetrics(timeRange: string = '24h'): Promise<any> {
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
      .from('workflow_executions')
      .select('status, duration_ms, started_at, completed_at')
      .gte('started_at', date.toISOString())

    if (error) {
      throw new Error(`Failed to get performance metrics: ${error.message}`)
    }

    const metrics = {
      timeRange,
      totalExecutions: executions?.length || 0,
      avgExecutionTime: 0,
      minExecutionTime: 0,
      maxExecutionTime: 0,
      successRate: 0,
      executionsPerHour: 0,
      peakHour: '00:00',
    }

    if (executions && executions.length > 0) {
      const completedExecutions = executions.filter(
        (e: any) => e.status === 'completed' && e.duration_ms
      )
      const durations = completedExecutions
        .map((e: any) => e.duration_ms)
        .filter((d: any) => d > 0)

      if (durations.length > 0) {
        metrics.avgExecutionTime =
          durations.reduce(({ sum, d }: any) => sum + d, 0) / durations.length
        metrics.minExecutionTime = Math.min(...durations)
        metrics.maxExecutionTime = Math.max(...durations)
      }

      metrics.successRate =
        (completedExecutions.length / executions.length) * 100

      // Calculate executions per hour
      const hours = (Date.now() - date.getTime()) / (1000 * 60 * 60)
      metrics.executionsPerHour = executions.length / hours

      // Find peak hour
      const hourCounts: { [hour: string]: number } = {}
      executions.forEach((e: any) => {
        const hour =
          new Date(e.started_at).getHours().toString().padStart(2, '0') + ':00'
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      })

      metrics.peakHour = Object.keys(hourCounts).reduce(
        (a, b) => (hourCounts[a] > hourCounts[b] ? a : b),
        '00:00'
      )
    }

    return metrics
  }
}
