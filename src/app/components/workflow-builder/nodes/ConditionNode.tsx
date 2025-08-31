import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GitBranch, ArrowRight } from 'lucide-react'

interface ConditionNodeData {
  label: string
  config: any
}

export function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  const getOperatorSymbol = () => {
    switch (data.config?.operator) {
      case 'equals':
        return '='
      case 'not_equals':
        return '≠'
      case 'contains':
        return '∋'
      case 'greater_than':
        return '>'
      case 'less_than':
        return '<'
      default:
        return '?'
    }
  }

  return (
    <Card className={`min-w-48 bg-yellow-50 border-yellow-200 ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="h-4 w-4 text-yellow-600" />
          <span className="font-medium text-sm">CONDITION</span>
        </div>
        
        <div className="text-sm font-medium mb-2">
          {data.label}
        </div>
        
        <Badge variant="outline" className="text-xs">
          IF/THEN
        </Badge>

        {/* Configuration preview */}
        {data.config?.field && (
          <div className="mt-2 text-xs text-muted-foreground font-mono">
            {data.config.field} {getOperatorSymbol()} {data.config.value || '?'}
          </div>
        )}
      </CardContent>
      
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-primary border-2 border-white"
      />
      
      {/* Output handles for true/false branches */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 bg-green-500 border-2 border-white"
        style={{ top: '40%' }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        className="w-3 h-3 bg-red-500 border-2 border-white"
        style={{ top: '60%' }}
      />
      
      {/* Labels for branches */}
      <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-xs">
        <div className="text-green-600" style={{ marginTop: '-10px' }}>✓</div>
        <div className="text-red-600" style={{ marginTop: '5px' }}>✗</div>
      </div>
    </Card>
  )
}