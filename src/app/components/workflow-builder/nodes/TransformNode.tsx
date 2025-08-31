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
        return 'bg-cyan-50 border-cyan-200'
      case 'aggregate':
        return 'bg-indigo-50 border-indigo-200'
      case 'sort':
        return 'bg-teal-50 border-teal-200'
      case 'group':
        return 'bg-emerald-50 border-emerald-200'
      case 'map':
      default:
        return 'bg-violet-50 border-violet-200'
    }
  }

  return (
    <Card className={`min-w-48 ${getTransformColor()} ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {getTransformIcon()}
          <span className="font-medium text-sm">TRANSFORM</span>
        </div>
        
        <div className="text-sm font-medium mb-2">
          {data.label}
        </div>
        
        <Badge variant="outline" className="text-xs">
          {(data.config?.type || 'map').toUpperCase()}
        </Badge>

        {/* Configuration preview */}
        {data.config?.type === 'map' && data.config.mapping && (
          <div className="mt-2 text-xs text-muted-foreground">
            {Object.keys(data.config.mapping).length} field mappings
          </div>
        )}
        
        {data.config?.type === 'filter' && data.config.condition && (
          <div className="mt-2 text-xs text-muted-foreground">
            Filter: {data.config.condition.field}
          </div>
        )}

        {data.config?.type === 'aggregate' && data.config.operation && (
          <div className="mt-2 text-xs text-muted-foreground">
            {data.config.operation.type || 'count'}
          </div>
        )}
      </CardContent>
      
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-primary border-2 border-white"
      />
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-primary border-2 border-white"
      />
    </Card>
  )
}