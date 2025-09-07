// Day 13: AI Agent Configuration Interface
// src/app/components/ai/AIAgentConfiguration.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
// import 
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Settings, 
  Zap, 
  DollarSign, 
  Clock, 
  Shield, 
  TestTube,
  Sparkles,
  Bot,
  MessageSquare,
  Code,
  Database,
  Cpu
} from 'lucide-react'

interface AIModel {
  id: string
  name: string
  provider: string
  type: string
  maxTokens: number
  inputCostPer1K: number
  outputCostPer1K: number
  capabilities: string[]
  contextWindow: number
}

interface AIAgent {
  id?: string
  name: string
  type: 'conversational' | 'analytical' | 'task' | 'custom'
  model: string
  systemPrompt: string
  promptTemplate?: string
  parameters: {
    temperature: number
    maxTokens: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
  }
  tools: string[]
  knowledgeBaseIds: string[]
  isActive: boolean
}

const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    type: 'chat',
    maxTokens: 4096,
    inputCostPer1K: 0.01,
    outputCostPer1K: 0.03,
    capabilities: ['text', 'reasoning', 'code', 'analysis'],
    contextWindow: 128000
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    type: 'chat',
    maxTokens: 4096,
    inputCostPer1K: 0.03,
    outputCostPer1K: 0.06,
    capabilities: ['text', 'reasoning', 'code', 'analysis'],
    contextWindow: 8192
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    type: 'chat',
    maxTokens: 4096,
    inputCostPer1K: 0.015,
    outputCostPer1K: 0.075,
    capabilities: ['text', 'reasoning', 'analysis', 'writing'],
    contextWindow: 200000
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    type: 'chat',
    maxTokens: 4096,
    inputCostPer1K: 0.003,
    outputCostPer1K: 0.015,
    capabilities: ['text', 'reasoning', 'analysis'],
    contextWindow: 200000
  }
]

const AVAILABLE_TOOLS = [
  { id: 'get_current_time', name: 'Current Time', description: 'Get current date and time' },
  { id: 'search_knowledge_base', name: 'Knowledge Search', description: 'Search organization knowledge base' },
  { id: 'execute_workflow', name: 'Execute Workflow', description: 'Run another workflow' },
  { id: 'send_notification', name: 'Send Notification', description: 'Send notifications to users' },
  { id: 'web_search', name: 'Web Search', description: 'Search the internet for information' },
  { id: 'database_query', name: 'Database Query', description: 'Query organization databases' }
]

const PROMPT_TEMPLATES = [
  {
    id: 'data-analyst',
    name: 'Data Analysis Assistant',
    description: 'Analyze data and provide insights',
    category: 'Analytics'
  },
  {
    id: 'content-generator',
    name: 'Content Generation Assistant',
    description: 'Generate various types of content',
    category: 'Content'
  },
  {
    id: 'customer-support',
    name: 'Customer Support Assistant',
    description: 'Handle customer support inquiries',
    category: 'Support'
  }
]

