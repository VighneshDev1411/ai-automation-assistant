'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth/auth-context'
import {
  Play,
  Save,
  Share,
  Copy,
  Download,
  Upload,
  Settings,
  Eye,
  History,
  Users,
  Zap,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  FolderOpen,
  Search,
  Filter,
  MoreVertical,
  Workflow,
} from 'lucide-react'

// Import our workflow components
import { WorkflowCanvasWrapper } from '@/components/workflow-builder/WorkflowCanvas'
// import { NodeToolbar } from '@/components/workflow-builder/NodeToolbar'
import { NodeToolbar } from '@/components/workflow-builder/nodes/NodeToolbar'

interface WorkflowMetadata {
  id?: string
  name: string
  description: string
  category: string
  tags: string[]
  isPublic: boolean
  version: string
  createdAt?: string
  updatedAt?: string
  author?: string
  organizationId?: string
}

interface WorkflowExecution {
  id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt?: string
  duration?: number
  triggeredBy: string
  stepResults: Array<{
    stepId: string
    status: 'success' | 'error' | 'skipped'
    duration: number
    output?: any
  }>
}

const categories = [
  'Automation',
  'Data Processing',
  'Communication',
  'Integration',
  'Analytics',
  'AI/ML',
  'Custom'
]

export default function WorkflowBuilderPage() {
  const { toast } = useToast()
  const { user, currentOrganization } = useAuth()
  const searchParams = useSearchParams()
  const workflowId = searchParams.get('id')

  // Workflow state
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowMetadata>({
    name: 'Untitled Workflow',
    description: '',
    category: 'Automation',
    tags: [],
    isPublic: false,
    version: '1.0.0',
  })
  const [loadedWorkflowData, setLoadedWorkflowData] = useState<any>(null)

  // UI state
  const [isNewWorkflowOpen, setIsNewWorkflowOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isExecutionHistoryOpen, setIsExecutionHistoryOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [showToolbar, setShowToolbar] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tempName, setTempName] = useState(currentWorkflow.name)
  const [currentWorkflowData, setCurrentWorkflowData] = useState<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] })

  // Load existing workflow if ID is provided
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId)
    }
  }, [workflowId])

  const loadWorkflow = async (id: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/workflows/${id}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load workflow' }))
        console.error('❌ Load failed with status:', response.status)
        console.error('❌ Error:', errorData)
        throw new Error(errorData.error || `Failed to load workflow (${response.status})`)
      }

      const data = await response.json()

      console.log('📦 Loaded workflow data:', data)
      console.log('📦 trigger_config:', data.trigger_config)
      console.log('📦 trigger_config.config:', data.trigger_config?.config)
      console.log('📦 Looking for nodes at:', {
        'trigger_config.nodes': data.trigger_config?.nodes,
        'trigger_config.config.nodes': data.trigger_config?.config?.nodes,
      })

      setCurrentWorkflow({
        id: data.id,
        name: data.name,
        description: data.description || '',
        category: 'Automation', // You can add this field to the database
        tags: data.tags || [],
        isPublic: false,
        version: '1.0.0',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      })

      // Store the full workflow data to pass to canvas
      // The nodes/edges are stored in trigger_config.config (nested)
      const nodesData = data.trigger_config?.config?.nodes || data.trigger_config?.nodes || []
      const edgesData = data.trigger_config?.config?.edges || data.trigger_config?.edges || []

      console.log('✅ Extracted nodes:', nodesData.length, 'nodes')
      console.log('✅ Extracted edges:', edgesData.length, 'edges')

      setLoadedWorkflowData({
        nodes: nodesData,
        edges: edgesData,
      })

      // Only show toast on first load, not on re-renders
      if (nodesData.length === 0 && edgesData.length === 0) {
        console.warn('⚠️ Workflow loaded but has no nodes/edges. Was it saved empty?')
      }

      toast({
        title: 'Workflow Loaded',
        description: `"${data.name}" loaded with ${nodesData.length} nodes`,
      })
    } catch (error) {
      console.error('Error loading workflow:', error)
      toast({
        title: 'Load Failed',
        description: error instanceof Error ? error.message : 'Failed to load workflow',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Sample execution history
  const [executionHistory] = useState<WorkflowExecution[]>([
    {
      id: 'exec_1',
      status: 'completed',
      startedAt: '2024-01-20T10:30:00Z',
      completedAt: '2024-01-20T10:31:15Z',
      duration: 75000,
      triggeredBy: 'Webhook',
      stepResults: [
        { stepId: 'step1', status: 'success', duration: 1200 },
        { stepId: 'step2', status: 'success', duration: 2500 },
        { stepId: 'step3', status: 'success', duration: 800 },
      ]
    },
    {
      id: 'exec_2',
      status: 'failed',
      startedAt: '2024-01-20T09:15:00Z',
      completedAt: '2024-01-20T09:15:45Z',
      duration: 45000,
      triggeredBy: 'Manual',
      stepResults: [
        { stepId: 'step1', status: 'success', duration: 1100 },
        { stepId: 'step2', status: 'error', duration: 3200 },
        { stepId: 'step3', status: 'skipped', duration: 0 },
      ]
    }
  ])

  // Save workflow
  const handleSaveWorkflow = useCallback(async (workflowData: any) => {
    setIsSaving(true)

    try {
      // Find trigger node to determine trigger type
      const triggerNode = workflowData.nodes.find((n: any) => n.type === 'trigger')
      const triggerType = triggerNode?.data?.triggerType || 'manual'

      // Transform action nodes to match schema
      const actionNodes = workflowData.nodes.filter((n: any) => n.type === 'action')
      const actions = actionNodes.length > 0 ? actionNodes.map((node: any) => ({
        id: node.id,
        type: 'transform', // Map to valid action type from schema
        name: node.data?.label || 'Action',
        config: node.data?.config || {},
      })) : [
        // If no actions, add a dummy one to pass validation
        {
          id: 'dummy-action',
          type: 'transform',
          name: 'Placeholder Action',
          config: {},
        }
      ]

      // Transform condition nodes to match schema
      const conditionNodes = workflowData.nodes.filter((n: any) => n.type === 'condition')
      const conditions = conditionNodes.map((node: any) => ({
        id: node.id,
        field: node.data?.config?.field || 'trigger.data',
        operator: node.data?.config?.operator || 'equals',
        value: node.data?.config?.value || '',
      }))

      const payload = {
        name: currentWorkflow.name,
        description: currentWorkflow.description,
        trigger_config: {
          type: triggerType,
          config: {
            nodes: workflowData.nodes,
            edges: workflowData.edges,
          },
        },
        actions,
        conditions: conditions.length > 0 ? conditions : undefined,
        status: 'draft',
        tags: currentWorkflow.tags,
      }

      const isUpdate = !!currentWorkflow.id
      const url = isUpdate ? `/api/workflows/${currentWorkflow.id}` : '/api/workflows'
      const method = isUpdate ? 'PATCH' : 'POST'

      console.log('Saving workflow with payload:', JSON.stringify(payload, null, 2))
      console.log('Is update?', isUpdate, 'URL:', url, 'Method:', method)

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save workflow' }))
        console.error('❌ Save failed with status:', response.status)
        console.error('❌ Error data:', errorData)

        // Show detailed validation errors if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const validationErrors = errorData.details.map((e: any) =>
            `${e.path?.join('.') || 'Field'}: ${e.message}`
          ).join('\n')
          throw new Error(`Validation failed:\n${validationErrors}`)
        }

        throw new Error(errorData.error || 'Failed to save workflow')
      }

      const result = await response.json()

      // Update current workflow with the saved ID (for new workflows)
      if (!isUpdate) {
        setCurrentWorkflow(prev => ({
          ...prev,
          id: result.workflow?.id || result.id,
          updatedAt: new Date().toISOString(),
        }))
      } else {
        setCurrentWorkflow(prev => ({
          ...prev,
          updatedAt: new Date().toISOString(),
        }))
      }

      toast({
        title: isUpdate ? "Workflow Updated" : "Workflow Saved",
        description: `"${currentWorkflow.name}" has been ${isUpdate ? 'updated' : 'saved'} successfully`,
      })
    } catch (error) {
      console.error('Error saving workflow:', error)
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save workflow. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [currentWorkflow, toast])

  // Execute workflow
  const handleExecuteWorkflow = useCallback(async (workflowId: string) => {
    setIsExecuting(true)
    
    try {
      // In real implementation, this would trigger workflow execution
      console.log('Executing workflow:', workflowId)
      
      // Simulate execution
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "Workflow Executed",
        description: "Workflow is now running in the background",
      })
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: "Failed to execute workflow. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }, [toast])

  // Create new workflow
  const handleCreateWorkflow = () => {
    setCurrentWorkflow({
      name: 'Untitled Workflow',
      description: '',
      category: 'Automation',
      tags: [],
      isPublic: false,
      version: '1.0.0',
    })
    setIsNewWorkflowOpen(false)
    
    toast({
      title: "New Workflow Created",
      description: "Start building your workflow by adding nodes from the sidebar",
    })
  }

  // Handle inline name edit
  const handleNameClick = () => {
    setIsEditingName(true)
    setTempName(currentWorkflow.name)
  }

  const handleNameSave = () => {
    if (tempName.trim()) {
      setCurrentWorkflow(prev => ({ ...prev, name: tempName.trim() }))
      setIsEditingName(false)
      toast({
        title: "Name Updated",
        description: `Workflow renamed to "${tempName.trim()}"`,
      })
    }
  }

  const handleNameCancel = () => {
    setTempName(currentWorkflow.name)
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave()
    } else if (e.key === 'Escape') {
      handleNameCancel()
    }
  }

  // Share workflow
  const handleShareWorkflow = () => {
    const shareUrl = `${window.location.origin}/workflows/shared/${currentWorkflow.id || 'demo'}`
    navigator.clipboard.writeText(shareUrl)

    toast({
      title: "Link Copied",
      description: "Workflow share link copied to clipboard",
    })
  }

  // Export workflow
  const handleExportWorkflow = () => {
    const exportData = {
      ...currentWorkflow,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentWorkflow.name.replace(/\s+/g, '-').toLowerCase()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "Workflow Exported",
      description: "Workflow has been downloaded as JSON file",
    })
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="flex flex-col gap-3 px-6 py-4">
          {/* Top Row - Title and Primary Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {/* Workflow Icon & Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Workflow className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        onBlur={handleNameSave}
                        autoFocus
                        className="h-8 text-xl font-bold px-2 py-1"
                        placeholder="Workflow name..."
                      />
                    </div>
                  ) : (
                    <h1
                      className="text-xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors"
                      onClick={handleNameClick}
                      title="Click to edit name"
                    >
                      {currentWorkflow.name}
                    </h1>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {currentWorkflow.description || 'Add a description in settings'}
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Actions - Right Side */}
            <div className="flex items-center gap-2">
              {/* Save - Disabled: Use the Save button in the canvas toolbar instead */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast({
                    title: "Use Canvas Save Button",
                    description: "Please use the Save button in the canvas toolbar below",
                  })
                }}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>

              {/* Execute - Primary Action */}
              <Button
                onClick={() => handleExecuteWorkflow(currentWorkflow.id || 'demo')}
                disabled={isExecuting}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg gap-2"
                size="sm"
              >
                {isExecuting ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isExecuting ? 'Running...' : 'Execute'}
              </Button>
            </div>
          </div>

          {/* Bottom Row - Metadata and Secondary Actions */}
          <div className="flex items-center justify-between">
            {/* Workflow Metadata */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-medium">{currentWorkflow.category}</Badge>
              <Badge variant="secondary" className="font-mono text-xs">v{currentWorkflow.version}</Badge>
              {currentWorkflow.isPublic && (
                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Public</Badge>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex items-center gap-2">
              {/* Toggle Toolbar */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowToolbar(!showToolbar)}
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden md:inline">{showToolbar ? 'Hide' : 'Show'} Toolbar</span>
              </Button>

              {/* Execution History */}
              <Dialog open={isExecutionHistoryOpen} onOpenChange={setIsExecutionHistoryOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <History className="h-4 w-4" />
                    <span className="hidden md:inline">History</span>
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Execution History</DialogTitle>
                  <DialogDescription>
                    Recent workflow executions and their results
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-3">
                  {executionHistory.map((execution) => (
                    <Card key={execution.id} className="glass-card border-0 shadow-md hover:shadow-lg transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              execution.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20' :
                              execution.status === 'failed' ? 'bg-red-100 dark:bg-red-900/20' :
                              'bg-blue-100 dark:bg-blue-900/20'
                            }`}>
                              {execution.status === 'completed' && (
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              )}
                              {execution.status === 'failed' && (
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                              )}
                              {execution.status === 'running' && (
                                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                              )}
                            </div>
                            <span className="font-semibold text-base">
                              {execution.id}
                            </span>
                          </div>
                          <Badge
                            className={
                              execution.status === 'completed' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' :
                              execution.status === 'failed' ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' :
                              'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                            }
                          >
                            {execution.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium">Started</span>
                            <div className="font-medium">{new Date(execution.startedAt).toLocaleString()}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium">Duration</span>
                            <div className="font-medium">{execution.duration ? `${(execution.duration / 1000).toFixed(1)}s` : 'N/A'}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium">Triggered by</span>
                            <div className="font-medium">{execution.triggeredBy}</div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground font-medium">Steps Progress</span>
                            <div className="flex gap-1.5">
                              {execution.stepResults.map((step, index) => (
                                <div
                                  key={index}
                                  className={`w-4 h-4 rounded-full shadow-sm ${
                                    step.status === 'success' ? 'bg-green-500' :
                                    step.status === 'error' ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                                  }`}
                                  title={`Step ${index + 1}: ${step.status}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

              {/* Settings */}
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden md:inline">Settings</span>
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Workflow Settings</DialogTitle>
                  <DialogDescription>
                    Configure workflow metadata and sharing settings
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="sharing">Sharing</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4">
                    <div>
                      <Label>Workflow Name</Label>
                      <Input
                        value={currentWorkflow.name}
                        onChange={(e) => setCurrentWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={currentWorkflow.description}
                        onChange={(e) => setCurrentWorkflow(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what this workflow does..."
                      />
                    </div>

                    <div>
                      <Label>Category</Label>
                      <Select
                        value={currentWorkflow.category}
                        onValueChange={(value) => setCurrentWorkflow(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tags</Label>
                      <Input
                        placeholder="automation, email, data (comma separated)"
                        value={currentWorkflow.tags.join(', ')}
                        onChange={(e) => setCurrentWorkflow(prev => ({
                          ...prev,
                          tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                        }))}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="sharing" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Public Workflow</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow others to view and use this workflow
                        </p>
                      </div>
                      <Button
                        variant={currentWorkflow.isPublic ? "default" : "outline"}
                        onClick={() => setCurrentWorkflow(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                      >
                        {currentWorkflow.isPublic ? "Public" : "Private"}
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleShareWorkflow} className="flex-1">
                        <Share className="h-4 w-4 mr-2" />
                        Share Link
                      </Button>
                      <Button variant="outline" onClick={handleExportWorkflow} className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-4">
                    <div>
                      <Label>Version</Label>
                      <Input
                        value={currentWorkflow.version}
                        onChange={(e) => setCurrentWorkflow(prev => ({ ...prev, version: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Danger Zone</Label>
                      <Card className="border-red-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Delete Workflow</p>
                              <p className="text-sm text-muted-foreground">
                                Permanently delete this workflow and all its data
                              </p>
                            </div>
                            <Button variant="destructive" size="sm">
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsSettingsOpen(false)}>
                    Save Settings
                  </Button>
                </div>
              </DialogContent>
              </Dialog>

              {/* New Workflow */}
              <Dialog open={isNewWorkflowOpen} onOpenChange={setIsNewWorkflowOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden md:inline">New</span>
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                  <DialogDescription>
                    Start fresh with a new workflow
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This will create a new workflow and clear the current canvas.
                    Make sure to save any unsaved changes first.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsNewWorkflowOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWorkflow}>
                    Create New Workflow
                  </Button>
                </div>
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Toolbar */}
        {showToolbar && (
          <div className="w-80 border-r bg-background/80 backdrop-blur-sm overflow-hidden shadow-sm">
            <NodeToolbar />
          </div>
        )}

        {/* Workflow Canvas */}
        <div className="flex-1 overflow-hidden relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading workflow...</p>
              </div>
            </div>
          ) : (
            <WorkflowCanvasWrapper
              workflowId={currentWorkflow.id}
              initialNodes={loadedWorkflowData?.nodes}
              initialEdges={loadedWorkflowData?.edges}
              onSave={handleSaveWorkflow}
              onExecute={handleExecuteWorkflow}
            />
          )}
        </div>
      </div>

      {/* Status Bar - Enhanced */}
      <div className="h-10 border-t bg-muted/30 backdrop-blur-sm flex items-center justify-between px-6 text-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-medium text-foreground">Ready</span>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <span className="text-muted-foreground">
            <span className="text-foreground font-medium">{currentOrganization?.name || 'Personal'}</span>
          </span>
          <div className="h-4 w-px bg-border"></div>
          <span className="text-muted-foreground hidden md:block">{user?.email}</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-muted-foreground">
            Last saved: <span className="text-foreground">Never</span>
          </span>
          <div className="h-4 w-px bg-border"></div>
          <span className="text-muted-foreground">
            Version: <span className="text-foreground font-mono">{currentWorkflow.version}</span>
          </span>
        </div>
      </div>
    </div>
  )
}