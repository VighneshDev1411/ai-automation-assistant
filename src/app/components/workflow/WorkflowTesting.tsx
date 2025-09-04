// src/components/workflow/WorkflowTesting.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import {
  Play,
  Pause,
  Square,
  Bug,
  TestTube,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Code,
  FileText,
  BarChart3,
  Timer,
  Database,
  Network,
  Cpu,
  StoreIcon,
  HardDrive
} from 'lucide-react'

interface TestCase {
  id: string
  name: string
  description: string
  input: any
  expectedOutput: any
  status: 'pending' | 'running' | 'passed' | 'failed'
  executionTime?: number
  actualOutput?: any
  error?: string
  createdAt: string
}

interface ExecutionStep {
  id: string
  nodeId: string
  nodeName: string
  nodeType: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startTime?: string
  endTime?: string
  executionTime?: number
  input?: any
  output?: any
  error?: string
  logs: string[]
}

interface WorkflowExecution {
  id: string
  testCaseId?: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: string
  endTime?: string
  totalExecutionTime?: number
  steps: ExecutionStep[]
  metrics: {
    cpu: number
    memory: number
    network: number
    database: number
  }
}

interface WorkflowTestingProps {
  workflowId: string
  workflowName: string
}

const mockTestCases: TestCase[] = [
  {
    id: '1',
    name: 'Valid Email Input',
    description: 'Test workflow with valid email data',
    input: {
      email: 'user@example.com',
      name: 'John Doe',
      action: 'signup'
    },
    expectedOutput: {
      emailSent: true,
      status: 'success'
    },
    status: 'passed',
    executionTime: 1250,
    actualOutput: {
      emailSent: true,
      status: 'success'
    },
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Invalid Email Format',
    description: 'Test workflow error handling with invalid email',
    input: {
      email: 'invalid-email',
      name: 'Jane Smith',
      action: 'signup'
    },
    expectedOutput: {
      error: 'Invalid email format',
      status: 'error'
    },
    status: 'failed',
    executionTime: 850,
    actualOutput: {
      error: 'Email validation failed',
      status: 'error'
    },
    error: 'Expected error message mismatch',
    createdAt: '2024-01-15T10:25:00Z'
  },
  {
    id: '3',
    name: 'Large Data Set',
    description: 'Test performance with large input data',
    input: {
      users: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        email: `user${i}@example.com`,
        name: `User ${i}`
      }))
    },
    expectedOutput: {
      processed: 1000,
      status: 'success'
    },
    status: 'pending',
    createdAt: '2024-01-15T10:20:00Z'
  }
]

