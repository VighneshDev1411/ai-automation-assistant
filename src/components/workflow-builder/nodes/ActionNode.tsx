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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Mail,
  Database,
  MessageSquare,
  Calendar,
  FileText,
  Link,
  Code,
  Send,
  Settings,
  Play,
  AlertCircle,
  CheckCircle2,
  Zap,
  Upload,
  Download,
  BarChart3,
  Bell,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// Field configuration interface
interface FieldConfig {
  key: string
  label: string
  type: 'select' | 'text' | 'email' | 'number' | 'textarea' | 'boolean' | 'json' | 'code' | 'datetime-local'
  placeholder?: string
  required?: boolean
  options?: string[]
  default?: string | number | boolean
}

// Action types configuration
const actionTypes = {
  sendEmail: {
    label: 'Send Email',
    icon: <Mail className="h-4 w-4" />,
    description: 'Send email via Gmail, Outlook, or SMTP',
    color: 'bg-blue-500',
    category: 'Communication',
    fields: [
      { key: 'provider', label: 'Email Provider', type: 'select' as const, options: ['gmail', 'outlook', 'smtp'], required: true },
      { key: 'to', label: 'To', type: 'text' as const, placeholder: 'recipient@example.com', required: true },
      { key: 'cc', label: 'CC', type: 'text' as const, placeholder: 'Optional CC addresses' },
      { key: 'subject', label: 'Subject', type: 'text' as const, placeholder: 'Email subject', required: true },
      { key: 'body', label: 'Message Body', type: 'textarea' as const, placeholder: 'Email content...', required: true },
      { key: 'isHtml', label: 'HTML Format', type: 'boolean' as const, default: false },
      { key: 'attachments', label: 'Attachments', type: 'text' as const, placeholder: 'File paths (optional)' },
    ] as FieldConfig[]
  },
  createRecord: {
    label: 'Create Record',
    icon: <Database className="h-4 w-4" />,
    description: 'Create record in database or CRM',
    color: 'bg-green-500',
    category: 'Data',
    fields: [
      { key: 'platform', label: 'Platform', type: 'select' as const, options: ['salesforce', 'hubspot', 'airtable', 'postgresql', 'mongodb'], required: true },
      { key: 'table', label: 'Table/Object', type: 'text' as const, placeholder: 'contacts', required: true },
      { key: 'fields', label: 'Field Mapping', type: 'json' as const, placeholder: '{"name": "{{trigger.name}}", "email": "{{trigger.email}}"}', required: true },
      { key: 'duplicateHandling', label: 'Duplicate Handling', type: 'select' as const, options: ['create', 'update', 'skip'], default: 'create' },
    ] as FieldConfig[]
  },
  sendSlack: {
    label: 'Send Slack Message',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Send message to Slack channel or user',
    color: 'bg-purple-500',
    category: 'Communication',
    fields: [
      { key: 'workspace', label: 'Workspace', type: 'select' as const, options: [], required: true },
      { key: 'channel', label: 'Channel', type: 'text' as const, placeholder: '#general or @username', required: true },
      { key: 'message', label: 'Message', type: 'textarea' as const, placeholder: 'Message content...', required: true },
      { key: 'asBot', label: 'Send as Bot', type: 'boolean' as const, default: true },
      { key: 'threadReply', label: 'Thread Reply', type: 'text' as const, placeholder: 'Optional thread timestamp' },
    ] as FieldConfig[]
  },
  createCalendarEvent: {
    label: 'Create Calendar Event',
    icon: <Calendar className="h-4 w-4" />,
    description: 'Create event in Google Calendar or Outlook',
    color: 'bg-orange-500',
    category: 'Productivity',
    fields: [
      { key: 'provider', label: 'Calendar Provider', type: 'select' as const, options: ['google', 'outlook'], required: true },
      { key: 'title', label: 'Event Title', type: 'text' as const, placeholder: 'Meeting title', required: true },
      { key: 'description', label: 'Description', type: 'textarea' as const, placeholder: 'Event description' },
      { key: 'startTime', label: 'Start Time', type: 'datetime-local' as const, required: true },
      { key: 'endTime', label: 'End Time', type: 'datetime-local' as const, required: true },
      { key: 'attendees', label: 'Attendees', type: 'text' as const, placeholder: 'email1@example.com, email2@example.com' },
      { key: 'location', label: 'Location', type: 'text' as const, placeholder: 'Meeting location' },
    ] as FieldConfig[]
  },
  uploadFile: {
    label: 'Upload File',
    icon: <Upload className="h-4 w-4" />,
    description: 'Upload file to cloud storage',
    color: 'bg-cyan-500',
    category: 'Files',
    fields: [
      { key: 'provider', label: 'Storage Provider', type: 'select' as const, options: ['google_drive', 'dropbox', 'aws_s3', 'azure_blob'], required: true },
      { key: 'filePath', label: 'Source File Path', type: 'text' as const, placeholder: '/path/to/file.pdf', required: true },
      { key: 'destinationPath', label: 'Destination Path', type: 'text' as const, placeholder: '/uploads/', required: true },
      { key: 'fileName', label: 'File Name', type: 'text' as const, placeholder: 'Optional new filename' },
      { key: 'makePublic', label: 'Make Public', type: 'boolean' as const, default: false },
    ] as FieldConfig[]
  },
  apiCall: {
    label: 'API Call',
    icon: <Link className="h-4 w-4" />,
    description: 'Make HTTP request to any API',
    color: 'bg-red-500',
    category: 'Integration',
    fields: [
      { key: 'method', label: 'HTTP Method', type: 'select' as const, options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], required: true },
      { key: 'url', label: 'URL', type: 'text' as const, placeholder: 'https://api.example.com/endpoint', required: true },
      { key: 'headers', label: 'Headers', type: 'json' as const, placeholder: '{"Authorization": "Bearer {{token}}"}' },
      { key: 'body', label: 'Request Body', type: 'textarea' as const, placeholder: 'JSON body for POST/PUT requests' },
      { key: 'timeout', label: 'Timeout (seconds)', type: 'number' as const, default: 30 },
      { key: 'retries', label: 'Retry Attempts', type: 'number' as const, default: 3 },
    ] as FieldConfig[]
  },
  customCode: {
    label: 'Custom Code',
    icon: <Code className="h-4 w-4" />,
    description: 'Execute custom JavaScript or Python code',
    color: 'bg-gray-800',
    category: 'Advanced',
    fields: [
      { key: 'language', label: 'Language', type: 'select' as const, options: ['javascript', 'python'], required: true },
      { key: 'code', label: 'Code', type: 'code' as const, placeholder: 'function execute(input) {\n  // Your code here\n  return input;\n}', required: true },
      { key: 'timeout', label: 'Timeout (seconds)', type: 'number' as const, default: 30 },
      { key: 'memoryLimit', label: 'Memory Limit (MB)', type: 'number' as const, default: 128 },
    ] as FieldConfig[]
  },
  sendNotification: {
    label: 'Send Notification',
    icon: <Bell className="h-4 w-4" />,
    description: 'Send push notification or SMS',
    color: 'bg-yellow-500',
    category: 'Communication',
    fields: [
      { key: 'type', label: 'Notification Type', type: 'select' as const, options: ['push', 'sms', 'webhook'], required: true },
      { key: 'recipient', label: 'Recipient', type: 'text' as const, placeholder: 'Phone number or device token', required: true },
      { key: 'title', label: 'Title', type: 'text' as const, placeholder: 'Notification title', required: true },
      { key: 'message', label: 'Message', type: 'textarea' as const, placeholder: 'Notification message', required: true },
      { key: 'priority', label: 'Priority', type: 'select' as const, options: ['low', 'normal', 'high'], default: 'normal' },
    ] as FieldConfig[]
  },
  generateReport: {
    label: 'Generate Report',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Generate PDF or Excel report',
    color: 'bg-indigo-500',
    category: 'Reports',
    fields: [
      { key: 'format', label: 'Report Format', type: 'select' as const, options: ['pdf', 'excel', 'csv'], required: true },
      { key: 'template', label: 'Template', type: 'select' as const, options: ['basic', 'detailed', 'custom'], required: true },
      { key: 'dataSource', label: 'Data Source', type: 'text' as const, placeholder: 'Query or data endpoint', required: true },
      { key: 'filename', label: 'Filename', type: 'text' as const, placeholder: 'report_{{date}}.pdf' },
      { key: 'emailReport', label: 'Email Report', type: 'boolean' as const, default: false },
    ] as FieldConfig[]
  },
}

