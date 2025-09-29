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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Clock,
  Calendar,
  Timer,
  Pause,
  Play,
  Settings,
  AlertCircle,
  CheckCircle2,
  Zap,
  Moon,
  Sun,
  CalendarDays,
  AlarmClock,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// Field configuration interface
interface FieldConfig {
  key: string
  label: string
  type: 'select' | 'text' | 'number' | 'boolean' | 'time' | 'datetime-local' | 'multiselect'
  placeholder?: string
  required?: boolean
  options?: string[]
  default?: string | number | boolean | string[]
}

// Delay types configuration
const delayTypes = {
  duration: {
    label: 'Fixed Duration',
    icon: <Timer className="h-4 w-4" />,
    description: 'Wait for a specific amount of time',
    color: 'bg-blue-500',
    fields: [
      { key: 'value', label: 'Duration Value', type: 'number' as const, placeholder: '5', required: true },
      { key: 'unit', label: 'Time Unit', type: 'select' as const, options: ['seconds', 'minutes', 'hours', 'days'], required: true },
    ] as FieldConfig[]
  },
  untilTime: {
    label: 'Until Specific Time',
    icon: <Clock className="h-4 w-4" />,
    description: 'Wait until a specific time of day',
    color: 'bg-green-500',
    fields: [
      { key: 'time', label: 'Time', type: 'time' as const, placeholder: '09:00', required: true },
      { key: 'timezone', label: 'Timezone', type: 'select' as const, options: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'], default: 'UTC' },
      { key: 'nextDay', label: 'If Past, Wait Until Tomorrow', type: 'boolean' as const, default: true },
    ] as FieldConfig[]
  },
  untilDate: {
    label: 'Until Specific Date',
    icon: <Calendar className="h-4 w-4" />,
    description: 'Wait until a specific date and time',
    color: 'bg-purple-500',
    fields: [
      { key: 'datetime', label: 'Date & Time', type: 'datetime-local' as const, required: true },
      { key: 'timezone', label: 'Timezone', type: 'select' as const, options: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'], default: 'UTC' },
    ] as FieldConfig[]
  },
  businessHours: {
    label: 'Until Business Hours',
    icon: <Sun className="h-4 w-4" />,
    description: 'Wait until business hours (skip weekends/holidays)',
    color: 'bg-orange-500',
    fields: [
      { key: 'startTime', label: 'Business Start Time', type: 'time' as const, default: '09:00', required: true },
      { key: 'endTime', label: 'Business End Time', type: 'time' as const, default: '17:00', required: true },
      { key: 'timezone', label: 'Timezone', type: 'select' as const, options: ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'], default: 'UTC' },
      { key: 'workdays', label: 'Work Days', type: 'multiselect' as const, options: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
      { key: 'skipHolidays', label: 'Skip Holidays', type: 'boolean' as const, default: true },
    ] as FieldConfig[]
  },
  dynamicDelay: {
    label: 'Dynamic Delay',
    icon: <Zap className="h-4 w-4" />,
    description: 'Calculate delay based on data from previous steps',
    color: 'bg-red-500',
    fields: [
      { key: 'calculation', label: 'Delay Calculation', type: 'text' as const, placeholder: 'trigger.urgency * 60', required: true },
      { key: 'unit', label: 'Result Unit', type: 'select' as const, options: ['seconds', 'minutes', 'hours'], default: 'minutes' },
      { key: 'minDelay', label: 'Minimum Delay', type: 'number' as const, placeholder: '1', default: 0 },
      { key: 'maxDelay', label: 'Maximum Delay', type: 'number' as const, placeholder: '60' },
    ] as FieldConfig[]
  },
  conditional: {
    label: 'Conditional Delay',
    icon: <AlarmClock className="h-4 w-4" />,
    description: 'Different delays based on conditions',
    color: 'bg-gray-600',
    fields: [
      { key: 'condition', label: 'Condition', type: 'text' as const, placeholder: 'trigger.priority === "high"', required: true },
      { key: 'trueDelay', label: 'Delay if True', type: 'number' as const, placeholder: '5', required: true },
      { key: 'falseDelay', label: 'Delay if False', type: 'number' as const, placeholder: '30', required: true },
      { key: 'unit', label: 'Time Unit', type: 'select' as const, options: ['seconds', 'minutes', 'hours'], default: 'minutes' },
    ] as FieldConfig[]
  },
}

interface DelayNodeData {
  label: string
  delayType?: keyof typeof delayTypes
  config: Record<string, any>
  isConfigured?: boolean
  estimatedDelay?: string
  currentStatus?: 'waiting' | 'scheduled' | 'completed'
  scheduledUntil?: string
  executionStats?: {
    totalWaits: number
    averageDelay: number
    lastExecution: string
  }
}

export const DelayNode = memo(({ data, selected }: NodeProps) => {
  const { toast } = useToast()
  const nodeData = data as unknown as DelayNodeData
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState(nodeData.config || {})
  const [localDelayType, setLocalDelayType] = useState<keyof typeof delayTypes>(
    nodeData.delayType || 'duration'
  )

  const currentDelay = delayTypes[localDelayType]
  const isConfigured = nodeData.isConfigured || false

  // Handle configuration save
  const handleSave = () => {
    // Validate required fields
    const requiredFields = currentDelay.fields.filter(field => field.required)
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
    nodeData.delayType = localDelayType
    nodeData.config = localConfig
    nodeData.isConfigured = true
    nodeData.label = getDelayLabel()
    nodeData.estimatedDelay = calculateEstimatedDelay()

    setIsConfigOpen(false)
    
    toast({
      title: "Configuration Saved",
      description: `${currentDelay.label} configured successfully`,
    })
  }

  // Handle field changes
  const handleFieldChange = (key: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Get delay label
  const getDelayLabel = () => {
    switch (localDelayType) {
      case 'duration':
        return `Wait ${localConfig.value || 'X'} ${localConfig.unit || 'minutes'}`
      case 'untilTime':
        return `Wait until ${localConfig.time || 'HH:MM'}`
      case 'untilDate':
        return `Wait until ${localConfig.datetime ? new Date(localConfig.datetime).toLocaleDateString() : 'date'}`
      case 'businessHours':
        return `Wait for business hours`
      case 'dynamicDelay':
        return `Dynamic delay: ${localConfig.calculation || 'formula'}`
      case 'conditional':
        return `Conditional delay`
      default:
        return 'Configure Delay'
    }
  }

  // Calculate estimated delay
  const calculateEstimatedDelay = () => {
    switch (localDelayType) {
      case 'duration':
        const value = localConfig.value || 0
        const unit = localConfig.unit || 'minutes'
        return `${value} ${unit}`
      case 'untilTime':
        return `Until ${localConfig.time || 'HH:MM'} ${localConfig.timezone || 'UTC'}`
      case 'untilDate':
        return localConfig.datetime ? new Date(localConfig.datetime).toLocaleString() : 'Not set'
      case 'businessHours':
        return `Next business day at ${localConfig.startTime || '09:00'}`
      case 'dynamicDelay':
        return 'Calculated at runtime'
      case 'conditional':
        return `${localConfig.trueDelay || 0}/${localConfig.falseDelay || 0} ${localConfig.unit || 'minutes'}`
      default:
        return 'Not configured'
    }
  }

  // Test delay calculation
  const testDelay = async () => {
    toast({
      title: "Testing Delay",
      description: "Calculating delay with current configuration...",
    })

    // Simulate test - in real implementation, this would calculate the actual delay
    setTimeout(() => {
      const mockDelay = Math.floor(Math.random() * 60) + 1
      toast({
        title: "Test Complete",
        description: `Calculated delay: ${mockDelay} minutes from now`,
      })
    }, 1000)
  }

  // Get status color and icon
  const getStatusInfo = () => {
    switch (nodeData.currentStatus) {
      case 'waiting':
        return { color: 'text-yellow-500', icon: <Pause className="h-4 w-4" /> }
      case 'scheduled':
        return { color: 'text-blue-500', icon: <Clock className="h-4 w-4" /> }
      case 'completed':
        return { color: 'text-green-500', icon: <CheckCircle2 className="h-4 w-4" /> }
      default:
        return { color: 'text-gray-500', icon: <Timer className="h-4 w-4" /> }
    }
  }

  const statusInfo = getStatusInfo()

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
        } ${nodeData.currentStatus === 'waiting' ? 'border-yellow-300' : ''}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-md ${currentDelay.color} text-white`}>
                {currentDelay.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {isConfigured ? getDelayLabel() : 'Configure Delay'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {currentDelay.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                Timing
              </Badge>
              
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configure Delay</DialogTitle>
                    <DialogDescription>
                      Set up timing controls for workflow execution
                    </DialogDescription>
                  </DialogHeader>

                  <Tabs defaultValue="config" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="config">Configuration</TabsTrigger>
                      <TabsTrigger value="schedule">Scheduling</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="config" className="space-y-6">
                      {/* Delay Type Selection */}
                      <div>
                        <Label>Delay Type</Label>
                        <Select
                          value={localDelayType}
                          onValueChange={(value: keyof typeof delayTypes) => setLocalDelayType(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(delayTypes).map(([key, delay]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  {delay.icon}
                                  <div>
                                    <div>{delay.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {delay.description}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dynamic Configuration Fields */}
                      <div className="space-y-4">
                        {currentDelay.fields.map((field) => (
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
                                      {option.replace('_', ' ')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {field.type === 'multiselect' && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {field.options?.map((option) => {
                                  const selected = (localConfig[field.key] || field.default || []).includes(option)
                                  return (
                                    <Button
                                      key={option}
                                      variant={selected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => {
                                        const current = localConfig[field.key] || field.default || []
                                        const updated = selected 
                                          ? current.filter((item: string) => item !== option)
                                          : [...current, option]
                                        handleFieldChange(field.key, updated)
                                      }}
                                    >
                                      {option.charAt(0).toUpperCase() + option.slice(1)}
                                    </Button>
                                  )
                                })}
                              </div>
                            )}

                            {(field.type === 'text' || field.type === 'time' || field.type === 'datetime-local') && (
                              <Input
                                type={field.type}
                                placeholder={field.placeholder}
                                value={localConfig[field.key] || field.default || ''}
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

                      {/* Delay Preview */}
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Delay Preview</h4>
                        <div className="text-sm">
                          <div><strong>Estimated delay:</strong> {calculateEstimatedDelay()}</div>
                          {localDelayType === 'businessHours' && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Will skip weekends and holidays if configured
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="schedule" className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Scheduling Options</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={localConfig.allowWeekends ?? true}
                              onCheckedChange={(checked) => handleFieldChange('allowWeekends', checked)}
                            />
                            <Label>Allow execution on weekends</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={localConfig.respectHolidays ?? false}
                              onCheckedChange={(checked) => handleFieldChange('respectHolidays', checked)}
                            />
                            <Label>Respect holidays (skip execution)</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={localConfig.enableCancellation ?? true}
                              onCheckedChange={(checked) => handleFieldChange('enableCancellation', checked)}
                            />
                            <Label>Allow manual cancellation</Label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Maximum Wait Time (hours)</Label>
                        <Input
                          type="number"
                          value={localConfig.maxWaitHours || 24}
                          onChange={(e) => handleFieldChange('maxWaitHours', parseInt(e.target.value))}
                          placeholder="24"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Workflow will timeout if delay exceeds this limit
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <Label>Error Handling</Label>
                          <Select
                            value={localConfig.errorHandling || 'continue'}
                            onValueChange={(value) => handleFieldChange('errorHandling', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="continue">Continue workflow after timeout</SelectItem>
                              <SelectItem value="fail">Fail workflow on timeout</SelectItem>
                              <SelectItem value="retry">Retry delay calculation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={localConfig.logDelayEvents ?? true}
                            onCheckedChange={(checked) => handleFieldChange('logDelayEvents', checked)}
                          />
                          <Label>Log delay events for debugging</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={localConfig.sendNotifications ?? false}
                            onCheckedChange={(checked) => handleFieldChange('sendNotifications', checked)}
                          />
                          <Label>Send notifications on long delays ({'>'}1 hour)</Label>
                        </div>

                        <div>
                          <Label>Custom Delay Calculation (JavaScript)</Label>
                          <Input
                            placeholder="Optional: return custom delay in seconds"
                            value={localConfig.customCalculation || ''}
                            onChange={(e) => handleFieldChange('customCalculation', e.target.value)}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Action Buttons */}
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={testDelay}>
                      <Play className="h-4 w-4 mr-2" />
                      Test Delay Calculation
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
                <span>Delay configured</span>
              </div>
              
              {/* Show current status */}
              {nodeData.currentStatus && (
                <div className="flex items-center gap-2 text-sm">
                  <div className={`${statusInfo.color}`}>
                    {statusInfo.icon}
                  </div>
                  <span className={statusInfo.color}>
                    Status: {nodeData.currentStatus}
                  </span>
                </div>
              )}

              {/* Show scheduled time */}
              {nodeData.scheduledUntil && (
                <div className="text-xs text-muted-foreground">
                  Scheduled until: {new Date(nodeData.scheduledUntil).toLocaleString()}
                </div>
              )}

              {/* Show execution stats */}
              {nodeData.executionStats && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Total waits: {nodeData.executionStats.totalWaits}</div>
                  <div>Avg delay: {nodeData.executionStats.averageDelay}min</div>
                </div>
              )}

              {/* Show estimated delay */}
              <div className="text-xs text-muted-foreground">
                Estimated: {nodeData.estimatedDelay || calculateEstimatedDelay()}
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

DelayNode.displayName = 'DelayNode'