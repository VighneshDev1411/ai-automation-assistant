'use client'

import { useState, useEffect } from 'react'
import { WorkflowCanvas } from '@/components/workflow-builder/WorkflowCanvas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowLeft, Save, Play, Share2 } from 'lucide-react'

export default function WorkflowBuilderPage() {
  const [workflow, setWorkflow] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [executing, setExecuting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Get workflow ID from URL (for editing existing workflow)
  const workflowId = searchParams?.get('id')

  useEffect(() => {
    loadWorkflow()
  }, [workflowId])

  // Load workflow from database
  const loadWorkflow = async () => {
    try {
      setLoading(true)

      if (workflowId) {
        // Load existing workflow
        const { data, error } = await supabase
          .from('workflows')
          .select('*')
          .eq('id', workflowId)
          .single()

        if (error) throw error

        setWorkflow({
          id: data.id,
          name: data.name,
          description: data.description,
          nodes: data.trigger_config ? [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: data.trigger_config
            },
            ...(data.actions || []).map((action: any, index: number) => ({
              id: `action-${index + 1}`,
              type: 'action',
              position: { x: 100 + (index + 1) * 300, y: 100 },
              data: action
            }))
          ] : [],
          edges: [],
          status: data.status,
          version: data.version
        })
      } else {
        // Create new workflow
        setWorkflow({
          name: 'Untitled Workflow',
          description: '',
          nodes: [
            {
              id: 'trigger-1',
              type: 'trigger',
              position: { x: 100, y: 100 },
              data: {
                label: 'Start',
                triggerType: 'manual',
                config: {}
              }
            }
          ],
          edges: [],
          status: 'draft',
          version: 1
        })
      }
    } catch (error: any) {
      console.error('Error loading workflow:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load workflow',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Save workflow to database
  const handleSave = async (workflowData: any) => {
    try {
      setSaving(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user's organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        throw new Error('No organization found')
      }

      // Extract trigger and actions from nodes
      const triggerNode = workflowData.nodes.find((n: any) => n.type === 'trigger')
      const actionNodes = workflowData.nodes.filter((n: any) => n.type === 'action')
      const conditionNodes = workflowData.nodes.filter((n: any) => n.type === 'condition')

      const workflowPayload = {
        name: workflowData.name || 'Untitled Workflow',
        description: workflowData.description || '',
        organization_id: membership.organization_id,
        created_by: user.id,
        status: 'draft',
        trigger_config: triggerNode?.data || {},
        actions: actionNodes.map((n: any) => n.data),
        conditions: conditionNodes.map((n: any) => n.data),
        version: workflow?.version || 1
      }

      if (workflowId) {
        // Update existing workflow
        const { data, error } = await supabase
          .from('workflows')
          .update(workflowPayload)
          .eq('id', workflowId)
          .select()
          .single()

        if (error) throw error

        setWorkflow({ ...workflowData, id: data.id })
        
        toast({
          title: 'Success',
          description: 'Workflow updated successfully'
        })
      } else {
        // Create new workflow
        const { data, error } = await supabase
          .from('workflows')
          .insert(workflowPayload)
          .select()
          .single()

        if (error) throw error

        setWorkflow({ ...workflowData, id: data.id })
        
        // Update URL with new workflow ID
        router.push(`/workflow-builder?id=${data.id}`)
        
        toast({
          title: 'Success',
          description: 'Workflow created successfully'
        })
      }
    } catch (error: any) {
      console.error('Error saving workflow:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to save workflow',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // Execute workflow
  const handleExecute = async (workflowData: any) => {
    try {
      setExecuting(true)

      if (!workflowData.id) {
        // Save first if not saved
        await handleSave(workflowData)
      }

      // Call execution API
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowId: workflowData.id,
          triggerData: {},
          debugMode: false
        })
      })

      if (!response.ok) {
        throw new Error('Execution failed')
      }

      const result = await response.json()

      toast({
        title: 'Workflow Executed',
        description: `Completed with status: ${result.status}`
      })
    } catch (error: any) {
      console.error('Error executing workflow:', error)
      toast({
        title: 'Execution Failed',
        description: error.message || 'Failed to execute workflow',
        variant: 'destructive'
      })
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Workflow Not Found</CardTitle>
            <CardDescription>
              The workflow you're looking for doesn't exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/workflows')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workflows
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <div className="h-16 border-b bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/workflows')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{workflow.name}</h1>
            {workflow.description && (
              <p className="text-sm text-muted-foreground">{workflow.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(workflow)}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={() => handleExecute(workflow)}
            disabled={executing || !workflow.id}
          >
            {executing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Execute
              </>
            )}
          </Button>

          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Workflow Builder */}
      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas
          workflowId={workflow.id}
          initialNodes={workflow.nodes}
          initialEdges={workflow.edges}
          onSave={handleSave}
          onExecute={async (workflowId: string) => {
            await handleExecute(workflow)
          }}
        />
      </div>
    </div>
  )
}