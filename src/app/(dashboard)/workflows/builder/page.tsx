// src/app/(dashboard)/workflows/builder/page.tsx
'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
// import { WorkflowBuilderWrapper } from '@/components/workflow-builder/WorkflowBuilder'
import { WorkflowBuilderWrapper } from '@/app/components/workflow-builder/WorkflowBuilder'
import { useAuth } from '@/lib/auth/auth-context'
import { createClient } from '@/lib/supabase/client'
// import { useToast } from '@/hooks/use-toast'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save, Play } from 'lucide-react'

export default function WorkflowBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentOrganization } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  const workflowId = searchParams.get('id')
  const [initialWorkflow, setInitialWorkflow] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(!!workflowId)

  // const params = useSearchParams()
  // const id = params.get

  // Load existing workflow if editing
  useEffect(() => {
    if (workflowId) {
      loadWorkflow()
    }
  }, [workflowId])

  const loadWorkflow = async () => {
    try {
      const { data: workflow, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single()

      if (error) throw error

      setInitialWorkflow(workflow)
    } catch (error) {
      console.error('Failed to load workflow:', error)
      toast({
        title: 'Error',
        description: 'Failed to load workflow',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (workflow: any) => {
    if (!currentOrganization) {
      toast({
        title: 'Error',
        description: 'No organization selected',
        variant: 'destructive',
      })
      return
    }

    try {
      const workflowData = {
        name: workflow.name,
        description: workflow.description,
        trigger_config: workflow.trigger_config,
        actions: workflow.actions,
        conditions: workflow.conditions,
        organization_id: currentOrganization.id,
        status: 'draft',
        // Store the visual layout data
        layout_data: {
          nodes: workflow.nodes,
          edges: workflow.edges,
          viewport: workflow.layout?.viewport,
        },
      }

      if (workflowId) {
        // Update existing workflow
        const { error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', workflowId)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Workflow updated successfully',
        })
      } else {
        // Create new workflow
        const { data, error } = await supabase
          .from('workflows')
          .insert(workflowData)
          .select()
          .single()

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Workflow created successfully',
        })

        // Navigate to edit mode
        router.replace(`/workflows/builder?id=${data.id}`)
      }
    } catch (error) {
      console.error('Failed to save workflow:', error)
      toast({
        title: 'Error',
        description: 'Failed to save workflow',
        variant: 'destructive',
      })
    }
  }

  const handleExecute = async (workflow: any) => {
    if (!workflowId) {
      toast({
        title: 'Error',
        description: 'Please save the workflow before executing',
        variant: 'destructive',
      })
      return
    }

    try {
      // First save the workflow
      await handleSave(workflow)

      // Then execute it
      const { data: executionId, error } = await supabase.rpc(
        'execute_workflow_v2',
        {
          workflow_id: workflowId,
          trigger_data: {
            manual_trigger: true,
            timestamp: new Date().toISOString(),
          },
        }
      )

      if (error) throw error

      toast({
        title: 'Workflow Executed',
        description: `Execution started with ID: ${executionId}`,
      })

      // Navigate to execution view
      router.push(`/workflows/${workflowId}/executions/${executionId}`)
    } catch (error) {
      console.error('Failed to execute workflow:', error)
      toast({
        title: 'Error',
        description: 'Failed to execute workflow',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading workflow...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <h1 className="text-xl font-semibold">
              {workflowId ? 'Edit Workflow' : 'Create Workflow'}
            </h1>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/workflows')}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Workflow Builder */}
      <div className="flex-1">
        <Suspense fallback={<div>Loading workflow builder...</div>}>
          <WorkflowBuilderWrapper
            workflowId={workflowId || undefined}
            initialWorkflow={initialWorkflow}
            onSave={handleSave}
            onExecute={handleExecute}
          />
        </Suspense>
      </div>
    </div>
  )
}

// Workflow Builder with Real-time Validation
// src/components/workflow-builder/WorkflowBuilderEnhanced.tsx