export function WorkflowTesting({ workflowId, workflowName }: WorkflowTestingProps) {
  const [testCases, setTestCases] = useState<TestCase[]>(mockTestCases)
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(null)
  const [activeTab, setActiveTab] = useState('test-cases')
  const [isRunning, setIsRunning] = useState(false)
  const [newTestCase, setNewTestCase] = useState({
    name: '',
    description: '',
    input: '{}',
    expectedOutput: '{}'
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { toast } = useToast()

  const [executionLogs, setExecutionLogs] = useState<string[]>([])
  const [debugBreakpoints, setDebugBreakpoints] = useState<string[]>([])

  // Simulate workflow execution
  const executeWorkflow = async (testCase?: TestCase) => {
    setIsRunning(true)
    setExecutionLogs([])
    
    const execution: WorkflowExecution = {
      id: Date.now().toString(),
      testCaseId: testCase?.id,
      status: 'running',
      startTime: new Date().toISOString(),
      steps: [
        {
          id: '1',
          nodeId: 'trigger-1',
          nodeName: 'Email Trigger',
          nodeType: 'trigger',
          status: 'pending',
          logs: []
        },
        {
          id: '2',
          nodeId: 'action-1',
          nodeName: 'Validate Email',
          nodeType: 'action',
          status: 'pending',
          logs: []
        },
        {
          id: '3',
          nodeId: 'condition-1',
          nodeName: 'Check Valid',
          nodeType: 'condition',
          status: 'pending',
          logs: []
        },
        {
          id: '4',
          nodeId: 'action-2',
          nodeName: 'Send Email',
          nodeType: 'action',
          status: 'pending',
          logs: []
        }
      ],
      metrics: {
        cpu: 0,
        memory: 0,
        network: 0,
        database: 0
      }
    }

    setCurrentExecution(execution)
    setActiveTab('execution')

    // Simulate step-by-step execution
    for (let i = 0; i < execution.steps.length; i++) {
      const step = execution.steps[i]
      
      // Start step
      step.status = 'running'
      step.startTime = new Date().toISOString()
      setCurrentExecution(prev => prev ? { ...prev } : null)
      
      // Add logs
      const stepLogs = [
        `Starting ${step.nodeName}...`,
        `Processing input: ${JSON.stringify(testCase?.input || {}, null, 2)}`,
        `Executing ${step.nodeType} logic...`
      ]
      
      for (const log of stepLogs) {
        await new Promise(resolve => setTimeout(resolve, 300))
        step.logs.push(log)
        setExecutionLogs(prev => [...prev, `[${step.nodeName}] ${log}`])
        setCurrentExecution(prev => prev ? { ...prev } : null)
      }

      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Complete step
      step.status = 'completed'
      step.endTime = new Date().toISOString()
      step.executionTime = Math.random() * 1000 + 200
      step.output = { processed: true, timestamp: new Date().toISOString() }
      
      setExecutionLogs(prev => [...prev, `[${step.nodeName}] Completed in ${step.executionTime?.toFixed(0)}ms`])
      setCurrentExecution(prev => prev ? { ...prev } : null)

      // Update metrics
      execution.metrics.cpu = Math.random() * 80 + 10
      execution.metrics.memory = Math.random() * 60 + 20
      execution.metrics.network = Math.random() * 40 + 5
      execution.metrics.database = Math.random() * 30 + 10
    }

    // Complete execution
    execution.status = 'completed'
    execution.endTime = new Date().toISOString()
    execution.totalExecutionTime = execution.steps.reduce((sum, step) => sum + (step.executionTime || 0), 0)
    
    setCurrentExecution(execution)
    setIsRunning(false)

    // Update test case if it was being tested
    if (testCase) {
      setTestCases(prev => prev.map(tc => 
        tc.id === testCase.id 
          ? { 
              ...tc, 
              status: execution.status === 'completed' ? 'passed' : 'failed',
              executionTime: execution.totalExecutionTime,
              actualOutput: execution.steps[execution.steps.length - 1]?.output
            }
          : tc
      ))
    }

    toast({
      title: 'Execution Complete',
      description: `Workflow executed successfully in ${execution.totalExecutionTime?.toFixed(0)}ms`,
    })
  }

  const runTestCase = (testCase: TestCase) => {
    setTestCases(prev => prev.map(tc => 
      tc.id === testCase.id ? { ...tc, status: 'running' } : tc
    ))
    executeWorkflow(testCase)
  }

  const runAllTests = async () => {
    setIsRunning(true)
    for (const testCase of testCases) {
      if (testCase.status !== 'passed') {
        await executeWorkflow(testCase)
      }
    }
    setIsRunning(false)
  }

  const createTestCase = () => {
    try {
      const input = JSON.parse(newTestCase.input)
      const expectedOutput = JSON.parse(newTestCase.expectedOutput)
      
      const testCase: TestCase = {
        id: Date.now().toString(),
        name: newTestCase.name,
        description: newTestCase.description,
        input,
        expectedOutput,
        status: 'pending',
        createdAt: new Date().toISOString()
      }

      setTestCases(prev => [...prev, testCase])
      setNewTestCase({ name: '', description: '', input: '{}', expectedOutput: '{}' })
      setShowCreateDialog(false)

      toast({
        title: 'Test Case Created',
        description: `Test case "${testCase.name}" has been created.`,
      })
    } catch (error) {
      toast({
        title: 'Invalid JSON',
        description: 'Please check your input and expected output JSON format.',
        variant: 'destructive'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'passed':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="badge-info">Running</Badge>
      case 'passed':
      case 'completed':
        return <Badge className="badge-success">Passed</Badge>
      case 'failed':
        return <Badge className="badge-error">Failed</Badge>
      case 'pending':
        return <Badge className="badge-neutral">Pending</Badge>
      default:
        return <Badge className="badge-neutral">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              <CardTitle>Workflow Testing & Debugging</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => executeWorkflow()}
                disabled={isRunning}
                variant="outline"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Test Run
                  </>
                )}
              </Button>
              
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="btn-shine"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Run All Tests
              </Button>
            </div>
          </div>
          <CardDescription>
            Test your workflow with different inputs and debug execution issues.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="test-cases">Test Cases</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="debugging">Debug</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Test Cases Tab */}
        <TabsContent value="test-cases" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Test Cases</CardTitle>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Create Test Case
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testCases.map(testCase => (
                  <Card key={testCase.id} className="clean-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(testCase.status)}
                            <h3 className="font-semibold">{testCase.name}</h3>
                            {getStatusBadge(testCase.status)}
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {testCase.description}
                          </p>
                          
                          {testCase.executionTime && (
                            <div className="text-sm text-muted-foreground">
                              Execution time: {testCase.executionTime.toFixed(0)}ms
                            </div>
                          )}
                          
                          {testCase.error && (
                            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded">
                              Error: {testCase.error}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => runTestCase(testCase)}
                            disabled={isRunning}
                            size="sm"
                            variant="outline"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Run
                          </Button>
                          
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execution Tab */}
        <TabsContent value="execution" className="space-y-6">
          {currentExecution ? (
            <>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Execution Flow
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentExecution.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          {getStatusIcon(step.status)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{step.nodeName}</h4>
                            <Badge variant="outline" className="text-xs">
                              {step.nodeType}
                            </Badge>
                          </div>
                          
                          {step.executionTime && (
                            <div className="text-sm text-muted-foreground">
                              {step.executionTime.toFixed(0)}ms
                            </div>
                          )}
                          
                          {step.error && (
                            <div className="text-sm text-red-600">
                              Error: {step.error}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {step.startTime && new Date(step.startTime).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Real-time Metrics */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Real-time Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">CPU</span>
                      </div>
                      <Progress value={currentExecution.metrics.cpu} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {currentExecution.metrics.cpu.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <StoreIcon className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Memory</span>
                      </div>
                      <Progress value={currentExecution.metrics.memory} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {currentExecution.metrics.memory.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Network</span>
                      </div>
                      <Progress value={currentExecution.metrics.network} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {currentExecution.metrics.network.toFixed(1)} MB/s
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Database</span>
                      </div>
                      <Progress value={currentExecution.metrics.database} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {currentExecution.metrics.database.toFixed(1)} ops/s
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-card">
              <CardContent className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Execution</h3>
                <p className="text-muted-foreground mb-4">
                  Start a test run to see real-time execution details.
                </p>
                <Button onClick={() => executeWorkflow()}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Test Run
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Debugging Tab */}
        <TabsContent value="debugging" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Execution Logs */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Execution Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                  {executionLogs.length > 0 ? (
                    executionLogs.map((log, index) => (
                      <div key={index} className="text-sm font-mono p-2 bg-muted/30 rounded">
                        <span className="text-muted-foreground">
                          {new Date().toLocaleTimeString()}
                        </span>
                        {' '}- {log}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Code className="h-8 w-8 mx-auto mb-2" />
                      <p>No logs available. Run a test to see execution logs.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Breakpoints */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Debug Breakpoints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input placeholder="Node ID or name" className="flex-1" />
                    <Button size="sm">
                      Add Breakpoint
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {debugBreakpoints.length > 0 ? (
                      debugBreakpoints.map((breakpoint, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-sm font-mono">{breakpoint}</span>
                          <Button size="sm" variant="ghost">
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bug className="h-8 w-8 mx-auto mb-2" />
                        <p>No breakpoints set. Add breakpoints to pause execution.</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Variable Inspector */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Variable Inspector
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Input Variables</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-muted/30 rounded font-mono text-sm">
                      <pre>{JSON.stringify({ email: 'user@example.com', name: 'John Doe' }, null, 2)}</pre>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Runtime Variables</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-muted/30 rounded font-mono text-sm">
                      <pre>{JSON.stringify({ 
                        timestamp: new Date().toISOString(),
                        nodeId: 'action-1',
                        processed: true 
                      }, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Execution Times */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Execution Times
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentExecution?.steps.map(step => (
                    <div key={step.id} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                      <div>
                        <div className="font-medium">{step.nodeName}</div>
                        <div className="text-sm text-muted-foreground">{step.nodeType}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          {step.executionTime?.toFixed(0) || '—'}ms
                        </div>
                        <div className="w-20 h-1 bg-muted rounded overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ 
                              width: step.executionTime 
                                ? `${Math.min((step.executionTime / 2000) * 100, 100)}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <Timer className="h-8 w-8 mx-auto mb-2" />
                      <p>No performance data available.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resource Usage */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Resource Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/30 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {currentExecution?.totalExecutionTime?.toFixed(0) || '—'}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Total Time</div>
                    </div>
                    
                    <div className="text-center p-4 bg-muted/30 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {currentExecution?.steps.length || '—'}
                      </div>
                      <div className="text-sm text-muted-foreground">Steps</div>
                    </div>
                    
                    <div className="text-center p-4 bg-muted/30 rounded">
                      <div className="text-2xl font-bold text-purple-600">
                        {currentExecution?.metrics.memory.toFixed(1) || '—'}%
                      </div>
                      <div className="text-sm text-muted-foreground">Peak Memory</div>
                    </div>
                    
                    <div className="text-center p-4 bg-muted/30 rounded">
                      <div className="text-2xl font-bold text-orange-600">
                        {currentExecution?.metrics.cpu.toFixed(1) || '—'}%
                      </div>
                      <div className="text-sm text-muted-foreground">Peak CPU</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Recommendations */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-800 dark:text-yellow-200">
                      Optimize Email Validation Step
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      The email validation step is taking longer than expected. Consider caching validation results.
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-blue-800 dark:text-blue-200">
                      Good Memory Usage
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      Memory usage is within optimal range. Current workflow is efficient.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Test Case Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Test Case</DialogTitle>
            <DialogDescription>
              Create a new test case to validate your workflow behavior.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                value={newTestCase.name}
                onChange={(e) => setNewTestCase(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Valid email input test"
              />
            </div>
            
            <div>
              <Label htmlFor="test-description">Description</Label>
              <Textarea
                id="test-description"
                value={newTestCase.description}
                onChange={(e) => setNewTestCase(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this test validates..."
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="test-input">Input Data (JSON)</Label>
              <Textarea
                id="test-input"
                value={newTestCase.input}
                onChange={(e) => setNewTestCase(prev => ({ ...prev, input: e.target.value }))}
                placeholder='{"email": "user@example.com", "name": "John Doe"}'
                rows={4}
                className="font-mono text-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="test-expected">Expected Output (JSON)</Label>
              <Textarea
                id="test-expected"
                value={newTestCase.expectedOutput}
                onChange={(e) => setNewTestCase(prev => ({ ...prev, expectedOutput: e.target.value }))}
                placeholder='{"status": "success", "emailSent": true}'
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={createTestCase}
              disabled={!newTestCase.name.trim()}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Create Test Case
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Usage in a Dialog or as a standalone page
export function WorkflowTestingDialog({ workflowId, workflowName }: { workflowId: string; workflowName: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <TestTube className="h-4 w-4 mr-2" />
          Test & Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test & Debug - {workflowName}</DialogTitle>
          <DialogDescription>
            Test your workflow with different scenarios and debug any issues.
          </DialogDescription>
        </DialogHeader>
        
        <WorkflowTesting
          workflowId={workflowId}
          workflowName={workflowName}
        />
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}