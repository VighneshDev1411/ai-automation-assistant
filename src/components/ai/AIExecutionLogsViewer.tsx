'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Brain,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Loader2,
  TrendingUp,
  Zap,
  Plus,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'

interface ExecutionLog {
  id: string
  timestamp: Date
  agentId: string
  agentName: string
  agentType: string
  model: string
  status: 'success' | 'error' | 'timeout' | 'cancelled'
  duration: number
  tokensUsed: number
  cost: number
  inputTokens: number
  outputTokens: number
  prompt: string
  response: string
  error?: string
  metadata?: Record<string, any>
}

interface AIExecutionLogsViewerProps {
  organizationId: string
  agentId?: string
  limit?: number
}

export function AIExecutionLogsViewer({
  organizationId,
  agentId,
  limit = 50,
}: AIExecutionLogsViewerProps) {
  const { toast } = useToast()
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null)
  const [stats, setStats] = useState({
    totalExecutions: 0,
    successRate: 0,
    totalTokens: 0,
    totalCost: 0,
    avgDuration: 0,
  })

  useEffect(() => {
    loadLogs()
  }, [organizationId, agentId])

  const loadLogs = async () => {
    setLoading(true)
    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (agentId) params.append('agentId', agentId)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('limit', '100')

      const response = await fetch(`/api/ai/executions?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to load logs')
      }

      const data = await response.json()

      // Transform API response to match component interface
      const transformedLogs: ExecutionLog[] = (data.logs || []).map((log: any) => ({
        id: log.id,
        timestamp: new Date(log.timestamp),
        agentId: log.agent_id || log.agentId,
        agentName: log.agent_name || log.agentName,
        agentType: log.agent_type || log.agentType,
        model: log.model,
        status: log.status,
        duration: log.duration,
        tokensUsed: log.tokens_total || log.tokensUsed,
        inputTokens: log.tokens_input || log.inputTokens,
        outputTokens: log.tokens_output || log.outputTokens,
        cost: parseFloat(log.cost || 0),
        prompt: log.request_prompt || log.prompt || '',
        response: log.response_content || log.response || '',
        error: log.error_message || log.error,
        metadata: log.response_metadata || log.metadata || {},
      }))

      setLogs(transformedLogs)

      // Calculate stats
      const successCount = transformedLogs.filter(l => l.status === 'success').length
      const totalTokens = transformedLogs.reduce((sum, l) => sum + l.tokensUsed, 0)
      const totalCost = transformedLogs.reduce((sum, l) => sum + l.cost, 0)
      const avgDuration = transformedLogs.length > 0
        ? transformedLogs.reduce((sum, l) => sum + l.duration, 0) / transformedLogs.length
        : 0

      setStats({
        totalExecutions: transformedLogs.length,
        successRate: transformedLogs.length > 0 ? (successCount / transformedLogs.length) * 100 : 0,
        totalTokens,
        totalCost,
        avgDuration,
      })
    } catch (error) {
      console.error('Failed to load execution logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load execution logs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Function to manually log an execution (for testing)
  const createTestLog = async () => {
    try {
      const testLog = {
        agentId: 'test-agent-1',
        agentName: 'Test AI Agent',
        agentType: 'text_analysis',
        model: 'gpt-4-turbo',
        duration: 2500,
        tokensUsed: {
          input: 150,
          output: 350,
          total: 500,
        },
        cost: 0.025,
        status: 'success',
        request: {
          prompt: 'Analyze this test text for sentiment',
          parameters: { temperature: 0.7, maxTokens: 1000 },
        },
        response: {
          content: 'This is a test response from the AI agent',
          metadata: { processingTime: 2500 },
        },
        sessionId: `session_${Date.now()}`,
      }

      const response = await fetch('/api/ai/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testLog),
      })

      if (!response.ok) {
        throw new Error('Failed to create test log')
      }

      toast({
        title: 'Test Log Created',
        description: 'Successfully created a test execution log',
      })

      // Reload logs
      loadLogs()
    } catch (error) {
      console.error('Failed to create test log:', error)
      toast({
        title: 'Error',
        description: 'Failed to create test log',
        variant: 'destructive',
      })
    }
  }

  // Function to clear old logs
  const clearOldLogs = async (olderThan: string = '30d') => {
    if (!confirm(`Are you sure you want to delete logs older than ${olderThan}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/ai/executions?olderThan=${olderThan}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to clear logs')
      }

      toast({
        title: 'Logs Cleared',
        description: `Successfully deleted logs older than ${olderThan}`,
      })

      // Reload logs
      loadLogs()
    } catch (error) {
      console.error('Failed to clear logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to clear logs',
        variant: 'destructive',
      })
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.model.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Agent', 'Model', 'Status', 'Duration (ms)', 'Tokens', 'Cost', 'Error'].join(','),
      ...filteredLogs.map(log =>
        [
          log.timestamp.toISOString(),
          log.agentName,
          log.model,
          log.status,
          log.duration,
          log.tokensUsed,
          log.cost.toFixed(4),
          log.error || '',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-execution-logs-${new Date().toISOString()}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Executions</p>
                <p className="text-2xl font-bold">{stats.totalExecutions}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</p>
              </div>
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execution Logs</CardTitle>
              <CardDescription>View and analyze AI agent execution history</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Add test button for development */}
              {process.env.NODE_ENV === 'development' && (
                <Button variant="outline" size="sm" onClick={createTestLog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Test Log
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={exportLogs}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => clearOldLogs('30d')}>
                    Clear logs older than 30 days
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => clearOldLogs('90d')}>
                    Clear logs older than 90 days
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by agent name or model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {log.timestamp.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.agentName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{log.agentType}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.model}</Badge>
                    </TableCell>
                    <TableCell>
                      {log.status === 'success' && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Success
                        </Badge>
                      )}
                      {log.status === 'error' && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                      {log.status === 'timeout' && (
                        <Badge variant="secondary">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Timeout
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{log.duration}ms</TableCell>
                    <TableCell>{log.tokensUsed.toLocaleString()}</TableCell>
                    <TableCell>${log.cost.toFixed(4)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Execution Details</DialogTitle>
                            <DialogDescription>
                              {log.agentName} - {log.timestamp.toLocaleString()}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium">Agent</Label>
                                <p className="text-sm">{log.agentName}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Model</Label>
                                <p className="text-sm">{log.model}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Duration</Label>
                                <p className="text-sm">{log.duration}ms</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Status</Label>
                                <p className="text-sm capitalize">{log.status}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Input Tokens</Label>
                                <p className="text-sm">{log.inputTokens}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Output Tokens</Label>
                                <p className="text-sm">{log.outputTokens}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Total Cost</Label>
                                <p className="text-sm">${log.cost.toFixed(4)}</p>
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Prompt</Label>
                              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs whitespace-pre-wrap">
                                {log.prompt}
                              </pre>
                            </div>

                            {log.response && (
                              <div>
                                <Label className="text-sm font-medium">Response</Label>
                                <pre className="mt-2 p-3 bg-muted rounded-lg text-xs whitespace-pre-wrap">
                                  {log.response}
                                </pre>
                              </div>
                            )}

                            {log.error && (
                              <div>
                                <Label className="text-sm font-medium text-red-600">Error</Label>
                                <pre className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                                  {log.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
