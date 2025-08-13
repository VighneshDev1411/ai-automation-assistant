'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  FileX, 
  Search, 
  Inbox, 
  Database,
  FolderOpen,
  Users,
  Zap
} from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {icon && (
        <div className="mb-4 p-3 bg-muted rounded-full">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      
      {description && (
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

export function NoWorkflowsState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <EmptyState
      icon={<Zap className="h-8 w-8 text-muted-foreground" />}
      title="No workflows yet"
      description="Create your first workflow to start automating tasks"
      action={{
        label: 'Create Workflow',
        onClick: onCreateNew
      }}
    />
  )
}

export function NoResultsState() {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8 text-muted-foreground" />}
      title="No results found"
      description="Try adjusting your search or filters"
    />
  )
}

export function NoDataState() {
  return (
    <EmptyState
      icon={<Database className="h-8 w-8 text-muted-foreground" />}
      title="No data available"
      description="Data will appear here once available"
    />
  )
}