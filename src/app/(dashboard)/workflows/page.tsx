'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SkeletonTable, RefreshIndicator } from '@/components/ui/loading-state'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { useToast } from '@/components/ui/use-toast'
import {
  Workflow,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpDown,
  FileText,
  Settings,
} from 'lucide-react'

// Mock workflow data
interface WorkflowType {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'error' | 'draft'
  lastRun: string
  nextRun: string
  executions: number
  successRate: number
  createdAt: string
  tags: string[]
}

function useWorkflows() {
  const [workflows, setWorkflows] = useState<WorkflowType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'lastRun' | 'executions'>('lastRun')

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/workflows')

      if (!response.ok) {
        throw new Error('Failed to fetch workflows')
      }

      const data = await response.json()

      // Transform the API response to match the expected WorkflowType format
      const transformedWorkflows: WorkflowType[] = (data.workflows || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        description: w.description || '',
        status: w.status,
        lastRun: w.lastRun || '-',
        nextRun: w.nextRun || '-',
        executions: w.executions || 0,
        successRate: w.successRate || 0,
        createdAt: w.createdAt,
        tags: w.tags || [],
      }))

      setWorkflows(transformedWorkflows)
    } catch (error) {
      console.error('Error fetching workflows:', error)
      // Keep workflows as empty array on error
      setWorkflows([])
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and sort workflows
  const filteredWorkflows = workflows
    .filter(workflow => {
      const matchesSearch = workflow.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || workflow.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'executions':
          return b.executions - a.executions
        case 'lastRun':
        default:
          return new Date(b.lastRun || 0).getTime() - new Date(a.lastRun || 0).getTime()
      }
    })

  return {
    workflows: filteredWorkflows,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    refetchWorkflows: fetchWorkflows,
  }
}

export default function WorkflowsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    workflows,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    refetchWorkflows,
  } = useWorkflows()

  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([])

  // Delete workflow handler
  const handleDeleteWorkflow = async (workflowId: string, workflowName: string) => {
    if (!confirm(`Are you sure you want to delete "${workflowName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete workflow' }))
        throw new Error(errorData.error || 'Failed to delete workflow')
      }

      toast({
        title: 'Workflow Deleted',
        description: `"${workflowName}" has been deleted successfully`,
      })

      // Refetch workflows to update the list
      refetchWorkflows()
    } catch (error) {
      console.error('Error deleting workflow:', error)
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete workflow',
        variant: 'destructive',
      })
    }
  }

  // Edit workflow handler
  const handleEditWorkflow = (workflowId: string) => {
    router.push(`/workflow-builder?id=${workflowId}`)
  }

  const toggleWorkflowSelection = (id: string) => {
    setSelectedWorkflows(prev =>
      prev.includes(id) ? prev.filter(wId => wId !== id) : [...prev, id]
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <XCircle className="h-4 w-4" />
      case 'inactive':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'badge-success'
      case 'error':
        return 'badge-error'
      case 'inactive':
        return 'badge-warning'
      case 'draft':
        return 'badge-neutral'
      default:
        return 'badge-neutral'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '-') return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <ErrorBoundary>
      <div className="container-padding section-spacing space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight gradient-text">
              Workflows
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage and monitor your automation workflows
            </p>
          </div>
          <Button className="btn-shine" onClick={() => router.push('/workflow-builder')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Workflows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workflows.length}</div>
              <p className="text-xs text-muted-foreground">+2 this week</p>
            </CardContent>
          </Card>

          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {workflows.filter(w => w.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">Running smoothly</p>
            </CardContent>
          </Card>

          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workflows.reduce((sum, w) => sum + w.executions, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="clean-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {workflows.length > 0
                  ? (
                      workflows.reduce((sum, w) => sum + w.successRate, 0) /
                      workflows.length
                    ).toFixed(1)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">Overall performance</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search workflows..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastRun">Last Run</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="executions">Executions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedWorkflows.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedWorkflows.length} selected
                  </span>
                  <Button variant="outline" size="sm">
                    <Play className="h-4 w-4 mr-1" />
                    Run
                  </Button>
                  <Button variant="outline" size="sm">
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <SkeletonTable rows={5} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedWorkflows(workflows.map(w => w.id))
                          } else {
                            setSelectedWorkflows([])
                          }
                        }}
                        checked={selectedWorkflows.length === workflows.length}
                        className="rounded border-input"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Executions</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map(workflow => (
                    <TableRow key={workflow.id} className="group">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedWorkflows.includes(workflow.id)}
                          onChange={() => toggleWorkflowSelection(workflow.id)}
                          className="rounded border-input"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{workflow.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {workflow.description}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {workflow.tags.slice(0, 2).map(tag => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs px-1 py-0 h-5"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {workflow.tags.length > 2 && (
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0 h-5"
                              >
                                +{workflow.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(workflow.status)} border`}>
                          {getStatusIcon(workflow.status)}
                          <span className="ml-1 capitalize">{workflow.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(workflow.lastRun)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(workflow.nextRun)}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {workflow.executions.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`text-sm font-medium ${
                              workflow.successRate >= 95
                                ? 'text-green-600 dark:text-green-400'
                                : workflow.successRate >= 90
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {workflow.successRate.toFixed(1)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditWorkflow(workflow.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              View Logs
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Settings className="h-4 w-4 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => handleDeleteWorkflow(workflow.id, workflow.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Empty State */}
        {!isLoading && workflows.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-600/20 dark:from-blue-400/20 dark:to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-200 dark:border-blue-800">
                <Workflow className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3">No workflows found</h3>
              <p className="text-muted-foreground text-lg mb-6 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters to find workflows.'
                  : 'Get started by creating your first automated workflow.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="btn-shine" onClick={() => router.push('/workflow-builder')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Workflow
                </Button>
                {(searchTerm || statusFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('all')
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        {!isLoading && workflows.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="clean-card cursor-pointer hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Template Library</CardTitle>
                  <div className="status-icon-bg info w-10 h-10">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Browse pre-built workflow templates to get started quickly.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Browse Templates
                </Button>
              </CardContent>
            </Card>

            <Card className="clean-card cursor-pointer hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Import/Export</CardTitle>
                  <div className="status-icon-bg purple w-10 h-10">
                    <ArrowUpDown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Import workflows from files or export your workflows to share.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  Manage Workflows
                </Button>
              </CardContent>
            </Card>

            <Card className="clean-card cursor-pointer hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Workflow Analytics</CardTitle>
                  <div className="status-icon-bg success w-10 h-10">
                    <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View detailed analytics and performance metrics for all workflows.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Debug Information - Development Only */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-dashed border-muted-foreground/30">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                🔧 Debug Information (Development Only)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <details className="text-xs">
                <summary className="cursor-pointer hover:text-foreground text-muted-foreground mb-2">
                  Click to view debug data
                </summary>
                <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-64 text-xs">
                  {JSON.stringify(
                    {
                      totalWorkflows: workflows.length,
                      activeWorkflows: workflows.filter(w => w.status === 'active').length,
                      searchTerm,
                      statusFilter,
                      sortBy,
                      selectedWorkflows: selectedWorkflows.length,
                      isLoading,
                    },
                    null,
                    2
                  )}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  )
}