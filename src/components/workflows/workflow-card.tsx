'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui'
import { Badge } from '../ui'
import { Button } from '../ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Play,
  Pause,
  MoreVertical,
  Edit,
  Copy,
  Trash,
  BarChart,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

import { formatDistanceToNow } from 'date-fns'
import type { Database } from '@/types/database'

type Workflow = Database['public']['Tables']['workflows']['Row']
type WorkflowStatus = Database['public']['Enums']['workflow_status']

interface WorkflowCardProps {
  workflow: Workflow
  onEdit?: (workflow: Workflow) => void
  onDelete?: (workflow: Workflow) => void
  // For easy UX
  onDuplicate?: (workflow: Workflow) => void
  onExecute?: (workflow: Workflow) => void
  onToggleStatus?: (workflow: Workflow) => void
  showStats?: boolean
}

export const WorkflowCard = ({
  workflow,
  onEdit,
  onDelete,
  onDuplicate,
  onExecute,
  onToggleStatus,
  showStats = true,
}: WorkflowCardProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const getStatusIcon = (status: WorkflowStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-3 w-3" />
      case 'paused':
        return <Pause className="h-3 w-3" />
      case 'archived':
        return <XCircle className="h-3 w-3" />
      default:
        return <AlertCircle className="h-3 w-3" />
    }
  }

  const getStatusColor = (status: WorkflowStatus) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'paused':
        return 'secondary'
      case 'archived':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const handleAction = async (action: () => Promise<void> | void) => {
    setIsLoading(true)
    try {
      await action()
    } finally {
      setIsLoading(false)
    }
  }

  const triggerType = workflow.trigger_config?.type || 'manual'
  const actionCount = workflow.actions?.length || 0

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg line-clamp-1">
              {workflow.name}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {workflow.description || 'No description provided'}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isLoading}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(workflow)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(workflow)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onToggleStatus && workflow.status !== 'archived' && (
                <DropdownMenuItem onClick={() => onToggleStatus(workflow)}>
                  {workflow.status === 'active' ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <BarChart className="mr-2 h-4 w-4" />
                View Analytics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(workflow)}
                  className="text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status and metadata */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={getStatusColor(workflow.status)}>
            {getStatusIcon(workflow.status)}
            <span className="ml-1 capitalize">{workflow.status}</span>
          </Badge>
          <Badge variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            {triggerType}
          </Badge>
          <Badge variant="outline">
            {actionCount} {actionCount === 1 ? 'action' : 'actions'}
          </Badge>
          {workflow.tags && workflow.tags.length > 0 && (
            <>
              {workflow.tags.slice(0, 2).map((tag:any) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {workflow.tags.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{workflow.tags.length - 2}
                </Badge>
              )}
            </>
          )}
        </div>

        {/* Stats */}
        {showStats && (
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-2xl font-semibold">--</p>
              <p className="text-xs text-muted-foreground">Executions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold">--</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold">--</p>
              <p className="text-xs text-muted-foreground">Avg Time</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {formatDistanceToNow(new Date(workflow.created_at), {
              addSuffix: true,
            })}
          </div>
          {onExecute && workflow.status === 'active' && (
            <Button
              size="sm"
              onClick={() => handleAction(() => onExecute(workflow))}
              disabled={isLoading}
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
