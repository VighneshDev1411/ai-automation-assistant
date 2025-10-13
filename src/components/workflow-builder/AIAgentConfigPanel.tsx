'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Brain,
  Sparkles,
  DollarSign,
  Zap,
  Settings,
  FileText,
  Code,
  MessageSquare,
  BarChart3,
  Info,
  AlertCircle,
} from 'lucide-react'

interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google'
  costPer1kTokens: number
  maxTokens: number
  speed: 'fast' | 'medium' | 'slow'
  capabilities: string[]
}

const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    costPer1kTokens: 0.01,
    maxTokens: 4096,
    speed: 'medium',
    capabilities: ['reasoning', 'code', 'analysis', 'creative'],
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    costPer1kTokens: 0.002,
    maxTokens: 4096,
    speed: 'fast',
    capabilities: ['conversation', 'basic-reasoning'],
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    costPer1kTokens: 0.015,
    maxTokens: 4096,
    speed: 'slow',
    capabilities: ['reasoning', 'analysis', 'writing', 'research'],
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    costPer1kTokens: 0.003,
    maxTokens: 4096,
    speed: 'medium',
    capabilities: ['reasoning', 'analysis', 'balanced'],
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    costPer1kTokens: 0.0005,
    maxTokens: 2048,
    speed: 'fast',
    capabilities: ['multimodal', 'fast-inference'],
  },
]

const AGENT_TYPES = [
  {
    id: 'text_generation',
    name: 'Text Generation',
    icon: <FileText className="h-4 w-4" />,
    description: 'Generate text content from prompts',
    color: 'blue',
  },
  {
    id: 'data_analysis',
    name: 'Data Analysis',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Analyze and extract insights from data',
    color: 'green',
  },
  {
    id: 'code_generation',
    name: 'Code Generation',
    icon: <Code className="h-4 w-4" />,
    description: 'Generate code snippets and scripts',
    color: 'purple',
  },
  {
    id: 'conversation',
    name: 'Conversation',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Interactive conversational AI',
    color: 'orange',
  },
]

const PROMPT_TEMPLATES = [
  {
    id: 'summarize',
    name: 'Summarize Text',
    template: 'Please summarize the following text in {{length}} sentences:\n\n{{input}}',
    variables: ['length', 'input'],
  },
  {
    id: 'extract',
    name: 'Extract Information',
    template: 'Extract {{fields}} from the following text:\n\n{{input}}',
    variables: ['fields', 'input'],
  },
  {
    id: 'classify',
    name: 'Classify Content',
    template: 'Classify the following text into one of these categories: {{categories}}\n\nText: {{input}}',
    variables: ['categories', 'input'],
  },
  {
    id: 'custom',
    name: 'Custom Prompt',
    template: '',
    variables: [],
  },
]

interface AIAgentConfigPanelProps {
  agentId?: string
  initialConfig?: any
  onSave: (config: any) => void
  onCancel: () => void
}

