'use client'

import React, { memo, useState } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Zap,
  Clock,
  Webhook,
  Mail,
  FileText,
  Calendar,
  Database,
  Settings,
  Play,
  AlertCircle,
  CheckCircle2,
  Copy,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// Field configuration interface
interface FieldConfig {
  key: string
  label: string
  type: 'select' | 'text' | 'email' | 'number' | 'textarea' | 'boolean'
  placeholder?: string
  required?: boolean
  options?: string[]
  default?: string | number | boolean
}

// Trigger types configuration
const triggerTypes = {
  webhook: {
    label: 'Webhook',
    icon: <Webhook className="h-4 w-4" />,
    description: 'Trigger when HTTP request is received',
    color: 'bg-green-500',
    fields: [
      { key: 'method', label: 'HTTP Method', type: 'select' as const, options: ['POST', 'GET', 'PUT', 'PATCH'], default: 'POST' },
      { key: 'path', label: 'Webhook Path', type: 'text' as const, placeholder: '/webhook/my-trigger', required: true },
      { key: 'authentication', label: 'Authentication', type: 'select' as const, options: ['none', 'api_key', 'bearer_token'], default: 'none' },
      { key: 'responseFormat', label: 'Response Format', type: 'select' as const, options: ['json', 'xml', 'text'], default: 'json' },
    ] as FieldConfig[]
  },
  schedule: {
    label: 'Schedule',
    icon: <Clock className="h-4 w-4" />,
    description: 'Trigger on a schedule using cron expressions',
    color: 'bg-blue-500',
    fields: [
      { key: 'schedule', label: 'Cron Expression', type: 'text' as const, placeholder: '0 9 * * 1-5', required: true },
      { key: 'timezone', label: 'Timezone', type: 'select' as const, options: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London'], default: 'UTC' },
      { key: 'enabled', label: 'Enabled', type: 'boolean' as const, default: true },
    ] as FieldConfig[]
  },
  email: {
    label: 'Email Received',
    icon: <Mail className="h-4 w-4" />,
    description: 'Trigger when email is received',
    color: 'bg-purple-500',
    fields: [
      { key: 'emailProvider', label: 'Email Provider', type: 'select' as const, options: ['gmail', 'outlook', 'imap'], required: true },
      { key: 'emailAddress', label: 'Email Address', type: 'email' as const, placeholder: 'trigger@yourdomain.com', required: true },
      { key: 'filterSubject', label: 'Subject Filter', type: 'text' as const, placeholder: 'Optional subject filter' },
      { key: 'filterSender', label: 'Sender Filter', type: 'text' as const, placeholder: 'Optional sender filter' },
    ] as FieldConfig[]
  },
  file: {
    label: 'File Upload',
    icon: <FileText className="h-4 w-4" />,
    description: 'Trigger when file is uploaded',
    color: 'bg-orange-500',
    fields: [
      { key: 'storageProvider', label: 'Storage Provider', type: 'select' as const, options: ['google_drive', 'dropbox', 'aws_s3', 'local'], required: true },
      { key: 'folderPath', label: 'Folder Path', type: 'text' as const, placeholder: '/uploads' },
      { key: 'fileExtensions', label: 'File Extensions', type: 'text' as const, placeholder: '.pdf,.docx,.txt' },
      { key: 'maxFileSize', label: 'Max File Size (MB)', type: 'number' as const, default: 10 },
    ] as FieldConfig[]
  },
  database: {
    label: 'Database Change',
    icon: <Database className="h-4 w-4" />,
    description: 'Trigger when database record changes',
    color: 'bg-red-500',
    fields: [
      { key: 'databaseType', label: 'Database Type', type: 'select' as const, options: ['postgresql', 'mysql', 'mongodb'], required: true },
      { key: 'tableName', label: 'Table/Collection', type: 'text' as const, placeholder: 'users', required: true },
      { key: 'operation', label: 'Operation', type: 'select' as const, options: ['insert', 'update', 'delete', 'any'], default: 'any' },
      { key: 'conditions', label: 'Conditions', type: 'textarea' as const, placeholder: 'Optional WHERE conditions' },
    ] as FieldConfig[]
  },
}

interface TriggerNodeData {
  label: string
  triggerType?: keyof typeof triggerTypes
  config: Record<string, any>
  isActive?: boolean
  webhookUrl?: string
}

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const { toast } = useToast()
  const nodeData = data as unknown as TriggerNodeData
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState(nodeData.config || {})
  const [localTriggerType, setLocalTriggerType] = useState<keyof typeof triggerTypes>(
    nodeData.triggerType || 'webhook'
  )

  const currentTrigger = triggerTypes[localTriggerType]
  const isConfigured = nodeData.triggerType && Object.keys(nodeData.config || {}).length > 0
  const isActive = nodeData.isActive || false

  // Handle configuration save
  const handleSave = () => {
    // Validate required fields
    const requiredFields = currentTrigger.fields.filter(field => field.required)
    const missingFields = requiredFields.filter(field => !localConfig[field.key])

    if (missingFields.length > 0) {
      toast({
        title: "Configuration Error",
        description: `Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      })
      return
    }

    // Update node data
    nodeData.triggerType = localTriggerType
    nodeData.config = localConfig
    nodeData.label = `${currentTrigger.label} Trigger`

    // Generate webhook URL if webhook type
    if (localTriggerType === 'webhook' && localConfig.path) {
      nodeData.webhookUrl = `${window.location.origin}/api/webhooks${localConfig.path}`
    }

    setIsConfigOpen(false)
    
    toast({
      title: "Configuration Saved",
      description: `${currentTrigger.label} trigger configured successfully`,
    })
  }

  // Handle field changes
  const handleFieldChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Copy webhook URL to clipboard
  const copyWebhookUrl = () => {
    if (nodeData.webhookUrl) {
      navigator.clipboard.writeText(nodeData.webhookUrl)
      toast({
        title: "Copied!",
        description: "Webhook URL copied to clipboard",
      })
    }
  }

  // Test trigger
  const testTrigger = async () => {
    toast({
      title: "Testing Trigger",
      description: "Sending test event to trigger...",
    })

    // Simulate test - in real implementation, this would call your API
    setTimeout(() => {
      toast({
        title: "Test Successful",
        description: "Trigger is working correctly",
      })
    }, 2000)
  }

  return (
    <>
      <Card 
        className={`w-80 transition-all duration-200 ${
          selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        } ${isActive ? 'border-green-500' : ''}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-md ${currentTrigger.color} text-white`}>
                {currentTrigger.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {nodeData.triggerType ? currentTrigger.label : 'Configure Trigger'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {currentTrigger.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {isConfigured && (
                <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                  {isActive ? "Active" : "Inactive"}
                </Badge>
              )}
              
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Configure Trigger</DialogTitle>
                    <DialogDescription>
                      Set up when this workflow should be triggered
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Trigger Type Selection */}
                    <div>
                      <Label>Trigger Type</Label>
                      <Select
                        value={localTriggerType}
                        onValueChange={(value: keyof typeof triggerTypes) => setLocalTriggerType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(triggerTypes).map(([key, trigger]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                {trigger.icon}
                                <span>{trigger.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dynamic Configuration Fields */}
                    <div className="space-y-4">
                      {currentTrigger.fields.map((field) => (
                        <div key={field.key}>
                          <Label>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          
                          {field.type === 'select' && (
                            <Select
                              value={localConfig[field.key] || field.default || ''}
                              onValueChange={(value) => handleFieldChange(field.key, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {field.type === 'text' && (
                            <Input
                              placeholder={field.placeholder}
                              value={localConfig[field.key] || ''}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            />
                          )}

                          {field.type === 'email' && (
                            <Input
                              type="email"
                              placeholder={field.placeholder}
                              value={localConfig[field.key] || ''}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            />
                          )}

                          {field.type === 'number' && (
                            <Input
                              type="number"
                              placeholder={field.placeholder}
                              value={localConfig[field.key] || field.default || ''}
                              onChange={(e) => handleFieldChange(field.key, parseInt(e.target.value))}
                            />
                          )}

                          {field.type === 'textarea' && (
                            <Textarea
                              placeholder={field.placeholder}
                              value={localConfig[field.key] || ''}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              rows={3}
                            />
                          )}

                          {field.type === 'boolean' && (
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={localConfig[field.key] ?? field.default ?? false}
                                onCheckedChange={(checked) => handleFieldChange(field.key, checked)}
                              />
                              <span className="text-sm text-muted-foreground">
                                {localConfig[field.key] ? 'Enabled' : 'Disabled'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Webhook URL Display */}
                    {localTriggerType === 'webhook' && localConfig.path && (
                      <div className="p-4 bg-muted rounded-lg">
                        <Label className="text-sm font-medium">Webhook URL</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            readOnly
                            value={`${window.location.origin}/api/webhooks${localConfig.path}`}
                            className="font-mono text-sm"
                          />
                          <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Send {localConfig.method || 'POST'} requests to this URL to trigger the workflow
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={testTrigger}>
                        <Play className="h-4 w-4 mr-2" />
                        Test Trigger
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSave}>
                          Save Configuration
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isConfigured ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Configured and ready</span>
              </div>
              
              {/* Show key configuration details */}
              <div className="text-xs text-muted-foreground space-y-1">
                {localTriggerType === 'webhook' && localConfig.path && (
                  <div>Path: {localConfig.path}</div>
                )}
                {localTriggerType === 'schedule' && localConfig.schedule && (
                  <div>Schedule: {localConfig.schedule}</div>
                )}
                {localTriggerType === 'email' && localConfig.emailAddress && (
                  <div>Email: {localConfig.emailAddress}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Click settings to configure</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: currentTrigger.color.replace('bg-', '').includes('green') ? '#10b981' : '#6366f1',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />
    </>
  )
})

TriggerNode.displayName = 'TriggerNode'