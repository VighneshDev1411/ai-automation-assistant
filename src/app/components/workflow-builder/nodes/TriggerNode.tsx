// src/components/workflow-builder/nodes/TriggerNode.tsx
import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Webhook, Clock, Mail, MousePointer } from 'lucide-react'

interface TriggerNodeData {
  label: string
  triggerType: string
  config: any
}

export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const getTriggerIcon = () => {
    switch (data.config?.type || data.triggerType) {
      case 'webhook':
        return <Webhook className="h-4 w-4" />
      case 'schedule':
        return <Clock className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'manual':
      default:
        return <MousePointer className="h-4 w-4" />
    }
  }

const getTriggerColor = () => {
  switch (data.config?.type || data.triggerType) {
    case 'webhook':
      return 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700'
    case 'schedule':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
    case 'email':
      return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
    case 'manual':
    default:
      return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700'
  }
}

  return (
    <Card className={`min-w-48 ${getTriggerColor()} ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {getTriggerIcon()}
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">TRIGGER</span>
        </div>
        
        <div className="text-sm font-medium mb-2">
          {data.label}
        </div>
        
        <Badge variant="outline" className="text-xs">
          {(data.config?.type || data.triggerType).replace('_', ' ').toUpperCase()}
        </Badge>

        {/* Configuration preview */}
        {data.config?.type === 'schedule' && data.config.cron && (
          <div className="mt-2 text-xs text-muted-foreground">
            {data.config.cron}
          </div>
        )}
        
        {data.config?.type === 'webhook' && data.config.events && (
          <div className="mt-2 text-xs text-muted-foreground">
            Events: {data.config.events.slice(0, 2).join(', ')}
            {data.config.events.length > 2 && '...'}
          </div>
        )}
      </CardContent>
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-primary border-2 border-white"
      />
    </Card>
  )
}

