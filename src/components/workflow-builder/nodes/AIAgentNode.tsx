'use client'

import React, { memo, useState } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AIRealTimeStatusIndicator } from '@/components/workflow-builder/AIRealTimeStatusIndicator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bot,
  Brain,
  FileText,
  Image,
  MessageSquare,
  BarChart3,
  Code,
  Zap,
  Settings,
  Play,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Target,
  Eye,
  Cpu,
  DollarSign,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// Field configuration interface
interface FieldConfig {
  key: string
  label: string
  type: 'select' | 'text' | 'textarea'
  placeholder?: string
  required?: boolean
  options?: string[]
  default?: string
}

// AI Agent types configuration
const agentTypes = {
  textAnalysis: {
    label: 'Text Analysis',
    icon: <FileText className="h-4 w-4" />,
    description: 'Analyze text for sentiment, entities, keywords, etc.',
    color: 'bg-purple-500',
    models: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet'],
    capabilities: ['sentiment', 'entities', 'keywords', 'classification', 'summarization'],
    fields: [
      { key: 'analysisType', label: 'Analysis Type', type: 'select' as const, options: ['sentiment', 'entities', 'keywords', 'classification', 'custom'], required: true },
      { key: 'inputText', label: 'Input Text Field', type: 'text' as const, placeholder: 'trigger.content', required: true },
      { key: 'customPrompt', label: 'Custom Prompt', type: 'textarea' as const, placeholder: 'Optional custom analysis prompt' },
      { key: 'outputFormat', label: 'Output Format', type: 'select' as const, options: ['json', 'text', 'structured'], default: 'json' },
    ] as FieldConfig[]
  },
  contentGeneration: {
    label: 'Content Generation',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Generate emails, documents, social posts, etc.',
    color: 'bg-blue-500',
    models: ['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku'],
    capabilities: ['email', 'document', 'social', 'marketing', 'technical'],
    fields: [
      { key: 'contentType', label: 'Content Type', type: 'select' as const, options: ['email', 'document', 'social_post', 'marketing_copy', 'technical_doc'], required: true },
      { key: 'topic', label: 'Topic/Subject', type: 'text' as const, placeholder: 'trigger.subject', required: true },
      { key: 'style', label: 'Writing Style', type: 'select' as const, options: ['professional', 'casual', 'formal', 'creative', 'technical'], default: 'professional' },
      { key: 'length', label: 'Target Length', type: 'select' as const, options: ['short', 'medium', 'long'], default: 'medium' },
      { key: 'customInstructions', label: 'Custom Instructions', type: 'textarea' as const, placeholder: 'Additional instructions for content generation' },
    ] as FieldConfig[]
  },
  imageAnalysis: {
    label: 'Image Analysis',
    icon: <Image className="h-4 w-4" />,
    description: 'Analyze images using AI vision models',
    color: 'bg-green-500',
    models: ['gpt-4-vision', 'claude-3-sonnet'],
    capabilities: ['description', 'ocr', 'objects', 'faces', 'text_extraction'],
    fields: [
      { key: 'imageSource', label: 'Image Source', type: 'text' as const, placeholder: 'trigger.image_url', required: true },
      { key: 'analysisType', label: 'Analysis Type', type: 'select' as const, options: ['description', 'ocr', 'objects', 'custom'], required: true },
      { key: 'customPrompt', label: 'Custom Analysis Prompt', type: 'textarea' as const, placeholder: 'What should I analyze in this image?' },
      { key: 'detail', label: 'Detail Level', type: 'select' as const, options: ['low', 'high'], default: 'high' },
    ] as FieldConfig[]
  },
  dataProcessing: {
    label: 'Data Processing',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Process and transform data intelligently',
    color: 'bg-orange-500',
    models: ['gpt-4', 'claude-3-sonnet'],
    capabilities: ['transformation', 'validation', 'enrichment', 'classification'],
    fields: [
      { key: 'dataSource', label: 'Data Source', type: 'text' as const, placeholder: 'trigger.data', required: true },
      { key: 'operation', label: 'Operation', type: 'select' as const, options: ['transform', 'validate', 'enrich', 'classify', 'extract'], required: true },
      { key: 'schema', label: 'Target Schema', type: 'textarea' as const, placeholder: 'Describe the desired output format' },
      { key: 'rules', label: 'Processing Rules', type: 'textarea' as const, placeholder: 'Specific rules or constraints' },
    ] as FieldConfig[]
  },
  decisionMaking: {
    label: 'Decision Making',
    icon: <Brain className="h-4 w-4" />,
    description: 'Make intelligent decisions based on data',
    color: 'bg-red-500',
    models: ['gpt-4', 'claude-3-sonnet'],
    capabilities: ['recommendation', 'approval', 'routing', 'prioritization'],
    fields: [
      { key: 'decisionType', label: 'Decision Type', type: 'select' as const, options: ['approve_reject', 'prioritize', 'categorize', 'recommend'], required: true },
      { key: 'criteria', label: 'Decision Criteria', type: 'textarea' as const, placeholder: 'What factors should influence this decision?', required: true },
      { key: 'inputData', label: 'Input Data', type: 'text' as const, placeholder: 'trigger.request', required: true },
      { key: 'options', label: 'Available Options', type: 'textarea' as const, placeholder: 'List possible decisions/outcomes' },
    ] as FieldConfig[]
  },
  codeGeneration: {
    label: 'Code Generation',
    icon: <Code className="h-4 w-4" />,
    description: 'Generate code snippets and scripts',
    color: 'bg-gray-700',
    models: ['gpt-4', 'claude-3-sonnet'],
    capabilities: ['javascript', 'python', 'sql', 'html', 'api'],
    fields: [
      { key: 'language', label: 'Programming Language', type: 'select' as const, options: ['javascript', 'python', 'sql', 'html', 'css'], required: true },
      { key: 'requirements', label: 'Requirements', type: 'textarea' as const, placeholder: 'Describe what the code should do', required: true },
      { key: 'framework', label: 'Framework/Library', type: 'text' as const, placeholder: 'Optional framework (e.g., React, FastAPI)' },
      { key: 'style', label: 'Code Style', type: 'select' as const, options: ['clean', 'commented', 'minimal'], default: 'clean' },
    ] as FieldConfig[]
  },
}

