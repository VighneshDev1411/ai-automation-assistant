'use client'

import React, { useCallback, useRef, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  ReactFlowInstance,
  MarkerType,
  ConnectionMode,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Play,
  Save,
  Download,
  Upload,
  Zap,
  Plus,
  Settings,
  Eye,
  Square,
  RotateCcw,
  Grid,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Trash2,
} from 'lucide-react'

// Import our custom node types (we'll create these next)
import { TriggerNode } from './nodes/TriggerNode'
import { ActionNode } from './nodes/ActionNode'
import { ConditionNode } from './nodes/ConditionNode'
import { AIAgentNode } from './nodes/AIAgentNode'

// import { DelayNode } from './nodes/DelayNode'
import { DelayNode } from './nodes/DelayNode'
// import { WebhookNode } from './nodes/WebhookNode'
import { WebhookNode } from './nodes/WebhookNode'

// Node type definitions
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  aiAgent: AIAgentNode,
  delay: DelayNode,
  webhook: WebhookNode,
}

// Initial nodes for demo
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 100, y: 100 },
    data: {
      label: 'When this happens...',
      triggerType: 'webhook',
      config: {},
    },
  },
]

const initialEdges: Edge[] = []

// Default edge style
const defaultEdgeOptions = {
  style: { strokeWidth: 2, stroke: '#6366f1' },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#6366f1',
  },
}

interface WorkflowCanvasProps {
  workflowId?: string
  isReadOnly?: boolean
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onSave?: (workflow: { nodes: Node[]; edges: Edge[] }) => void
  onExecute?: (workflowId: string) => void
}

