'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
  DollarSign,
  Activity,
  TrendingUp,
} from 'lucide-react'

export interface AIExecutionStatus {
  nodeId: string
  agentId: string
  agentName: string
  model: string
  status: 'idle' | 'queued' | 'processing' | 'streaming' | 'completed' | 'error'
  progress?: number // 0-100
  currentStep?: string
  tokensUsed: {
    input: number
    output: number
    total: number
  }
  cost: number
  duration: number // milliseconds
  error?: string
  startTime?: Date
  estimatedTimeRemaining?: number
}

interface AIRealTimeStatusIndicatorProps {
  nodeId: string
  workflowExecutionId?: string
  position?: 'overlay' | 'inline' | 'badge'
  showDetails?: boolean
  onStatusChange?: (status: AIExecutionStatus) => void
}

export function AIRealTimeStatusIndicator({
  nodeId,
  workflowExecutionId,
  position = 'overlay',
  showDetails = true,
  onStatusChange,
}: AIRealTimeStatusIndicatorProps) {
  const [status, setStatus] = useState<AIExecutionStatus>({
    nodeId,
    agentId: '',
    agentName: 'AI Agent',
    model: '',
    status: 'idle',
    tokensUsed: { input: 0, output: 0, total: 0 },
    cost: 0,
    duration: 0,
  })

  const [isVisible, setIsVisible] = useState(false)

  // Simulate real-time updates - replace with actual WebSocket/SSE connection
  useEffect(() => {
    if (!workflowExecutionId) return

    // Show indicator when execution starts
    setIsVisible(true)

    // Simulate status updates
    const statusUpdates = [
      { status: 'queued' as const, progress: 0, currentStep: 'Queued for processing' },
      { status: 'processing' as const, progress: 20, currentStep: 'Preparing prompt' },
      { status: 'processing' as const, progress: 40, currentStep: 'Sending to AI model' },
      { status: 'streaming' as const, progress: 60, currentStep: 'Receiving response' },
      { status: 'processing' as const, progress: 80, currentStep: 'Processing output' },
      { status: 'completed' as const, progress: 100, currentStep: 'Completed' },
    ]

    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex >= statusUpdates.length) {
        clearInterval(interval)
        // Hide after completion
        setTimeout(() => setIsVisible(false), 3000)
        return
      }

      const update = statusUpdates[currentIndex]
      const newStatus: AIExecutionStatus = {
        ...status,
        status: update.status,
        progress: update.progress,
        currentStep: update.currentStep,
        tokensUsed: {
          input: Math.floor(Math.random() * 500) + 100,
          output: Math.floor(Math.random() * 1000) + 200,
          total: 0,
        },
        cost: Math.random() * 0.05,
        duration: Date.now() - (status.startTime?.getTime() || Date.now()),
      }
      newStatus.tokensUsed.total = newStatus.tokensUsed.input + newStatus.tokensUsed.output

      setStatus(newStatus)
      onStatusChange?.(newStatus)
      currentIndex++
    }, 1500)

    return () => clearInterval(interval)
  }, [workflowExecutionId])

  const getStatusIcon = () => {
    switch (status.status) {
      case 'idle':
        return <Brain className="h-4 w-4 text-gray-400" />
      case 'queued':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'processing':
      case 'streaming':
        return <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusColor = () => {
    switch (status.status) {
      case 'idle':
        return 'bg-gray-100 border-gray-300'
      case 'queued':
        return 'bg-blue-50 border-blue-300'
      case 'processing':
      case 'streaming':
        return 'bg-purple-50 border-purple-300'
      case 'completed':
        return 'bg-green-50 border-green-300'
      case 'error':
        return 'bg-red-50 border-red-300'
    }
  }

  const getStatusText = () => {
    switch (status.status) {
      case 'idle':
        return 'Ready'
      case 'queued':
        return 'Queued'
      case 'processing':
        return 'Processing'
      case 'streaming':
        return 'Streaming'
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Failed'
    }
  }

  if (!isVisible && status.status === 'idle') return null

  // Badge position (small indicator on node)
  if (position === 'badge') {
    return (
      <div className="absolute -top-2 -right-2 z-10">
        <div className={`
          flex items-center gap-1 px-2 py-1 rounded-full border-2
          ${getStatusColor()}
          shadow-lg animate-in fade-in zoom-in duration-200
        `}>
          {getStatusIcon()}
          {status.status === 'processing' || status.status === 'streaming' ? (
            <span className="text-xs font-medium">
              {status.progress}%
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  // Inline position (inside node)
  if (position === 'inline') {
    return (
      <div className={`
        flex items-center gap-2 p-2 rounded-lg border
        ${getStatusColor()}
        animate-in fade-in slide-in-from-top-2 duration-300
      `}>
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{status.currentStep || getStatusText()}</p>
          {(status.status === 'processing' || status.status === 'streaming') && (
            <Progress value={status.progress} className="h-1 mt-1" />
          )}
        </div>
        {showDetails && status.status === 'completed' && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="text-xs">
              {status.tokensUsed.total}t
            </Badge>
            <span className="text-muted-foreground">${status.cost.toFixed(4)}</span>
          </div>
        )}
      </div>
    )
  }

  // Overlay position (floating card next to node)
  return (
    <div className="absolute -top-2 left-full ml-4 z-50 animate-in fade-in slide-in-from-left-2 duration-300">
      <Card className={`
        w-80 shadow-2xl border-2
        ${getStatusColor()}
      `}>
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <div>
                <p className="font-semibold text-sm">{status.agentName}</p>
                <p className="text-xs text-muted-foreground">{status.model}</p>
              </div>
            </div>
            <Badge variant={status.status === 'completed' ? 'default' : 'secondary'}>
              {getStatusText()}
            </Badge>
          </div>

          {/* Current Step */}
          {status.currentStep && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Current Step:</p>
              <p className="text-sm font-medium">{status.currentStep}</p>
            </div>
          )}

          {/* Progress Bar */}
          {(status.status === 'processing' || status.status === 'streaming') && status.progress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-mono font-medium">{status.progress}%</span>
              </div>
              <Progress value={status.progress} className="h-2" />
            </div>
          )}

          {/* Streaming Indicator */}
          {status.status === 'streaming' && (
            <div className="flex items-center gap-2 text-xs text-purple-600">
              <Activity className="h-3 w-3 animate-pulse" />
              <span>Streaming response in real-time...</span>
            </div>
          )}

          {/* Metrics */}
          {showDetails && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              {/* Tokens */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tokens</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Input:</span>
                    <span className="font-mono">{status.tokensUsed.input.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Output:</span>
                    <span className="font-mono">{status.tokensUsed.output.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium pt-0.5 border-t">
                    <span>Total:</span>
                    <span className="font-mono">{status.tokensUsed.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Cost & Duration */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Cost & Time</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-mono text-green-600">${status.cost.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-mono">{(status.duration / 1000).toFixed(1)}s</span>
                  </div>
                  {status.estimatedTimeRemaining && status.status === 'processing' && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">ETA:</span>
                      <span className="font-mono">{(status.estimatedTimeRemaining / 1000).toFixed(0)}s</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {status.status === 'error' && status.error && (
            <div className="p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
              <p className="font-medium mb-1">Error:</p>
              <p>{status.error}</p>
            </div>
          )}

          {/* Success Summary */}
          {status.status === 'completed' && (
            <div className="flex items-center gap-2 p-2 bg-green-100 border border-green-300 rounded">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <div className="flex-1 text-xs">
                <p className="font-medium text-green-800">
                  Completed in {(status.duration / 1000).toFixed(1)}s
                </p>
                <p className="text-green-600">
                  {status.tokensUsed.total.toLocaleString()} tokens • ${status.cost.toFixed(4)}
                </p>
              </div>
            </div>
          )}

          {/* Efficiency Indicator */}
          {status.status === 'completed' && status.cost < 0.01 && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span>Cost-efficient execution</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// Hook for managing multiple AI status indicators in a workflow
export function useAIStatusTracking(workflowExecutionId?: string) {
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, AIExecutionStatus>>(new Map())

  const updateNodeStatus = useCallback((nodeId: string, status: AIExecutionStatus) => {
    setNodeStatuses(prev => new Map(prev).set(nodeId, status))
  }, [])

  const clearNodeStatus = useCallback((nodeId: string) => {
    setNodeStatuses(prev => {
      const next = new Map(prev)
      next.delete(nodeId)
      return next
    })
  }, [])

  const clearAllStatuses = useCallback(() => {
    setNodeStatuses(new Map())
  }, [])

  const getNodeStatus = useCallback((nodeId: string) => {
    return nodeStatuses.get(nodeId)
  }, [nodeStatuses])

  // Calculate aggregate statistics
  const stats = {
    totalNodes: nodeStatuses.size,
    activeNodes: Array.from(nodeStatuses.values()).filter(
      s => s.status === 'processing' || s.status === 'streaming'
    ).length,
    completedNodes: Array.from(nodeStatuses.values()).filter(s => s.status === 'completed').length,
    failedNodes: Array.from(nodeStatuses.values()).filter(s => s.status === 'error').length,
    totalTokens: Array.from(nodeStatuses.values()).reduce((sum, s) => sum + s.tokensUsed.total, 0),
    totalCost: Array.from(nodeStatuses.values()).reduce((sum, s) => sum + s.cost, 0),
    avgDuration: nodeStatuses.size > 0
      ? Array.from(nodeStatuses.values()).reduce((sum, s) => sum + s.duration, 0) / nodeStatuses.size
      : 0,
  }

  return {
    nodeStatuses,
    updateNodeStatus,
    clearNodeStatus,
    clearAllStatuses,
    getNodeStatus,
    stats,
  }
}

// Workflow-level execution summary component
interface AIWorkflowExecutionSummaryProps {
  stats: ReturnType<typeof useAIStatusTracking>['stats']
  isExecuting: boolean
}

export function AIWorkflowExecutionSummary({
  stats,
  isExecuting,
}: AIWorkflowExecutionSummaryProps) {
  if (!isExecuting && stats.totalNodes === 0) return null

  return (
    <Card className="border-2 border-purple-200 bg-purple-50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-sm">AI Execution Summary</h3>
          </div>
          {isExecuting && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Running
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">AI Nodes</p>
            <p className="text-2xl font-bold">{stats.totalNodes}</p>
            <p className="text-xs text-green-600">
              {stats.completedNodes} completed
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold text-purple-600">{stats.activeNodes}</p>
            {stats.failedNodes > 0 && (
              <p className="text-xs text-red-600">{stats.failedNodes} failed</p>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
            <p className="text-2xl font-bold">{(stats.totalTokens / 1000).toFixed(1)}K</p>
            <p className="text-xs text-muted-foreground">
              {stats.avgDuration > 0 ? `${(stats.avgDuration / 1000).toFixed(1)}s avg` : ''}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
            <p className="text-2xl font-bold text-green-600">${stats.totalCost.toFixed(3)}</p>
            <p className="text-xs text-muted-foreground">
              {stats.totalNodes > 0 ? `$${(stats.totalCost / stats.totalNodes).toFixed(4)}/node` : ''}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}