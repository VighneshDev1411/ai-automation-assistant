// AI Agents Management & Listing Page
// src/app/(dashboard)/ai-agents/page.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Bot, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Play,
  Pause,
  Eye,
  TrendingUp,
  Zap,
  MessageSquare,
  Database,
  Cpu,
  Clock,
  DollarSign,
  Shield,
  Star,
  Settings
} from 'lucide-react'
import Link from 'next/link'

interface AIAgent {
  id: string
  name: string
  type: 'conversational' | 'analytical' | 'task' | 'custom'
  model: string
  description?: string
  isActive: boolean
  createdAt: string
  lastUsed?: string
  usage: {
    totalRequests: number
    totalTokens: number
    totalCost: number
    averageLatency: number
    successRate: number
  }
  performance: {
    responseQuality: number
    userSatisfaction: number
    efficiency: number
  }
  tags: string[]
  tools: string[]
}

// Mock data for demonstration
const mockAgents: AIAgent[] = [
  {
    id: '1',
    name: 'Customer Support Assistant',
    type: 'conversational',
    model: 'gpt-4-turbo',
    description: 'Handles customer inquiries with empathy and accuracy',
    isActive: true,
    createdAt: '2024-01-15T10:30:00Z',
    lastUsed: '2024-01-20T14:45:00Z',
    usage: {
      totalRequests: 1247,
      totalTokens: 89340,
      totalCost: 12.45,
      averageLatency: 850,
      successRate: 94.2
    },
    performance: {
      responseQuality: 92,
      userSatisfaction: 88,
      efficiency: 91
    },
    tags: ['customer-service', 'support', 'chat'],
    tools: ['search_knowledge_base', 'send_notification', 'execute_workflow']
  },
  {
    id: '2',
    name: 'Data Analysis Expert',
    type: 'analytical',
    model: 'claude-3-opus',
    description: 'Analyzes complex datasets and provides actionable insights',
    isActive: true,
    createdAt: '2024-01-12T09:15:00Z',
    lastUsed: '2024-01-19T16:20:00Z',
    usage: {
      totalRequests: 523,
      totalTokens: 156720,
      totalCost: 23.78,
      averageLatency: 1250,
      successRate: 97.8
    },
    performance: {
      responseQuality: 96,
      userSatisfaction: 93,
      efficiency: 89
    },
    tags: ['analytics', 'data', 'insights'],
    tools: ['database_query', 'web_search', 'execute_workflow']
  },
  {
    id: '3',
    name: 'Content Creator Pro',
    type: 'task',
    model: 'gpt-4',
    description: 'Creates engaging content for marketing and social media',
    isActive: false,
    createdAt: '2024-01-10T11:45:00Z',
    lastUsed: '2024-01-18T13:30:00Z',
    usage: {
      totalRequests: 789,
      totalTokens: 234560,
      totalCost: 18.67,
      averageLatency: 950,
      successRate: 91.5
    },
    performance: {
      responseQuality: 89,
      userSatisfaction: 85,
      efficiency: 87
    },
    tags: ['content', 'marketing', 'creative'],
    tools: ['web_search', 'send_notification']
  },
  {
    id: '4',
    name: 'Code Review Assistant',
    type: 'custom',
    model: 'claude-3-sonnet',
    description: 'Reviews code for best practices and potential issues',
    isActive: true,
    createdAt: '2024-01-08T14:20:00Z',
    lastUsed: '2024-01-20T10:15:00Z',
    usage: {
      totalRequests: 432,
      totalTokens: 67890,
      totalCost: 8.94,
      averageLatency: 720,
      successRate: 98.1
    },
    performance: {
      responseQuality: 95,
      userSatisfaction: 91,
      efficiency: 94
    },
    tags: ['development', 'code-review', 'quality'],
    tools: ['database_query', 'execute_workflow']
  }
]

const AGENT_TYPES = {
  conversational: { icon: MessageSquare, label: 'Conversational', color: 'bg-blue-500' },
  analytical: { icon: Database, label: 'Analytical', color: 'bg-purple-500' },
  task: { icon: Cpu, label: 'Task', color: 'bg-green-500' },
  custom: { icon: Settings, label: 'Custom', color: 'bg-orange-500' }
}

