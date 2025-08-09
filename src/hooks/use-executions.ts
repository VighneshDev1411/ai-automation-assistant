import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ExecutionService } from '@/lib/supabase/services'
import type { Database } from '@/types/database'

type ExecutionStatus = Database['public']['Enums']['execution_status']

export function useExecutions(workflowId: string, options?: {
  status?: ExecutionStatus
  limit?: number
}) {
  const supabase = createClient()
  const service = new ExecutionService(supabase)

  return useQuery({
    queryKey: ['executions', workflowId, options],
    queryFn: () => service.findByWorkflow(workflowId, options),
    enabled: !!workflowId,
    refetchInterval: (data) => {
      // Refetch every 5 seconds if there are pending or running executions
      const hasPendingOrRunning = data?.some(
        exec => exec.status === 'pending' || exec.status === 'running'
      )
      return hasPendingOrRunning ? 5000 : false
    },
  })
}

export function useExecution(executionId: string) {
  const supabase = createClient()
  const service = new ExecutionService(supabase)

  return useQuery({
    queryKey: ['execution', executionId],
    queryFn: () => service.findById(executionId),
    enabled: !!executionId,
    refetchInterval: (data) => {
      // Refetch every 2 seconds if execution is pending or running
      return data?.status === 'pending' || data?.status === 'running' ? 2000 : false
    },
  })
}

export function useExecutionSteps(executionId: string) {
  const supabase = createClient()
  const service = new ExecutionService(supabase)

  return useQuery({
    queryKey: ['execution-steps', executionId],
    queryFn: () => service.getExecutionSteps(executionId),
    enabled: !!executionId,
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
  })
}
