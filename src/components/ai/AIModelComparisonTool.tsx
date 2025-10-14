'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  Brain,
  Play,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  DollarSign,
  Target,
  CheckCircle2,
  XCircle,
  BarChart3,
  Minus,
  Download,
  Share2,
  Award,
  AlertCircle,
  Plus,
} from 'lucide-react'

interface ModelConfig {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google'
  costPer1kTokens: number
  maxTokens: number
  speed: 'fast' | 'medium' | 'slow'
}

interface ComparisonResult {
  id: string
  timestamp: Date
  model: string
  prompt: string
  response: string
  metrics: {
    duration: number
    tokensUsed: number
    cost: number
    quality: number // 0-100 score
    relevance: number // 0-100 score
    coherence: number // 0-100 score
  }
  userRating?: number // 1-5 stars
  status: 'success' | 'error'
  error?: string
}

interface ABTestResult {
  testId: string
  name: string
  startDate: Date
  endDate?: Date
  status: 'running' | 'completed' | 'paused'
  variantA: {
    name: string
    model: string
    prompt: string
    executions: number
    avgQuality: number
    avgCost: number
    avgDuration: number
    winRate: number
  }
  variantB: {
    name: string
    model: string
    prompt: string
    executions: number
    avgQuality: number
    avgCost: number
    avgDuration: number
    winRate: number
  }
  statisticalSignificance: number // 0-100
  winner?: 'A' | 'B' | 'tie'
}

const MODELS: ModelConfig[] = [
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    costPer1kTokens: 0.01,
    maxTokens: 4096,
    speed: 'medium',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    costPer1kTokens: 0.002,
    maxTokens: 4096,
    speed: 'fast',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    costPer1kTokens: 0.015,
    maxTokens: 4096,
    speed: 'slow',
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    costPer1kTokens: 0.003,
    maxTokens: 4096,
    speed: 'medium',
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    costPer1kTokens: 0.0005,
    maxTokens: 2048,
    speed: 'fast',
  },
]

