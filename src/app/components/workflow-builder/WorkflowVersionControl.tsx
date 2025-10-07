'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
  GitBranch,
  Clock,
  RotateCcw,
  GitCompare,
  Eye,
  Download,
  Tag,
  Archive,
  AlertCircle,
  CheckCircle,
  User,
  Calendar,
  FileText,
  ArrowRight,
  Plus,
  Loader2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'

interface WorkflowVersion {
  id: string
  workflow_id: string
  version: number
  config: {
    name: string
    description?: string
    nodes: any[]
    edges: any[]
    tags?: string[]
    changelog?: string
  }
  changed_by: string
  change_notes: string | null
  created_at: string
  author?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  metadata?: {
    nodesAdded?: number
    nodesRemoved?: number
    nodesModified?: number
    edgesChanged?: number
    executionCount?: number
    successRate?: number
    avgExecutionTime?: number
  }
}

interface WorkflowVersionControlProps {
  workflowId: string
  workflowName: string
  currentVersion: number
  currentConfig: any
  onRestore?: (version: WorkflowVersion) => void
  onCompare?: (version1: WorkflowVersion, version2: WorkflowVersion) => void
}

export const WorkflowVersionControl: React.FC<WorkflowVersionControlProps> = ({
  workflowId,
  workflowName,
  currentVersion,
  currentConfig,
  onRestore,
  onCompare
}) => {
  const [versions, setVersions] = useState<WorkflowVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<WorkflowVersion | null>(null)
  const [compareVersion, setCompareVersion] = useState<WorkflowVersion | null>(null)
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [newVersionData, setNewVersionData] = useState({
    name: '',
    description: '',
    tags: '',
    changelog: ''
  })
  const { toast } = useToast()
  const supabase = createClient()

  // Fetch version history from Supabase
  useEffect(() => {
    fetchVersionHistory()
  }, [workflowId])

  const fetchVersionHistory = async () => {
    try {
      setLoading(true)

      // Fetch workflow versions with author info
      const { data: versionsData, error: versionsError } = await supabase
        .from('workflow_versions')
        .select(`
          *,
          author:profiles!changed_by(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('workflow_id', workflowId)
        .order('version', { ascending: false })

      if (versionsError) throw versionsError

      // Fetch execution stats for each version
      const versionsWithStats = await Promise.all(
        (versionsData || []).map(async (version) => {
          const { data: stats } = await supabase
            .rpc('get_workflow_stats', {
              workflow_id: workflowId,
              time_range: '30 days'
            })

          return {
            ...version,
            metadata: stats || {}
          }
        })
      )

      setVersions(versionsWithStats)
    } catch (error: any) {
      console.error('Error fetching version history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load version history',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVersion = async () => {
    if (!newVersionData.name) {
      toast({
        title: 'Error',
        description: 'Version name is required',
        variant: 'destructive'
      })
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Prepare config with metadata
      const config = {
        ...currentConfig,
        name: newVersionData.name,
        description: newVersionData.description,
        tags: newVersionData.tags.split(',').map(t => t.trim()).filter(Boolean),
        changelog: newVersionData.changelog
      }

      // Create new version
      const { data, error } = await supabase
        .from('workflow_versions')
        .insert({
          workflow_id: workflowId,
          version: currentVersion + 1,
          config,
          changed_by: user.id,
          change_notes: newVersionData.changelog
        })
        .select(`
          *,
          author:profiles!changed_by(
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      // Update workflow's current version
      await supabase
        .from('workflows')
        .update({ version: currentVersion + 1 })
        .eq('id', workflowId)

      // Refresh version list
      await fetchVersionHistory()

      setIsCreatingVersion(false)
      setNewVersionData({ name: '', description: '', tags: '', changelog: '' })

      toast({
        title: 'Version Created',
        description: `Version ${currentVersion + 1} created successfully`
      })
    } catch (error: any) {
      console.error('Error creating version:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create version',
        variant: 'destructive'
      })
    }
  }

  const handleRestoreVersion = async (version: WorkflowVersion) => {
    try {
      // Update workflow with the version's config
      const { error } = await supabase
        .from('workflows')
        .update({
          trigger_config: version.config.nodes.find((n: any) => n.type === 'trigger')?.data || {},
          actions: version.config.nodes.filter((n: any) => n.type === 'action').map((n: any) => n.data),
          conditions: version.config.nodes.filter((n: any) => n.type === 'condition').map((n: any) => n.data),
          version: currentVersion + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId)

      if (error) throw error

      toast({
        title: 'Version Restored',
        description: `Restored to version ${version.version}`
      })

      onRestore?.(version)
      await fetchVersionHistory()
    } catch (error: any) {
      console.error('Error restoring version:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore version',
        variant: 'destructive'
      })
    }
  }

  const handleCompareVersions = () => {
    if (!selectedVersion || !compareVersion) {
      toast({
        title: 'Select Versions',
        description: 'Please select two versions to compare',
        variant: 'destructive'
      })
      return
    }

    onCompare?.(selectedVersion, compareVersion)
  }

  const handleExportVersion = async (version: WorkflowVersion) => {
    try {
      const exportData = {
        workflow_name: workflowName,
        version: version.version,
        exported_at: new Date().toISOString(),
        config: version.config
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${workflowName}_v${version.version}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Version Exported',
        description: `Version ${version.version} exported successfully`
      })
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export version',
        variant: 'destructive'
      })
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateChanges = (config: any) => {
    const nodes = config.nodes || []
    const edges = config.edges || []
    return {
      nodesAdded: nodes.length,
      nodesRemoved: 0,
      nodesModified: 0,
      edgesChanged: edges.length
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            Version Control
          </h2>
          <p className="text-muted-foreground mt-1">
            {versions.length} version{versions.length !== 1 ? 's' : ''} • Current: v{currentVersion}
          </p>
        </div>

        <Dialog open={isCreatingVersion} onOpenChange={setIsCreatingVersion}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Version
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Version</DialogTitle>
              <DialogDescription>
                Save the current workflow state as a new version
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Version Name *</label>
                <Input
                  placeholder="e.g., Enhanced AI Integration"
                  value={newVersionData.name}
                  onChange={(e) => setNewVersionData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe the changes in this version..."
                  value={newVersionData.description}
                  onChange={(e) => setNewVersionData(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tags</label>
                <Input
                  placeholder="production, ai-enabled, stable (comma-separated)"
                  value={newVersionData.tags}
                  onChange={(e) => setNewVersionData(prev => ({ ...prev, tags: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Changelog</label>
                <Textarea
                  placeholder="- Added feature X&#10;- Fixed bug Y&#10;- Improved performance Z"
                  value={newVersionData.changelog}
                  onChange={(e) => setNewVersionData(prev => ({ ...prev, changelog: e.target.value }))}
                  className="mt-1"
                  rows={5}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreatingVersion(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateVersion}>
                  Create Version
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">
            <Clock className="mr-2 h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="compare">
            <GitCompare className="mr-2 h-4 w-4" />
            Compare
          </TabsTrigger>
          <TabsTrigger value="tags">
            <Tag className="mr-2 h-4 w-4" />
            Tags
          </TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {versions.map((version, index) => {
                const changes = calculateChanges(version.config)
                const isCurrent = version.version === currentVersion

                return (
                  <Card 
                    key={version.id}
                    className={`relative ${isCurrent ? 'border-primary shadow-md' : ''}`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-primary">Current</Badge>
                      </div>
                    )}

                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2">
                            <span className="text-primary font-mono">v{version.version}</span>
                            <span>-</span>
                            <span>{version.config.name || 'Unnamed Version'}</span>
                          </CardTitle>
                          <CardDescription>
                            {version.config.description || version.change_notes}
                          </CardDescription>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedVersion(version)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestoreVersion(version)}
                              title="Restore this version"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleExportVersion(version)}
                            title="Export version"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="space-y-4">
                        {/* Metadata */}
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{version.author?.full_name || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(version.created_at)}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-2xl font-bold">{version.config.nodes?.length || 0}</div>
                            <div className="text-xs text-muted-foreground">Nodes</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-2xl font-bold">{version.config.edges?.length || 0}</div>
                            <div className="text-xs text-muted-foreground">Connections</div>
                          </div>
                          <div className="text-center p-3 bg-muted rounded-lg">
                            <div className="text-2xl font-bold">
                              {changes.nodesAdded + changes.nodesRemoved + changes.nodesModified}
                            </div>
                            <div className="text-xs text-muted-foreground">Changes</div>
                          </div>
                        </div>

                        {/* Tags */}
                        {version.config.tags && version.config.tags.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {version.config.tags.map((tag: string) => (
                              <Badge key={tag} variant="outline">
                                <Tag className="mr-1 h-3 w-3" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Changelog */}
                        {version.config.changelog && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              View Changelog
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-3 rounded-lg whitespace-pre-wrap">
                              {version.config.changelog}
                            </pre>
                          </details>
                        )}
                      </div>
                    </CardContent>

                    {/* Timeline connector */}
                    {index < versions.length - 1 && (
                      <div className="absolute left-1/2 -bottom-4 w-0.5 h-4 bg-border" />
                    )}
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare">
          <Card>
            <CardHeader>
              <CardTitle>Compare Versions</CardTitle>
              <CardDescription>
                Select two versions to see what changed between them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Base Version</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={selectedVersion?.id || ''}
                    onChange={(e) => setSelectedVersion(versions.find(v => v.id === e.target.value) || null)}
                  >
                    <option value="">Select version...</option>
                    {versions.map(version => (
                      <option key={version.id} value={version.id}>
                        v{version.version} - {version.config.name || 'Unnamed'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Compare With</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md"
                    value={compareVersion?.id || ''}
                    onChange={(e) => setCompareVersion(versions.find(v => v.id === e.target.value) || null)}
                  >
                    <option value="">Select version...</option>
                    {versions.map(version => (
                      <option key={version.id} value={version.id}>
                        v{version.version} - {version.config.name || 'Unnamed'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedVersion && compareVersion && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="font-bold">v{selectedVersion.version}</div>
                      <div className="text-sm text-muted-foreground">{selectedVersion.config.name}</div>
                    </div>
                    <ArrowRight className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-bold">v{compareVersion.version}</div>
                      <div className="text-sm text-muted-foreground">{compareVersion.config.name}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Nodes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {((compareVersion.config.nodes?.length || 0) - (selectedVersion.config.nodes?.length || 0)) > 0 ? '+' : ''}
                          {(compareVersion.config.nodes?.length || 0) - (selectedVersion.config.nodes?.length || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedVersion.config.nodes?.length || 0} → {compareVersion.config.nodes?.length || 0}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Connections</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {((compareVersion.config.edges?.length || 0) - (selectedVersion.config.edges?.length || 0)) > 0 ? '+' : ''}
                          {(compareVersion.config.edges?.length || 0) - (selectedVersion.config.edges?.length || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedVersion.config.edges?.length || 0} → {compareVersion.config.edges?.length || 0}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Tags</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {((compareVersion.config.tags?.length || 0) - (selectedVersion.config.tags?.length || 0))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedVersion.config.tags?.length || 0} → {compareVersion.config.tags?.length || 0}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Button className="w-full" onClick={handleCompareVersions}>
                    <GitCompare className="mr-2 h-4 w-4" />
                    View Detailed Comparison
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags">
          <Card>
            <CardHeader>
              <CardTitle>Version Tags</CardTitle>
              <CardDescription>
                Browse versions by tags and categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(new Set(versions.flatMap(v => v.config.tags || []))).map(tag => {
                  const taggedVersions = versions.filter(v => v.config.tags?.includes(tag))
                  return (
                    <div key={tag} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-base">
                          <Tag className="mr-2 h-4 w-4" />
                          {tag}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {taggedVersions.length} version{taggedVersions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {taggedVersions.map(version => (
                          <div key={version.id} className="flex items-center justify-between text-sm">
                            <span className="font-mono">v{version.version}</span>
                            <span className="text-muted-foreground">{version.config.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(version.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}