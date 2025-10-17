'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  Bug,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  Terminal,
  Database,
  Network,
  Activity,
  FileJson,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Code,
  RefreshCw,
  Plus,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface ExecutionStep {
  id: string
  execution_id: string
  step_index: number
  action_type: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  input_data: any
  output_data: any
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
}

interface ExecutionLog {
  id: string
  workflow_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  trigger_type: string
  trigger_data: any
  execution_data: any
  error_details: any
  retry_count: number
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  steps: ExecutionStep[]
}

interface TestCase {
  id: string
  name: string
  description: string
  input_data: any
  expected_output: any
  actual_output?: any
  status?: 'passed' | 'failed' | 'pending'
  error?: string
  duration_ms?: number
  created_at: string
}

interface WorkflowTestingProps {
  workflowId: string
  workflowName: string
  workflowConfig: {
    nodes: any[]
    edges: any[]
  }
  onExecutionComplete?: (result: ExecutionLog) => void
}

export const WorkflowTesting: React.FC<WorkflowTestingProps> = ({
  workflowId,
  workflowName,
  workflowConfig,
  onExecutionComplete,
}) => {
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentStep, setCurrentStep] = useState<number | null>(null)
  const [selectedExecution, setSelectedExecution] =
    useState<ExecutionLog | null>(null)
  const [testInput, setTestInput] = useState('')
  const [isDebugMode, setIsDebugMode] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchExecutionHistory()
    loadTestCases()
  }, [workflowId])

  // Fetch execution history from database
  const fetchExecutionHistory = async () => {
    try {
      setLoading(true)

      const { data: executions, error } = await supabase
        .from('execution_logs')
        .select(
          `
          *,
          steps:execution_steps(*)
        `
        )
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setExecutionLogs(executions || [])
    } catch (error: any) {
      console.error('Error fetching execution history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load execution history',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Load saved test cases
  const loadTestCases = () => {
    const saved = localStorage.getItem(`workflow_test_cases_${workflowId}`)
    if (saved) {
      setTestCases(JSON.parse(saved))
    }
  }

  // Save test cases to localStorage
  const saveTestCases = (cases: TestCase[]) => {
    localStorage.setItem(
      `workflow_test_cases_${workflowId}`,
      JSON.stringify(cases)
    )
    setTestCases(cases)
  }

  // Execute workflow with test data
  const executeWorkflow = async (inputData?: any) => {
    try {
      setIsExecuting(true)
      const startTime = Date.now()

      // Parse input data
      const triggerData = inputData || (testInput ? JSON.parse(testInput) : {})

      // Call workflow execution API
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger_data: triggerData,
          debug_mode: isDebugMode,
        }),
      })

      if (!response.ok) throw new Error('Execution failed')

      const result = await response.json()
      const duration = Date.now() - startTime

      toast({
        title: 'Execution Complete',
        description: `Execution started with ID: ${result.execution_id || 'unknown'}`,
      })

      // Refresh execution history to show the new execution
      setTimeout(() => fetchExecutionHistory(), 1000)
    } catch (error: any) {
      console.error('Execution error:', error)
      toast({
        title: 'Execution Failed',
        description: error.message || 'An error occurred during execution',
        variant: 'destructive',
      })
    } finally {
      setIsExecuting(false)
    }
  }

  // Step-by-step execution
  const executeStep = async (stepIndex: number) => {
    try {
      setCurrentStep(stepIndex)

      // Simulate step execution
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: 'Step Executed',
        description: `Step ${stepIndex + 1} completed successfully`,
      })
    } catch (error) {
      toast({
        title: 'Step Failed',
        description: 'Failed to execute step',
        variant: 'destructive',
      })
    } finally {
      setCurrentStep(null)
    }
  }

  // Run all test cases
  const runAllTests = async () => {
    try {
      setLoading(true)
      const updatedTests = await Promise.all(
        testCases.map(async testCase => {
          const startTime = Date.now()
          try {
            const response = await fetch(`/api/workflows/${workflowId}/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                trigger_data: testCase.input_data,
              }),
            })

            const result = await response.json()
            const duration = Date.now() - startTime

            return {
              ...testCase,
              actual_output: result.output,
              status: 'passed' as const,
              duration_ms: duration,
            }
          } catch (error: any) {
            return {
              ...testCase,
              status: 'failed' as const,
              error: error.message,
              duration_ms: Date.now() - startTime,
            }
          }
        })
      )

      saveTestCases(updatedTests)

      const passed = updatedTests.filter(t => t.status === 'passed').length
      toast({
        title: 'Tests Complete',
        description: `${passed}/${updatedTests.length} tests passed`,
      })
    } catch (error) {
      toast({
        title: 'Test Run Failed',
        description: 'Failed to run test suite',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Add new test case
  const addTestCase = () => {
    const newTest: TestCase = {
      id: `test_${Date.now()}`,
      name: `Test Case ${testCases.length + 1}`,
      description: '',
      input_data: {},
      expected_output: {},
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    saveTestCases([...testCases, newTest])
  }

  // Delete test case
  const deleteTestCase = (id: string) => {
    saveTestCases(testCases.filter(t => t.id !== id))
  }

  // Export execution log
  const exportExecution = (execution: ExecutionLog) => {
    const exportData = {
      workflow_name: workflowName,
      execution_id: execution.id,
      exported_at: new Date().toISOString(),
      execution,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `execution_${execution.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Clear all execution history
  const clearHistory = async () => {
    if (!confirm('Are you sure you want to clear all execution history?'))
      return

    try {
      const { error } = await supabase
        .from('execution_logs')
        .delete()
        .eq('workflow_id', workflowId)

      if (error) throw error

      setExecutionLogs([])
      toast({
        title: 'History Cleared',
        description: 'All execution logs have been deleted',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear history',
        variant: 'destructive',
      })
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500'
      case 'failed':
        return 'text-red-500'
      case 'running':
        return 'text-blue-500'
      case 'pending':
        return 'text-yellow-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="h-6 w-6" />
            Testing & Debugging
          </h2>
          <p className="text-muted-foreground mt-1">
            Test your workflow with sample data and debug execution
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsDebugMode(!isDebugMode)}
          >
            <Terminal className="mr-2 h-4 w-4" />
            {isDebugMode ? 'Disable' : 'Enable'} Debug
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Advanced
          </Button>
        </div>
      </div>

      <Tabs defaultValue="quick-test" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick-test">
            <Zap className="mr-2 h-4 w-4" />
            Quick Test
          </TabsTrigger>
          <TabsTrigger value="test-cases">
            <FileJson className="mr-2 h-4 w-4" />
            Test Cases
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="step-debug">
            <StepForward className="mr-2 h-4 w-4" />
            Step Debug
          </TabsTrigger>
        </TabsList>

        {/* Quick Test Tab */}
        <TabsContent value="quick-test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Test Execution</CardTitle>
              <CardDescription>
                Test your workflow with custom input data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Test Input (JSON)</label>
                <Textarea
                  placeholder='{\n  "email": "test@example.com",\n  "name": "John Doe"\n}'
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  className="mt-1 font-mono"
                  rows={8}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => executeWorkflow()}
                  disabled={isExecuting}
                  className="flex-1"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Execute Workflow
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setTestInput('{}')}
                  disabled={isExecuting}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Stats */}
              {executionLogs.length > 0 && (
                <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {executionLogs.length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Runs
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {
                        executionLogs.filter(e => e.status === 'completed')
                          .length
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Successful
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">
                      {executionLogs.filter(e => e.status === 'failed').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {executionLogs[0]?.duration_ms
                        ? formatDuration(executionLogs[0].duration_ms)
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last Duration
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Execution Result */}
          {selectedExecution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Latest Execution Result</span>
                  <Badge className={getStatusColor(selectedExecution.status)}>
                    {selectedExecution.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="input">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Input Data
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                        {JSON.stringify(
                          selectedExecution.trigger_data,
                          null,
                          2
                        )}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="output">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <FileJson className="h-4 w-4" />
                        Output Data
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                        {JSON.stringify(
                          selectedExecution.execution_data,
                          null,
                          2
                        )}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>

                  {selectedExecution.error_details && (
                    <AccordionItem value="error">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2 text-red-500">
                          <AlertTriangle className="h-4 w-4" />
                          Error Details
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-red-50 dark:bg-red-950 p-4 rounded-lg overflow-x-auto text-xs text-red-600 dark:text-red-400">
                          {JSON.stringify(
                            selectedExecution.error_details,
                            null,
                            2
                          )}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  <AccordionItem value="steps">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Execution Steps ({selectedExecution.steps?.length || 0})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {selectedExecution.steps?.map((step, index) => (
                          <div
                            key={step.id}
                            className="border rounded-lg p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono">
                                  Step {step.step_index + 1}
                                </span>
                                <Badge variant="outline">
                                  {step.action_type}
                                </Badge>
                                <span
                                  className={`flex items-center gap-1 ${getStatusColor(step.status)}`}
                                >
                                  {getStatusIcon(step.status)}
                                  <span className="text-xs">{step.status}</span>
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(step.duration_ms)}
                              </span>
                            </div>

                            {step.error_message && (
                              <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded">
                                {step.error_message}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Test Cases Tab */}
        <TabsContent value="test-cases" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Test Suite</CardTitle>
                  <CardDescription>
                    Create and run automated test cases
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={addTestCase} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Test
                  </Button>
                  <Button
                    onClick={runAllTests}
                    disabled={loading || testCases.length === 0}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Run All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {testCases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileJson className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No test cases yet. Add your first test to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testCases.map(testCase => (
                    <Card key={testCase.id} className="border-2">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Input
                              value={testCase.name}
                              onChange={e => {
                                const updated = testCases.map(t =>
                                  t.id === testCase.id
                                    ? { ...t, name: e.target.value }
                                    : t
                                )
                                saveTestCases(updated)
                              }}
                              className="font-semibold mb-2"
                            />
                            <Input
                              value={testCase.description}
                              onChange={e => {
                                const updated = testCases.map(t =>
                                  t.id === testCase.id
                                    ? { ...t, description: e.target.value }
                                    : t
                                )
                                saveTestCases(updated)
                              }}
                              placeholder="Test description..."
                              className="text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {testCase.status && (
                              <Badge
                                variant={
                                  testCase.status === 'passed'
                                    ? 'default'
                                    : 'destructive'
                                }
                              >
                                {testCase.status}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                executeWorkflow(testCase.input_data)
                              }
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTestCase(testCase.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">
                            Input Data
                          </label>
                          <Textarea
                            value={JSON.stringify(testCase.input_data, null, 2)}
                            onChange={e => {
                              try {
                                const parsed = JSON.parse(e.target.value)
                                const updated = testCases.map(t =>
                                  t.id === testCase.id
                                    ? { ...t, input_data: parsed }
                                    : t
                                )
                                saveTestCases(updated)
                              } catch {}
                            }}
                            className="mt-1 font-mono text-xs"
                            rows={4}
                          />
                        </div>

                        {testCase.actual_output && (
                          <div>
                            <label className="text-sm font-medium">
                              Actual Output
                            </label>
                            <pre className="mt-1 bg-muted p-3 rounded-lg overflow-x-auto text-xs">
                              {JSON.stringify(testCase.actual_output, null, 2)}
                            </pre>
                          </div>
                        )}

                        {testCase.error && (
                          <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium">Error:</span>
                            </div>
                            <p className="text-xs mt-1 text-red-600 dark:text-red-400">
                              {testCase.error}
                            </p>
                          </div>
                        )}

                        {testCase.duration_ms && (
                          <div className="text-xs text-muted-foreground">
                            Execution time:{' '}
                            {formatDuration(testCase.duration_ms)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Execution History</CardTitle>
                  <CardDescription>
                    View past workflow executions and their results
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={fetchExecutionHistory}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={clearHistory}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : executionLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No execution history yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {executionLogs.map(execution => (
                      <Card
                        key={execution.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => setSelectedExecution(execution)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span
                                className={getStatusColor(execution.status)}
                              >
                                {getStatusIcon(execution.status)}
                              </span>
                              <div>
                                <div className="font-medium">
                                  {execution.trigger_type}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(execution.started_at)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {formatDuration(execution.duration_ms)}
                              </div>
                              {execution.steps && (
                                <div className="text-xs text-muted-foreground">
                                  {execution.steps.length} steps
                                </div>
                              )}
                            </div>
                          </div>

                          {execution.retry_count > 0 && (
                            <Badge variant="outline" className="mr-2">
                              {execution.retry_count} retries
                            </Badge>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation()
                              exportExecution(execution)
                            }}
                            className="mt-2"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Export
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Step Debug Tab */}
        <TabsContent value="step-debug" className="space-y-4"></TabsContent>
        {/* Step Debug Tab - Continued */}
        <TabsContent value="step-debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step-by-Step Debugging</CardTitle>
              <CardDescription>
                Execute workflow nodes one at a time for detailed debugging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Workflow Steps Visualization */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Workflow Steps</h3>
                  <Badge variant="outline">
                    {workflowConfig.nodes.length} nodes
                  </Badge>
                </div>

                <div className="space-y-2">
                  {workflowConfig.nodes.map((node, index) => (
                    <div
                      key={node.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border-2
                        ${currentStep === index ? 'border-primary bg-primary/10' : 'border-border'}
                        ${node.type === 'trigger' ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
                        ${node.type === 'action' ? 'bg-green-50 dark:bg-green-950/20' : ''}
                        ${node.type === 'condition' ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border-2">
                          {currentStep === index ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <span className="text-sm font-medium">
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">
                            {node.data.label || node.type}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {node.type}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => executeStep(index)}
                          disabled={currentStep !== null}
                        >
                          <StepForward className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Debug Controls */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <Button
                      className="w-full"
                      disabled={currentStep !== null}
                      onClick={() => executeStep(0)}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start Debug
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={currentStep === null}
                    >
                      <StepForward className="mr-2 h-4 w-4" />
                      Next Step
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setCurrentStep(null)}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Variable Inspector */}
              {showAdvanced && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Variable Inspector
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium">Variable</div>
                        <div className="font-medium">Value</div>
                      </div>
                      <div className="border-t pt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            trigger.data
                          </code>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {JSON.stringify(
                              testInput ? JSON.parse(testInput) : {},
                              null,
                              0
                            ).slice(0, 50)}
                            ...
                          </code>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            workflow.id
                          </code>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {workflowId}
                          </code>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            currentStep
                          </code>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {currentStep !== null ? currentStep : 'null'}
                          </code>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Breakpoints */}
              {showAdvanced && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Breakpoints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workflowConfig.nodes.map((node, index) => (
                        <div key={node.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`breakpoint-${node.id}`}
                            className="rounded"
                          />
                          <label
                            htmlFor={`breakpoint-${node.id}`}
                            className="text-sm cursor-pointer"
                          >
                            Step {index + 1}: {node.data.label || node.type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Console Output */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Debug Console
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64 w-full">
                    <pre className="text-xs bg-black text-green-400 p-4 rounded-lg font-mono">
                      {`> Workflow Debugger Ready
> Workflow ID: ${workflowId}
> Total Steps: ${workflowConfig.nodes.length}
> Status: ${currentStep !== null ? `Executing step ${currentStep + 1}` : 'Idle'}
${currentStep !== null ? `\n> [Step ${currentStep + 1}] Executing ${workflowConfig.nodes[currentStep]?.type}...` : ''}
${isDebugMode ? '\n> Debug mode: ENABLED' : '\n> Debug mode: DISABLED'}
> Ready for input...`}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              {showAdvanced && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-xl font-bold">0ms</div>
                        <div className="text-xs text-muted-foreground">
                          Current Step
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-xl font-bold">0ms</div>
                        <div className="text-xs text-muted-foreground">
                          Total Time
                        </div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-xl font-bold">0 KB</div>
                        <div className="text-xs text-muted-foreground">
                          Memory Used
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Network Monitor */}
              {showAdvanced && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Network Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No network activity recorded
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execution Detail Modal */}
      {selectedExecution && (
        <Dialog
          open={!!selectedExecution}
          onOpenChange={() => setSelectedExecution(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Execution Details
                <Badge className={getStatusColor(selectedExecution.status)}>
                  {selectedExecution.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Execution ID: {selectedExecution.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Trigger Type:
                      </span>
                      <span className="ml-2 font-medium">
                        {selectedExecution.trigger_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="ml-2 font-medium">
                        {formatDuration(selectedExecution.duration_ms)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Started:</span>
                      <span className="ml-2 font-medium">
                        {formatDate(selectedExecution.started_at)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="ml-2 font-medium">
                        {selectedExecution.completed_at
                          ? formatDate(selectedExecution.completed_at)
                          : 'Running...'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Retry Count:
                      </span>
                      <span className="ml-2 font-medium">
                        {selectedExecution.retry_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Steps:</span>
                      <span className="ml-2 font-medium">
                        {selectedExecution.steps?.length || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Steps Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Execution Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedExecution.steps?.map((step, index) => (
                      <div key={step.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                              step.status === 'completed'
                                ? 'bg-green-500 border-green-500 text-white'
                                : step.status === 'failed'
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : step.status === 'running'
                                    ? 'bg-blue-500 border-blue-500 text-white'
                                    : 'bg-gray-300 border-gray-300 text-gray-600'
                            }`}
                          >
                            {step.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : step.status === 'failed' ? (
                              <XCircle className="h-4 w-4" />
                            ) : step.status === 'running' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          {index < selectedExecution.steps.length - 1 && (
                            <div className="w-0.5 h-12 bg-border" />
                          )}
                        </div>

                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-sm">
                              {step.action_type}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDuration(step.duration_ms)}
                            </div>
                          </div>

                          {step.error_message && (
                            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950 p-2 rounded mt-2">
                              {step.error_message}
                            </div>
                          )}

                          {showAdvanced && (
                            <details className="mt-2">
                              <summary className="text-xs cursor-pointer text-muted-foreground">
                                View step data
                              </summary>
                              <div className="mt-2 space-y-2">
                                <div>
                                  <div className="text-xs font-medium mb-1">
                                    Input:
                                  </div>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(step.input_data, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <div className="text-xs font-medium mb-1">
                                    Output:
                                  </div>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {JSON.stringify(step.output_data, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Raw Data */}
              {showAdvanced && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Raw Execution Data
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="trigger">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="trigger">Trigger</TabsTrigger>
                        <TabsTrigger value="execution">Execution</TabsTrigger>
                        <TabsTrigger value="error">Error</TabsTrigger>
                      </TabsList>
                      <TabsContent value="trigger">
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                          {JSON.stringify(
                            selectedExecution.trigger_data,
                            null,
                            2
                          )}
                        </pre>
                      </TabsContent>
                      <TabsContent value="execution">
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                          {JSON.stringify(
                            selectedExecution.execution_data,
                            null,
                            2
                          )}
                        </pre>
                      </TabsContent>
                      <TabsContent value="error">
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                          {selectedExecution.error_details
                            ? JSON.stringify(
                                selectedExecution.error_details,
                                null,
                                2
                              )
                            : 'No errors'}
                        </pre>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => exportExecution(selectedExecution)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    executeWorkflow(selectedExecution.trigger_data)
                  }
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Re-run
                </Button>
                <Button onClick={() => setSelectedExecution(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
