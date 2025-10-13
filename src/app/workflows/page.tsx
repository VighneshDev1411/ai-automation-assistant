'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
// import { WorkflowTemplates } from '@/components/workflow-builder/WorkflowTemplates'
import { WorkflowTemplates } from '../components/workflow-builder/WorkflowTemplates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import {
  Plus,
  Search,
  MoreVertical,
  Play,
  Edit,
  Trash2,
  Copy,
  Sparkles,
  Loader2,
  Workflow,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

function WorkflowsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  const defaultTab = searchParams.get('tab') || 'my-workflows'

  const [workflows, setWorkflows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState(defaultTab)

  useEffect(() => {
    if (activeTab === 'my-workflows') {
      loadWorkflows()
    }
  }, [activeTab])

  const loadWorkflows = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user's organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        setWorkflows([])
        setLoading(false)
        return
      }

      // Load workflows
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('organization_id', membership.organization_id)
        .order('updated_at', { ascending: false })

      if (error) throw error

      setWorkflows(data || [])
    } catch (error: any) {
      console.error('Error loading workflows:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load workflows',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFromTemplate = async (template: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user's organization
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!membership) throw new Error('No organization found')

      // Track template usage
      await fetch('/api/templates/track-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id })
      })

      // Create workflow from template
      const { data, error } = await supabase
        .from('workflows')
        .insert([
          {
            name: `${template.name} (Copy)`,
            description: template.description,
            nodes: template.config.nodes,
            edges: template.config.edges,
            organization_id: membership.organization_id,
            created_by: user.id,
            status: 'draft',
            version: 1
          }
        ])
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Workflow Created',
        description: 'Template has been added to your workflows'
      })

      router.push(`/workflow-builder?id=${data.id}`)
    } catch (error: any) {
      console.error('Error creating from template:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create workflow',
        variant: 'destructive'
      })
    }
  }

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId)

      if (error) throw error

      setWorkflows(workflows.filter(w => w.id !== workflowId))

      toast({
        title: 'Workflow Deleted',
        description: 'The workflow has been removed'
      })
    } catch (error: any) {
      console.error('Error deleting workflow:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete workflow',
        variant: 'destructive'
      })
    }
  }

  const handleDuplicateWorkflow = async (workflow: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!membership) throw new Error('No organization found')

      const { data, error } = await supabase
        .from('workflows')
        .insert([
          {
            name: `${workflow.name} (Copy)`,
            description: workflow.description,
            nodes: workflow.nodes,
            edges: workflow.edges,
            organization_id: membership.organization_id,
            created_by: user.id,
            status: 'draft',
            version: 1
          }
        ])
        .select()
        .single()

      if (error) throw error

      setWorkflows([data, ...workflows])

      toast({
        title: 'Workflow Duplicated',
        description: 'A copy has been created'
      })
    } catch (error: any) {
      console.error('Error duplicating workflow:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate workflow',
        variant: 'destructive'
      })
    }
  }

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'draft':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Workflow className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      draft: 'secondary',
      error: 'destructive'
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Manage and execute your automation workflows
          </p>
        </div>
        <Button onClick={() => router.push('/workflow-builder')}>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-workflows">
            <Workflow className="mr-2 h-4 w-4" />
            My Workflows
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Sparkles className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* My Workflows Tab */}
        <TabsContent value="my-workflows" className="mt-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Workflows Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery
                    ? 'No workflows found matching your search'
                    : 'No workflows yet. Create your first workflow to get started.'}
                </p>
                <Button onClick={() => router.push('/workflow-builder')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="hover:border-primary cursor-pointer transition-colors"
                  onClick={() => router.push(`/workflow-builder?id=${workflow.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(workflow.status)}
                          <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {workflow.description || 'No description'}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/workflow-builder?id=${workflow.id}`)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDuplicateWorkflow(workflow)
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteWorkflow(workflow.id)
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(workflow.status)}
                        <span className="text-xs text-muted-foreground">
                          v{workflow.version || 1}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/workflow-builder?id=${workflow.id}`)
                        }}
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Run
                      </Button>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground">
                      Updated {new Date(workflow.updated_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <WorkflowTemplates
            onSelectTemplate={handleCreateFromTemplate}
            onImport={(config:any) => {
              toast({
                title: 'Import',
                description: 'Workflow configuration imported'
              })
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function WorkflowsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <WorkflowsContent />
    </Suspense>
  )
}