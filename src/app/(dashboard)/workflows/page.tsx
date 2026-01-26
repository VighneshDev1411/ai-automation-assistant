'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WorkflowTemplates } from '@/app/components/workflow-builder/WorkflowTemplates'
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
import { ScheduleDialog } from '@/components/workflows/ScheduleDialog'
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
  Calendar,
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
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)

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
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id, joined_at')
        .eq('user_id', user.id)

      // Filter for joined organizations and get the first one
      const membership = (memberships || []).find(m => m.joined_at !== null)

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
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id, joined_at')
        .eq('user_id', user.id)

      // Filter for joined organizations and get the first one
      const membership = (memberships || []).find(m => m.joined_at !== null)

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

      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id, joined_at')
        .eq('user_id', user.id)

      // Filter for joined organizations and get the first one
      const membership = (memberships || []).find(m => m.joined_at !== null)

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

  const handleToggleStatus = async (workflow: any) => {
    try {
      const newStatus = workflow.status === 'active' ? 'paused' : 'active'

      const { error } = await supabase
        .from('workflows')
        .update({ status: newStatus })
        .eq('id', workflow.id)

      if (error) throw error

      // Update local state
      setWorkflows(workflows.map(w =>
        w.id === workflow.id ? { ...w, status: newStatus } : w
      ))

      toast({
        title: 'Workflow Updated',
        description: `Workflow ${newStatus === 'active' ? 'activated' : 'paused'} successfully`
      })
    } catch (error: any) {
      console.error('Error toggling workflow status:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update workflow status',
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Workflows
          </h1>
          <p className="text-muted-foreground">
            Manage and execute your automation workflows
          </p>
        </div>
        <Button
          onClick={() => router.push('/workflow-builder')}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="mr-2 h-5 w-5" />
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
                  className="group hover:border-primary hover:shadow-xl cursor-pointer transition-all duration-300 overflow-hidden border-2 bg-card/50 backdrop-blur-sm"
                  onClick={() => router.push(`/workflow-builder?id=${workflow.id}`)}
                >
                  <CardHeader className="pb-3 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-colors"></div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(workflow.status)}
                          <CardTitle className="text-lg group-hover:text-primary transition-colors font-semibold">
                            {workflow.name}
                          </CardTitle>
                        </div>
                        <CardDescription className="line-clamp-2 text-sm">
                          {workflow.description || 'No description'}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
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
                              setSelectedWorkflow(workflow)
                              setScheduleDialogOpen(true)
                            }}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            Schedule
                          </DropdownMenuItem>
                          {workflow.status !== 'archived' && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleStatus(workflow)
                              }}
                            >
                              {workflow.status === 'active' ? (
                                <>
                                  <Clock className="mr-2 h-4 w-4" />
                                  Pause
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
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
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(workflow.status)}
                        <Badge variant="outline" className="text-xs">
                          v{workflow.version || 1}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/workflow-builder?id=${workflow.id}`)
                        }}
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Run
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Updated {new Date(workflow.updated_at).toLocaleDateString()}</span>
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
            onImport={(_config:any) => {
              toast({
                title: 'Import',
                description: 'Workflow configuration imported'
              })
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      {selectedWorkflow && (
        <ScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          workflowId={selectedWorkflow.id}
          workflowName={selectedWorkflow.name}
          onScheduleCreated={() => {
            toast({
              title: 'Schedule Created',
              description: `Workflow "${selectedWorkflow.name}" has been scheduled successfully`
            })
            setScheduleDialogOpen(false)
          }}
        />
      )}
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