export function WorkflowCanvas({
  workflowId,
  isReadOnly = false,
  initialNodes: providedInitialNodes,
  initialEdges: providedInitialEdges,
  onSave,
  onExecute,
}: WorkflowCanvasProps) {
  const { toast } = useToast()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

  // React Flow state - use provided initial data if available, otherwise use defaults
  const [nodes, setNodes, onNodesChange] = useNodesState(providedInitialNodes || initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(providedInitialEdges || initialEdges)

  // Update nodes and edges when initial data changes (for loading existing workflows)
  useEffect(() => {
    if (providedInitialNodes && providedInitialNodes.length > 0) {
      setNodes(providedInitialNodes)
    }
    if (providedInitialEdges && providedInitialEdges.length > 0) {
      setEdges(providedInitialEdges)
    }
  }, [providedInitialNodes, providedInitialEdges, setNodes, setEdges])
  
  // UI state
  const [isExecuting, setIsExecuting] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showMiniMap, setShowMiniMap] = useState(true)
  const [showGrid, setShowGrid] = useState(true)

  // Handle new connections between nodes
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      // Validate connection
      if (params.source === params.target) {
        toast({
          title: "Invalid Connection",
          description: "Cannot connect a node to itself",
          variant: "destructive",
        })
        return
      }

      // Check for existing connection
      const existingEdge = edges.find(
        (edge) => edge.source === params.source && edge.target === params.target
      )
      
      if (existingEdge) {
        toast({
          title: "Connection Exists",
          description: "A connection already exists between these nodes",
          variant: "destructive",
        })
        return
      }

      setEdges((eds) => addEdge({ ...params, ...defaultEdgeOptions }, eds))
      
      toast({
        title: "Connection Created",
        description: "Successfully connected workflow nodes",
      })
    },
    [edges, setEdges, toast]
  )

  // Handle drag and drop from toolbar
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const nodeId = event.dataTransfer.getData('application/reactflow')
      if (!nodeId || !reactFlowInstance) return

      // Map node IDs to their types
      const nodeTypeMap: Record<string, string> = {
        'webhook-trigger': 'trigger',
        'schedule-trigger': 'trigger',
        'email-trigger': 'trigger',
        'file-trigger': 'trigger',
        'send-email': 'action',
        'create-record': 'action',
        'send-slack': 'action',
        'create-calendar': 'action',
        'upload-file': 'action',
        'call-api': 'action',
        'ai-text-analysis': 'aiAgent',
        'ai-content-generation': 'aiAgent',
        'ai-image-analysis': 'aiAgent',
        'ai-data-processing': 'aiAgent',
        'condition': 'condition',
        'filter': 'condition',
        'delay': 'delay',
        'transform': 'action',
        'custom-code': 'action',
        'webhook-call': 'webhook',
      }

      const type = nodeTypeMap[nodeId] || 'action'

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNodeId = `${nodeId}_${Date.now()}`

      // Map nodeId to actionType for ActionNode
      const actionTypeMap: Record<string, string> = {
        'send-email': 'sendEmail',
        'create-record': 'createRecord',
        'send-slack': 'sendSlack',
        'create-calendar': 'createCalendarEvent',
        'upload-file': 'uploadFile',
        'call-api': 'apiCall',
        'custom-code': 'customCode',
        'transform': 'transformData',
      }

      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: {
          label: getDefaultLabelForNode(nodeId),
          nodeId,
          actionType: actionTypeMap[nodeId],
          config: {},
        },
      }

      setNodes((nds) => nds.concat(newNode))

      toast({
        title: "Node Added",
        description: `${getDefaultLabelForNode(nodeId)} added to workflow`,
      })
    },
    [reactFlowInstance, setNodes, toast]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Node selection handler
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node)
    },
    []
  )

  // Delete selected nodes (Delete/Backspace key)
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      toast({
        title: "Node Deleted",
        description: `${deleted.length} node(s) removed from workflow`,
      })
    },
    [toast]
  )

  // Delete selected edges
  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      toast({
        title: "Connection Deleted",
        description: `${deleted.length} connection(s) removed`,
      })
    },
    [toast]
  )

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete selected nodes with Delete or Backspace
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        event.preventDefault()
        setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id))
        setEdges((eds) => eds.filter(
          (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
        ))
        setSelectedNode(null)
        toast({
          title: "Node Deleted",
          description: "Node and its connections removed",
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNode, setNodes, setEdges, toast])

  // Clear selection when clicking canvas
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // Save workflow
  const handleSave = useCallback(() => {
    const workflow = {
      nodes,
      edges,
      viewport: reactFlowInstance?.getViewport(),
      updatedAt: new Date().toISOString(),
    }

    if (onSave) {
      onSave({ nodes, edges })
    }

    toast({
      title: "Workflow Saved",
      description: "Your workflow has been saved successfully",
    })
  }, [nodes, edges, reactFlowInstance, onSave, toast])

  // Execute workflow
  const handleExecute = useCallback(async () => {
    if (!workflowId) {
      toast({
        title: "Save Required",
        description: "Please save the workflow before executing",
        variant: "destructive",
      })
      return
    }

    setIsExecuting(true)
    
    try {
      if (onExecute) {
        await onExecute(workflowId)
      }
      
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
  }, [workflowId, onExecute, toast])

  // Auto-layout function
  const handleAutoLayout = useCallback(() => {
    // Simple auto-layout algorithm - we'll enhance this later
    const layoutedNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: 100 + (index % 3) * 300,
        y: 100 + Math.floor(index / 3) * 200,
      },
    }))
    
    setNodes(layoutedNodes)
    
    toast({
      title: "Layout Applied",
      description: "Nodes have been automatically arranged",
    })
  }, [nodes, setNodes, toast])

  // Fit view to content
  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2 })
    }
  }, [reactFlowInstance])

  return (
    <div className="h-full w-full flex flex-col">
      {/* Enhanced Toolbar */}
      <div className="bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="px-6 py-3 flex items-center justify-between">
          {/* Left Section - Title & Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Canvas</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{nodes.length} nodes</span>
                  <span>•</span>
                  <span>{edges.length} connections</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
                {/* Delete Node (appears when selected) */}
                {selectedNode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id))
                      setEdges((eds) => eds.filter(
                        (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
                      ))
                      setSelectedNode(null)
                      toast({
                        title: "Node Deleted",
                        description: "Node and its connections removed",
                      })
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 border-red-200 dark:border-red-900"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Node
                  </Button>
                )}

                {/* Separator */}
                {selectedNode && <div className="h-6 w-px bg-border"></div>}

                {/* Layout Actions */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAutoLayout}
                  title="Auto arrange nodes"
                >
                  <Grid className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Auto Layout</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFitView}
                  title="Fit to view"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>

                {/* Separator */}
                <div className="h-6 w-px bg-border"></div>

                {/* Primary Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md gap-2"
                >
                  {isExecuting ? (
                    <>
                      <Square className="h-4 w-4 animate-pulse" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Execute</span>
                    </>
                  )}
                </Button>
              </>
            )}

            {isReadOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleFitView}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Fit View
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex">
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionMode={ConnectionMode.Loose}
            fitView
            className="bg-background"
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={['Delete', 'Backspace']}
          >
            <Background
              variant={showGrid ? BackgroundVariant.Dots : BackgroundVariant.Lines}
              gap={20}
              size={1}
            />
            <Controls showInteractive={false} />
            
            {showMiniMap && (
              <MiniMap
                style={{
                  height: 120,
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                }}
                zoomable
                pannable
              />
            )}

            {/* Canvas Controls Panel */}
            <Panel position="top-right" className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMiniMap(!showMiniMap)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </Panel>

            {/* Workflow Stats Panel */}
            <Panel position="bottom-left">
              <Card className="w-64">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Workflow Stats</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Nodes:</span>
                    <span>{nodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connections:</span>
                    <span>{edges.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={isExecuting ? "default" : "secondary"} className="text-xs">
                      {isExecuting ? "Running" : "Ready"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}

// Helper function to get default labels for nodes
function getDefaultLabel(type: string): string {
  switch (type) {
    case 'trigger':
      return 'When this happens...'
    case 'action':
      return 'Then do this...'
    case 'condition':
      return 'If condition is met...'
    case 'aiAgent':
      return 'AI processes...'
    case 'delay':
      return 'Wait for...'
    case 'webhook':
      return 'Call webhook...'
    default:
      return 'New node'
  }
}

// Helper function to get specific label based on node ID
function getDefaultLabelForNode(nodeId: string): string {
  const labelMap: Record<string, string> = {
    'webhook-trigger': 'Webhook Trigger',
    'schedule-trigger': 'Schedule Trigger',
    'email-trigger': 'Email Received',
    'file-trigger': 'File Upload',
    'send-email': 'Send Email',
    'create-record': 'Create Record',
    'send-slack': 'Send Slack Message',
    'create-calendar': 'Create Calendar Event',
    'upload-file': 'Upload File',
    'call-api': 'API Call',
    'ai-text-analysis': 'Text Analysis',
    'ai-content-generation': 'Content Generation',
    'ai-image-analysis': 'Image Analysis',
    'ai-data-processing': 'Data Processing',
    'condition': 'Condition',
    'filter': 'Filter',
    'delay': 'Delay',
    'transform': 'Transform Data',
    'custom-code': 'Custom Code',
    'webhook-call': 'Webhook Call',
  }

  return labelMap[nodeId] || 'New Node'
}

// Wrapper component with ReactFlowProvider
export function WorkflowCanvasWrapper(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  )
}