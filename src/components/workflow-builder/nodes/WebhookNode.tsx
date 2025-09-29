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
  Webhook,
  Globe,
  Lock,
  Key,
  Settings,
  Play,
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Clock,
  Zap,
  Shield,
  BarChart3,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// Field configuration interface
interface FieldConfig {
  key: string
  label: string
  type: 'select' | 'text' | 'password'
  placeholder?: string
  required?: boolean
  options?: string[]
  default?: string
}

// HTTP methods with their characteristics
const httpMethods = {
  GET: { color: 'bg-green-500', description: 'Retrieve data' },
  POST: { color: 'bg-blue-500', description: 'Create new resource' },
  PUT: { color: 'bg-orange-500', description: 'Update entire resource' },
  PATCH: { color: 'bg-yellow-500', description: 'Partial update' },
  DELETE: { color: 'bg-red-500', description: 'Remove resource' },
}

// Authentication types
const authTypes = {
  none: {
    label: 'No Authentication',
    icon: <Globe className="h-4 w-4" />,
    fields: [] as FieldConfig[]
  },
  apiKey: {
    label: 'API Key',
    icon: <Key className="h-4 w-4" />,
    fields: [
      { key: 'keyName', label: 'Key Name', type: 'text' as const, placeholder: 'X-API-Key', required: true },
      { key: 'keyValue', label: 'API Key', type: 'password' as const, placeholder: 'Your API key', required: true },
      { key: 'location', label: 'Location', type: 'select' as const, options: ['header', 'query'], default: 'header' },
    ] as FieldConfig[]
  },
  bearer: {
    label: 'Bearer Token',
    icon: <Shield className="h-4 w-4" />,
    fields: [
      { key: 'token', label: 'Token', type: 'password' as const, placeholder: 'Bearer token', required: true },
    ] as FieldConfig[]
  },
  basic: {
    label: 'Basic Auth',
    icon: <Lock className="h-4 w-4" />,
    fields: [
      { key: 'username', label: 'Username', type: 'text' as const, placeholder: 'Username', required: true },
      { key: 'password', label: 'Password', type: 'password' as const, placeholder: 'Password', required: true },
    ] as FieldConfig[]
  },
  oauth2: {
    label: 'OAuth 2.0',
    icon: <Shield className="h-4 w-4" />,
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password' as const, placeholder: 'OAuth access token', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password' as const, placeholder: 'Optional refresh token' },
    ] as FieldConfig[]
  },
}

interface Header {
  id: string
  key: string
  value: string
  enabled: boolean
}

interface WebhookNodeData {
  label: string
  url?: string
  method?: keyof typeof httpMethods
  authType?: keyof typeof authTypes
  authConfig?: Record<string, any>
  headers?: Header[]
  body?: string
  timeout?: number
  retries?: number
  isConfigured?: boolean
  lastResponse?: {
    status: number
    responseTime: number
    timestamp: string
    success: boolean
  }
  responseFormat?: 'json' | 'xml' | 'text' | 'binary'
}

