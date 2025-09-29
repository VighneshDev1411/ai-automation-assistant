'use client'

import React, { useState, useCallback, useEffect } from 'react'
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
  
  // Workflow state
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowMetadata>({
    name: 'Untitled Workflow',
    description: '',
    category: 'Automation',
    tags: [],
    isPublic: false,
    version: '1.0.0',
  })
  
  // UI state
  const [isNewWorkflowOpen, setIsNewWorkflowOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isExecutionHistoryOpen, setIsExecutionHistoryOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [showToolbar, setShowToolbar] = useState(true)
  
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
      // In real implementation, this would save to your API
      console.log('Saving workflow:', {
        ...currentWorkflow,
        nodes: workflowData.nodes,
        edges: workflowData.edges,
        organizationId: currentOrganization?.id,
        updatedAt: new Date().toISOString(),
      })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast({
        title: "Workflow Saved",
        description: `"${currentWorkflow.name}" has been saved successfully`,
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [currentWorkflow, currentOrganization, toast])

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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-4 flex-1">
            {/* Workflow Info */}
            <div className="flex items-center gap-2">
              <Workflow className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">{currentWorkflow.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {currentWorkflow.description || 'No description'}
                </p>
              </div>
            </div>

            {/* Workflow Status */}
            <div className="flex items-center gap-2">
              <Badge variant="outline">{currentWorkflow.category}</Badge>
              <Badge variant="secondary">v{currentWorkflow.version}</Badge>
              {currentWorkflow.isPublic && (
                <Badge variant="default">Public</Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Toggle Toolbar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowToolbar(!showToolbar)}
            >
              <FolderOpen className="h-4 w-4" />
            </Button>

            {/* Execution History */}
            <Dialog open={isExecutionHistoryOpen} onOpenChange={setIsExecutionHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <History className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Execution History</DialogTitle>
                  <DialogDescription>
                    Recent workflow executions and their results
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {executionHistory.map((execution) => (
                    <Card key={execution.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {execution.status === 'completed' && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                            {execution.status === 'failed' && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                            {execution.status === 'running' && (
                              <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                            )}
                            <span className="font-medium">
                              Execution {execution.id}
                            </span>
                          </div>
                          <Badge 
                            variant={execution.status === 'completed' ? 'default' : 
                                   execution.status === 'failed' ? 'destructive' : 'secondary'}
                          >
                            {execution.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Started:</span>
                            <div>{new Date(execution.startedAt).toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Duration:</span>
                            <div>{execution.duration ? `${(execution.duration / 1000).toFixed(1)}s` : 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Triggered by:</span>
                            <div>{execution.triggeredBy}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Steps:</span>
                            <div className="flex gap-1">
                              {execution.stepResults.map((step, index) => (
                                <div
                                  key={index}
                                  className={`w-3 h-3 rounded-full ${
                                    step.status === 'success' ? 'bg-green-500' :
                                    step.status === 'error' ? 'bg-red-500' : 'bg-gray-300'
                                  }`}
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
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
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

            {/* Save */}
            <Button
              variant="outline"
              onClick={() => handleSaveWorkflow({ nodes: [], edges: [] })}
              disabled={isSaving}
            >
              {isSaving ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>

            {/* Execute */}
            <Button
              onClick={() => handleExecuteWorkflow(currentWorkflow.id || 'demo')}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isExecuting ? 'Running...' : 'Execute'}
            </Button>

            {/* New Workflow */}
            <Dialog open={isNewWorkflowOpen} onOpenChange={setIsNewWorkflowOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New
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

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Toolbar */}
        {showToolbar && (
          <div className="w-80 border-r bg-background/50 overflow-hidden">
            <NodeToolbar />
          </div>
        )}

        {/* Workflow Canvas */}
        <div className="flex-1 overflow-hidden">
          <WorkflowCanvasWrapper
            workflowId={currentWorkflow.id}
            onSave={handleSaveWorkflow}
            onExecute={handleExecuteWorkflow}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t bg-muted/50 flex items-center justify-between px-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Ready</span>
          <span>•</span>
          <span>Organization: {currentOrganization?.name || 'Personal'}</span>
          <span>•</span>
          <span>User: {user?.email}</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span>Last saved: Never</span>
          <span>•</span>
          <span>Version: {currentWorkflow.version}</span>
        </div>
      </div>
    </div>
  )
}