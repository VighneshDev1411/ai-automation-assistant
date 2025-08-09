import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { BaseService } from './base.service'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

export class OrganizationService extends BaseService<'organizations'> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'organizations')
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    
    return data
  }

  async createOrganization(
    name: string,
    slug: string,
    description?: string
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('create_organization', {
      org_name: name,
      org_slug: slug,
      org_description: description,
    })

    if (error) throw error
    return data
  }

async getOrganizationMembers(organizationId: string) {
  const { data, error } = await this.supabase
    .from('organization_members')
    .select(`
      *,
      user:profiles!organization_members_user_id_fkey (
        id,
        email,
        full_name,
        avatar_url,
        job_title
      )
    `)
    .eq('organization_id', organizationId)

  if (error) throw error
  return data
}
  async inviteMember(
    organizationId: string,
    userEmail: string,
    role: Database['public']['Enums']['user_role'] = 'member'
  ) {
    const { data, error } = await this.supabase.rpc('invite_to_organization', {
      org_id: organizationId,
      user_email: userEmail,
      invite_role: role,
    })

    if (error) throw error
    return data
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: Database['public']['Enums']['user_role']
  ) {
    const { data, error } = await this.supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeMember(organizationId: string, userId: string) {
    const { error } = await this.supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId)

    if (error) throw error
    return true
  }
}
