'use client'

import React, { useState, useCallback, useRef, Suspense } from 'react'
import {
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Node,
  Edge,
  Connection,
  EdgeChange,
  NodeChange,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'

// Import custom node types
import { TriggerNode } from '@/components/workflow-builder/nodes/TriggerNode'
import { ActionNode } from '@/components/workflow-builder/nodes/ActionNode'
import { ConditionNode } from '@/components/workflow-builder/nodes/ConditionNode'
import { AIAgentNode } from '@/components/workflow-builder/nodes/AIAgentNode'
import { NodeInspector } from './NodeInspector'
import { IntegrationRegistry } from '@/lib/integrations/IntegrationRegistry'

import {
  Play,
  Save,
  Plus,
  Settings,
  Eye,
  Trash2,
  Copy,
  Download,
  Upload,
  Zap,
  GitBranch,
  Database,
  Code,
  Mail,
  Webhook,
  Clock,
  MousePointer,
  Bot,
} from 'lucide-react'

// Defining node types

const nodeType = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  aiAgent: AIAgentNode,
}

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 100, y: 100 },
    data: {
      label: 'Manual Trigger',
      triggerType: 'manual',
      config: {},
    },
  },
]

const initialEdges: Edge[] = []

interface WorkflowBuilderProps {
  workflowId?: string
  initialWorkflow: any
  onSave?: (workflow: any) => void
  onExecute?: (workflow: any) => void
}