export default function AIAgentConfiguration() {
  const [agent, setAgent] = useState<AIAgent>({
    name: '',
    type: 'conversational',
    model: 'gpt-4-turbo',
    systemPrompt: '',
    promptTemplate: '',
    parameters: {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0
    },
    tools: [],
    knowledgeBaseIds: [],
    isActive: true
  })

  const [testPrompt, setTestPrompt] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [costEstimate, setCostEstimate] = useState<any>(null)
  const [validationResult, setValidationResult] = useState<any>(null)

  const selectedModel = AI_MODELS.find(m => m.id === agent.model)

  // Calculate cost estimate when parameters change
  useEffect(() => {
    if (testPrompt && selectedModel) {
      const inputTokens = Math.ceil(testPrompt.length / 4)
      const outputTokens = agent.parameters.maxTokens
      const inputCost = (inputTokens / 1000) * selectedModel.inputCostPer1K
      const outputCost = (outputTokens / 1000) * selectedModel.outputCostPer1K
      const totalCost = inputCost + outputCost

      setCostEstimate({
        inputTokens,
        outputTokens,
        inputCost: inputCost.toFixed(4),
        outputCost: outputCost.toFixed(4),
        totalCost: totalCost.toFixed(4),
        costLevel: totalCost > 0.1 ? 'high' : totalCost > 0.01 ? 'medium' : 'low'
      })
    }
  }, [testPrompt, agent.parameters.maxTokens, selectedModel])

  const handleParameterChange = (param: string, value: number) => {
    setAgent(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [param]: value
      }
    }))
  }

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    setAgent(prev => ({
      ...prev,
      tools: enabled 
        ? [...prev.tools, toolId]
        : prev.tools.filter(id => id !== toolId)
    }))
  }

  const testAgent = async () => {
    if (!testPrompt) return

    setTestLoading(true)
    try {
      // Simulate AI response for demo
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockResponse = `This is a simulated response from ${selectedModel?.name} for the prompt: "${testPrompt.substring(0, 50)}..."\n\nThe agent would process this request using the configured parameters:\n- Temperature: ${agent.parameters.temperature}\n- Max Tokens: ${agent.parameters.maxTokens}\n- Model: ${agent.model}`
      
      setTestResponse(mockResponse)
      
      // Mock validation result
      setValidationResult({
        isValid: true,
        score: 95,
        violations: [],
        warnings: [],
        response: mockResponse
      })
    } catch (error) {
      console.error('Test failed:', error)
    } finally {
      setTestLoading(false)
    }
  }

  const saveAgent = async () => {
    try {
      // This would call your API to save the agent
      console.log('Saving agent:', agent)
      alert('Agent configuration saved successfully!')
    } catch (error) {
      console.error('Failed to save agent:', error)
      alert('Failed to save agent configuration')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" />
            AI Agent Configuration
          </h1>
          <p className="text-muted-foreground">Design and configure intelligent AI agents for your workflows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={testAgent} disabled={!testPrompt || testLoading}>
            <TestTube className="h-4 w-4 mr-2" />
            {testLoading ? 'Testing...' : 'Test Agent'}
          </Button>
          <Button onClick={saveAgent}>
            <Bot className="h-4 w-4 mr-2" />
            Save Agent
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">Basic Config</TabsTrigger>
          <TabsTrigger value="model">Model & Parameters</TabsTrigger>
          <TabsTrigger value="prompts">Prompts & Templates</TabsTrigger>
          <TabsTrigger value="tools">Tools & Capabilities</TabsTrigger>
          <TabsTrigger value="testing">Testing & Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Basic Configuration
              </CardTitle>
              <CardDescription>
                Configure the fundamental properties of your AI agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    placeholder="e.g., Customer Support Assistant"
                    value={agent.name}
                    onChange={(e) => setAgent(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent-type">Agent Type</Label>
                  <Select
                    value={agent.type}
                    onValueChange={(value: any) => setAgent(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversational">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Conversational - Chat and dialogue
                        </div>
                      </SelectItem>
                      <SelectItem value="analytical">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Analytical - Data analysis and insights
                        </div>
                      </SelectItem>
                      <SelectItem value="task">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4" />
                          Task - Specific task automation
                        </div>
                      </SelectItem>
                      <SelectItem value="custom">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          Custom - Custom behavior
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="agent-active"
                  checked={agent.isActive}
                  onCheckedChange={(checked) => setAgent(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="agent-active">Agent Active</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  Model Selection
                </CardTitle>
                <CardDescription>
                  Choose the AI model that best fits your needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {AI_MODELS.map((model) => (
                    <div
                      key={model.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        agent.model === model.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setAgent(prev => ({ ...prev, model: model.id }))}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">{model.provider}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            ${model.inputCostPer1K.toFixed(4)}/1K in
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ${model.outputCostPer1K.toFixed(4)}/1K out
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {model.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Context: {model.contextWindow.toLocaleString()} tokens
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Model Parameters
                </CardTitle>
                <CardDescription>
                  Fine-tune the model's behavior and output characteristics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Temperature</Label>
                      <span className="text-sm text-muted-foreground">
                        {agent.parameters.temperature}
                      </span>
                    </div>
                    <Slider
                      value={[agent.parameters.temperature]}
                      onValueChange={(value:any) => handleParameterChange('temperature', value[0])}
                      max={2}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Higher values make output more random, lower values more focused
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Max Tokens</Label>
                      <span className="text-sm text-muted-foreground">
                        {agent.parameters.maxTokens}
                      </span>
                    </div>
                    <Slider
                      value={[agent.parameters.maxTokens]}
                      onValueChange={(value:any) => handleParameterChange('maxTokens', value[0])}
                      max={selectedModel?.maxTokens || 4096}
                      min={100}
                      step={100}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum number of tokens in the response
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Top P</Label>
                      <span className="text-sm text-muted-foreground">
                        {agent.parameters.topP}
                      </span>
                    </div>
                    <Slider
                      value={[agent.parameters.topP]}
                      onValueChange={(value:any) => handleParameterChange('topP', value[0])}
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Controls diversity via nucleus sampling
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Frequency Penalty</Label>
                      <span className="text-sm text-muted-foreground">
                        {agent.parameters.frequencyPenalty}
                      </span>
                    </div>
                    <Slider
                      value={[agent.parameters.frequencyPenalty]}
                      onValueChange={(value:any) => handleParameterChange('frequencyPenalty', value[0])}
                      max={2}
                      min={-2}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Reduces repetition of frequently used tokens
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Presence Penalty</Label>
                      <span className="text-sm text-muted-foreground">
                        {agent.parameters.presencePenalty}
                      </span>
                    </div>
                    <Slider
                      value={[agent.parameters.presencePenalty]}
                      onValueChange={(value:any) => handleParameterChange('presencePenalty', value[0])}
                      max={2}
                      min={-2}
                      step={0.1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Encourages talking about new topics
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  System Prompt
                </CardTitle>
                <CardDescription>
                  Define the agent's personality, role, and behavior guidelines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="You are a helpful AI assistant that..."
                  value={agent.systemPrompt}
                  onChange={(e) => setAgent(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  rows={8}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This prompt sets the foundation for how your agent behaves and responds
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Prompt Templates
                </CardTitle>
                <CardDescription>
                  Use predefined templates or create custom prompt structures
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {PROMPT_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className="p-3 border rounded-lg cursor-pointer hover:border-gray-300 transition-colors"
                      onClick={() => setAgent(prev => ({ ...prev, promptTemplate: template.id }))}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{template.name}</div>
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                        </div>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <Label htmlFor="custom-template">Custom Template</Label>
                  <Textarea
                    id="custom-template"
                    placeholder="Create your own prompt template using {{variables}}..."
                    value={agent.promptTemplate || ''}
                    onChange={(e) => setAgent(prev => ({ ...prev, promptTemplate: e.target.value }))}
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Available Tools & Capabilities
              </CardTitle>
              <CardDescription>
                Enable tools and functions that your agent can use to perform tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AVAILABLE_TOOLS.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    <Switch
                      id={tool.id}
                      checked={agent.tools.includes(tool.id)}
                      onCheckedChange={(checked) => handleToolToggle(tool.id, checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={tool.id} className="font-medium cursor-pointer">
                        {tool.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">{tool.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Your Agent
                </CardTitle>
                <CardDescription>
                  Test how your agent responds to different prompts and scenarios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="test-prompt">Test Prompt</Label>
                  <Textarea
                    id="test-prompt"
                    placeholder="Enter a test prompt to see how your agent responds..."
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                </div>

                {costEstimate && (
                  <Alert>
                    <DollarSign className="h-4 w-4" />
                    <AlertDescription>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div>Input tokens: {costEstimate.inputTokens}</div>
                          <div>Output tokens: {costEstimate.outputTokens}</div>
                        </div>
                        <div>
                          <div>Input cost: ${costEstimate.inputCost}</div>
                          <div>Output cost: ${costEstimate.outputCost}</div>
                          <div className="font-medium">Total: ${costEstimate.totalCost}</div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={testAgent} 
                  disabled={!testPrompt || testLoading}
                  className="w-full"
                >
                  {testLoading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Testing Agent...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Agent
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Response & Validation
                </CardTitle>
                <CardDescription>
                  Review the agent's response and safety validation results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {testResponse && (
                  <div>
                    <Label>Agent Response</Label>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
                      {testResponse}
                    </div>
                  </div>
                )}

                {validationResult && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Safety Score</Label>
                      <span className="text-sm font-medium">{validationResult.score}/100</span>
                    </div>
                    <Progress value={validationResult.score} className="w-full" />
                    
                    {validationResult.violations.length > 0 && (
                      <Alert variant="destructive">
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          {validationResult.violations.length} safety violations detected
                        </AlertDescription>
                      </Alert>
                    )}

                    {validationResult.warnings.length > 0 && (
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          {validationResult.warnings.length} warnings detected
                        </AlertDescription>
                      </Alert>
                    )}

                    {validationResult.isValid && (
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          Response passed all safety checks
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {!testResponse && (
                  <div className="text-center text-muted-foreground py-8">
                    Enter a test prompt and click "Test Agent" to see the response
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}