'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  BarChart3
} from 'lucide-react'

interface WorkflowExecution {
  id: string
  workflowName: string
  status: 'success' | 'failed' | 'running'
  startTime: string
  duration: string
  trigger: string
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalExecutions: 0,
    successRate: 0,
    avgDuration: '',
    activeWorkflows: 0
  })

  const [recentExecutions, setRecentExecutions] = useState<WorkflowExecution[]>([])
  const [performanceData, setPerformanceData] = useState<Array<{ name: string; executions: number; successRate: number }>>([])

  useEffect(() => {
    // Fetch analytics data
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/analytics/executions')
        const data = await response.json()

        // Set stats from API response
        setStats({
          totalExecutions: data.totalExecutions || 0,
          successRate: data.successRate || 0,
          avgDuration: data.avgDuration || '0s',
          activeWorkflows: data.activeWorkflows || 0
        })

        // Set recent executions from API response
        setRecentExecutions(data.recentExecutions || [])

        // Set performance data from API response
        setPerformanceData(data.performanceByWorkflow || [])
      } catch (error) {
        console.error('Error fetching analytics:', error)
      }
    }

    fetchAnalytics()
  }, [])

  const getStatusBadge = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'success':
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Success
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      case 'running':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Clock className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Monitor workflow performance and execution metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExecutions}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              +2.1% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <TrendingDown className="h-3 w-3 mr-1 text-green-600" />
              -0.5s from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWorkflows}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              Running continuously
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Trends</CardTitle>
          <CardDescription>Workflow executions over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
            <div className="text-center space-y-2">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Chart visualization coming soon
              </p>
              <p className="text-xs text-muted-foreground">
                Will display execution trends and performance metrics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>Latest workflow runs and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentExecutions.map(execution => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{execution.workflowName}</p>
                    {getStatusBadge(execution.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {execution.startTime}
                    </span>
                    <span>Duration: {execution.duration}</span>
                    <span>Trigger: {execution.trigger}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance by Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Workflow</CardTitle>
          <CardDescription>Top performing workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceData.length > 0 ? performanceData.map((workflow, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{workflow.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-xs">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${workflow.successRate}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {workflow.successRate}%
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-medium">{workflow.executions}</p>
                  <p className="text-xs text-muted-foreground">executions</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No workflow performance data available yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
