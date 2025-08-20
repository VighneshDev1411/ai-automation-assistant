import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { IntegrationService } from '@/lib/supabase/services'
import { useAuth } from '@/lib/auth/auth-context'
import { toast } from '@/components/ui/use-toast'
import type { Database } from '@/types/database'

export function useIntegrations() {
  const { currentOrganization } = useAuth()
  const supabase = createClient()
  const service = new IntegrationService(supabase)

  return useQuery({
    queryKey: ['integrations', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return []

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!currentOrganization,
  })
}

export function useIntegration(provider: string) {
  const { currentOrganization } = useAuth()
  const supabase = createClient()
  const service = new IntegrationService(supabase)

  return useQuery({
    queryKey: ['integration', currentOrganization?.id, provider],
    queryFn: () => {
      if (!currentOrganization) return null
      return service.findByOrganizationAndProvider(
        currentOrganization.id,
        provider
      )
    },
    enabled: !!currentOrganization && !!provider,
  })
}

export function useConnectIntegration() {
  const queryClient = useQueryClient()
  const { currentOrganization, user } = useAuth()
  const supabase = createClient()
  const service = new IntegrationService(supabase)

  return useMutation({
    mutationFn: async (data: {
      provider: string
      credentials?: any
      settings?: any
    }) => {
      if (!currentOrganization || !user) {
        throw new Error('No organization or user')
      }

      // Check if integration already exists
      const existing = await service.findByOrganizationAndProvider(
        currentOrganization.id,
        data.provider
      )

      if (existing) {
        // Update existing integration
        return service.update(existing.id, {
          credentials: data.credentials,
          settings: data.settings,
          status: 'connected',
        })
      } else {
        // Create new integration
        return service.create({
          organization_id: currentOrganization.id,
          user_id: user.id,
          provider: data.provider,
          status: 'connected',
          credentials: data.credentials,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      toast({
        title: 'Integration connected',
        description: 'The integration has been connected successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect integration',
        variant: 'destructive',
      })
    },
  })
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const service = new IntegrationService(supabase)

  return useMutation({
    mutationFn: async (integrationId: string) => {
      return service.updateStatus(integrationId, 'disconnected')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      toast({
        title: 'Integration disconnected',
        description: 'The integration has been disconnected.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect integration',
        variant: 'destructive',
      })
    },
  })
}
