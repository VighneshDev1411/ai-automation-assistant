'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  RefreshCw,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Database } from '@/types/database'

type IntegrationStatus = Database['public']['Enums']['integration_status']

interface IntegrationCardProps {
  provider: string
  name: string
  description: string
  icon: React.ReactNode
  status?: IntegrationStatus
  lastSynced?: string | null
  onConnect?: () => void
  onDisconnect?: () => void
  onSync?: () => void
  onSettings?: () => void
}

export const IntegrationCard = ({
  provider,
  name,
  description,
  icon,
  status = 'disconnected',
  lastSynced,
  onConnect,
  onDisconnect,
  onSync,
  onSettings,
}: IntegrationCardProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const handleAction = async (action: () => Promise<void> | void) => {
    setIsLoading(true)
    try {
      await action()
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin" />
      default:
        return <XCircle className="h-4 w-4 text-muted-foreground" />
    }
  }
  const isConnected = status === 'connected'
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-lg">{icon}</div>
            <div className="space-y-1">
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Switch
              checked={isConnected}
              onCheckedChange={() => {
                if (isConnected && onDisconnect) {
                  handleAction(onDisconnect)
                } else if (!isConnected && onConnect) {
                  handleAction(onConnect)
                }
              }}
              disabled={isLoading || status === 'pending'}
            />
          </div>
        </div>
      </CardHeader>
      {isConnected && (
        <CardContent className="border-t bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {lastSynced ? (
                <span>
                  Last synced{' '}
                  {formatDistanceToNow(new Date(lastSynced), {
                    addSuffix: true,
                  })}
                </span>
              ) : (
                <span>Never synced</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onSync && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction(onSync)}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              {onSettings && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSettings}
                  disabled={isLoading}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
