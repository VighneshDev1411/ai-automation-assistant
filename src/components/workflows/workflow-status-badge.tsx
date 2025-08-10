import { Badge } from '@/components/ui/badge'
import { CheckCircle, Pause, XCircle, AlertCircle, Loader2, Clock } from 'lucide-react'
import type { Database } from '@/types/database'

type WorkflowStatus = Database['public']['Enums']['workflow_status']
type ExecutionStatus = Database['public']['Enums']['execution_status']

interface StatusBadgeProps {
  status: WorkflowStatus | ExecutionStatus
  showIcon?: boolean
  size?: 'sm' | 'default'
}

export function StatusBadge({ status, showIcon = true, size = 'default' }: StatusBadgeProps) {
  const getIcon = () => {
    switch (status) {
      case 'active':
      case 'completed':
        return <CheckCircle className="h-3 w-3" />
      case 'paused':
        return <Pause className="h-3 w-3" />
      case 'archived':
      case 'cancelled':
        return <XCircle className="h-3 w-3" />
      case 'draft':
      case 'pending':
        return <Clock className="h-3 w-3" />
      case 'running':
        return <Loader2 className="h-3 w-3 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  const getVariant = () => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'default'
      case 'paused':
      case 'pending':
        return 'secondary'
      case 'archived':
      case 'cancelled':
        return 'outline'
      case 'draft':
        return 'secondary'
      case 'running':
        return 'default'
      case 'failed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <Badge variant={getVariant()} className={size === 'sm' ? 'text-xs' : ''}>
      {showIcon && getIcon()}
      {showIcon && <span className="ml-1">{status}</span>}
      {!showIcon && status}
    </Badge>
  )
}