'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Settings,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ToolCaseIcon,
  Bot,
  History,
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface ToolCall {
  id: string
  toolName: string
  parameters: any
  result: any
  success: boolean
  executionTime: number
  timestamp: Date
}

interface AgentExecution {
  id: string
  message: string
  response: string
  toolCalls: ToolCall[]
  tokensUsed: number
  processingTime: number
  timestamp: Date
}

export default function FunctionCallingTest() {
  const [activeTab, setActiveTab] = useState('tools')
  const [availableTools, setAvailableTools] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState('assistant')
  const [userMessage, setUserMessage] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionHistory, setExecutionHistory] = useState<AgentExecution[]>([])

  // Mock function calling system
  const [functionSystem, setFunctionSystem] = useState<any>(null)
  const [agent, setAgent] = useState<any>(null)

  useEffect(() => {
    initializeFunctionSystem()
  }, [])

  const initializeFunctionSystem = async () => {
    try {
      // Dynamic import to avoid SSR issues
      const { FunctionCallingSystem } = await import(
        '@/lib/ai/FunctionCallingSystem'
      )
      const { BUILT_IN_TOOLS } = await import('@/lib/ai/tools/BuiltInTools')
      const { AgentWithTools, AGENT_PRESETS } = await import(
        '@/lib/ai/AgentWithTools'
      )

      // Initialize function calling system
      const system = new FunctionCallingSystem()

      // Register built-in tools
      BUILT_IN_TOOLS.forEach(tool => {
        system.registerTool(tool)
      })

      setFunctionSystem(system)
      setAvailableTools(system.getAvailableTools())

      // In the initializeFunctionSystem function, update the agent config:

      const agentConfig = {
        ...AGENT_PRESETS.assistant,
        systemPrompt: `You are a comprehensive enterprise AI assistant with complete platform capabilities.

🚀 FULL FEATURE SET:
1. Knowledge & RAG: search_knowledge_base, add_document_to_kb, get_kb_stats
2. Workflow Automation: trigger_workflow, get_workflow_status, list_workflows  
3. Multi-Modal Processing: analyze_image, process_multimodal_document, search_multimodal_content
4. AI Training & Learning: create_training_dataset, add_training_example, start_fine_tuning, get_training_status, list_training_datasets
5. Safety & Compliance: check_content_safety, check_compliance, get_safety_stats, get_violation_history, emergency_stop
6. Analytics & Performance: get_performance_dashboard, analyze_costs, get_usage_patterns, get_performance_insights, record_performance_metric

🎯 ENTERPRISE READY: Full safety compliance, cost optimization, performance monitoring, and advanced AI capabilities.

Use the appropriate tools based on user requests. Always prioritize safety and provide actionable insights.`,
        availableTools: [
          'get_current_time',
          'generate_uuid',
          'calculate_math',
          'search_knowledge_base',
          'add_document_to_kb',
          'get_kb_stats',
          'trigger_workflow',
          'get_workflow_status',
          'list_workflows',
          'analyze_image',
          'process_multimodal_document',
          'search_multimodal_content',
          'create_training_dataset',
          'add_training_example',
          'start_fine_tuning',
          'get_training_status',
          'list_training_datasets',
          'check_content_safety',
          'check_compliance',
          'get_safety_stats',
          'get_violation_history',
          'emergency_stop',
          'deactivate_emergency_stop',
          'get_performance_dashboard', // Analytics tools
          'analyze_costs',
          'get_usage_patterns',
          'get_performance_insights',
          'record_performance_metric',
        ],
      }

      const agentInstance = new AgentWithTools(agentConfig, system)
      setAgent(agentInstance)

      toast({
        title: 'Function Calling System Ready',
        description: `Loaded ${BUILT_IN_TOOLS.length} tools`,
      })
    } catch (error) {
      console.error('Failed to initialize function calling system:', error)
      toast({
        title: 'Initialization Failed',
        description: 'Could not load function calling system',
        variant: 'destructive',
      })
    }
  }

  const executeAgentMessage = async () => {
    if (!agent || !userMessage.trim()) return

    setIsExecuting(true)

    try {
      const context = {
        sessionId: crypto.randomUUID(),
        timestamp: new Date(),
        metadata: { source: 'test-interface' },
      }

      const response = await agent.processMessage(userMessage, context)

      const execution: AgentExecution = {
        id: crypto.randomUUID(),
        message: userMessage,
        response: response.message,
        toolCalls: response.toolCalls || [],
        tokensUsed: response.tokensUsed,
        processingTime: response.processingTime,
        timestamp: new Date(),
      }

      setExecutionHistory(prev => [execution, ...prev])
      setUserMessage('')

      toast({
        title: 'Message Processed',
        description: `Response generated in ${response.processingTime}ms`,
      })
    } catch (error) {
      toast({
        title: 'Execution Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const testSingleTool = async (toolName: string) => {
    if (!functionSystem) return

    const testParams = getTestParameters(toolName)
    const context = {
      sessionId: crypto.randomUUID(),
      timestamp: new Date(),
      metadata: { source: 'tool-test' },
    }

    try {
      const result = await functionSystem.executeFunction(
        toolName,
        testParams,
        context
      )

      toast({
        title: `Tool Test: ${toolName}`,
        description: result.success ? 'Test passed' : 'Test failed',
        variant: result.success ? 'default' : 'destructive',
      })

      console.log(`Tool test result for ${toolName}:`, result)
    } catch (error) {
      toast({
        title: 'Tool Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const getTestParameters = (toolName: string): Record<string, any> => {
    const testParams: Record<string, Record<string, any>> = {
      get_current_time: {},
      generate_uuid: {},
      calculate_math: { expression: '2 + 2 * 3' },

      search_array: {
        data: [
          { name: 'John', city: 'NYC' },
          { name: 'Jane', city: 'LA' },
        ],
        field: 'name',
        query: 'John',
      },
      send_email: {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email from the function calling system.',
      },
      make_http_request: {
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        method: 'GET',
      },
      format_data: {
        data: [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ],
        format: 'json',
      },
    }

    return testParams[toolName] || {}
  }

  const getToolIcon = (category: string) => {
    switch (category) {
      case 'utility':
        return '🔧'
      case 'data':
        return '📊'
      case 'communication':
        return '📧'
      case 'automation':
        return '🤖'
      default:
        return '⚙️'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          Function Calling System Test
        </h1>
        <p className="text-muted-foreground">
          Test AI agents with function calling capabilities
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <ToolCaseIcon className="h-4 w-4" />
            Available Tools
          </TabsTrigger>
          <TabsTrigger value="agent" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agent Chat
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Execution History
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Available Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Tools</CardTitle>
            </CardHeader>
            <CardContent>
              {availableTools.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tools loaded yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableTools.map(tool => (
                    <div key={tool.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {getToolIcon(tool.category)}
                          </span>
                          <h3 className="font-medium">{tool.name}</h3>
                        </div>
                        <Badge variant={tool.enabled ? 'default' : 'secondary'}>
                          {tool.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {tool.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{tool.category}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testSingleTool(tool.name)}
                          disabled={!tool.enabled}
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Chat Tab */}
        <TabsContent value="agent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chat with AI Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Agent Type</label>
                <select
                  value={selectedAgent}
                  onChange={e => setSelectedAgent(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="assistant">General Assistant</option>
                  <option value="dataAnalyst">Data Analyst</option>
                  <option value="automationBot">Automation Bot</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <div className="flex gap-2">
                  <Textarea
                    value={userMessage}
                    onChange={e => setUserMessage(e.target.value)}
                    placeholder="Ask the agent to perform a task..."
                    className="flex-1"
                    rows={3}
                  />
                  <Button
                    onClick={executeAgentMessage}
                    disabled={isExecuting || !userMessage.trim()}
                    className="px-6"
                  >
                    {isExecuting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserMessage('What time is it right now?')}
                >
                  Ask Time
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserMessage('Calculate 15 * 24 + 100')}
                >
                  Math Problem
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserMessage('Generate a UUID for me')}
                >
                  Generate UUID
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setUserMessage(
                      'Send an email to john@example.com saying hello'
                    )
                  }
                >
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execution History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
            </CardHeader>
            <CardContent>
              {executionHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No executions yet. Try sending a message to the agent.
                </div>
              ) : (
                <div className="space-y-4">
                  {executionHistory.map(execution => (
                    <div key={execution.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">"{execution.message}"</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {execution.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          {execution.processingTime}ms
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-sm">{execution.response}</p>
                      </div>

                      {execution.toolCalls.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Tool Calls:</h4>
                          {execution.toolCalls.map((call, index) => (
                            <div key={index} className="bg-blue-50 rounded p-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{call.toolName}</Badge>
                                <span className="text-xs text-gray-600">
                                  {call.executionTime}ms
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t flex justify-between text-xs text-gray-600">
                        <span>Tokens: {execution.tokensUsed}</span>
                        <span>Tools: {execution.toolCalls.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Function calling system is ready with {availableTools.length}{' '}
                  tools loaded. Agents can now execute functions based on user
                  requests.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
