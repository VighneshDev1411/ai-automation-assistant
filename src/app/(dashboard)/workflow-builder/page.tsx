'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WorkflowBuilder } from '@/app/components/workflow-builder/WorkflowBuilder'
import { WorkflowVersionControl } from '@/app/components/workflow-builder/WorkflowVersionControl'
import { WorkflowTesting } from '@/app/components/workflow-builder/WorkflowTesting'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  Settings,
  GitBranch,
  Bug,
  Play,
  Save,
  ArrowLeft,
  Loader2,
  ChevronRight,
  Share2,
} from 'lucide-react'

function WorkflowBuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  const workflowId = searchParams.get('id')

  const [workflow, setWorkflow] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [showToolsPanel, setShowToolsPanel] = useState(false)
  const [activeToolTab, setActiveToolTab] = useState('versions')

  useEffect(() => {
    loadWorkflow()
  }, [workflowId])

  // Load workflow from database
  const loadWorkflow = async () => {
    try {
      if (!workflowId) {
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
                config: {},
              },
            },
          ],
          edges: [],
          status: 'draft',
          version: 1,
        })
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .maybeSingle()

      if (error) {
        console.error('Database error loading workflow:', error)
        throw new Error(error.message || 'Database error')
      }

      if (!data) {
        console.error('Workflow not found:', workflowId)
        toast({
          title: 'Workflow Not Found',
          description:
            'This workflow does not exist or you do not have access to it',
          variant: 'destructive',
        })
        router.push('/workflows')
        return
      }

      // Clean trigger nodes on load
      const cleanedNodes = cleanTriggerNodes(data.nodes || [])

      setWorkflow({
        id: data.id,
        name: data.name,
        description: data.description,
        nodes: cleanedNodes,
        edges: data.edges || [],
        status: data.status,
        version: data.version || 1,
      })
    } catch (error: any) {
      console.error('Error loading workflow:', error)
      toast({
        title: 'Error Loading Workflow',
        description:
          error.message || 'Failed to load workflow. Please try again.',
        variant: 'destructive',
      })
      // Redirect to workflows page on error
      setTimeout(() => router.push('/workflows'), 2000)
    } finally {
      setLoading(false)
    }
  }

  // Handle schedule trigger creation/update
  const handleScheduleTrigger = async (workflowId: string, workflowData: any) => {
    const triggerNode = workflowData.nodes?.find((n: any) => n.type === 'trigger')

    if (!triggerNode || triggerNode.data?.triggerType !== 'schedule') {
      // No schedule trigger, delete any existing schedules
      await supabase
        .from('workflow_schedules')
        .delete()
        .eq('workflow_id', workflowId)
      return
    }

    const config = triggerNode.data.config
    if (!config?.schedule) return

    // Check if schedule already exists
    const { data: existing } = await supabase
      .from('workflow_schedules')
      .select('id')
      .eq('workflow_id', workflowId)
      .maybeSingle()

    const scheduleData = {
      workflow_id: workflowId,
      cron_expression: config.schedule,
      timezone: config.timezone || 'America/Chicago',
      status: config.enabled !== false ? 'active' : 'inactive',
      next_run_at: new Date(Date.now() + 60000).toISOString(), // Calculate proper next run
    }

    if (existing) {
      // Update existing schedule
      await supabase
        .from('workflow_schedules')
        .update(scheduleData)
        .eq('id', existing.id)
    } else {
      // Create new schedule
      await supabase
        .from('workflow_schedules')
        .insert([scheduleData])
    }
  }

  // Clean trigger node data structure
  const cleanTriggerNodes = (nodes: any[]) => {
    return nodes.map((node) => {
      if (node.type !== 'trigger') return node

      const data = node.data || {}

      // Fix: Move root-level schedule fields into config
      const config = { ...(data.config || {}) }

      if (data.schedule && !config.schedule) config.schedule = data.schedule
      if (data.timezone && !config.timezone) config.timezone = data.timezone
      if (data.enabled !== undefined && config.enabled === undefined) config.enabled = data.enabled
      if (data.cron && !config.schedule) config.schedule = data.cron

      // Create clean data with proper structure
      return {
        ...node,
        data: {
          triggerType: data.triggerType,
          config: config,
          label: data.label,
          ...(data.webhookUrl && { webhookUrl: data.webhookUrl }),
        },
      }
    })
  }

  // Save workflow
  const handleSave = async (workflowData: any) => {
    try {
      setSaving(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get user's organization (optional - fallback to null if not found)
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id, joined_at')
        .eq('user_id', user.id)
        .maybeSingle()

      const organizationId =
        membership?.organization_id && membership?.joined_at
          ? membership.organization_id
          : null

      // Clean nodes before saving
      const cleanedNodes = cleanTriggerNodes(workflowData.nodes || workflow.nodes)

      const workflowPayload = {
        name: workflowData.name || workflow.name,
        description: workflowData.description || workflow.description,
        nodes: cleanedNodes,
        edges: workflowData.edges || workflow.edges,
        trigger_config: workflowData.trigger_config || {
          type: 'manual',
          config: {},
          nodes: workflowData.nodes || workflow.nodes,
          edges: workflowData.edges || workflow.edges,
        },
        organization_id: organizationId, // ✅ guaranteed valid now
        created_by: user.id, // ✅ matches auth.uid()
        status: 'draft',
        version: (workflow.version || 0) + 1,
        updated_at: new Date().toISOString(),
      }

      if (workflow.id) {
        // Update existing workflow
        const { error } = await supabase
          .from('workflows')
          .update(workflowPayload)
          .eq('id', workflow.id)

        if (error) throw error

        // Check if workflow has schedule trigger and create/update schedule
        await handleScheduleTrigger(workflow.id, workflowData)

        toast({
          title: 'Workflow Saved',
          description: 'Your workflow has been updated successfully',
        })
      } else {
        // Create new workflow
        const { data, error } = await supabase
          .from('workflows')
          .insert([workflowPayload])
          .select()
          .single()

        if (error) throw error

        setWorkflow({ ...workflowData, id: data.id })

        // Check if workflow has schedule trigger and create schedule
        await handleScheduleTrigger(data.id, workflowData)

        router.push(`/workflow-builder?id=${data.id}`)

        toast({
          title: 'Workflow Created',
          description: 'Your workflow has been saved successfully',
        })
      }
    } catch (error: any) {
      console.error('Error saving workflow:', error)
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save workflow',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Execute workflow
  const handleExecute = async (_workflowData: any) => {
    try {
      setExecuting(true)

      if (!workflow.id) {
        toast({
          title: 'Save First',
          description: 'Please save the workflow before executing',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch(`/api/workflows/${workflow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_data: {},
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Execution failed')
      }

      toast({
        title: 'Workflow Executed',
        description: `Execution ID: ${result.execution_id}`,
      })

      // Optionally switch to testing tab to see results
      setShowToolsPanel(true)
      setActiveToolTab('testing')
    } catch (error: any) {
      console.error('Error executing workflow:', error)
      toast({
        title: 'Execution Failed',
        description: error.message || 'Failed to execute workflow',
        variant: 'destructive',
      })
    } finally {
      setExecuting(false)
    }
  }

  // Handle version restore
  const handleVersionRestore = async (version: any) => {
    try {
      setWorkflow({
        ...workflow,
        nodes: version.workflow.nodes,
        edges: version.workflow.edges,
        version: version.version,
      })

      toast({
        title: 'Version Restored',
        description: `Restored to version ${version.version}`,
      })
    } catch (error: any) {
      toast({
        title: 'Restore Failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Workflow not found</p>
          <Button onClick={() => router.push('/workflows')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workflows
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top Header Bar */}
      <div className="h-16 border-b bg-background flex items-center justify-between px-4 flex-shrink-0">
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
              <p className="text-sm text-muted-foreground">
                {workflow.description}
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            v{workflow.version}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tools Panel Toggle */}
          <Button
            variant={showToolsPanel ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowToolsPanel(!showToolsPanel)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Tools
            {showToolsPanel ? <ChevronRight className="ml-2 h-4 w-4" /> : null}
          </Button>

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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Workflow Builder Canvas */}
        <div className="flex-1">
          <WorkflowBuilder
            workflowId={workflow.id}
            initialWorkflow={workflow}
            onSave={handleSave}
            onExecute={handleExecute}
          />
        </div>

        {/* Right Tools Panel */}
        {showToolsPanel && (
          <div className="absolute right-0 top-0 bottom-0 w-96 border-l bg-background overflow-y-auto shadow-lg z-10">
            <Tabs value={activeToolTab} onValueChange={setActiveToolTab}>
              <div className="border-b p-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="versions">
                    <GitBranch className="mr-2 h-4 w-4" />
                    Versions
                  </TabsTrigger>
                  <TabsTrigger value="testing">
                    <Bug className="mr-2 h-4 w-4" />
                    Testing
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="versions" className="m-0 p-4">
                {workflow.id ? (
                  <WorkflowVersionControl
                    workflowId={workflow.id}
                    workflowName={workflow.name}
                    currentVersion={workflow.version}
                    currentConfig={{
                      nodes: workflow.nodes,
                      edges: workflow.edges,
                    }}
                    onRestore={handleVersionRestore}
                    onCompare={(v1: any, v2: any) => {
                      toast({
                        title: 'Compare Versions',
                        description: `Comparing v${v1.version} with v${v2.version}`,
                      })
                    }}
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Save workflow to enable version control
                  </div>
                )}
              </TabsContent>

              <TabsContent value="testing" className="m-0 p-4">
                {workflow.id ? (
                  <WorkflowTesting
                    workflowId={workflow.id}
                    workflowName={workflow.name}
                    workflowConfig={{
                      nodes: workflow.nodes,
                      edges: workflow.edges,
                    }}
                    onExecutionComplete={(result: any) => {
                      toast({
                        title: 'Test Complete',
                        description: `Status: ${result.status}`,
                      })
                    }}
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Save workflow to enable testing
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WorkflowBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <WorkflowBuilderContent />
    </Suspense>
  )
}