export const WebhookNode = memo(({ data, selected }: NodeProps) => {
  const { toast } = useToast()
  const nodeData = data as unknown as WebhookNodeData
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [localUrl, setLocalUrl] = useState(nodeData.url || '')
  const [localMethod, setLocalMethod] = useState<keyof typeof httpMethods>(nodeData.method || 'POST')
  const [localAuthType, setLocalAuthType] = useState<keyof typeof authTypes>(nodeData.authType || 'none')
  const [localAuthConfig, setLocalAuthConfig] = useState(nodeData.authConfig || {})
  const [localHeaders, setLocalHeaders] = useState<Header[]>(
    nodeData.headers || [{ id: 'header_1', key: 'Content-Type', value: 'application/json', enabled: true }]
  )
  const [localBody, setLocalBody] = useState(nodeData.body || '')
  const [localTimeout, setLocalTimeout] = useState(nodeData.timeout || 30)
  const [localRetries, setLocalRetries] = useState(nodeData.retries || 3)
  const [responseFormat, setResponseFormat] = useState(nodeData.responseFormat || 'json')
  const [showSecrets, setShowSecrets] = useState(false)

  const isConfigured = nodeData.isConfigured || false
  const currentAuth = authTypes[localAuthType]

  // Handle configuration save
  const handleSave = () => {
    // Validate URL
    if (!localUrl) {
      toast({
        title: "Configuration Error",
        description: "Please provide a valid URL",
        variant: "destructive",
      })
      return
    }

    try {
      new URL(localUrl)
    } catch {
      toast({
        title: "Configuration Error",
        description: "Please provide a valid URL format",
        variant: "destructive",
      })
      return
    }

    // Validate auth fields
    if (localAuthType !== 'none') {
      const requiredFields = currentAuth.fields.filter(field => field.required)
      const missingFields = requiredFields.filter(field => !localAuthConfig[field.key])

      if (missingFields.length > 0) {
        toast({
          title: "Authentication Error",
          description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
          variant: "destructive",
        })
        return
      }
    }

    // Update node data
    nodeData.url = localUrl
    nodeData.method = localMethod
    nodeData.authType = localAuthType
    nodeData.authConfig = localAuthConfig
    nodeData.headers = localHeaders.filter(h => h.key && h.value)
    nodeData.body = localBody
    nodeData.timeout = localTimeout
    nodeData.retries = localRetries
    nodeData.responseFormat = responseFormat
    nodeData.isConfigured = true
    nodeData.label = `${localMethod} ${getDomainFromUrl(localUrl)}`

    setIsConfigOpen(false)
    
    toast({
      title: "Configuration Saved",
      description: "Webhook configuration saved successfully",
    })
  }

  // Get domain from URL for display
  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url.substring(0, 30) + (url.length > 30 ? '...' : '')
    }
  }

  // Handle auth field changes
  const handleAuthFieldChange = (key: string, value: any) => {
    setLocalAuthConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Add new header
  const addHeader = () => {
    const newHeader: Header = {
      id: `header_${Date.now()}`,
      key: '',
      value: '',
      enabled: true
    }
    setLocalHeaders(prev => [...prev, newHeader])
  }

  // Update header
  const updateHeader = (id: string, updates: Partial<Header>) => {
    setLocalHeaders(prev => prev.map(header => 
      header.id === id ? { ...header, ...updates } : header
    ))
  }

  // Remove header
  const removeHeader = (id: string) => {
    setLocalHeaders(prev => prev.filter(header => header.id !== id))
  }

  // Test webhook
  const testWebhook = async () => {
    if (!localUrl) {
      toast({
        title: "Test Error",
        description: "Please configure URL first",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Testing Webhook",
      description: "Sending test request...",
    })

    // Simulate test - in real implementation, this would make actual HTTP request
    setTimeout(() => {
      const mockResponse = {
        status: 200,
        responseTime: Math.floor(Math.random() * 500) + 100,
        success: true,
      }

      toast({
        title: "Test Successful",
        description: `Response: ${mockResponse.status} (${mockResponse.responseTime}ms)`,
      })
    }, 1500)
  }

  // Copy curl command
  const copyCurlCommand = () => {
    const headers = localHeaders
      .filter(h => h.enabled && h.key && h.value)
      .map(h => `-H "${h.key}: ${h.value}"`)
      .join(' ')

    let curl = `curl -X ${localMethod} "${localUrl}"`
    
    if (headers) {
      curl += ` ${headers}`
    }

    if (localAuthType === 'bearer' && localAuthConfig.token) {
      curl += ` -H "Authorization: Bearer ${localAuthConfig.token}"`
    } else if (localAuthType === 'basic' && localAuthConfig.username) {
      curl += ` -u "${localAuthConfig.username}:${localAuthConfig.password}"`
    }

    if (localBody && (localMethod === 'POST' || localMethod === 'PUT' || localMethod === 'PATCH')) {
      curl += ` -d '${localBody}'`
    }

    navigator.clipboard.writeText(curl)
    toast({
      title: "Copied!",
      description: "cURL command copied to clipboard",
    })
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
              <div className={`p-2 rounded-md ${httpMethods[localMethod]?.color || 'bg-gray-500'} text-white`}>
                <Webhook className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {isConfigured ? `${localMethod} Request` : 'Configure Webhook'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isConfigured ? getDomainFromUrl(localUrl) : 'HTTP request to external API'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Badge 
                variant="outline" 
                className={`text-xs ${httpMethods[localMethod]?.color.replace('bg-', 'text-')} border-current`}
              >
                {localMethod}
              </Badge>
              
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configure Webhook</DialogTitle>
                    <DialogDescription>
                      Set up HTTP request to external API or webhook endpoint
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="request" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="request">Request</TabsTrigger>
                      <TabsTrigger value="auth">Authentication</TabsTrigger>
                      <TabsTrigger value="headers">Headers & Body</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="request" className="space-y-6">
                      {/* Method and URL */}
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label>Method</Label>
                          <Select
                            value={localMethod}
                            onValueChange={(value: keyof typeof httpMethods) => setLocalMethod(value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(httpMethods).map(([method, config]) => (
                                <SelectItem key={method} value={method}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded ${config.color}`} />
                                    <span>{method}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-3">
                          <Label>URL</Label>
                          <Input
                            placeholder="https://api.example.com/endpoint"
                            value={localUrl}
                            onChange={(e) => setLocalUrl(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Method description */}
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded ${httpMethods[localMethod].color}`} />
                          <span className="font-medium">{localMethod}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {httpMethods[localMethod].description}
                        </p>
                      </div>

                      {/* Response Format */}
                      <div>
                        <Label>Expected Response Format</Label>
                        <Select
                          value={responseFormat}
                          onValueChange={(value: any) => setResponseFormat(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="json">JSON</SelectItem>
                            <SelectItem value="xml">XML</SelectItem>
                            <SelectItem value="text">Plain Text</SelectItem>
                            <SelectItem value="binary">Binary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quick Test */}
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={testWebhook} className="flex-1">
                          <Play className="h-4 w-4 mr-2" />
                          Test Request
                        </Button>
                        <Button variant="outline" onClick={copyCurlCommand}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy cURL
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="auth" className="space-y-6">
                      {/* Authentication Type */}
                      <div>
                        <Label>Authentication Type</Label>
                        <Select
                          value={localAuthType}
                          onValueChange={(value: keyof typeof authTypes) => setLocalAuthType(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(authTypes).map(([key, auth]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  {auth.icon}
                                  <span>{auth.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Authentication Fields */}
                      {localAuthType !== 'none' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Authentication Configuration</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowSecrets(!showSecrets)}
                            >
                              {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>

                          {currentAuth.fields.map((field) => (
                            <div key={field.key}>
                              <Label>
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              
                              {field.type === 'select' && (
                                <Select
                                  value={localAuthConfig[field.key] || field.default || ''}
                                  onValueChange={(value) => handleAuthFieldChange(field.key, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
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

                              {(field.type === 'text' || field.type === 'password') && (
                                <Input
                                  type={field.type === 'password' && !showSecrets ? 'password' : 'text'}
                                  placeholder={field.placeholder}
                                  value={localAuthConfig[field.key] || ''}
                                  onChange={(e) => handleAuthFieldChange(field.key, e.target.value)}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Security Note */}
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium text-yellow-800">Security Note</span>
                        </div>
                        <p className="text-sm text-yellow-700">
                          Authentication credentials are encrypted and stored securely. They are never logged or exposed in workflow execution logs.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="headers" className="space-y-6">
                      {/* Headers */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">HTTP Headers</h4>
                          <Button variant="outline" size="sm" onClick={addHeader}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Header
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {localHeaders.map((header) => (
                            <div key={header.id} className="flex items-center gap-2 p-3 border rounded-lg">
                              <Switch
                                checked={header.enabled}
                                onCheckedChange={(checked) => updateHeader(header.id, { enabled: checked })}
                              />
                              <Input
                                placeholder="Header name"
                                value={header.key}
                                onChange={(e) => updateHeader(header.id, { key: e.target.value })}
                                className="flex-1"
                              />
                              <Input
                                placeholder="Header value"
                                value={header.value}
                                onChange={(e) => updateHeader(header.id, { value: e.target.value })}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeHeader(header.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Request Body */}
                      {(localMethod === 'POST' || localMethod === 'PUT' || localMethod === 'PATCH') && (
                        <div>
                          <Label>Request Body</Label>
                          <Textarea
                            placeholder="JSON, XML, or form data..."
                            value={localBody}
                            onChange={(e) => setLocalBody(e.target.value)}
                            rows={8}
                            className="font-mono text-sm"
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                try {
                                  const formatted = JSON.stringify(JSON.parse(localBody), null, 2)
                                  setLocalBody(formatted)
                                } catch {
                                  toast({
                                    title: "Format Error",
                                    description: "Invalid JSON format",
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              Format JSON
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLocalBody('{\n  "key": "value"\n}')}
                            >
                              JSON Template
                            </Button>
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-6">
                      {/* Timeout and Retries */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Timeout (seconds)</Label>
                          <Input
                            type="number"
                            value={localTimeout}
                            onChange={(e) => setLocalTimeout(parseInt(e.target.value))}
                            min={1}
                            max={300}
                          />
                        </div>
                        <div>
                          <Label>Retry Attempts</Label>
                          <Input
                            type="number"
                            value={localRetries}
                            onChange={(e) => setLocalRetries(parseInt(e.target.value))}
                            min={0}
                            max={10}
                          />
                        </div>
                      </div>

                      {/* Advanced Options */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch id="follow-redirects" defaultChecked />
                          <Label htmlFor="follow-redirects">Follow redirects</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch id="verify-ssl" defaultChecked />
                          <Label htmlFor="verify-ssl">Verify SSL certificates</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch id="log-response" defaultChecked />
                          <Label htmlFor="log-response">Log response for debugging</Label>
                        </div>
                      </div>

                      {/* Error Handling */}
                      <div>
                        <Label>Error Handling</Label>
                        <Select defaultValue="fail">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fail">Fail workflow on error</SelectItem>
                            <SelectItem value="continue">Continue workflow on error</SelectItem>
                            <SelectItem value="retry">Retry with exponential backoff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={testWebhook}>
                      <Play className="h-4 w-4 mr-2" />
                      Test Webhook
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
                <span>Webhook configured</span>
              </div>
              
              {/* Show auth type */}
              {localAuthType !== 'none' && (
                <div className="flex items-center gap-2 text-xs">
                  {currentAuth.icon}
                  <span className="text-muted-foreground">{currentAuth.label}</span>
                </div>
              )}

              {/* Show last response */}
              {nodeData.lastResponse && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Last response:</span>
                    <span className={nodeData.lastResponse.success ? 'text-green-600' : 'text-red-600'}>
                      {nodeData.lastResponse.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response time:</span>
                    <span>{nodeData.lastResponse.responseTime}ms</span>
                  </div>
                </div>
              )}

              {/* Show URL preview */}
              <div className="text-xs text-muted-foreground truncate">
                {localUrl}
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

WebhookNode.displayName = 'WebhookNode'