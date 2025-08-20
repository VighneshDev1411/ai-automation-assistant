// src/lib/supabase/services/workflow.service.ts
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { BaseService } from './base.service'

type Workflow = Database['public']['Tables']['workflows']['Row'] & { version?: number }
type WorkflowInsert = Database['public']['Tables']['workflows']['Insert']
type WorkflowUpdate = Database['public']['Tables']['workflows']['Update']
type WorkflowStatus = Database['public']['Enums']['workflow_status']

export class WorkflowService extends BaseService<'workflows'> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'workflows')
  }

  async findByOrganization(
    organizationId: string,
    options?: {
      status?: WorkflowStatus
      isTemplate?: boolean
      limit?: number
      offset?: number
    }
  ) {
    let query = this.supabase
      .from('workflows')
      .select('*')
      .eq('organization_id', organizationId)

    if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.isTemplate !== undefined) {
      query = query.eq('is_template', options.isTemplate)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      )
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async searchWorkflows(
    searchQuery: string,
    organizationId?: string,
    statusFilter?: WorkflowStatus,
    tagFilter?: string[]
  ) {
    const { data, error } = await this.supabase.rpc('search_workflows', {
      search_query: searchQuery,
      org_id: organizationId,
      status_filter: statusFilter,
      tag_filter: tagFilter,
    })

    if (error) throw error
    return data
  }

  async executeWorkflow(workflowId: string, triggerData: any = {}) {
    const { data, error } = await this.supabase.rpc('execute_workflow', {
      workflow_id: workflowId,
      trigger_data: triggerData,
    })

    if (error) throw error
    return data
  }

  async getWorkflowStats(workflowId: string, timeRange?: string) {
    const { data, error } = await this.supabase.rpc('get_workflow_stats', {
      workflow_id: workflowId,
      time_range: timeRange || '30 days',
    })

    if (error) throw error
    return data
  }

  async createVersion(workflowId: string, config: any, changeNotes?: string) {
    // Use our custom method instead of BaseService.findById
    const workflow = await this.getWorkflowById(workflowId)
    if (!workflow) throw new Error('Workflow not found')

    const newVersion = (workflow.version || 1) + 1

    const { data, error } = await this.supabase
      .from('workflow_versions')
      .insert({
        workflow_id: workflowId,
        version: newVersion,
        config,
        change_notes: changeNotes,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getVersionHistory(workflowId: string) {
    const { data, error } = await this.supabase
      .from('workflow_versions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('version', { ascending: false })

    if (error) throw error
    return data
  }

  // Create a new method instead of overriding findById
  async getWorkflowById(id: string): Promise<Workflow | null> {
    const { data, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data
  }
}