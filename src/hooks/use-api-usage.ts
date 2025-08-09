import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'

export function useApiUsage(dateRange?: { startDate: string; endDate: string }) {
  const { currentOrganization } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['api-usage', currentOrganization?.id, dateRange],
    queryFn: async () => {
      if (!currentOrganization) return []

      let query = supabase
        .from('api_usage')
        .select('*')
        .eq('organization_id', currentOrganization.id)

      if (dateRange?.startDate) {
        query = query.gte('created_at', dateRange.startDate)
      }
      if (dateRange?.endDate) {
        query = query.lte('created_at', dateRange.endDate)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!currentOrganization,
  })
}

export function useOrganizationUsage(dateRange?: { startDate: string; endDate: string }) {
  const { currentOrganization } = useAuth()
  const supabase = createClient()

  return useQuery({
    queryKey: ['organization-usage', currentOrganization?.id, dateRange],
    queryFn: async () => {
      if (!currentOrganization) return null

      const { data, error } = await supabase.rpc('get_organization_usage', {
        org_id: currentOrganization.id,
        start_date: dateRange?.startDate,
        end_date: dateRange?.endDate,
      })

      if (error) throw error
      return data
    },
    enabled: !!currentOrganization,
  })
}