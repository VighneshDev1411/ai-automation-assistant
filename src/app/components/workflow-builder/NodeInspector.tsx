// File: src/app/components/workflow-builder/NodeInspector.tsx

import React, { useState, useEffect } from 'react'
import { Node } from 'reactflow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { X, Settings, Trash2 } from 'lucide-react'
import { IntegrationRegistry } from '@/lib/integrations/IntegrationRegistry'

interface NodeInspectorProps {
  node?: Node
  onUpdate: (updates: Partial<Node>) => void
  onDelete: () => void
  onClose: () => void
}

export function NodeInspector({ node, onUpdate, onDelete, onClose }: NodeInspectorProps) {
  console.log('🔵 NodeInspector RENDERED with node:', node)

  const [config, setConfig] = useState(node?.data?.config || {})
  const [selectedIntegration, setSelectedIntegration] = useState<string>('')
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [availableActions, setAvailableActions] = useState<any[]>([])
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])

  // Debug: Log all available integrations on mount
  useEffect(() => {
    console.log('=== NodeInspector mounted ===')
    console.log('Node type:', node?.type)
    console.log('Node data:', node?.data)
  }, [])

  useEffect(() => {
    console.log('🟢 NodeInspector useEffect triggered')
    console.log('Node data:', node?.data)

    if (node?.data?.config) {
      setConfig(node.data.config)
      if (node.data.config.integration) {
        console.log('Found integration in config:', node.data.config.integration)
        setSelectedIntegration(node.data.config.integration)
        setSelectedAction(node.data.config.action || '')
        loadIntegrationData(node.data.config.integration)
      }
    }

    // Check if node has actionType (different structure)
    if (node?.data?.actionType === 'sendSlack' || node?.data?.nodeId === 'send-slack') {
      console.log('🟡 Detected Slack node, auto-loading Slack data')
      setSelectedIntegration('slack')
      setSelectedAction('send_message')
      loadIntegrationData('slack')
    }
  }, [node])

  const loadIntegrationData = (integrationId: string) => {
    console.log('Loading integration data for:', integrationId)

    // Hardcoded data for now to ensure it works
    if (integrationId === 'slack') {
      const slackActions = [
        { id: 'send_message', name: 'Send Message', description: 'Send a message to a Slack channel' },
        { id: 'create_channel', name: 'Create Channel', description: 'Create a new Slack channel' }
      ]

      const slackWorkspaces = [
        { id: 'T1234567890', name: 'Demo Workspace', status: 'connected' },
        { id: 'T0949780Q4T', name: 'Your Workspace', status: 'connected' }
      ]

      const slackChannels = [
        { id: 'C1234567890', name: '#general' },
        { id: 'C1234567891', name: '#random' },
        { id: 'C1234567892', name: '#demo-workflow' },
        { id: 'C1234567893', name: '#notifications' }
      ]

      console.log('Setting Slack actions:', slackActions)
      console.log('Setting Slack workspaces:', slackWorkspaces)
      console.log('Setting Slack channels:', slackChannels)

      setAvailableActions(slackActions)
      setWorkspaces(slackWorkspaces)
      setChannels(slackChannels)
    } else {
      // Try registry for other integrations
      const actions = IntegrationRegistry.getAvailableActions(integrationId)
      const workspaceList = IntegrationRegistry.getWorkspaces(integrationId)

      console.log('Available actions:', actions)
      console.log('Workspaces:', workspaceList)

      setAvailableActions(actions)
      setWorkspaces(workspaceList)
    }
  }

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    
    onUpdate({
      data: {
        ...node?.data,
        config: newConfig
      }
    })
  }

  const handleIntegrationChange = (integrationId: string) => {
    setSelectedIntegration(integrationId)
    setSelectedAction('')
    loadIntegrationData(integrationId)
    
    handleConfigChange('integration', integrationId)
  }

  const handleActionChange = (actionId: string) => {
    setSelectedAction(actionId)
    handleConfigChange('action', actionId)
  }

  if (!node) return null

  const renderTriggerConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Trigger Type</Label>
        <Select 
          value={config.type || 'webhook'} 
          onValueChange={(value) => handleConfigChange('type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select trigger type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="schedule">Schedule</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="email">Email Received</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.type === 'webhook' && (
        <div>
          <Label>Webhook Path</Label>
          <Input
            value={config.path || '/webhook/demo-form'}
            onChange={(e) => handleConfigChange('path', e.target.value)}
            placeholder="/webhook/your-endpoint"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Full URL: {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}{config.path || '/webhook/demo-form'}
          </p>
        </div>
      )}

      {config.type === 'schedule' && (
        <div>
          <Label>Cron Expression</Label>
          <Input
            value={config.cron || '0 9 * * 1-5'}
            onChange={(e) => handleConfigChange('cron', e.target.value)}
            placeholder="0 9 * * 1-5 (weekdays at 9 AM)"
          />
        </div>
      )}
    </div>
  )

  const renderActionConfig = () => (
    <div className="space-y-4">
      {/* Debug Info */}
      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
        <div>Selected Integration: {selectedIntegration || 'none'}</div>
        <div>Selected Action: {selectedAction || 'none'}</div>
        <div>Workspaces loaded: {workspaces.length}</div>
        <div>Actions loaded: {availableActions.length}</div>
        <div>Channels loaded: {channels.length}</div>
      </div>

      {/* Integration Selection */}
      <div>
        <Label>Integration</Label>
        <Select
          value={selectedIntegration}
          onValueChange={(value) => {
            console.log('Integration dropdown changed to:', value)
            handleIntegrationChange(value)
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select integration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="slack">
              💬 Slack
            </SelectItem>
            <SelectItem value="gmail">
              📧 Gmail
            </SelectItem>
            <SelectItem value="sheets">
              📊 Google Sheets
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Selection */}
      {selectedIntegration && (
        <div>
          <Label>Action</Label>
          <Select value={selectedAction} onValueChange={handleActionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {availableActions.map((action) => (
                <SelectItem key={action.id} value={action.id}>
                  {action.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Workspace Selection */}
      {selectedIntegration && (
        <div>
          <Label>Workspace ({workspaces.length} available)</Label>
          <Select
            value={config.workspace}
            onValueChange={(value) => {
              console.log('Workspace selected:', value)
              handleConfigChange('workspace', value)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={workspaces.length > 0 ? "Select workspace" : "No workspaces available"} />
            </SelectTrigger>
            <SelectContent>
              {workspaces.length > 0 ? (
                workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name} ({workspace.status})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No workspaces found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {workspaces.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              Debug: workspaces array is empty. Check console.
            </p>
          )}
        </div>
      )}

      {/* Slack-specific Configuration */}
      {selectedIntegration === 'slack' && selectedAction === 'send_message' && (
        <>
          <div>
            <Label>Channel</Label>
            <Select 
              value={config.channel} 
              onValueChange={(value) => handleConfigChange('channel', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.name}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              value={config.message || ''}
              onChange={(e) => handleConfigChange('message', e.target.value)}
              placeholder="Enter your message... Use {{trigger.fieldName}} for dynamic content"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available variables: {'{trigger.name}'}, {'{trigger.email}'}, {'{trigger.message}'}
            </p>
          </div>

          <div>
            <Label>Bot Username (Optional)</Label>
            <Input
              value={config.username || ''}
              onChange={(e) => handleConfigChange('username', e.target.value)}
              placeholder="Workflow Bot"
            />
          </div>

          <div>
            <Label>Emoji Icon (Optional)</Label>
            <Input
              value={config.icon_emoji || ''}
              onChange={(e) => handleConfigChange('icon_emoji', e.target.value)}
              placeholder=":robot_face:"
            />
          </div>
        </>
      )}

      {/* Generic inputs for other actions */}
      {selectedAction && selectedIntegration !== 'slack' && (
        <div>
          <Label>Configuration</Label>
          <Textarea
            value={JSON.stringify(config.actionConfig || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                handleConfigChange('actionConfig', parsed)
              } catch (error) {
                // Invalid JSON, ignore
              }
            }}
            placeholder='{"key": "value"}'
            rows={6}
          />
        </div>
      )}
    </div>
  )

  const renderConditionConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Field</Label>
        <Input
          value={config.field || ''}
          onChange={(e) => handleConfigChange('field', e.target.value)}
          placeholder="trigger.email"
        />
      </div>

      <div>
        <Label>Operator</Label>
        <Select 
          value={config.operator || 'equals'} 
          onValueChange={(value) => handleConfigChange('operator', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Equals</SelectItem>
            <SelectItem value="not_equals">Not Equals</SelectItem>
            <SelectItem value="contains">Contains</SelectItem>
            <SelectItem value="starts_with">Starts With</SelectItem>
            <SelectItem value="ends_with">Ends With</SelectItem>
            <SelectItem value="greater_than">Greater Than</SelectItem>
            <SelectItem value="less_than">Less Than</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Value</Label>
        <Input
          value={config.value || ''}
          onChange={(e) => handleConfigChange('value', e.target.value)}
          placeholder="comparison value"
        />
      </div>
    </div>
  )

  return (
    <Card className="absolute right-4 top-4 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto shadow-lg z-10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Configure {node.type}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Node Label */}
        <div>
          <Label>Label</Label>
          <Input
            value={node.data?.label || ''}
            onChange={(e) => onUpdate({
              data: { ...node.data, label: e.target.value }
            })}
            placeholder="Node label"
          />
        </div>

        <Separator />

        {/* Node-specific Configuration */}
        {node.type === 'trigger' && renderTriggerConfig()}
        {node.type === 'action' && renderActionConfig()}
        {node.type === 'condition' && renderConditionConfig()}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onDelete}
            className="flex-1"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>

        {/* Configuration Preview */}
        <div className="mt-4 p-2 bg-muted rounded text-xs">
          <strong>Config:</strong>
          <pre className="mt-1 text-xs overflow-x-auto">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}