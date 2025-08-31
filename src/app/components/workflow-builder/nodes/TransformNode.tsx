// TransformNode.tsx
import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Code, 
  Filter, 
  BarChart3, 
  ArrowUpDown,
  Group
} from 'lucide-react'

interface TransformNodeData {
  label: string
  config: any
}

export function TransformNode({ data, selected }: NodeProps<TransformNodeData>) {
  const getTransformIcon = () => {
    switch (data.config?.type) {
      case 'filter':
        return <Filter className="h-4 w-4" />
      case 'aggregate':
        return <BarChart3 className="h-4 w-4" />
      case 'sort':
        return <ArrowUpDown className="h-4 w-4" />
      case 'group':
        return <Group className="h-4 w-4" />
      case 'map':
      default:
        return <Code className="h-4 w-4" />
    }
  }

 const getTransformColor = () => {
  switch (data.config?.type) {
    case 'filter':
      return 'bg-cyan-50 border-cyan-200 dark:bg-cyan-950/30 dark:border-cyan-800 dark:text-cyan-100'
    case 'aggregate':
      return 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-100'
    case 'sort':
      return 'bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800 dark:text-teal-100'
    case 'group':
      return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100'
    case 'map':
    default:
      return 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-100'
  }
}

  return (
    <Card className={`min-w-48 ${getTransformColor()} ${selected ? 'ring-2 ring-primary' : ''} transition-all duration-200`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {getTransformIcon()}
          <span className="font-medium text-sm">TRANSFORM</span>
        </div>
        
        <div className="text-sm font-medium mb-2 text-foreground">
          {data.label}
        </div>
        
        <Badge variant="outline" className="text-xs border-current">
          {(data.config?.type || 'map').toUpperCase()}
        </Badge>

        {/* Configuration preview */}
        {data.config?.type === 'map' && data.config.mapping && (
          <div className="mt-2 text-xs opacity-70">
            {Object.keys(data.config.mapping).length} field mappings
          </div>
        )}
        
        {data.config?.type === 'filter' && data.config.condition && (
          <div className="mt-2 text-xs opacity-70">
            Filter: {data.config.condition.field}
          </div>
        )}

        {data.config?.type === 'aggregate' && data.config.operation && (
          <div className="mt-2 text-xs opacity-70">
            {data.config.operation.type || 'count'}
          </div>
        )}
      </CardContent>
      
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-primary border-2 border-white dark:border-gray-800"
      />
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-primary border-2 border-white dark:border-gray-800"
      />
    </Card>
  )
}