const AI_MODELS = {
  'gpt-4-turbo': { name: 'GPT-4 Turbo', provider: 'OpenAI', color: 'bg-emerald-100 text-emerald-800' },
  'gpt-4': { name: 'GPT-4', provider: 'OpenAI', color: 'bg-emerald-100 text-emerald-800' },
  'claude-3-opus': { name: 'Claude 3 Opus', provider: 'Anthropic', color: 'bg-violet-100 text-violet-800' },
  'claude-3-sonnet': { name: 'Claude 3 Sonnet', provider: 'Anthropic', color: 'bg-violet-100 text-violet-800' }
}

export default function AIAgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>(mockAgents)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('lastUsed')

  // Filter and sort agents
  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesType = filterType === 'all' || agent.type === filterType
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && agent.isActive) ||
                           (filterStatus === 'inactive' && !agent.isActive)
      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'lastUsed':
          return new Date(b.lastUsed || 0).getTime() - new Date(a.lastUsed || 0).getTime()
        case 'performance':
          return b.performance.responseQuality - a.performance.responseQuality
        case 'usage':
          return b.usage.totalRequests - a.usage.totalRequests
        default:
          return 0
      }
    })

  const handleToggleAgent = (agentId: string) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, isActive: !agent.isActive } : agent
    ))
  }

  const handleDeleteAgent = (agentId: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      setAgents(prev => prev.filter(agent => agent.id !== agentId))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const getAgentTypeInfo = (type: string) => {
    return AGENT_TYPES[type as keyof typeof AGENT_TYPES] || AGENT_TYPES.custom
  }

  const getModelInfo = (model: string) => {
    return AI_MODELS[model as keyof typeof AI_MODELS] || { 
      name: model, 
      provider: 'Unknown', 
      color: 'bg-gray-100 text-gray-800' 
    }
  }

  const getRelativeTime = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diffInHours = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return `${Math.floor(diffInDays / 7)}w ago`
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" />
            AI Agents
          </h1>
          <p className="text-muted-foreground">Manage and monitor your intelligent AI agents</p>
        </div>
        <Link href="/ai-agents/configure">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Agent
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bot className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{agents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Agents</p>
                <p className="text-2xl font-bold">{agents.filter(a => a.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">
                  {formatNumber(agents.reduce((sum, agent) => sum + agent.usage.totalRequests, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(agents.reduce((sum, agent) => sum + agent.usage.totalCost, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Type: {filterType === 'all' ? 'All' : getAgentTypeInfo(filterType).label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterType('all')}>
                    All Types
                  </DropdownMenuItem>
                  {Object.entries(AGENT_TYPES).map(([type, info]) => (
                    <DropdownMenuItem key={type} onClick={() => setFilterType(type)}>
                      <info.icon className="h-4 w-4 mr-2" />
                      {info.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Status: {filterStatus === 'all' ? 'All' : filterStatus === 'active' ? 'Active' : 'Inactive'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterStatus('all')}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('active')}>Active</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('inactive')}>Inactive</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Sort by: {sortBy}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy('lastUsed')}>Last Used</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('performance')}>Performance</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('usage')}>Usage</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => {
          const typeInfo = getAgentTypeInfo(agent.type)
          const modelInfo = getModelInfo(agent.model)
          
          return (
            <Card key={agent.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-10 w-10 ${typeInfo.color}`}>
                      <AvatarFallback className="text-white">
                        <typeInfo.icon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {typeInfo.label}
                        </Badge>
                        <Badge className={`text-xs ${modelInfo.color}`}>
                          {modelInfo.name}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Agent
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggleAgent(agent.id)}
                      >
                        {agent.isActive ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteAgent(agent.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${agent.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-muted-foreground">
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {agent.lastUsed ? `Used ${getRelativeTime(agent.lastUsed)}` : 'Never used'}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {agent.description && (
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                )}

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Quality</span>
                      <span>{agent.performance.responseQuality}%</span>
                    </div>
                    <Progress value={agent.performance.responseQuality} className="h-1" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">Satisfaction</span>
                      <span>{agent.performance.userSatisfaction}%</span>
                    </div>
                    <Progress value={agent.performance.userSatisfaction} className="h-1" />
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{formatNumber(agent.usage.totalRequests)}</div>
                    <div className="text-xs text-muted-foreground">Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{formatCurrency(agent.usage.totalCost)}</div>
                    <div className="text-xs text-muted-foreground">Cost</div>
                  </div>
                </div>

                {/* Tags */}
                {agent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {agent.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Tools */}
                {agent.tools.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {agent.tools.length} tool{agent.tools.length !== 1 ? 's' : ''} enabled
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No agents found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'Create your first AI agent to get started'
              }
            </p>
            {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
              <Link href="/ai-agents/configure">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Agent
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}