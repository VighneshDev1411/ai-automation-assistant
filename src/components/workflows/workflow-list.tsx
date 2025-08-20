'use client'

import { useState } from 'react'
import { WorkflowCard } from './workflow-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ResponsiveGrid } from '@/components/layout/responsive-grid'
import { EmptyState } from '@/components/common/empty-state'
import { LoadingState } from '@/components/common/loading-state'
import { Search, Filter, Plus, Workflow } from 'lucide-react'
import type { Database } from '@/types/database'

type Workflow = Database['public']['Tables']['workflows']['Row']
type WorkflowStatus = Database['public']['Enums']['workflow_status']

interface WorkflowListProps {
  workflows: Workflow[]
  isLoading?: boolean
  onCreateNew?: () => void
  onEdit?: (workflow: Workflow) => void
  onDelete?: (workflow: Workflow) => void
  onDuplicate?: (workflow: Workflow) => void
  onExecute?: (workflow: Workflow) => void
  onToggleStatus?: (workflow: Workflow) => void
}

export const WorkflowList = ({
  workflows,
  isLoading = false,
  onCreateNew,
  onEdit,
  onDelete,
  onDuplicate,
  onExecute,
  onToggleStatus,
}: WorkflowListProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>(
    'all'
  )

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' || workflow.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    ;<LoadingState />
  }
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={value => setStatusFilter(value as any)}
        >
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workflows</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        {onCreateNew && (
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        )}
      </div>

      {/* Workflow Grid */}
      {filteredWorkflows.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title={
            searchQuery || statusFilter !== 'all'
              ? 'No workflows found'
              : 'No workflows yet'
          }
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first workflow to get started automating tasks'
          }
          action={
            onCreateNew && !searchQuery && statusFilter === 'all' ? (
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Workflow
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} gap={6}>
          {filteredWorkflows.map(workflow => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onExecute={onExecute}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </ResponsiveGrid>
      )}
    </div>
  )
}
