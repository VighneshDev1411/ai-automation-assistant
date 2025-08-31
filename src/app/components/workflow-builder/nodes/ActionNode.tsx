import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Globe, 
  Mail, 
  Database, 
  Link,
  Code,
  Settings
} from 'lucide-react'

interface ActionNodeData {
  label: string
  config: any
}

export function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  const getActionIcon = () => {
    switch (data.config?.type) {
      case 'http':
        return <Globe className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'database':
        return <Database className="h-4 w-4" />
      case 'integration':
        return <Link className="h-4 w-4" />
      case 'ai':
        return <Code className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const getActionColor = () => {
    switch (data.config?.type) {
      case 'http':
        return 'bg-blue-50 border-blue-200'
      case 'email':
        return 'bg-green-50 border-green-200'
      case 'database':
        return 'bg-orange-50 border-orange-200'
      case 'integration':
        return 'bg-purple-50 border-purple-200'
      case 'ai':
        return 'bg-pink-50 border-pink-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <Card className={`min-w-48 ${getActionColor()} ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {getActionIcon()}
          <Play className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">ACTION</span>
        </div>
        
        <div className="text-sm font-medium mb-2">
          {data.label}
        </div>
        
        <Badge variant="outline" className="text-xs">
          {(data.config?.type || 'action').replace('_', ' ').toUpperCase()}
        </Badge>

        {/* Configuration preview */}
        {data.config?.type === 'http' && (
          <div className="mt-2 text-xs text-muted-foreground">
            {data.config.method || 'GET'} {data.config.url ? new URL(data.config.url).hostname : 'No URL'}
          </div>
        )}
        
        {data.config?.type === 'email' && (
          <div className="mt-2 text-xs text-muted-foreground">
            To: {data.config.to || 'Not configured'}
          </div>
        )}

        {data.config?.type === 'database' && (
          <div className="mt-2 text-xs text-muted-foreground">
            {data.config.operation || 'Operation'}: {data.config.table || 'Table'}
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
