'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Loader2,
  RefreshCw,
  Settings,
  DollarSign,
  ScrollText
} from 'lucide-react'
import Link from 'next/link'
import { Progress } from '@radix-ui/react-progress'
import { AIAgent } from '@/lib/ai/AIAgentManager'
import { AIExecutionLogsViewer } from '@/components/ai/AIExecutionLogsViewer'

export default function AIAgentsPage() {
  const { toast } = useToast()
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'agents' | 'logs'>('agents')
  const [organizationId, setOrganizationId] = useState<string>('')

  // Load agents from API
  useEffect(() => {
    loadAgents()
    loadOrganizationId()
  }, [])

  const loadOrganizationId = async () => {
    try {
      // Get organization ID from the first agent or from API
      const response = await fetch('/api/ai-agents')
      const result = await response.json()
      if (result.data && result.data.length > 0) {
        setOrganizationId(result.data[0].organizationId || '')
      }
    } catch (error) {
      console.error('Failed to load organization ID:', error)
    }
  }

  const loadAgents = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai-agents')
      const result = await response.json()

      if (!response.ok) {
        // Handle specific errors
        if (result.error === 'Failed to get user profile') {
          console.warn('User profile not found, showing empty state')
          setAgents([])
          toast({
            title: 'Setup Required',
            description: 'Please complete your profile setup to use AI agents',
            variant: 'default'
          })
          return
        }

        if (result.error === 'No organization found') {
          console.warn('No organization found, showing empty state')
          setAgents([])
          toast({
            title: 'Organization Required',
            description: 'Please join or create an organization to use AI agents',
            variant: 'default'
          })
          return
        }

        throw new Error(result.error || 'Failed to load agents')
      }

      setAgents(result.data || [])

      // Show message if no organization but request succeeded
      if (result.message && result.data.length === 0) {
        toast({
          title: 'Info',
          description: result.message,
          variant: 'default'
        })
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load AI agents',
        variant: 'destructive'
      })
      // Set empty array on error to prevent infinite loading
      setAgents([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/ai-agents/${agentId}/toggle`, {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to toggle agent')
      }
      
      // Update local state
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, isActive: result.data.is_active }
          : agent
      ))
      
      toast({
        title: 'Success',
        description: result.message,
        variant: 'default'
      })
    } catch (error) {
      console.error('Failed to toggle agent:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to toggle agent',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    if (!confirm(`Are you sure you want to delete "${agentName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/ai-agents/${agentId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete agent')
      }
      
      // Remove from local state
      setAgents(prev => prev.filter(agent => agent.id !== agentId))
      
      toast({
        title: 'Success',
        description: result.message,
        variant: 'default'
      })
    } catch (error) {
      console.error('Failed to delete agent:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete agent',
        variant: 'destructive'
      })
    }
  }

  const handleDuplicateAgent = async (agent: AIAgent) => {
    try {
      const duplicateData = {
        name: `${agent.name} (Copy)`,
        type: agent.type,
        model: agent.model,
        system_prompt: agent.systemPrompt,
        prompt_template: agent.promptTemplate,
        parameters: agent.parameters,
        tools: agent.tools,
        knowledge_base_ids: agent.knowledgeBaseIds,
        tags: agent.tags
      }

      const response = await fetch('/api/ai-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to duplicate agent')
      }
      
      // Reload agents to get the new one
      await loadAgents()
      
      toast({
        title: 'Success',
        description: `Agent "${agent.name}" duplicated successfully`,
        variant: 'default'
      })
    } catch (error) {
      console.error('Failed to duplicate agent:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to duplicate agent',
        variant: 'destructive'
      })
    }
  }

  // Filter agents based on search and filters
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        agent.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        agent.tags?.some((tag:any) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = filterType === 'all' || agent.type === filterType
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && agent.isActive) ||
                         (filterStatus === 'inactive' && !agent.isActive)
    return matchesSearch && matchesType && matchesStatus
  })

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading AI agents...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            AI Agents
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage and monitor your intelligent AI agents</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadAgents} size="sm" className="sm:size-default">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link href="/ai-agents/compare">
            <Button variant="outline" size="sm" className="gap-2 sm:size-default">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Compare Models</span>
              <span className="sm:hidden">Compare</span>
            </Button>
          </Link>
          <Link href="/ai-agents/configure">
            <Button size="sm" className="gap-2 sm:size-default">
              <Plus className="h-4 w-4" />
              Create Agent
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'agents' | 'logs')}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="agents" className="flex-1 sm:flex-initial text-sm sm:text-base">
            <Bot className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex-1 sm:flex-initial text-sm sm:text-base">
            <ScrollText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Execution Logs</span>
            <span className="sm:hidden">Logs</span>
          </TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4 sm:space-y-6">

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
              <div className="sm:ml-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-xl sm:text-2xl font-bold">{agents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Play className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              <div className="sm:ml-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active Agents</p>
                <p className="text-xl sm:text-2xl font-bold">{agents.filter(a => a.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
              <div className="sm:ml-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {agents.reduce((sum, agent) => sum + (agent.usageStats?.totalRequests || 0), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
              <div className="sm:ml-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-xl sm:text-2xl font-bold">
                  ${agents.reduce((sum, agent) => sum + (agent.usageStats?.totalCost || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-col lg:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Filter dropdowns - keeping same as before */}
          </div>
        </CardContent>
      </Card>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-white flex-shrink-0 ${
                    agent.type === 'conversational' ? 'bg-blue-500' :
                    agent.type === 'analytical' ? 'bg-purple-500' :
                    agent.type === 'task' ? 'bg-green-500' : 'bg-orange-500'
                  }`}>
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg truncate">{agent.name}</CardTitle>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {agent.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs truncate max-w-[120px]">
                        {agent.model}
                      </Badge>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/ai-agents/${agent.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/ai-agents/configure?id=${agent.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Agent
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicateAgent(agent)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleAgent(agent.id!)}>
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
                      onClick={() => handleDeleteAgent(agent.id!, agent.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${agent.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {agent.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {agent.lastUsed ? `Used ${getRelativeTime(agent.lastUsed)}` : 'Never used'}
                </span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
              {agent.description && (
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
              )}

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground truncate">Quality</span>
                    <span className="flex-shrink-0">{agent.performance?.responseQuality || 85}%</span>
                  </div>
                  <Progress value={agent.performance?.responseQuality || 85} className="h-1" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground truncate">Satisfaction</span>
                    <span className="flex-shrink-0">{agent.performance?.userSatisfaction || 80}%</span>
                  </div>
                  <Progress value={agent.performance?.userSatisfaction || 80} className="h-1" />
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2 border-t">
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold">
                    {(agent.usageStats?.totalRequests || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-semibold">
                    ${(agent.usageStats?.totalCost || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">Cost</div>
                </div>
              </div>

              {/* Tags */}
              {agent.tags && agent.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {agent.tags.map((tag:any) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Tools */}
              {agent.tools && agent.tools.length > 0 && (
                <div className="flex items-center gap-2">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {agent.tools.length} tool{agent.tools.length !== 1 ? 's' : ''} enabled
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredAgents.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
            <Bot className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No agents found</h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center mb-4 max-w-md">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search criteria or filters'
                : 'Create your first AI agent to get started'
              }
            </p>
            {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
              <Link href="/ai-agents/configure">
                <Button className="gap-2" size="sm">
                  <Plus className="h-4 w-4" />
                  Create Your First Agent
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
        </TabsContent>

        {/* Execution Logs Tab */}
        <TabsContent value="logs">
          <AIExecutionLogsViewer organizationId={organizationId} />
        </TabsContent>
      </Tabs>
    </div>
  )

  // Helper function for relative time
  function getRelativeTime(date: string) {
    const now = new Date()
    const then = new Date(date)
    const diffInHours = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return `${Math.floor(diffInDays / 7)}w ago`
  }
}