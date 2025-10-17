import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { OrganizationService } from '@/lib/supabase/services'
import { useAuth } from '@/lib/auth/auth-context'
import { toast } from '@/components/ui/use-toast'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

export function useOrganizations() {
  const { user } = useAuth()
  const supabase = createClient()
  const service = new OrganizationService(supabase)

  return useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      if (!user) return []
      
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          joined_at,
          organizations (*)
        `)
        .eq('user_id', user.id)

      if (error) throw error

      // Filter only joined memberships (where joined_at is not null)
      return data
        .filter(item => item.joined_at !== null)
        .map(item => ({
          ...item.organizations,
          role: item.role,
          joined_at: item.joined_at,
        }))
    },
    enabled: !!user,
  })
}

export function useOrganization(organizationId: string) {
  const supabase = createClient()
  const service = new OrganizationService(supabase)

  return useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => service.findById(organizationId),
    enabled: !!organizationId,
  })
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const supabase = createClient()
  const service = new OrganizationService(supabase)

  return useMutation({
    mutationFn: async (data: {
      name: string
      slug: string
      description?: string
    }) => {
      return service.createOrganization(data.name, data.slug, data.description)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', user?.id] })
      toast({
        title: 'Organization created',
        description: 'Your organization has been created successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create organization',
        variant: 'destructive',
      })
    },
  })
}

export function useOrganizationMembers(organizationId: string) {
  const supabase = createClient()
  const service = new OrganizationService(supabase)

  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: () => service.getOrganizationMembers(organizationId),
    enabled: !!organizationId,
  })
}

export function useInviteMember(organizationId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const service = new OrganizationService(supabase)

  return useMutation({
    mutationFn: async (data: { email: string; role: UserRole }) => {
      return service.inviteMember(organizationId, data.email, data.role)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] })
      toast({
        title: 'Invitation sent',
        description: 'An invitation has been sent to the user.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive',
      })
    },
  })
}