export function WorkflowBuilder({
  workflowId,
  initialWorkflow,
  onSave,
  onExecute,
}: WorkflowBuilderProps) {
  const { toast } = useToast()
  const [nodes, setNodes] = useState<Node[]>(initialWorkflow?.nodes || initialNodes)
  const [edges, setEdges] = useState<Edge[]>(initialWorkflow?.edges || initialEdges)
  const [workflowName, setWorkflowName] = useState(
    initialWorkflow?.name || 'Untitled Workflow'
  )
  const [workflowDescription, setWorkflowDescription] = useState(
    initialWorkflow?.description || ''
  )
  const [isValidating, setIsValidating] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // Node change handlers

  const onNodeChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds: any) => applyNodeChanges(changes, nds)),
    []
  )

  const onEdgeChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds: any) => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds: any) => addEdge(connection, eds))
  }, [])

  // Adding new node

  const addNode = (nodeType: string) => {
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position: { x: Math.random() * 400 + 200, y: Math.random() * 400 + 200 },
      data: {
        label: `New ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`,
        config: getDefaultConfig(nodeType),
      },
    }
    setNodes((nds: any) => [...nds, newNode])
    setSelectedNode(newNode.id)
  }

  // Get default configuration for node type

  const getDefaultConfig = (nodeType: string) => {
    switch (nodeType) {
      case 'trigger':
        return {
          type: 'webhook',
          path: '/webhook/demo-form',
          config: {}
        }
      case 'action':
        return {
          integration: '', // This will be selected in the inspector
          action: '',
          config: {}
        }
      case 'condition':
        return {
          field: 'trigger.email',
          operator: 'contains',
          value: '@company.com'
        }
      case 'transform':
        return {
          type: 'map',
          mapping: {
            'output.name': 'input.firstName + " " + input.lastName'
          }
        }
      case 'aiAgent':
        return {
          agentType: 'textAnalysis',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 1000,
          config: {}
        }
      default:
        return {}
    }
  }
  // Deleting the selected node

  const deleteNode = (nodeId: string) => {
    setNodes((nds: any) => nds.filter((n: any) => n.id !== nodeId))
    setEdges((eds: any) =>
      eds.filter((e: any) => e.source !== nodeId && e.target !== nodeId)
    )

    if (selectedNode === nodeId) {
      setSelectedNode(null)
    }
  }

  // Validating the workflow

  const validateWorkflow = async () => {
    setIsValidating(true)
    const errors: string[] = []

    try {
      // Basic validation

      if (!workflowName.trim()) {
        errors.push('Workflow name is required')
      }
      if (nodes.length === 0) {
        errors.push('Workflow must have at least one node')
      }
      // Check for trigger node

      const triggerNodes = nodes.filter(n => n.type === 'trigger')
      if (triggerNodes.length === 0) {
        errors.push('Workflow must have at least one trigger')
      }
      if (triggerNodes.length > 1) {
        errors.push('Workflow can only have one trigger')
      }

      // Check for orphaned nodes

      const connectedNodes = new Set()
      edges.forEach(edge => {
        connectedNodes.add(edge.source)
        connectedNodes.add(edge.target)
      })

      const orphanedNodes = nodes.filter(
        n => n.type !== 'trigger' && !connectedNodes.has(n.id)
      )

      if (orphanedNodes.length > 0) {
        errors.push(
          `${orphanedNodes.length} node(s) are not connected to the workflow`
        )
      }

      // Validating indiviual nodes now

      for (const node of nodes) {
        const nodeErrors = validateNode(node)
        errors.push(...nodeErrors)
      }

      setValidationErrors(errors)

      if (errors.length === 0) {
        toast({
          title: 'Validation Successful',
          description: 'Workflow is valid and ready to save',
        })
      } else {
        toast({
          title: 'Validation Failed',
          description: `Found ${errors.length} error(s)`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      errors.push('Validation failed due to unexpected error')
      setValidationErrors(errors)
    } finally {
      setIsValidating(false)
    }
  }
  const validateNode = (node: Node): string[] => {
    const errors: string[] = []
    const config = node.data.config as any

    switch (node.type) {
      case 'action':
        if (config?.type === 'http') {
          if (!config.url) {
            errors.push(`Action "${node.data.label}" is missing URL`)
          }
        } else if (config?.type === 'email') {
          if (!config.to) {
            errors.push(
              `Email action "${node.data.label}" is missing recipient`
            )
          }
        }
        break

      case 'condition':
        if (!config?.field) {
          errors.push(`Condition "${node.data.label}" is missing field`)
        }
        if (!config?.operator) {
          errors.push(`Condition "${node.data.label}" is missing operator`)
        }
        break

      case 'transform':
        if (!config?.type) {
          errors.push(
            `Transform "${node.data.label}" is missing transformation type`
          )
        }
        break
    }

    return errors
  }

  // Saving the workflow
  const saveWorkflow = async () => {
    await validateWorkflow()

    if (validationErrors.length > 0) {
      toast({
        title: 'Cannot Save',
        description: 'Please fix validation errors before saving',
        variant: 'destructive',
      })
      return
    }

    const workflow = {
      name: workflowName,
      description: workflowDescription,
      trigger_config: getTriggerConfig(),
      actions: getActionsConfig(),
      conditions: getConditionsConfig(),
      nodes: nodes,
      edges: edges,
      layout: {
        version: '1.0',
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    }

    if (onSave) {
      onSave(workflow)
    }
  }

  // Executing the workflow

  const executeWorkflow = async () => {
    await validateWorkflow()

    if (validationErrors.length > 0) {
      toast({
        title: 'Cannot Execute',
        description: 'Please fix validation errors before executing',
        variant: 'destructive',
      })
      return
    }

    const workflow = {
      name: workflowName,
      description: workflowDescription,
      trigger_config: getTriggerConfig(),
      actions: getActionsConfig(),
      conditions: getConditionsConfig(),
    }

    if (onExecute) {
      onExecute(workflow)
    }
  }

  const getTriggerConfig = () => {
    const triggerNode = nodes.find(n => n.type === 'trigger')
    return {
      ...(triggerNode?.data.config || { type: 'manual', config: {} }),
      nodes: nodes,  // Include nodes array for execution
      edges: edges   // Include edges array for execution
    }
  }

  const getActionsConfig = () => {
    return nodes
      .filter(n => n.type === 'action' || n.type === 'transform')
      .map(node => {
        const config = node.data.config as any
        return {
          id: node.id,
          type: config?.type || node.type,
          name: node.data.label,
          config: config || {},
        }
      })
  }

  const getConditionsConfig = () => {
    return nodes
      .filter(n => n.type === 'condition')
      .map(node => {
        const config = node.data.config as any
        return {
          id: node.id,
          field: config?.field || '',
          operator: config?.operator || 'equals',
          value: config?.value || '',
        }
      })
  }
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Don't open NodeInspector for nodes that have their own Settings dialog
    // Action and AI Agent nodes have detailed Settings buttons
    if (node.type === 'action' || node.type === 'aiAgent') {
      return
    }
    setSelectedNode(node.id)
  }, [])

  // Clear selection when clicking on pane
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Node Palette */}
      <Card className="w-80 rounded-none border-r">
        <CardHeader>
          <CardTitle>Workflow Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workflow Info */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={e => setWorkflowName(e.target.value)}
                placeholder="Enter workflow name"
              />
            </div>
            <div>
              <Label htmlFor="workflow-description">Description</Label>
              <Input
                id="workflow-description"
                value={workflowDescription}
                onChange={e => setWorkflowDescription(e.target.value)}
                placeholder="Enter description (optional)"
              />
            </div>
          </div>

          <Separator />

          {/* Node Palette */}
          <div>
            <h3 className="font-medium mb-3">Add Components</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addNode('trigger')}
                className="h-16 flex-col gap-1"
              >
                <Zap className="h-4 w-4" />
                Trigger
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => addNode('action')}
                className="h-16 flex-col gap-1"
              >
                <Play className="h-4 w-4" />
                Action
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => addNode('condition')}
                className="h-16 flex-col gap-1"
              >
                <GitBranch className="h-4 w-4" />
                Condition
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => addNode('transform')}
                className="h-16 flex-col gap-1"
              >
                <Code className="h-4 w-4" />
                Transform
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => addNode('aiAgent')}
                className="h-16 flex-col gap-1"
              >
                <Bot className="h-4 w-4" />
                AI Agent
              </Button>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={validateWorkflow}
              disabled={isValidating}
              className="w-full"
              variant="outline"
            >
              {isValidating ? (
                <>
                  <Eye className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Validate
                </>
              )}
            </Button>

            <Button onClick={saveWorkflow} className="w-full" variant="outline">
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>

            <Button onClick={executeWorkflow} className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Execute
            </Button>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-destructive">
                Validation Errors:
              </h4>
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm text-destructive bg-destructive/10 p-2 rounded"
                  >
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodeChange}
          onEdgesChange={onEdgeChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeType}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {/* Node Inspector */}
        {selectedNode && (
          <NodeInspector
            node={nodes.find(n => n.id === selectedNode)}
            onUpdate={updatedNode => {
              setNodes(nds =>
                nds.map(n =>
                  n.id === selectedNode ? { ...n, ...updatedNode } : n
                )
              )
            }}
            onDelete={() => deleteNode(selectedNode)}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  )
}

// Wrapper component with ReactFlow provider
export function WorkflowBuilderWrapper(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
  
      <WorkflowBuilder {...props} />
 
    </ReactFlowProvider>
  )
}
