// src/app/(dashboard)/workflows/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'
// import { Respon } from '@/components/layout/ResponsiveContainer'
import { ResponsiveContainer } from '@/components/layout/container'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
// import { 
//   WorkflowLoadingState,
//   NoWorkflowsState,
//   NoResultsState
// } from '@/components/ui/loading-states'
import { WorkflowLoadingState } from '@/components/ui/loading-states/workflow-loading'

import { ResponsiveGrid } from '@/components/layout/responsive-grid'
import { WorkflowCard } from '@/components/workflows/workflow-card'
import { StatsCard } from '@/components/common/stat-card'
import { toast, toastSuccess, toastError } from '@/components/ui/use-toast'
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Play,
  Pause,
  Edit,
  Copy,
  Trash,
  Zap,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  BarChart,
  RefreshCw,
} from 'lucide-react'
import type { Database } from '@/types/database'
import { NoResultsState, NoWorkflowsState } from '@/components/ui/empty-states'


type Workflow = Database['public']['Tables']['workflows']['Row']

export default function WorkflowsPage() {
  const router = useRouter()
  const { user, currentOrganization } = useAuth()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [filteredWorkflows, setFilteredWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    workflow?: Workflow
  }>({ open: false })
  
  const supabase = createClient()

  // Statistics
  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.status === 'active').length,
    paused: workflows.filter(w => w.status === 'paused').length,
    draft: workflows.filter(w => w.status === 'draft').length,
    error: workflows.filter(w => w.status === 'error').length,
  }

  // Load workflows
  useEffect(() => {
    if (currentOrganization) {
      loadWorkflows()
      subscribeToWorkflows()
    }
  }, [currentOrganization])

  // Filter workflows
  useEffect(() => {
    let filtered = [...workflows]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(w => 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(w => w.status === statusFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'status':
          return a.status.localeCompare(b.status)
        case 'updated_at':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    setFilteredWorkflows(filtered)
  }, [workflows, searchQuery, statusFilter, sortBy])

  const loadWorkflows = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', currentOrganization?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWorkflows(data || [])
    } catch (error: any) {
      toastError('Failed to load workflows', error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const subscribeToWorkflows = () => {
    const channel = supabase
      .channel('workflows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflows',
          filter: `organization_id=eq.${currentOrganization?.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setWorkflows(prev => [payload.new as Workflow, ...prev])
            toastSuccess('New workflow created')
          } else if (payload.eventType === 'UPDATE') {
            setWorkflows(prev =>
              prev.map(w => w.id === payload.new.id ? payload.new as Workflow : w)
            )
          } else if (payload.eventType === 'DELETE') {
            setWorkflows(prev => prev.filter(w => w.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleCreateNew = () => {
    router.push('/workflows/new')
  }

  const handleEdit = (workflow: Workflow) => {
    router.push(`/workflows/${workflow.id}/edit`)
  }

  const handleDuplicate = async (workflow: Workflow) => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .insert({
          ...workflow,
          id: undefined,
          name: `${workflow.name} (Copy)`,
          status: 'draft',
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single()

      if (error) throw error
      
      toastSuccess('Workflow duplicated successfully')
      router.push(`/workflows/${data.id}/edit`)
    } catch (error: any) {
      toastError('Failed to duplicate workflow', error.message)
    }
  }

  const handleToggleStatus = async (workflow: Workflow) => {
    const newStatus = workflow.status === 'active' ? 'paused' : 'active'
    
    try {
      const { error } = await supabase
        .from('workflows')
        .update({ status: newStatus })
        .eq('id', workflow.id)

      if (error) throw error
      
      toastSuccess(
        `Workflow ${newStatus === 'active' ? 'activated' : 'paused'}`
      )
    } catch (error: any) {
      toastError('Failed to update workflow status', error.message)
    }
  }

  const handleDelete = (workflow: Workflow) => {
    setDeleteDialog({ open: true, workflow })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.workflow) return

    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', deleteDialog.workflow.id)

      if (error) throw error
      
      toastSuccess('Workflow deleted successfully')
      setDeleteDialog({ open: false })
    } catch (error: any) {
      toastError('Failed to delete workflow', error.message)
    }
  }

  const handleExecute = async (workflow: Workflow) => {
    try {
      // This would trigger the workflow execution
      // In a real app, this would call an edge function or API
      toastSuccess(`Executing workflow: ${workflow.name}`)
    } catch (error: any) {
      toastError('Failed to execute workflow', error.message)
    }
  }

  const handleImport = () => {
    toast({
      title: 'Coming soon',
      description: 'Workflow import will be available soon',
    })
  }

  const handleExport = () => {
    toast({
      title: 'Coming soon',
      description: 'Workflow export will be available soon',
    })
  }

  if (isLoading) {
    return (
      <ResponsiveContainer>
        <PageHeader
          title="Workflows"
          description="Create and manage your automation workflows"
        />
        <WorkflowLoadingState />
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer>
      <PageHeader
        title="Workflows"
        description="Create and manage your automation workflows"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>
      </PageHeader>

      {/* Statistics */}
      <ResponsiveGrid cols={{ default: 2, lg: 5 }} gap={4} className="mb-6">
        <StatsCard
          title="Total Workflows"
          value={stats.total}
          icon={<Zap className="h-5 w-5 text-primary" />}
        />
        <StatsCard
          title="Active"
          value={stats.active}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
        />
        <StatsCard
          title="Paused"
          value={stats.paused}
          icon={<Pause className="h-5 w-5 text-yellow-500" />}
        />
        <StatsCard
          title="Draft"
          value={stats.draft}
          icon={<AlertCircle className="h-5 w-5 text-gray-500" />}
        />
        <StatsCard
          title="Errors"
          value={stats.error}
          icon={<XCircle className="h-5 w-5 text-red-500" />}
        />
      </ResponsiveGrid>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created Date</SelectItem>
                <SelectItem value="updated_at">Updated Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={loadWorkflows}
              className="shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Grid */}
      {filteredWorkflows.length === 0 ? (
        <Card className="p-12">
          <CardContent>
            {workflows.length === 0 ? (
              <NoWorkflowsState onCreateNew={handleCreateNew} />
            ) : (
              <NoResultsState />
            )}
          </CardContent>
        </Card>
      ) : (
        <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }} gap={6}>
          {filteredWorkflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={{
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                status: workflow.status as any,
                lastRun: workflow.last_run_at 
                  ? new Date(workflow.last_run_at).toLocaleDateString()
                  : undefined,
                successRate: 98, // Mock data - would come from analytics
                executionCount: Math.floor(Math.random() * 1000), // Mock data
              }}
              onEdit={() => handleEdit(workflow)}
              onDelete={() => handleDelete(workflow)}
              onToggleStatus={() => handleToggleStatus(workflow)}
              onDuplicate={() => handleDuplicate(workflow)}
            />
          ))}
        </ResponsiveGrid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.workflow?.name}"? 
              This action cannot be undone and will permanently remove the workflow 
              and all its execution history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ResponsiveContainer>
  )
}