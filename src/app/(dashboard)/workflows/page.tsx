'use client'

import { useState } from 'react'
import {
  useWorkflows,
  useDeleteWorkflow,
  useUpdateWorkflow,
  useExecuteWorkflow,
} from '@/hooks'
import { useAuth } from '@/lib/auth/auth-context'
import { Container } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { WorkflowList } from '@/components/workflows/workflow-list'
import { ConfirmationDialog } from '@/components/common/confirmation-dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'
import { LoadingState } from '@/components/common/loading-state'

type Workflow = Database['public']['Tables']['workflows']['Row']

export const WorkflowsPage = () => {
  const router = useRouter()
  const { currentOrganization } = useAuth()
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    workflow?: Workflow
  }>({ open: false })

  // Data fetching
  const { data: workflows, isLoading } = useWorkflows(
    currentOrganization?.id || ''
  )

  // Mutations
  const deleteWorkflow = useDeleteWorkflow()
  const updateWorkflow = useUpdateWorkflow(deleteDialog.workflow?.id || '')
  const executeWorkflow = useExecuteWorkflow()

  const handleCreateNew = () => {
    router.push('/workflows/new')
  }

  const handleEdit = (workflow: Workflow) => {
    router.push(`/workflows/${workflow.id}/edit`)
  }

  const handleDelete = (workflow: Workflow) => {
    setDeleteDialog({ open: true, workflow })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.workflow) return

    try {
      await deleteWorkflow.mutateAsync(deleteDialog.workflow.id)
      toast({
        title: 'Workflow deleted',
        description: 'The workflow has been permanently deleted.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect integration',
        variant: 'destructive',
      })
    }
  }

  const handleSync = async (provider: string) => {
    const integration = integrations?.find((i: any) => i.provider === provider)
    if (!integration) return

    toast({
      title: 'Syncing....',
      description: 'Synchronization in progress',
    })

    // TODO : Implement sync logic via Edge Functions
  }

  const handleSettings = (provider: string) => {
    toast({
      title: 'Coming soon',
      description: 'Integration settings will be available soon.',
    })
  }

  if (isLoading) {
    return (
      <Container>
        <PageHeader
          title="Integrations"
          description="Connect your favorite apps and services"
        />
        <LoadingState message='Loading integrations...' />
      </Container>
    )
  }

  // Removed invalid global isLoading check
}