interface AIAgentNodeData {
  label: string
  agentType?: keyof typeof agentTypes
  model?: string
  config: Record<string, any>
  temperature?: number
  maxTokens?: number
  isConfigured?: boolean
  workflowExecutionId?: string
  lastExecution?: {
    timestamp: string
    tokensUsed: number
    cost: number
    duration: number
    status: 'success' | 'error'
  }
}

export const AIAgentNode = memo(({ data, selected, id }: NodeProps) => {
  const { toast } = useToast()
  const nodeData = data as unknown as AIAgentNodeData
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState(nodeData.config || {})
  const [localAgentType, setLocalAgentType] = useState<keyof typeof agentTypes>(
    nodeData.agentType || 'textAnalysis'
  )
  const [localModel, setLocalModel] = useState(nodeData.model || 'gpt-4')
  const [temperature, setTemperature] = useState(nodeData.temperature || 0.7)
  const [maxTokens, setMaxTokens] = useState(nodeData.maxTokens || 1000)

  const currentAgent = agentTypes[localAgentType]
  const isConfigured = nodeData.isConfigured || false

  // Handle configuration save
  const handleSave = () => {
    // Validate required fields
    const requiredFields = currentAgent.fields.filter(field => field.required)
    const missingFields = requiredFields.filter(field => !localConfig[field.key])

    if (missingFields.length > 0) {
      toast({
        title: "Configuration Error",
        description: `Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      })
      return
    }

    // Update node data
    nodeData.agentType = localAgentType
    nodeData.model = localModel
    nodeData.config = localConfig
    nodeData.temperature = temperature
    nodeData.maxTokens = maxTokens
    nodeData.isConfigured = true
    nodeData.label = `${currentAgent.label} (${localModel})`

    setIsConfigOpen(false)
    
    toast({
      title: "Configuration Saved",
      description: `${currentAgent.label} agent configured successfully`,
    })
  }

  // Handle field changes
  const handleFieldChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Test AI agent
  const testAgent = async () => {
    toast({
      title: "Testing AI Agent",
      description: "Running test with sample data...",
    })

    // Simulate test - in real implementation, this would call your AI agent system
    setTimeout(() => {
      const mockResult = {
        tokensUsed: Math.floor(Math.random() * 500) + 100,
        cost: (Math.random() * 0.05).toFixed(4),
        duration: Math.floor(Math.random() * 3000) + 1000,
      }

      toast({
        title: "Test Successful",
        description: `Agent processed in ${mockResult.duration}ms, used ${mockResult.tokensUsed} tokens ($${mockResult.cost})`,
      })
    }, 2000)
  }

  // Get model cost estimate
  const getModelCost = (model: string) => {
    const costs = {
      'gpt-4': '$0.03/1K tokens',
      'gpt-3.5-turbo': '$0.002/1K tokens',
      'claude-3-sonnet': '$0.015/1K tokens',
      'claude-3-haiku': '$0.0025/1K tokens',
      'gpt-4-vision': '$0.01-0.04/1K tokens',
    }
    return costs[model as keyof typeof costs] || 'Variable pricing'
  }

  return (
    <>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#6366f1',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />

      <Card
        className={`w-80 transition-all duration-200 relative ${
          selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
      >
        {/* AI Real-Time Status Indicator */}
        {nodeData.workflowExecutionId && (
          <AIRealTimeStatusIndicator
            nodeId={id}
            workflowExecutionId={nodeData.workflowExecutionId}
            position="overlay"
          />
        )}

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-md ${currentAgent.color} text-white relative`}>
                {currentAgent.icon}
                <Sparkles className="h-2 w-2 absolute -top-1 -right-1 text-yellow-300" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {nodeData.agentType ? currentAgent.label : 'Configure AI Agent'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {currentAgent.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                <Bot className="h-3 w-3 mr-1" />
                AI
              </Badge>
              
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configure AI Agent</DialogTitle>
                    <DialogDescription>
                      Set up the AI agent for intelligent workflow automation
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="agent" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="agent">Agent Config</TabsTrigger>
                      <TabsTrigger value="model">Model & Parameters</TabsTrigger>
                      <TabsTrigger value="data">Data Mapping</TabsTrigger>
                      <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                    </TabsList>

                    <TabsContent value="agent" className="space-y-6">
                      {/* Agent Type Selection */}
                      <div>
                        <Label>AI Agent Type</Label>
                        <Select
                          value={localAgentType}
                          onValueChange={(value: keyof typeof agentTypes) => setLocalAgentType(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(agentTypes).map(([key, agent]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  {agent.icon}
                                  <div>
                                    <div>{agent.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {agent.description}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dynamic Configuration Fields */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Agent Configuration</h4>
                        {currentAgent.fields.map((field) => (
                          <div key={field.key}>
                            <Label>
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            
                            {field.type === 'select' && (
                              <Select
                                value={localConfig[field.key] || field.default || ''}
                                onValueChange={(value) => handleFieldChange(field.key, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options?.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option.replace('_', ' ')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {field.type === 'text' && (
                              <Input
                                placeholder={field.placeholder}
                                value={localConfig[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              />
                            )}

                            {field.type === 'textarea' && (
                              <Textarea
                                placeholder={field.placeholder}
                                value={localConfig[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                rows={3}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Capabilities */}
                      <div className="p-4 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2">Agent Capabilities</h5>
                        <div className="flex flex-wrap gap-2">
                          {currentAgent.capabilities.map((capability) => (
                            <Badge key={capability} variant="secondary" className="text-xs">
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="model" className="space-y-6">
                      {/* Model Selection */}
                      <div>
                        <Label>AI Model</Label>
                        <Select
                          value={localModel}
                          onValueChange={setLocalModel}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currentAgent.models.map((model) => (
                              <SelectItem key={model} value={model}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{model}</span>
                                  <span className="text-xs text-muted-foreground ml-4">
                                    {getModelCost(model)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Cost: {getModelCost(localModel)}
                        </p>
                      </div>

                      {/* Temperature */}
                      <div>
                        <Label>Creativity (Temperature): {temperature}</Label>
                        <Slider
                          value={[temperature]}
                          onValueChange={(value) => setTemperature(value[0])}
                          max={2}
                          min={0}
                          step={0.1}
                          className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Focused (0)</span>
                          <span>Balanced (1)</span>
                          <span>Creative (2)</span>
                        </div>
                      </div>

                      {/* Max Tokens */}
                      <div>
                        <Label>Max Output Tokens</Label>
                        <Input
                          type="number"
                          value={maxTokens}
                          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                          min={1}
                          max={4000}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Estimated cost: ${((maxTokens / 1000) * 0.03).toFixed(4)} per execution
                        </p>
                      </div>

                      {/* Advanced Settings */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Advanced Settings</h4>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={localConfig.streamResponse ?? false}
                            onCheckedChange={(checked) => handleFieldChange('streamResponse', checked)}
                          />
                          <Label>Stream Response</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={localConfig.cacheResults ?? true}
                            onCheckedChange={(checked) => handleFieldChange('cacheResults', checked)}
                          />
                          <Label>Cache Results</Label>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="data" className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Data Flow</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Configure how data flows into and out of the AI agent
                        </p>
                        
                        <div className="space-y-2 text-sm">
                          <div><strong>Input Variables:</strong></div>
                          <div><code>{'{{'} trigger.* {'}}' }</code> - Data from workflow trigger</div>
                          <div><code>{'{{'} previous.* {'}}' }</code> - Output from previous step</div>
                          <div><code>{'{{'} context.* {'}}' }</code> - Workflow context variables</div>

                          <div className="mt-4"><strong>Output Format:</strong></div>
                          <div>The AI agent will return structured data that can be used in subsequent steps</div>
                        </div>
                      </div>

                      <div>
                        <Label>Custom Input Processing</Label>
                        <Textarea
                          placeholder="Optional: Transform input data before sending to AI agent"
                          value={localConfig.inputProcessing || ''}
                          onChange={(e) => handleFieldChange('inputProcessing', e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>Output Processing</Label>
                        <Textarea
                          placeholder="Optional: Transform AI agent output before passing to next step"
                          value={localConfig.outputProcessing || ''}
                          onChange={(e) => handleFieldChange('outputProcessing', e.target.value)}
                          rows={3}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="monitoring" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Cost Tracking</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Monitor token usage and costs
                          </div>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Cpu className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">Performance</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Track response times and quality
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={localConfig.enableMonitoring ?? true}
                            onCheckedChange={(checked) => handleFieldChange('enableMonitoring', checked)}
                          />
                          <Label>Enable detailed monitoring</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={localConfig.logInputOutput ?? false}
                            onCheckedChange={(checked) => handleFieldChange('logInputOutput', checked)}
                          />
                          <Label>Log input/output for debugging</Label>
                        </div>

                        <div>
                          <Label>Cost Alert Threshold ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={localConfig.costThreshold || 1.00}
                            onChange={(e) => handleFieldChange('costThreshold', parseFloat(e.target.value))}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={testAgent}>
                      <Play className="h-4 w-4 mr-2" />
                      Test Agent
                    </Button>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave}>
                        Save Configuration
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isConfigured ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Agent configured</span>
              </div>
              
              {/* Show model info */}
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-xs">
                  {localModel}
                </Badge>
                <span className="text-muted-foreground">
                  Temp: {temperature}
                </span>
              </div>

              {/* Show last execution stats */}
              {nodeData.lastExecution && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Last run:</span>
                    <span className={nodeData.lastExecution.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                      {nodeData.lastExecution.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tokens:</span>
                    <span>{nodeData.lastExecution.tokensUsed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost:</span>
                    <span>${nodeData.lastExecution.cost}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Click settings to configure</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#8b5cf6',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />
    </>
  )
})

AIAgentNode.displayName = 'AIAgentNode'