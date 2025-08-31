import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Globe, 
  Mail, 
  Database, 
  Webhook,
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
      case 'webhook':
        return <Webhook className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const getActionColor = () => {
  switch (data.config?.type) {
    case 'http':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100'
    case 'email':
      return 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 dark:text-green-100'
    case 'database':
      return 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-100'
    case 'webhook':
      return 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-100'
    default:
      return 'bg-gray-50 border-gray-200 dark:bg-gray-950/30 dark:border-gray-800 dark:text-gray-100'
  }
}

  return (
    <Card className={`min-w-48 ${getActionColor()} ${selected ? 'ring-2 ring-primary' : ''} transition-all duration-200`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {getActionIcon()}
          <span className="font-medium text-sm">ACTION</span>
        </div>
        
        <div className="text-sm font-medium mb-2 text-foreground">
          {data.label}
        </div>
        
        <Badge variant="outline" className="text-xs border-current">
          {(data.config?.type || 'action').toUpperCase()}
        </Badge>

        {/* Configuration preview */}
        {data.config?.type === 'http' && data.config.url && (
          <div className="mt-2 text-xs opacity-70">
            {data.config.url ? new URL(data.config.url).hostname : 'No URL'}
          </div>
        )}
        
        {data.config?.type === 'email' && (
          <div className="mt-2 text-xs opacity-70">
            To: {data.config.to || 'Not configured'}
          </div>
        )}

        {data.config?.type === 'database' && (
          <div className="mt-2 text-xs opacity-70">
            {data.config.operation || 'Operation'}: {data.config.table || 'Table'}
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