export function AIAgentConfigPanel({
  agentId,
  initialConfig,
  onSave,
  onCancel,
}: AIAgentConfigPanelProps) {
  const [config, setConfig] = useState({
    agentType: initialConfig?.agentType || 'text_generation',
    model: initialConfig?.model || 'gpt-4-turbo',
    temperature: initialConfig?.temperature || 0.7,
    maxTokens: initialConfig?.maxTokens || 1000,
    topP: initialConfig?.topP || 1,
    frequencyPenalty: initialConfig?.frequencyPenalty || 0,
    presencePenalty: initialConfig?.presencePenalty || 0,
    systemPrompt: initialConfig?.systemPrompt || '',
    userPrompt: initialConfig?.userPrompt || '',
    promptTemplate: initialConfig?.promptTemplate || 'custom',
    outputFormat: initialConfig?.outputFormat || 'text',
    enableStreaming: initialConfig?.enableStreaming || false,
  })

  const selectedModel = AI_MODELS.find(m => m.id === config.model)
  const estimatedCost = selectedModel
    ? ((config.maxTokens / 1000) * selectedModel.costPer1kTokens).toFixed(4)
    : '0.00'

  const handleSave = () => {
    onSave(config)
  }

  const applyTemplate = (templateId: string) => {
    const template = PROMPT_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setConfig(prev => ({
        ...prev,
        promptTemplate: templateId,
        userPrompt: template.template,
      }))
    }
  }

  const getSpeedBadge = (speed: string) => {
    const colors = {
      fast: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      slow: 'bg-red-100 text-red-800',
    }
    return colors[speed as keyof typeof colors] || colors.medium
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          Configure AI Agent
        </h2>
        <p className="text-muted-foreground mt-1">
          Set up your AI agent's behavior and capabilities
        </p>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="prompts">Prompts</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Basic Configuration */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agent Type</CardTitle>
              <CardDescription>Choose the primary function of this agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {AGENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setConfig(prev => ({ ...prev, agentType: type.id }))}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      config.agentType === type.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {type.icon}
                      <span className="font-medium">{type.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI Model</CardTitle>
              <CardDescription>Select the AI model for this agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={config.model} onValueChange={(value) => setConfig(prev => ({ ...prev, model: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{model.name}</span>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant="outline" className={getSpeedBadge(model.speed)}>
                            {model.speed}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ${model.costPer1kTokens}/1K tokens
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedModel && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Provider:</span>
                        <span className="text-sm capitalize">{selectedModel.provider}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Max Tokens:</span>
                        <span className="text-sm">{selectedModel.maxTokens.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Estimated Cost:</span>
                        <span className="text-sm font-mono">${estimatedCost}</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium">Capabilities:</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {selectedModel.capabilities.map((cap) => (
                            <Badge key={cap} variant="secondary" className="text-xs">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Response Length</CardTitle>
              <CardDescription>Maximum tokens for the AI response</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Max Tokens</Label>
                <span className="text-sm font-mono">{config.maxTokens}</span>
              </div>
              <Slider
                value={[config.maxTokens]}
                onValueChange={(value) => setConfig(prev => ({ ...prev, maxTokens: value[0] }))}
                min={100}
                max={selectedModel?.maxTokens || 4096}
                step={100}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher values allow longer responses but increase cost
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prompts Configuration */}
        <TabsContent value="prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Prompt Templates</CardTitle>
              <CardDescription>Use pre-built templates or create your own</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={config.promptTemplate} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {config.promptTemplate !== 'custom' && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Template Variables:</p>
                      <div className="flex flex-wrap gap-2">
                        {PROMPT_TEMPLATES.find(t => t.id === config.promptTemplate)?.variables.map((variable) => (
                          <Badge key={variable} variant="outline">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">System Prompt</CardTitle>
              <CardDescription>Define the agent's role and behavior</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="You are a helpful assistant that..."
                value={config.systemPrompt}
                onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                The system prompt sets the overall personality and constraints
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">User Prompt</CardTitle>
              <CardDescription>The actual prompt sent to the AI</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Analyze the following data and provide insights..."
                value={config.userPrompt}
                onChange={(e) => setConfig(prev => ({ ...prev, userPrompt: e.target.value }))}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Use variables like {`{{trigger.data}}`} to reference workflow data
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Configuration */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Temperature</CardTitle>
              <CardDescription>Controls randomness in responses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <span className="text-sm font-mono">{config.temperature.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.temperature]}
                onValueChange={(value) => setConfig(prev => ({ ...prev, temperature: value[0] }))}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower = more focused and deterministic, Higher = more creative and varied
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top P (Nucleus Sampling)</CardTitle>
              <CardDescription>Alternative to temperature</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Top P</Label>
                <span className="text-sm font-mono">{config.topP.toFixed(2)}</span>
              </div>
              <Slider
                value={[config.topP]}
                onValueChange={(value) => setConfig(prev => ({ ...prev, topP: value[0] }))}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Recommended to use temperature OR top P, not both
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Frequency Penalty</CardTitle>
                <CardDescription className="text-xs">Reduce repetition</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">{config.frequencyPenalty.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.frequencyPenalty]}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, frequencyPenalty: value[0] }))}
                  min={-2}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Presence Penalty</CardTitle>
                <CardDescription className="text-xs">Encourage new topics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">{config.presencePenalty.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.presencePenalty]}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, presencePenalty: value[0] }))}
                  min={-2}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Output Format</CardTitle>
              <CardDescription>How the AI response should be structured</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={config.outputFormat} onValueChange={(value) => setConfig(prev => ({ ...prev, outputFormat: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Plain Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>Estimated cost per request:</span>
          <span className="font-mono font-medium text-foreground">${estimatedCost}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Settings className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  )
}