import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { BaseService } from './base.service'

type Integration = Database['public']['Tables']['integrations']['Row']
type IntegrationStatus = Database['public']['Enums']['integration_status']

export class IntegrationService extends BaseService<'integrations'> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'integrations')
  }

  async findByOrganizationAndProvider(
    organizationId: string,
    provider: string
  ): Promise<Integration | null> {
    const { data, error } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  async updateStatus(
    integrationId: string,
    status: IntegrationStatus,
    errorMessage?: string
  ) {
    const updateData: any = { status }
    if (errorMessage) {
      updateData.error_message = errorMessage
    }
    if (status === 'connected') {
      updateData.last_synced_at = new Date().toISOString()
    }

    return this.update(integrationId, updateData)
  }

  async storeCredentials(integrationId: string, credentials: any) {
    // In production, encrypt credentials before storing
    return this.update(integrationId, { credentials })
  }

  async syncIntegration(integrationId: string) {
    const integration = await this.findById(integrationId)
    if (!integration || (integration as any).error) throw new Error('Integration not found')

    // Update last synced timestamp
    await this.update(integrationId, {
      last_synced_at: new Date().toISOString(),
    })

    // Actual sync logic would be implemented in Edge Functions
    return integration
  }
}
