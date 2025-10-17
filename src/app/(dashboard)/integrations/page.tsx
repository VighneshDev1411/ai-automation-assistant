'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  MessageSquare,
  Mail,
  Calendar,
  Cloud,
  Database as DatabaseIcon,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Settings as SettingsIcon,
  FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface IntegrationConfig {
  id: string
  provider: string
  name: string
  description: string
  icon: React.ElementType
  category: string
  connectUrl?: string
}

interface IntegrationStatus {
  provider: string
  status: 'connected' | 'disconnected'
  lastSync?: string
  settings?: any
}

const AVAILABLE_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'slack',
    provider: 'slack',
    name: 'Slack',
    description: 'Send messages and notifications to Slack channels',
    icon: MessageSquare,
    category: 'Communication',
  },
  {
    id: 'notion',
    provider: 'notion',
    name: 'Notion',
    description: 'Query databases and create pages in Notion workspaces',
    icon: FileText,
    category: 'Productivity',
    connectUrl: process.env.NEXT_PUBLIC_NOTION_AUTH_URL || `https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_NOTION_REDIRECT_URI || '')}`
  },
  {
    id: 'gmail',
    provider: 'google',
    name: 'Gmail',
    description: 'Send and receive emails through Gmail',
    icon: Mail,
    category: 'Email',
    connectUrl: process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL || `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || '')}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly')}&access_type=offline&prompt=consent`
  },
  {
    id: 'google-calendar',
    provider: 'google-calendar',
    name: 'Google Calendar',
    description: 'Create and manage calendar events',
    icon: Calendar,
    category: 'Productivity',
  },
  {
    id: 'google-drive',
    provider: 'google-drive',
    name: 'Google Drive',
    description: 'Access and manage files in Google Drive',
    icon: Cloud,
    category: 'Storage'
  },
  {
    id: 'airtable',
    provider: 'airtable',
    name: 'Airtable',
    description: 'Manage records in Airtable bases',
    icon: DatabaseIcon,
    category: 'Database'
  }
]

function IntegrationsPageContent() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [integrationStatuses, setIntegrationStatuses] = useState<IntegrationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingId, setConnectingId] = useState<string | null>(null)

  useEffect(() => {
    // Check for OAuth callback success/error
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'notion_connected') {
      toast({
        title: 'Notion Connected',
        description: 'Your Notion workspace has been successfully connected.',
      })
      // Clean URL
      window.history.replaceState({}, '', '/integrations')
    } else if (success === 'google_connected') {
      toast({
        title: 'Gmail Connected',
        description: 'Your Gmail account has been successfully connected.',
      })
      window.history.replaceState({}, '', '/integrations')
    } else if (error) {
      toast({
        title: 'Connection Failed',
        description: `Failed to connect integration: ${decodeURIComponent(error)}`,
        variant: 'destructive',
      })
      window.history.replaceState({}, '', '/integrations')
    }

    fetchIntegrationStatuses()
  }, [searchParams])

  const fetchIntegrationStatuses = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id, joined_at')
        .eq('user_id', user.id)

      const membership = (memberships || []).find(m => m.joined_at !== null)
      if (!membership) return

      // Fetch connected integrations
      const { data: connectedIntegrations } = await supabase
        .from('integrations')
        .select('provider, status, last_synced_at, settings')
        .eq('organization_id', membership.organization_id)

      const statuses: IntegrationStatus[] = (connectedIntegrations || []).map(int => ({
        provider: int.provider,
        status: int.status === 'connected' ? 'connected' : 'disconnected',
        lastSync: int.last_synced_at ? formatRelativeTime(int.last_synced_at) : undefined,
        settings: int.settings
      }))

      setIntegrationStatuses(statuses)
    } catch (error) {
      console.error('Failed to fetch integration statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const handleConnect = (integration: IntegrationConfig) => {
    if (integration.connectUrl) {
      setConnectingId(integration.id)
      window.location.href = integration.connectUrl
    } else {
      toast({
        title: 'Coming Soon',
        description: `${integration.name} integration is not yet available.`,
      })
    }
  }

  const handleDisconnect = async (provider: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id, joined_at')
        .eq('user_id', user.id)

      const membership = (memberships || []).find(m => m.joined_at !== null)
      if (!membership) return

      await supabase
        .from('integrations')
        .delete()
        .eq('provider', provider)
        .eq('organization_id', membership.organization_id)

      toast({
        title: 'Disconnected',
        description: 'Integration has been disconnected.',
      })

      // Refresh statuses
      fetchIntegrationStatuses()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect integration.',
        variant: 'destructive',
      })
    }
  }

  const getIntegrationStatus = (provider: string): IntegrationStatus => {
    return integrationStatuses.find(s => s.provider === provider) || {
      provider,
      status: 'disconnected'
    }
  }

  const getStatusBadge = (status: 'connected' | 'disconnected' | 'error') => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            Disconnected
          </Badge>
        )
    }
  }

  const connectedCount = integrationStatuses.filter(s => s.status === 'connected').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your favorite tools and services to automate workflows
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedCount}</div>
            <p className="text-xs text-muted-foreground">
              Active integrations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{AVAILABLE_INTEGRATIONS.length - connectedCount}</div>
            <p className="text-xs text-muted-foreground">
              Ready to connect
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{AVAILABLE_INTEGRATIONS.length}</div>
            <p className="text-xs text-muted-foreground">
              Integration options
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AVAILABLE_INTEGRATIONS.map(integration => {
          const Icon = integration.icon
          const status = getIntegrationStatus(integration.provider)
          const isConnecting = connectingId === integration.id

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {integration.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm">
                  {integration.description}
                </CardDescription>

                <div className="flex items-center justify-between">
                  {getStatusBadge(status.status)}
                  {status.lastSync && (
                    <span className="text-xs text-muted-foreground">
                      {status.lastSync}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {status.status === 'connected' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDisconnect(integration.provider)}
                      >
                        Disconnect
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <SettingsIcon className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={() => handleConnect(integration)}
                      disabled={loading || isConnecting}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <IntegrationsPageContent />
    </Suspense>
  )
}