export function AIModelComparisonTool() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'compare' | 'ab-test' | 'history'>('compare')

  // Model Comparison State
  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt-4-turbo', 'claude-3-sonnet'])
  const [testPrompt, setTestPrompt] = useState('')
  const [testInput, setTestInput] = useState('')
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([])
  const [isComparing, setIsComparing] = useState(false)

  // A/B Testing State
  const [abTests, setAbTests] = useState<ABTestResult[]>([
    {
      testId: 'test_1',
      name: 'Customer Support Response Quality',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'running',
      variantA: {
        name: 'GPT-4 Friendly',
        model: 'gpt-4-turbo',
        prompt: 'You are a friendly customer support agent...',
        executions: 145,
        avgQuality: 87,
        avgCost: 0.032,
        avgDuration: 2100,
        winRate: 52,
      },
      variantB: {
        name: 'Claude Professional',
        model: 'claude-3-sonnet',
        prompt: 'You are a professional customer support specialist...',
        executions: 143,
        avgQuality: 85,
        avgCost: 0.018,
        avgDuration: 1800,
        winRate: 48,
      },
      statisticalSignificance: 68,
    },
    {
      testId: 'test_2',
      name: 'Content Generation Speed vs Quality',
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'completed',
      variantA: {
        name: 'GPT-3.5 Fast',
        model: 'gpt-3.5-turbo',
        prompt: 'Generate concise marketing copy...',
        executions: 500,
        avgQuality: 78,
        avgCost: 0.008,
        avgDuration: 850,
        winRate: 35,
      },
      variantB: {
        name: 'GPT-4 Quality',
        model: 'gpt-4-turbo',
        prompt: 'Generate compelling marketing copy...',
        executions: 500,
        avgQuality: 92,
        avgCost: 0.035,
        avgDuration: 2200,
        winRate: 65,
      },
      statisticalSignificance: 95,
      winner: 'B',
    },
  ])

  const handleRunComparison = async () => {
    if (!testPrompt || selectedModels.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select models and enter a test prompt',
        variant: 'destructive',
      })
      return
    }

    setIsComparing(true)

    try {
      // Simulate comparison for each model
      const results: ComparisonResult[] = []

      for (const modelId of selectedModels) {
        const model = MODELS.find(m => m.id === modelId)!
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

        const result: ComparisonResult = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          model: model.name,
          prompt: testPrompt,
          response: `This is a simulated response from ${model.name}. In a real implementation, this would be the actual AI response. The response demonstrates ${model.name}'s capabilities in handling the given prompt with varying levels of detail and accuracy.`,
          metrics: {
            duration: Math.floor(Math.random() * 3000) + (model.speed === 'fast' ? 500 : model.speed === 'medium' ? 1500 : 2500),
            tokensUsed: Math.floor(Math.random() * 500) + 200,
            cost: (Math.floor(Math.random() * 500) + 200) / 1000 * model.costPer1kTokens,
            quality: Math.floor(Math.random() * 30) + 70,
            relevance: Math.floor(Math.random() * 30) + 70,
            coherence: Math.floor(Math.random() * 30) + 70,
          },
          status: Math.random() > 0.9 ? 'error' : 'success',
          error: Math.random() > 0.9 ? 'Model timeout or rate limit exceeded' : undefined,
        }

        results.push(result)
      }

      setComparisonResults(results)

      toast({
        title: 'Comparison Complete',
        description: `Tested ${selectedModels.length} models successfully`,
      })
    } catch (error) {
      toast({
        title: 'Comparison Failed',
        description: 'An error occurred during model comparison',
        variant: 'destructive',
      })
    } finally {
      setIsComparing(false)
    }
  }

  const getBestModel = () => {
    if (comparisonResults.length === 0) return null

    const successResults = comparisonResults.filter(r => r.status === 'success')
    if (successResults.length === 0) return null

    return successResults.reduce((best, current) => {
      const bestScore = (best.metrics.quality + best.metrics.relevance + best.metrics.coherence) / 3
      const currentScore = (current.metrics.quality + current.metrics.relevance + current.metrics.coherence) / 3
      return currentScore > bestScore ? current : best
    })
  }

  const getMostCostEffective = () => {
    if (comparisonResults.length === 0) return null

    const successResults = comparisonResults.filter(r => r.status === 'success')
    if (successResults.length === 0) return null

    return successResults.reduce((best, current) => {
      const bestEfficiency = (best.metrics.quality / best.metrics.cost)
      const currentEfficiency = (current.metrics.quality / current.metrics.cost)
      return currentEfficiency > bestEfficiency ? current : best
    })
  }

  const getFastestModel = () => {
    if (comparisonResults.length === 0) return null

    const successResults = comparisonResults.filter(r => r.status === 'success')
    if (successResults.length === 0) return null

    return successResults.reduce((fastest, current) =>
      current.metrics.duration < fastest.metrics.duration ? current : fastest
    )
  }

  const getMetricIcon = (value: number, baseline: number, higherIsBetter: boolean = true) => {
    const threshold = baseline * 0.1
    if (higherIsBetter) {
      if (value > baseline + threshold) return <TrendingUp className="h-4 w-4 text-green-600" />
      if (value < baseline - threshold) return <TrendingDown className="h-4 w-4 text-red-600" />
    } else {
      if (value < baseline - threshold) return <TrendingUp className="h-4 w-4 text-green-600" />
      if (value > baseline + threshold) return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const exportComparison = () => {
    const csv = [
      ['Model', 'Quality', 'Relevance', 'Coherence', 'Duration (ms)', 'Tokens', 'Cost', 'Status'].join(','),
      ...comparisonResults.map(r =>
        [
          r.model,
          r.metrics.quality,
          r.metrics.relevance,
          r.metrics.coherence,
          r.metrics.duration,
          r.metrics.tokensUsed,
          r.metrics.cost.toFixed(4),
          r.status,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `model-comparison-${new Date().toISOString()}.csv`
    a.click()
  }

  const bestModel = getBestModel()
  const mostCostEffective = getMostCostEffective()
  const fastestModel = getFastestModel()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Model Comparison & Testing</h2>
          <p className="text-muted-foreground">
            Compare models and run A/B tests to optimize performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportComparison} disabled={comparisonResults.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compare">
            <BarChart3 className="mr-2 h-4 w-4" />
            Model Comparison
          </TabsTrigger>
          <TabsTrigger value="ab-test">
            <Target className="mr-2 h-4 w-4" />
            A/B Testing
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Model Comparison Tab */}
        <TabsContent value="compare" className="space-y-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
              <CardDescription>Select models and enter a prompt to compare</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Model Selection */}
              <div>
                <Label>Select Models to Compare (up to 5)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        if (selectedModels.includes(model.id)) {
                          setSelectedModels(selectedModels.filter(m => m !== model.id))
                        } else if (selectedModels.length < 5) {
                          setSelectedModels([...selectedModels, model.id])
                        }
                      }}
                      className={`
                        p-3 rounded-lg border-2 transition-all text-left
                        ${selectedModels.includes(model.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{model.name}</span>
                        {selectedModels.includes(model.id) && (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs capitalize">
                          {model.speed}
                        </Badge>
                        <span>${model.costPer1kTokens}/1K</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Prompt */}
              <div>
                <Label>Test Prompt</Label>
                <Textarea
                  placeholder="Enter the prompt you want to test across models..."
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              {/* Test Input (Optional) */}
              <div>
                <Label>Test Input (Optional)</Label>
                <Textarea
                  placeholder="Enter sample input data for the prompt..."
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              {/* Run Button */}
              <Button
                onClick={handleRunComparison}
                disabled={isComparing || selectedModels.length === 0 || !testPrompt}
                className="w-full"
              >
                {isComparing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Comparing Models...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Comparison
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {comparisonResults.length > 0 && (
            <>
              {/* Winner Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bestModel && (
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-900">Best Quality</span>
                      </div>
                      <p className="text-lg font-bold text-green-900">{bestModel.model}</p>
                      <p className="text-sm text-green-700 mt-1">
                        {((bestModel.metrics.quality + bestModel.metrics.relevance + bestModel.metrics.coherence) / 3).toFixed(1)}% avg score
                      </p>
                    </CardContent>
                  </Card>
                )}

                {mostCostEffective && (
                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-900">Most Cost-Effective</span>
                      </div>
                      <p className="text-lg font-bold text-blue-900">{mostCostEffective.model}</p>
                      <p className="text-sm text-blue-700 mt-1">
                        {(mostCostEffective.metrics.quality / mostCostEffective.metrics.cost).toFixed(0)} quality per $
                      </p>
                    </CardContent>
                  </Card>
                )}

                {fastestModel && (
                  <Card className="border-2 border-purple-200 bg-purple-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-purple-900">Fastest</span>
                      </div>
                      <p className="text-lg font-bold text-purple-900">{fastestModel.model}</p>
                      <p className="text-sm text-purple-700 mt-1">
                        {(fastestModel.metrics.duration / 1000).toFixed(2)}s response time
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Detailed Results Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Comparison Results</CardTitle>
                  <CardDescription>
                    Showing results for {comparisonResults.length} models
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Quality</TableHead>
                          <TableHead>Relevance</TableHead>
                          <TableHead>Coherence</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Tokens</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparisonResults.map((result) => {
                          const avgQuality = comparisonResults.reduce((sum, r) => sum + r.metrics.quality, 0) / comparisonResults.length
                          const avgDuration = comparisonResults.reduce((sum, r) => sum + r.metrics.duration, 0) / comparisonResults.length
                          const avgCost = comparisonResults.reduce((sum, r) => sum + r.metrics.cost, 0) / comparisonResults.length

                          return (
                            <TableRow key={result.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{result.model}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(result.timestamp).toLocaleTimeString()}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {result.status === 'success' ? (
                                  <Badge variant="default">Success</Badge>
                                ) : (
                                  <Badge variant="destructive">Failed</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getMetricIcon(result.metrics.quality, avgQuality)}
                                  <span className="font-mono">{result.metrics.quality}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono">{result.metrics.relevance}%</span>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono">{result.metrics.coherence}%</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getMetricIcon(result.metrics.duration, avgDuration, false)}
                                  <span className="font-mono">{result.metrics.duration}ms</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono">{result.metrics.tokensUsed}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getMetricIcon(result.metrics.cost, avgCost, false)}
                                  <span className="font-mono">${result.metrics.cost.toFixed(4)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>{result.model} Response</DialogTitle>
                                      <DialogDescription>
                                        Executed at {new Date(result.timestamp).toLocaleString()}
                                      </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-sm font-medium">Prompt</Label>
                                        <pre className="mt-2 p-3 bg-muted rounded-lg text-xs whitespace-pre-wrap">
                                          {result.prompt}
                                        </pre>
                                      </div>

                                      <div>
                                        <Label className="text-sm font-medium">Response</Label>
                                        <pre className="mt-2 p-3 bg-muted rounded-lg text-xs whitespace-pre-wrap">
                                          {result.response}
                                        </pre>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                        <div>
                                          <p className="text-sm font-medium">Quality Score</p>
                                          <p className="text-2xl font-bold">{result.metrics.quality}%</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">Duration</p>
                                          <p className="text-2xl font-bold">{result.metrics.duration}ms</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">Tokens Used</p>
                                          <p className="text-2xl font-bold">{result.metrics.tokensUsed}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium">Cost</p>
                                          <p className="text-2xl font-bold">${result.metrics.cost.toFixed(4)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="ab-test" className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Run A/B tests to compare prompt variations and models in production
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New A/B Test
            </Button>
          </div>

          <div className="space-y-4">
            {abTests.map((test) => (
              <Card key={test.testId}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{test.name}</CardTitle>
                      <CardDescription>
                        Started {test.startDate.toLocaleDateString()}
                        {test.endDate && ` • Ended ${test.endDate.toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                    <Badge variant={test.status === 'running' ? 'default' : test.status === 'completed' ? 'secondary' : 'outline'}>
                      {test.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Variants Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Variant A */}
                      <div className={`
                        p-4 rounded-lg border-2
                        ${test.winner === 'A' ? 'border-green-500 bg-green-50' : 'border-border'}
                      `}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">Variant A: {test.variantA.name}</h4>
                          {test.winner === 'A' && (
                            <Award className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Model:</span>
                            <Badge variant="outline">{test.variantA.model}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Executions:</span>
                            <span className="font-medium">{test.variantA.executions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Quality:</span>
                            <span className="font-medium">{test.variantA.avgQuality}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Cost:</span>
                            <span className="font-medium">${test.variantA.avgCost.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Duration:</span>
                            <span className="font-medium">{test.variantA.avgDuration}ms</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-muted-foreground">Win Rate:</span>
                            <span className="font-bold text-lg">{test.variantA.winRate}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Variant B */}
                      <div className={`
                        p-4 rounded-lg border-2
                        ${test.winner === 'B' ? 'border-green-500 bg-green-50' : 'border-border'}
                      `}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">Variant B: {test.variantB.name}</h4>
                          {test.winner === 'B' && (
                            <Award className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Model:</span>
                            <Badge variant="outline">{test.variantB.model}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Executions:</span>
                            <span className="font-medium">{test.variantB.executions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Quality:</span>
                            <span className="font-medium">{test.variantB.avgQuality}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Cost:</span>
                            <span className="font-medium">${test.variantB.avgCost.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Avg Duration:</span>
                            <span className="font-medium">{test.variantB.avgDuration}ms</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-muted-foreground">Win Rate:</span>
                            <span className="font-bold text-lg">{test.variantB.winRate}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistical Significance */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Statistical Significance</Label>
                        <span className="text-sm font-mono">{test.statisticalSignificance}%</span>
                      </div>
                      <Progress value={test.statisticalSignificance} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {test.statisticalSignificance >= 95 ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Results are statistically significant
                          </span>
                        ) : test.statisticalSignificance >= 80 ? (
                          <span className="text-yellow-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Approaching statistical significance
                          </span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            More data needed for statistical significance
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Winner Declaration */}
                    {test.winner && test.status === 'completed' && (
                      <Alert className="border-green-200 bg-green-50">
                        <Award className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          <strong>Winner: Variant {test.winner}</strong>
                          {' - '}
                          {test.winner === 'A' ? test.variantA.name : test.variantB.name}
                          {' '}
                          outperformed with {test.winner === 'A' ? test.variantA.winRate : test.variantB.winRate}% win rate
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t">
                      {test.status === 'running' && (
                        <>
                          <Button variant="outline" size="sm">
                            Pause Test
                          </Button>
                          <Button variant="outline" size="sm">
                            End Test
                          </Button>
                        </>
                      )}
                      {test.status === 'completed' && test.winner && (
                        <Button size="sm">
                          Deploy Winner to Production
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Export Results
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparison History</CardTitle>
              <CardDescription>
                View past model comparisons and A/B test results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No historical comparisons yet</p>
                <p className="text-xs mt-1">Run model comparisons to see history here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}