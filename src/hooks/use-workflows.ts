import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { WorkflowService } from '@/lib/supabase/services'
import { useAuth } from '@/lib/auth/auth-context'
import { toast } from '@/components/ui/use-toast'
import type { Database } from '@/types/database'

type WorkflowStatus = Database['public']['Enums']['workflow_status']

export function useWorkflows(organizationId: string, options?: {
  status?: WorkflowStatus
  isTemplate?: boolean
}) {
  const supabase = createClient()
  const service = new WorkflowService(supabase)

  return useQuery({
    queryKey: ['workflows', organizationId, options],
    queryFn: () => service.findByOrganization(organizationId, options),
    enabled: !!organizationId,
  })
}

export function useWorkflow(workflowId: string) {
  const supabase = createClient()
  const service = new WorkflowService(supabase)

  return useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => service.findById(workflowId),
    enabled: !!workflowId,
  })
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient()
  const { currentOrganization } = useAuth()
  const supabase = createClient()
  const service = new WorkflowService(supabase)

  return useMutation({
    mutationFn: async (data: Database['public']['Tables']['workflows']['Insert']) => {
      if (!currentOrganization) throw new Error('No organization selected')
      
      return service.create({
        ...data,
        organization_id: currentOrganization.id,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast({
        title: 'Workflow created',
        description: 'Your workflow has been created successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create workflow',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateWorkflow(workflowId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const service = new WorkflowService(supabase)

  return useMutation({
    mutationFn: async (data: Database['public']['Tables']['workflows']['Update']) => {
      return service.update(workflowId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      toast({
        title: 'Workflow updated',
        description: 'Your workflow has been updated successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update workflow',
        variant: 'destructive',
      })
    },
  })
}

export function useExecuteWorkflow() {
  const queryClient = useQueryClient()
  const supabase = createClient()
  const service = new WorkflowService(supabase)

  return useMutation({
    mutationFn: async ({ workflowId, triggerData }: {
      workflowId: string
      triggerData?: any
    }) => {
      return service.executeWorkflow(workflowId, triggerData)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['executions', variables.workflowId] })
      toast({
        title: 'Workflow executed',
        description: 'Your workflow has been triggered successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to execute workflow',
        variant: 'destructive',
      })
    },
  })
}

export function useWorkflowStats(workflowId: string, timeRange?: string) {
  const supabase = createClient()
  const service = new WorkflowService(supabase)

  return useQuery({
    queryKey: ['workflow-stats', workflowId, timeRange],
    queryFn: () => service.getWorkflowStats(workflowId, timeRange),
    enabled: !!workflowId,
  })
}