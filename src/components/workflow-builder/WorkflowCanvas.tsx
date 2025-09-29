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
  onSave?: (workflow: { nodes: Node[]; edges: Edge[] }) => void
  onExecute?: (workflowId: string) => void
}

export function WorkflowCanvas({
  workflowId,
  isReadOnly = false,
  onSave,
  onExecute,
}: WorkflowCanvasProps) {
  const { toast } = useToast()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
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

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type || !reactFlowInstance) return

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const newNodeId = `${type}_${Date.now()}`
      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data: {
          label: getDefaultLabel(type),
          config: {},
        },
      }

      setNodes((nds) => nds.concat(newNode))
      
      toast({
        title: "Node Added",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} node added to workflow`,
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
      {/* Toolbar */}
      <div className="bg-background border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Workflow Builder</h2>
          <Badge variant="outline">
            {nodes.length} nodes, {edges.length} connections
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoLayout}
              >
                <Grid className="h-4 w-4 mr-2" />
                Auto Layout
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <Square className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isExecuting ? 'Running...' : 'Execute'}
              </Button>
            </>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleFitView}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
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
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionMode={ConnectionMode.Loose}
            fitView
            className="bg-background"
            proOptions={{ hideAttribution: true }}
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

// Wrapper component with ReactFlowProvider
export function WorkflowCanvasWrapper(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  )
}