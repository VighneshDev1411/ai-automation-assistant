'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Mail,
  Calendar,
  Cloud,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Settings as SettingsIcon
} from 'lucide-react'

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ElementType
  status: 'connected' | 'disconnected' | 'error'
  category: string
  lastSync?: string
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send messages and notifications to Slack channels',
      icon: MessageSquare,
      status: 'connected',
      category: 'Communication',
      lastSync: '2 minutes ago'
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Send and receive emails through Gmail',
      icon: Mail,
      status: 'connected',
      category: 'Email',
      lastSync: '5 minutes ago'
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Create and manage calendar events',
      icon: Calendar,
      status: 'connected',
      category: 'Productivity',
      lastSync: '1 hour ago'
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Access and manage files in Google Drive',
      icon: Cloud,
      status: 'disconnected',
      category: 'Storage'
    },
    {
      id: 'microsoft-teams',
      name: 'Microsoft Teams',
      description: 'Send messages to Microsoft Teams channels',
      icon: MessageSquare,
      status: 'disconnected',
      category: 'Communication'
    },
    {
      id: 'airtable',
      name: 'Airtable',
      description: 'Manage records in Airtable bases',
      icon: Database,
      status: 'disconnected',
      category: 'Database'
    }
  ])

  const [loading, setLoading] = useState(false)

  const handleConnect = (integrationId: string) => {
    setLoading(true)
    // Simulate OAuth flow
    setTimeout(() => {
      setIntegrations(prev =>
        prev.map(int =>
          int.id === integrationId
            ? { ...int, status: 'connected' as const, lastSync: 'Just now' }
            : int
        )
      )
      setLoading(false)
    }, 1500)
  }

  const handleDisconnect = (integrationId: string) => {
    setIntegrations(prev =>
      prev.map(int =>
        int.id === integrationId
          ? { ...int, status: 'disconnected' as const, lastSync: undefined }
          : int
      )
    )
  }

  const getStatusBadge = (status: Integration['status']) => {
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

  const connectedCount = integrations.filter(i => i.status === 'connected').length

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
            <div className="text-2xl font-bold">{integrations.length - connectedCount}</div>
            <p className="text-xs text-muted-foreground">
              Ready to connect
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.length}</div>
            <p className="text-xs text-muted-foreground">
              Integration options
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map(integration => {
          const Icon = integration.icon
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
                  {getStatusBadge(integration.status)}
                  {integration.lastSync && (
                    <span className="text-xs text-muted-foreground">
                      {integration.lastSync}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {integration.status === 'connected' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDisconnect(integration.id)}
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
                      onClick={() => handleConnect(integration.id)}
                      disabled={loading}
                    >
                      {loading ? (
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
