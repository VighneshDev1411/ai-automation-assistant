// src/lib/workflow-engine/core/TriggerSystem.ts

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export interface TriggerConfig {
  id: string
  type: 'webhook' | 'schedule' | 'manual' | 'email' | 'form'
  config: any
  workflowId: string
  status: 'active' | 'inactive'
}

export interface WebhookConfig {
  id: string
  workflowId: string
  url: string
  events: string[]
  secret?: string
  headers?: Record<string, string>
  status: 'active' | 'inactive'
  createdBy: string
  createdAt: string
}

export interface ScheduleConfig {
  id: string
  workflowId: string
  cronExpression: string
  timezone: string
  startDate?: string
  endDate?: string
  status: 'active' | 'inactive'
  nextRunAt?: string
  lastRunAt?: string
}

export class TriggerSystem {
  private supabase: SupabaseClient<Database>
  private webhookHandlers = new Map<string, Function>()
  private scheduledJobs = new Map<string, any>()

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
    this.initializeSystem()
  }

  private async initializeSystem(): Promise<void> {
    // Initialize webhook handlers
    await this.loadActiveWebhooks()
    
    // Initialize scheduled jobs
    await this.loadActiveSchedules()
  }

  // ========================================
  // WEBHOOK TRIGGER HANDLING
  // ========================================

  async handleWebhook(webhookId: string, payload: any): Promise<string> {
    // Get webhook configuration
    const webhook = await this.getWebhookConfig(webhookId)
    if (!webhook) {
      throw new Error(`Webhook not found: ${webhookId}`)
    }

    if (webhook.status !== 'active') {
      throw new Error(`Webhook is not active: ${webhookId}`)
    }

    // Verify webhook signature if secret is configured
    if (webhook.secret && payload.headers) {
      const isValidSignature = await this.verifyWebhookSignature(
        payload.payload, 
        webhook.secret, 
        payload.headers['x-webhook-signature'] || payload.headers['x-hub-signature-256']
      )
      
      if (!isValidSignature) {
        throw new Error('Invalid webhook signature')
      }
    }

    // Find workflow associated with webhook
    const { data: workflow, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', webhook.workflowId)
      .eq('status', 'active')
      .single()

    if (error || !workflow) {
      throw new Error(`Workflow not found or not active: ${webhook.workflowId}`)
    }

    // Log webhook received
    await this.logTriggerEvent('webhook', webhookId, payload, workflow.id)

    // Import WorkflowEngine to avoid circular dependency
    const { WorkflowEngine } = await import('./WorkflowEngine')
    const workflowEngine = new WorkflowEngine(this.supabase)
    
    return workflowEngine.executeWorkflow(
      workflow.id,
      {
        ...payload.payload,
        webhook: {
          id: webhookId,
          headers: payload.headers,
          receivedAt: new Date().toISOString()
        }
      },
      workflow.created_by
    )
  }

  async registerWebhook(workflowId: string, triggerConfig: any): Promise<string> {
    const webhookId = crypto.randomUUID()
    const webhookUrl = `/api/webhooks/${webhookId}`
    
    // Validate workflow exists and is active
    const { data: workflow, error: workflowError } = await this.supabase
      .from('workflows')
      .select('id, status, organization_id, created_by')
      .eq('id', workflowId)
      .single()

    if (workflowError || !workflow) {
      throw new Error('Workflow not found')
    }

    if (workflow.status !== 'active') {
      throw new Error('Cannot register webhook for inactive workflow')
    }

    // Store webhook configuration
    const { error } = await this.supabase
      .from('webhooks')
      .insert({
        id: webhookId,
        workflow_id: workflowId,
        organization_id: workflow.organization_id,
        url: webhookUrl,
        events: triggerConfig.events || ['*'],
        secret: triggerConfig.secret,
        headers: triggerConfig.headers || {},
        status: 'active',
        created_by: workflow.created_by,
        created_at: new Date().toISOString()
      })

    if (error) {
      throw new Error(`Failed to register webhook: ${error.message}`)
    }

    return webhookId
  }

  async deactivateWebhook(webhookId: string): Promise<void> {
    const { error } = await this.supabase
      .from('webhooks')
      .update({ status: 'inactive' })
      .eq('id', webhookId)

    if (error) {
      throw new Error(`Failed to deactivate webhook: ${error.message}`)
    }
  }

  async getWebhookConfig(webhookId: string): Promise<WebhookConfig | null> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      workflowId: data.workflow_id,
      url: data.url,
      events: data.events || [],
      secret: data.secret,
      headers: data.headers || {},
      status: data.status,
      createdBy: data.created_by,
      createdAt: data.created_at
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

    webhooks?.forEach(webhook => {
      this.webhookHandlers.set(webhook.id, async (payload: any) => {
        return this.handleWebhook(webhook.id, payload)
      })
    })
  }

  // ========================================
  // SCHEDULE TRIGGER HANDLING
  // ========================================

  async handleScheduled(workflowId: string): Promise<string> {
    const { data: workflow, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('status', 'active')
      .single()

    if (error || !workflow) {
      throw new Error(`Scheduled workflow not found or not active: ${workflowId}`)
    }

    // Log scheduled execution
    await this.logTriggerEvent('schedule', workflowId, { scheduledAt: new Date().toISOString() }, workflowId)

    // Update last run time
    await this.updateScheduleLastRun(workflowId)

    const { WorkflowEngine } = await import('./WorkflowEngine')
    const workflowEngine = new WorkflowEngine(this.supabase)
    
    return workflowEngine.executeWorkflow(
      workflowId,
      { 
        scheduledAt: new Date().toISOString(),
        trigger: 'schedule'
      },
      workflow.created_by
    )
  }

  async scheduleWorkflow(workflowId: string, scheduleConfig: {
    cron: string
    timezone?: string
    startDate?: string
    endDate?: string
  }): Promise<string> {
    const scheduleId = crypto.randomUUID()
    
    // Validate cron expression
    if (!this.isValidCronExpression(scheduleConfig.cron)) {
      throw new Error('Invalid cron expression')
    }

    // Calculate next run time
    const nextRunAt = this.calculateNextRun(scheduleConfig.cron, scheduleConfig.timezone)

    const { error } = await this.supabase
      .from('workflow_schedules')
      .insert({
        id: scheduleId,
        workflow_id: workflowId,
        cron_expression: scheduleConfig.cron,
        timezone: scheduleConfig.timezone || 'UTC',
        start_date: scheduleConfig.startDate,
        end_date: scheduleConfig.endDate,
        next_run_at: nextRunAt,
        status: 'active',
        created_at: new Date().toISOString()
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

  async getScheduledWorkflows(organizationId: string): Promise<ScheduleConfig[]> {
    const { data, error } = await this.supabase
      .from('workflow_schedules')
      .select(`
        *,
        workflows!inner(
          id,
          name,
          organization_id,
          status
        )
      `)
      .eq('workflows.organization_id', organizationId)
      .eq('status', 'active')
      .eq('workflows.status', 'active')

    if (error) {
      throw new Error(`Failed to get scheduled workflows: ${error.message}`)
    }

    return (data || []).map(schedule => ({
      id: schedule.id,
      workflowId: schedule.workflow_id,
      cronExpression: schedule.cron_expression,
      timezone: schedule.timezone,
      startDate: schedule.start_date,
      endDate: schedule.end_date,
      status: schedule.status,
      nextRunAt: schedule.next_run_at,
      lastRunAt: schedule.last_run_at
    }))
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

    schedules?.forEach(schedule => {
      this.scheduledJobs.set(schedule.id, {
        workflowId: schedule.workflow_id,
        cronExpression: schedule.cron_expression,
        timezone: schedule.timezone,
        nextRun: schedule.next_run_at
      })
    })
  }

  private async updateScheduleLastRun(workflowId: string): Promise<void> {
    const now = new Date().toISOString()
    
    const { error } = await this.supabase
      .from('workflow_schedules')
      .update({ 
        last_run_at: now,
        next_run_at: null // Would calculate next run time
      })
      .eq('workflow_id', workflowId)

    if (error) {
      console.error('Failed to update schedule last run:', error)
    }
  }

  // ========================================
  // EMAIL TRIGGER HANDLING
  // ========================================

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
      throw new Error(`Failed to find email-triggered workflows: ${error.message}`)
    }

    const executionIds: string[] = []

    for (const workflow of workflows || []) {
      const triggerConfig = workflow.trigger_config
      
      // Check if email matches trigger criteria
      if (this.emailMatchesTrigger(emailData, triggerConfig.config)) {
        try {
          await this.logTriggerEvent('email', workflow.id, emailData, workflow.id)

          const { WorkflowEngine } = await import('./WorkflowEngine')
          const workflowEngine = new WorkflowEngine(this.supabase)
          
          const executionId = await workflowEngine.executeWorkflow(
            workflow.id,
            {
              email: emailData,
              trigger: 'email'
            },
            workflow.created_by
          )
          
          executionIds.push(executionId)
        } catch (error) {
          console.error(`Failed to execute email-triggered workflow ${workflow.id}:`, error)
        }
      }
    }

    return executionIds
  }

  private emailMatchesTrigger(emailData: any, triggerConfig: any): boolean {
    // Check sender filter
    if (triggerConfig.fromFilter) {
      const fromPattern = new RegExp(triggerConfig.fromFilter, 'i')
      if (!fromPattern.test(emailData.from)) {
        return false
      }
    }

    // Check subject filter
    if (triggerConfig.subjectFilter) {
      const subjectPattern = new RegExp(triggerConfig.subjectFilter, 'i')
      if (!subjectPattern.test(emailData.subject)) {
        return false
      }
    }

    // Check recipient filter
    if (triggerConfig.toEmail) {
      if (emailData.to !== triggerConfig.toEmail) {
        return false
      }
    }

    return true
  }

  // ========================================
  // FORM TRIGGER HANDLING
  // ========================================

  async handleFormSubmission(formId: string, formData: any): Promise<string[]> {
    // Find workflows triggered by this form
    const { data: workflows, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('status', 'active')
      .contains('trigger_config', { type: 'form', config: { formId } })

    if (error) {
      throw new Error(`Failed to find form-triggered workflows: ${error.message}`)
    }

    const executionIds: string[] = []

    for (const workflow of workflows || []) {
      try {
        await this.logTriggerEvent('form', formId, formData, workflow.id)

        const { WorkflowEngine } = await import('./WorkflowEngine')
        const workflowEngine = new WorkflowEngine(this.supabase)
        
        const executionId = await workflowEngine.executeWorkflow(
          workflow.id,
          {
            form: {
              id: formId,
              data: formData,
              submittedAt: new Date().toISOString()
            },
            trigger: 'form'
          },
          workflow.created_by
        )
        
        executionIds.push(executionId)
      } catch (error) {
        console.error(`Failed to execute form-triggered workflow ${workflow.id}:`, error)
      }
    }

    return executionIds
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private async verifyWebhookSignature(
    payload: any, 
    secret: string, 
    signature: string
  ): Promise<boolean> {
    if (!signature) return false

    try {
      const expectedSignature = await this.generateWebhookSignature(payload, secret)
      return signature === expectedSignature
    } catch (error) {
      console.error('Failed to verify webhook signature:', error)
      return false
    }
  }

  private async generateWebhookSignature(payload: any, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(payload) + secret)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return 'sha256=' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private isValidCronExpression(cron: string): boolean {
    // Basic cron validation
    const parts = cron.trim().split(/\s+/)
    if (parts.length < 5 || parts.length > 6) {
      return false
    }

    // Validate each part (minute, hour, day, month, day-of-week, year?)
    const ranges = [
      { min: 0, max: 59 },  // minute
      { min: 0, max: 23 },  // hour
      { min: 1, max: 31 },  // day
      { min: 1, max: 12 },  // month
      { min: 0, max: 6 },   // day of week
      { min: 1970, max: 3000 } // year (optional)
    ]

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      
      if (part === '*' || part === '?') continue
      if (part.includes('/') || part.includes('-') || part.includes(',')) continue
      
      const num = parseInt(part)
      if (isNaN(num) || num < ranges[i].min || num > ranges[i].max) {
        return false
      }
    }

    return true
  }

  private calculateNextRun(cronExpression: string, timezone: string = 'UTC'): string {
    // This would use a proper cron parser library in production
    // For now, return a simple calculation
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1) // Next minute as placeholder
    return now.toISOString()
  }

  private async logTriggerEvent(
    triggerType: string,
    triggerId: string,
    triggerData: any,
    workflowId: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('trigger_events')
        .insert({
          trigger_type: triggerType,
          trigger_id: triggerId,
          workflow_id: workflowId,
          trigger_data: triggerData,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to log trigger event:', error)
      }
    } catch (error) {
      console.error('Failed to log trigger event:', error)
    }
  }

  // ========================================
  // MANAGEMENT METHODS
  // ========================================

  async getAllTriggers(organizationId: string): Promise<TriggerConfig[]> {
    const triggers: TriggerConfig[] = []

    // Get webhook triggers
    const { data: webhooks } = await this.supabase
      .from('webhooks')
      .select(`
        *,
        workflows!inner(organization_id)
      `)
      .eq('workflows.organization_id', organizationId)

    webhooks?.forEach(webhook => {
      triggers.push({
        id: webhook.id,
        type: 'webhook',
        config: {
          url: webhook.url,
          events: webhook.events,
          secret: webhook.secret ? '***' : undefined
        },
        workflowId: webhook.workflow_id,
        status: webhook.status
      })
    })

    // Get schedule triggers
    const { data: schedules } = await this.supabase
      .from('workflow_schedules')
      .select(`
        *,
        workflows!inner(organization_id)
      `)
      .eq('workflows.organization_id', organizationId)

    schedules?.forEach(schedule => {
      triggers.push({
        id: schedule.id,
        type: 'schedule',
        config: {
          cron: schedule.cron_expression,
          timezone: schedule.timezone,
          nextRun: schedule.next_run_at
        },
        workflowId: schedule.workflow_id,
        status: schedule.status
      })
    })

    return triggers
  }

  async getTriggerStats(organizationId: string, timeRange: string = '24h'): Promise<any> {
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
      .select(`
        trigger_type,
        workflows!inner(organization_id)
      `)
      .eq('workflows.organization_id', organizationId)
      .gte('created_at', date.toISOString())

    if (error) {
      throw new Error(`Failed to get trigger stats: ${error.message}`)
    }

    const stats = {
      totalTriggers: events?.length || 0,
      webhookTriggers: events?.filter(e => e.trigger_type === 'webhook').length || 0,
      scheduleTriggers: events?.filter(e => e.trigger_type === 'schedule').length || 0,
      emailTriggers: events?.filter(e => e.trigger_type === 'email').length || 0,
      formTriggers: events?.filter(e => e.trigger_type === 'form').length || 0,
      timeRange
    }

    return stats
  }

  // ========================================
  // WEBHOOK SECURITY
  // ========================================

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

  private generateSecret(length: number = 32): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let secret = ''
    
    for (let i = 0; i < length; i++) {
      secret += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    
    return secret
  }

  // ========================================
  // MONITORING AND DEBUGGING
  // ========================================

  async getRecentTriggerEvents(
    organizationId: string, 
    limit: number = 50
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('trigger_events')
      .select(`
        *,
        workflows!inner(
          name,
          organization_id
        )
      `)
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
        headers: { 'x-test-webhook': 'true' }
      })

      return {
        success: true,
        executionId,
        message: 'Webhook test successful'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Webhook test failed'
      }
    }
  }

  // ========================================
  // CLEANUP AND MAINTENANCE
  // ========================================

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

    const totalCleaned = (deletedWebhooks?.length || 0) + (deletedSchedules?.length || 0)
    
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
          issues.push(`Webhook ${webhook.id} references inactive workflow ${webhook.workflow_id}`)
          invalid++
        } else {
          valid++
        }
      } catch (error) {
        issues.push(`Failed to validate webhook ${webhook.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
          issues.push(`Schedule ${schedule.id} has invalid cron expression: ${schedule.cron_expression}`)
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
          issues.push(`Schedule ${schedule.id} references inactive workflow ${schedule.workflow_id}`)
          invalid++
        } else {
          valid++
        }
      } catch (error) {
        issues.push(`Failed to validate schedule ${schedule.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        invalid++
      }
    }

    return { valid, invalid, issues }
  }
}