interface ActionNodeData {
  label: string
  actionType?: keyof typeof actionTypes
  config: Record<string, any>
  isConfigured?: boolean
  lastExecuted?: string
  status?: 'success' | 'error' | 'pending'
}

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const { toast } = useToast()
  const nodeData = data as unknown as ActionNodeData
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState(nodeData.config || {})
  const [localActionType, setLocalActionType] = useState<keyof typeof actionTypes>(
    nodeData.actionType || 'sendEmail'
  )

  const currentAction = actionTypes[localActionType]
  const isConfigured = nodeData.actionType && Object.keys(nodeData.config || {}).length > 0

  // Handle configuration save
  const handleSave = () => {
    // Validate required fields
    const requiredFields = currentAction.fields.filter(field => field.required)
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
    nodeData.actionType = localActionType
    nodeData.config = localConfig
    nodeData.label = currentAction.label
    nodeData.isConfigured = true

    setIsConfigOpen(false)
    
    toast({
      title: "Configuration Saved",
      description: `${currentAction.label} action configured successfully`,
    })
  }

  // Handle field changes
  const handleFieldChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Test action
  const testAction = async () => {
    toast({
      title: "Testing Action",
      description: "Running test execution...",
    })

    // Simulate test - in real implementation, this would call your API
    setTimeout(() => {
      toast({
        title: "Test Successful",
        description: "Action executed successfully in test mode",
      })
    }, 2000)
  }

  // Get status color
  const getStatusColor = () => {
    switch (nodeData.status) {
      case 'success': return 'text-green-500'
      case 'error': return 'text-red-500'
      case 'pending': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#6366f1',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />

      <Card 
        className={`w-80 transition-all duration-200 ${
          selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-md ${currentAction.color} text-white`}>
                {currentAction.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {nodeData.actionType ? currentAction.label : 'Configure Action'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {currentAction.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {currentAction.category}
              </Badge>
              
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configure Action</DialogTitle>
                    <DialogDescription>
                      Set up the {currentAction.label.toLowerCase()} action
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="config" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="config">Configuration</TabsTrigger>
                      <TabsTrigger value="data">Data Mapping</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="config" className="space-y-6">
                      {/* Action Type Selection */}
                      <div>
                        <Label>Action Type</Label>
                        <Select
                          value={localActionType}
                          onValueChange={(value: keyof typeof actionTypes) => setLocalActionType(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(actionTypes).map(([key, action]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  {action.icon}
                                  <span>{action.label}</span>
                                  <Badge variant="outline" className="text-xs ml-auto">
                                    {action.category}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dynamic Configuration Fields */}
                      <div className="space-y-4">
                        {currentAction.fields.map((field) => (
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

                            {(field.type === 'text' || field.type === 'email') && (
                              <Input
                                type={field.type}
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

                            {field.type === 'datetime-local' && (
                              <Input
                                type="datetime-local"
                                value={localConfig[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              />
                            )}

                            {(field.type === 'textarea' || field.type === 'code') && (
                              <Textarea
                                placeholder={field.placeholder}
                                value={localConfig[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                rows={field.type === 'code' ? 8 : 3}
                                className={field.type === 'code' ? 'font-mono text-sm' : ''}
                              />
                            )}

                            {field.type === 'json' && (
                              <Textarea
                                placeholder={field.placeholder}
                                value={localConfig[field.key] || ''}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                rows={4}
                                className="font-mono text-sm"
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
                    </TabsContent>

                    <TabsContent value="data" className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Data Mapping</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Map data from previous steps using variables like {'{{'} trigger.field {'}}'}  or {'{{'} step1.output {'}}'}
                        </p>

                        <div className="space-y-2 text-sm">
                          <div><code>{'{{'} trigger.* {'}}' }</code> - Data from workflow trigger</div>
                          <div><code>{'{{'} previous.* {'}}' }</code> - Data from previous step</div>
                          <div><code>{'{{'} stepName.* {'}}' }</code> - Data from specific step</div>
                          <div><code>{'{{'} date {'}}' }</code> - Current date/time</div>
                          <div><code>{'{{'} user.* {'}}' }</code> - Current user data</div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <Label>Error Handling</Label>
                          <Select
                            value={localConfig.errorHandling || 'stop'}
                            onValueChange={(value) => handleFieldChange('errorHandling', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="stop">Stop workflow on error</SelectItem>
                              <SelectItem value="continue">Continue on error</SelectItem>
                              <SelectItem value="retry">Retry on error</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Retry Count</Label>
                          <Input
                            type="number"
                            value={localConfig.retryCount || 3}
                            onChange={(e) => handleFieldChange('retryCount', parseInt(e.target.value))}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={localConfig.logOutput ?? true}
                            onCheckedChange={(checked) => handleFieldChange('logOutput', checked)}
                          />
                          <Label>Log action output</Label>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={testAction}>
                      <Play className="h-4 w-4 mr-2" />
                      Test Action
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
              
              {/* Show execution status */}
              {nodeData.status && (
                <div className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor().replace('text-', 'bg-')}`} />
                  <span className={getStatusColor()}>
                    Last execution: {nodeData.status}
                  </span>
                </div>
              )}

              {/* Show key configuration details */}
              <div className="text-xs text-muted-foreground space-y-1">
                {localActionType === 'sendEmail' && localConfig.to && (
                  <div>To: {localConfig.to}</div>
                )}
                {localActionType === 'createRecord' && localConfig.table && (
                  <div>Table: {localConfig.table}</div>
                )}
                {localActionType === 'apiCall' && localConfig.url && (
                  <div>URL: {localConfig.url}</div>
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
          background: '#6366f1',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
      />
    </>
  )
})

ActionNode.displayName = 'ActionNode'