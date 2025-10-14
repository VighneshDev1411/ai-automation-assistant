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
} from 'lucide-react'
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
      // In production, this would fetch from your API
      // For now, generating mock data
      const mockLogs: ExecutionLog[] = Array.from({ length: 20 }, (_, i) => {
        const status = ['success', 'success', 'success', 'error'][Math.floor(Math.random() * 4)] as ExecutionLog['status']
        const duration = Math.floor(Math.random() * 3000) + 500
        const inputTokens = Math.floor(Math.random() * 500) + 100
        const outputTokens = Math.floor(Math.random() * 800) + 200
        const tokensUsed = inputTokens + outputTokens
        const cost = (tokensUsed / 1000) * 0.002

        return {
          id: `exec_${i + 1}`,
          timestamp: new Date(Date.now() - i * 3600000),
          agentId: agentId || `agent_${Math.floor(Math.random() * 5) + 1}`,
          agentName: ['Customer Support Bot', 'Content Generator', 'Data Analyzer', 'Email Assistant'][Math.floor(Math.random() * 4)],
          agentType: ['conversational', 'analytical', 'task'][Math.floor(Math.random() * 3)],
          model: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet'][Math.floor(Math.random() * 3)],
          status,
          duration,
          tokensUsed,
          cost,
          inputTokens,
          outputTokens,
          prompt: 'Sample prompt for AI agent execution...',
          response: status === 'success' ? 'Sample AI response generated successfully...' : '',
          error: status === 'error' ? 'Model timeout or rate limit exceeded' : undefined,
          metadata: {
            temperature: 0.7,
            maxTokens: 1000,
          },
        }
      })

      setLogs(mockLogs)

      // Calculate stats
      const successCount = mockLogs.filter(l => l.status === 'success').length
      const totalTokens = mockLogs.reduce((sum, l) => sum + l.tokensUsed, 0)
      const totalCost = mockLogs.reduce((sum, l) => sum + l.cost, 0)
      const avgDuration = mockLogs.reduce((sum, l) => sum + l.duration, 0) / mockLogs.length

      setStats({
        totalExecutions: mockLogs.length,
        successRate: (successCount / mockLogs.length) * 100,
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
              <Button variant="outline" size="sm" onClick={loadLogs}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportLogs}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
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
