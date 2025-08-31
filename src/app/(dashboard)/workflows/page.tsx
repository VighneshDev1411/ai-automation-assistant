// src/app/(dashboard)/workflows/page.tsx
'use client'

import { useState, useEffect } from 'react'
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

// Mock workflow data (will be replaced with Supabase)
interface Workflow {
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
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'lastRun' | 'executions'>(
    'lastRun'
  )

  useEffect(() => {
    // Simulate loading workflows
    setTimeout(() => {
      setWorkflows([
        {
          id: '1',
          name: 'Daily Sales Report',
          description: 'Generates daily sales report and sends to team',
          status: 'active',
          lastRun: '2 hours ago',
          nextRun: 'in 22 hours',
          executions: 365,
          successRate: 99.2,
          createdAt: '2024-01-15',
          tags: ['sales', 'reporting', 'daily'],
        },
        {
          id: '2',
          name: 'Customer Onboarding',
          description:
            'Automated customer onboarding workflow with AI assistance',
          status: 'active',
          lastRun: '30 min ago',
          nextRun: 'on trigger',
          executions: 1247,
          successRate: 97.8,
          createdAt: '2024-02-20',
          tags: ['customer', 'onboarding', 'ai'],
        },
        {
          id: '3',
          name: 'Data Sync Pipeline',
          description: 'Syncs data between CRM and database',
          status: 'error',
          lastRun: '1 day ago',
          nextRun: 'paused',
          executions: 892,
          successRate: 94.5,
          createdAt: '2024-01-10',
          tags: ['data', 'sync', 'integration'],
        },
        {
          id: '4',
          name: 'Social Media Scheduler',
          description: 'AI-powered social media content scheduling',
          status: 'inactive',
          lastRun: '3 days ago',
          nextRun: 'disabled',
          executions: 156,
          successRate: 100,
          createdAt: '2024-03-01',
          tags: ['social', 'marketing', 'ai'],
        },
        {
          id: '5',
          name: 'Invoice Processing',
          description: 'Automated invoice processing and approval',
          status: 'active',
          lastRun: '5 hours ago',
          nextRun: 'in 1 hour',
          executions: 2341,
          successRate: 98.9,
          createdAt: '2024-01-05',
          tags: ['finance', 'automation', 'approval'],
        },
        {
          id: '6',
          name: 'Lead Scoring Model',
          description: 'ML-based lead scoring and routing',
          status: 'draft',
          lastRun: 'never',
          nextRun: 'draft',
          executions: 0,
          successRate: 0,
          createdAt: '2024-03-15',
          tags: ['ml', 'leads', 'sales'],
        },
      ])
      setIsLoading(false)
    }, 1000)
  }, [])

  // Filter workflows
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch =
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' || workflow.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Sort workflows
  const sortedWorkflows = [...filteredWorkflows].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'executions':
        return b.executions - a.executions
      case 'lastRun':
      default:
        return 0 // In real app, would sort by actual timestamp
    }
  })

  return {
    workflows: sortedWorkflows,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
  }
}

export default function WorkflowsPage() {
  const {
    workflows,
    isLoading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
  } = useWorkflows()

  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
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
      return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800'
    case 'error':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
    case 'inactive':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800'
    case 'draft':
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-300 dark:border-gray-800'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/50 dark:text-gray-300 dark:border-gray-800'
  }
}

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
            <p className="text-muted-foreground">
              Manage and monitor your automation workflows
            </p>
          </div>
          <Button className="btn-shine">
            <Plus className="h-4 w-4 mr-2" />
            Create Workflow
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {workflows.filter(w => w.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workflows
                  .reduce((sum, w) => sum + w.executions, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {workflows.length > 0
                  ? (
                      workflows.reduce((sum, w) => sum + w.successRate, 0) /
                      workflows.length
                    ).toFixed(1)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastRun">Last Run</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="executions">Executions</SelectItem>
                  </SelectContent>
                </Select>
                <RefreshIndicator
                  isRefreshing={isRefreshing}
                  onRefresh={handleRefresh}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SkeletonTable rows={6} columns={7} />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <input
                          type="checkbox"
                          checked={
                            selectedWorkflows.length === workflows.length
                          }
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedWorkflows(workflows.map(w => w.id))
                            } else {
                              setSelectedWorkflows([])
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead className="text-center">Executions</TableHead>
                      <TableHead className="text-center">
                        Success Rate
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.map(workflow => (
                      <TableRow
                        key={workflow.id}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedWorkflows.includes(workflow.id)}
                            onChange={() =>
                              toggleWorkflowSelection(workflow.id)
                            }
                            className="rounded border-gray-300"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{workflow.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {workflow.description}
                            </div>
                            <div className="flex gap-1 mt-1">
                              {workflow.tags.map(tag => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${getStatusColor(workflow.status)} flex items-center gap-1 w-fit`}
                          >
                            {getStatusIcon(workflow.status)}
                            {workflow.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{workflow.lastRun}</TableCell>
                        <TableCell>{workflow.nextRun}</TableCell>
                        <TableCell className="text-center">
                          {workflow.executions}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={
                              workflow.successRate > 95
                                ? 'text-green-600'
                                : 'text-yellow-600'
                            }
                          >
                            {workflow.successRate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Play className="h-4 w-4 mr-2" />
                                Run Now
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedWorkflows.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="shadow-lg">
              <CardContent className="flex items-center gap-4 p-4">
                <span className="text-sm font-medium">
                  {selectedWorkflows.length} workflow(s) selected
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Play className="h-4 w-4 mr-1" />
                    Run
                  </Button>
                  <Button size="sm" variant="outline">
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
