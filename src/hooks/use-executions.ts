import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ExecutionService } from '@/lib/supabase/services'
import type { Database } from '@/types/database'

type ExecutionStatus = Database['public']['Enums']['execution_status']
type ExecutionLog = { 
  id: string
  status: ExecutionStatus 
  // Add other execution properties as needed
}

export function useExecutions(workflowId: string, options?: {
  status?: ExecutionStatus
  limit?: number
}) {
  const supabase = createClient()
  const service = new ExecutionService(supabase)

  return useQuery<ExecutionLog[]>({
    queryKey: ['executions', workflowId, options],
    queryFn: async () => {
      try {
        const result = await service.findByWorkflow(workflowId, options)
        return Array.isArray(result) ? result : []
      } catch (error) {
        console.error('Error fetching executions:', error)
        return []
      }
    },
    enabled: !!workflowId,
    refetchInterval: (query) => {
      // Refetch every 5 seconds if there are pending or running executions
      const data = query.state.data
      const hasPendingOrRunning = Array.isArray(data) && data.some(
        (exec) => exec.status === 'pending' || exec.status === 'running'
      )
      return hasPendingOrRunning ? 5000 : false
    },
  })
}

export function useExecution(executionId: string) {
  const supabase = createClient()
  const service = new ExecutionService(supabase)

  return useQuery<ExecutionLog | null>({
    queryKey: ['execution', executionId],
    queryFn: async (): Promise<ExecutionLog | null> => {
      try {
        const result = await service.findById(executionId)
        // Handle the case where result might be GenericStringError or other error type
        if (!result || typeof result === 'string' || 'error' in result) {
          return null
        }
        return result as ExecutionLog
      } catch (error) {
        console.error('Error fetching execution:', error)
        return null
      }
    },
    enabled: !!executionId,
    refetchInterval: (query) => {
      // Refetch every 2 seconds if execution is pending or running
      const data = query.state.data
      return data && (data.status === 'pending' || data.status === 'running') ? 2000 : false
    },
  })
}

export function useExecutionSteps(executionId: string) {
  const supabase = createClient()
  const service = new ExecutionService(supabase)

  return useQuery<any[]>({
    queryKey: ['execution-steps', executionId],
    queryFn: async () => {
      try {
        const result = await service.getExecutionSteps(executionId)
        return Array.isArray(result) ? result : []
      } catch (error) {
        console.error('Error fetching execution steps:', error)
        return []
      }
    },
    enabled: !!executionId,
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
  })
}