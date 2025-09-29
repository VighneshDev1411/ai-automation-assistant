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
  GitBranch,
  Filter,
  Code2,
  Zap,
  Settings,
  Play,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

// Condition operators
const operators = {
  // String operators
  equals: { label: 'equals', types: ['string', 'number'], symbol: '=' },
  notEquals: { label: 'not equals', types: ['string', 'number'], symbol: '≠' },
  contains: { label: 'contains', types: ['string'], symbol: '⊃' },
  notContains: { label: 'not contains', types: ['string'], symbol: '⊅' },
  startsWith: { label: 'starts with', types: ['string'], symbol: '⊢' },
  endsWith: { label: 'ends with', types: ['string'], symbol: '⊣' },
  isEmpty: { label: 'is empty', types: ['string'], symbol: '∅' },
  isNotEmpty: { label: 'is not empty', types: ['string'], symbol: '≢∅' },
  
  // Number operators
  greaterThan: { label: 'greater than', types: ['number'], symbol: '>' },
  lessThan: { label: 'less than', types: ['number'], symbol: '<' },
  greaterThanOrEqual: { label: 'greater than or equal', types: ['number'], symbol: '≥' },
  lessThanOrEqual: { label: 'less than or equal', types: ['number'], symbol: '≤' },
  
  // Boolean operators
  isTrue: { label: 'is true', types: ['boolean'], symbol: '✓' },
  isFalse: { label: 'is false', types: ['boolean'], symbol: '✗' },
  
  // Array operators
  arrayContains: { label: 'array contains', types: ['array'], symbol: '∋' },
  arrayNotContains: { label: 'array not contains', types: ['array'], symbol: '∌' },
  arrayLength: { label: 'array length', types: ['array'], symbol: '|A|' },
  
  // Date operators
  dateAfter: { label: 'after date', types: ['date'], symbol: '▷' },
  dateBefore: { label: 'before date', types: ['date'], symbol: '◁' },
  dateWithinDays: { label: 'within days', types: ['date'], symbol: '±' },
  
  // Regex
  matchesRegex: { label: 'matches regex', types: ['string'], symbol: '/.*/' },
}

interface ConditionRule {
  id: string
  field: string
  operator: keyof typeof operators
  value: string
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'date'
}

interface ConditionGroup {
  id: string
  logic: 'AND' | 'OR'
  rules: ConditionRule[]
  groups?: ConditionGroup[]
}

interface ConditionNodeData {
  label: string
  conditionType: 'simple' | 'advanced' | 'code'
  conditions: ConditionGroup
  customCode?: string
  isConfigured?: boolean
  trueCount?: number
  falseCount?: number
}

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const { toast } = useToast()
  const nodeData = data as unknown as ConditionNodeData
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [localConditions, setLocalConditions] = useState<ConditionGroup>(
    nodeData.conditions || {
      id: 'root',
      logic: 'AND',
      rules: [{
        id: 'rule_1',
        field: '',
        operator: 'equals',
        value: '',
        dataType: 'string'
      }]
    }
  )
  const [conditionType, setConditionType] = useState(nodeData.conditionType || 'simple')
  const [customCode, setCustomCode] = useState(nodeData.customCode || '')

  const isConfigured = nodeData.isConfigured || false

  // Add new rule
  const addRule = (groupId: string) => {
    const newRule: ConditionRule = {
      id: `rule_${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
      dataType: 'string'
    }

    const updateGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          rules: [...group.rules, newRule]
        }
      }
      return {
        ...group,
        groups: group.groups?.map(updateGroup)
      }
    }

    setLocalConditions(updateGroup(localConditions))
  }

  // Remove rule
  const removeRule = (groupId: string, ruleId: string) => {
    const updateGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          rules: group.rules.filter(rule => rule.id !== ruleId)
        }
      }
      return {
        ...group,
        groups: group.groups?.map(updateGroup)
      }
    }

    setLocalConditions(updateGroup(localConditions))
  }

  // Update rule
  const updateRule = (groupId: string, ruleId: string, updates: Partial<ConditionRule>) => {
    const updateGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          rules: group.rules.map(rule => 
            rule.id === ruleId ? { ...rule, ...updates } : rule
          )
        }
      }
      return {
        ...group,
        groups: group.groups?.map(updateGroup)
      }
    }

    setLocalConditions(updateGroup(localConditions))
  }

  // Toggle group logic
  const toggleGroupLogic = (groupId: string) => {
    const updateGroup = (group: ConditionGroup): ConditionGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          logic: group.logic === 'AND' ? 'OR' : 'AND'
        }
      }
      return {
        ...group,
        groups: group.groups?.map(updateGroup)
      }
    }

    setLocalConditions(updateGroup(localConditions))
  }

  // Save configuration
  const handleSave = () => {
    if (conditionType === 'code' && !customCode.trim()) {
      toast({
        title: "Configuration Error",
        description: "Please provide custom code for condition evaluation",
        variant: "destructive",
      })
      return
    }

    if (conditionType !== 'code') {
      const hasEmptyRules = localConditions.rules.some(rule => !rule.field || !rule.value)
      if (hasEmptyRules) {
        toast({
          title: "Configuration Error",
          description: "Please fill in all condition fields",
          variant: "destructive",
        })
        return
      }
    }

    // Update node data
    nodeData.conditionType = conditionType
    nodeData.conditions = localConditions
    nodeData.customCode = customCode
    nodeData.isConfigured = true
    nodeData.label = getConditionLabel()

    setIsConfigOpen(false)
    
    toast({
      title: "Configuration Saved",
      description: "Condition logic configured successfully",
    })
  }

  // Get condition label
  const getConditionLabel = () => {
    if (conditionType === 'code') return 'Custom Code Condition'
    if (localConditions.rules.length === 1) {
      const rule = localConditions.rules[0]
      return rule.field ? `If ${rule.field} ${operators[rule.operator].label}...` : 'If condition...'
    }
    return `If ${localConditions.rules.length} conditions (${localConditions.logic})`
  }

  // Test condition
  const testCondition = async () => {
    toast({
      title: "Testing Condition",
      description: "Evaluating condition with sample data...",
    })

    // Simulate test - in real implementation, this would evaluate the condition
    setTimeout(() => {
      const result = Math.random() > 0.5 // Random result for demo
      toast({
        title: "Test Complete",
        description: `Condition evaluated to: ${result ? 'TRUE' : 'FALSE'}`,
      })
    }, 1500)
  }

  // Render condition rule
  const renderRule = (rule: ConditionRule, groupId: string) => (
    <div key={rule.id} className="flex items-center gap-2 p-3 bg-background border rounded-lg">
      <Input
        placeholder="Field name (e.g., trigger.name)"
        value={rule.field}
        onChange={(e) => updateRule(groupId, rule.id, { field: e.target.value })}
        className="flex-1"
      />
      
      <Select
        value={rule.operator}
        onValueChange={(value: keyof typeof operators) => 
          updateRule(groupId, rule.id, { operator: value })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(operators)
            .filter(([_, op]) => op.types.includes(rule.dataType))
            .map(([key, op]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2">
                  <code className="text-xs">{op.symbol}</code>
                  {op.label}
                </span>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select
        value={rule.dataType}
        onValueChange={(value: any) => updateRule(groupId, rule.id, { dataType: value })}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="string">Text</SelectItem>
          <SelectItem value="number">Number</SelectItem>
          <SelectItem value="boolean">Boolean</SelectItem>
          <SelectItem value="array">Array</SelectItem>
          <SelectItem value="date">Date</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Value"
        value={rule.value}
        onChange={(e) => updateRule(groupId, rule.id, { value: e.target.value })}
        className="flex-1"
      />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => removeRule(groupId, rule.id)}
        disabled={localConditions.rules.length === 1}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )

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
              <div className="p-2 rounded-md bg-orange-500 text-white">
                <GitBranch className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {isConfigured ? getConditionLabel() : 'Configure Condition'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Branch workflow based on conditions
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                Logic
              </Badge>
              
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configure Condition Logic</DialogTitle>
                    <DialogDescription>
                      Set up the conditions that determine workflow branching
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Condition Type Selection */}
                    <div>
                      <Label>Condition Type</Label>
                      <Select
                        value={conditionType}
                        onValueChange={(value: any) => setConditionType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4" />
                              Simple Conditions
                            </div>
                          </SelectItem>
                          <SelectItem value="advanced">
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-4 w-4" />
                              Advanced Logic
                            </div>
                          </SelectItem>
                          <SelectItem value="code">
                            <div className="flex items-center gap-2">
                              <Code2 className="h-4 w-4" />
                              Custom Code
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Simple/Advanced Conditions */}
                    {(conditionType === 'simple' || conditionType === 'advanced') && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Condition Rules</h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleGroupLogic('root')}
                            >
                              {localConditions.logic}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addRule('root')}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Rule
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {localConditions.rules.map((rule, index) => (
                            <div key={rule.id}>
                              {index > 0 && (
                                <div className="flex justify-center py-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {localConditions.logic}
                                  </Badge>
                                </div>
                              )}
                              {renderRule(rule, 'root')}
                            </div>
                          ))}
                        </div>

                        {/* Preview */}
                        <div className="p-4 bg-muted rounded-lg">
                          <h5 className="font-medium mb-2">Condition Preview</h5>
                          <div className="text-sm font-mono">
                            {localConditions.rules.map((rule, index) => (
                              <div key={rule.id}>
                                {index > 0 && <span className="text-blue-600"> {localConditions.logic} </span>}
                                <span>
                                  {rule.field || 'field'} {operators[rule.operator].symbol} {rule.value || 'value'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Code */}
                    {conditionType === 'code' && (
                      <div className="space-y-4">
                        <div>
                          <Label>Custom JavaScript Code</Label>
                          <p className="text-sm text-muted-foreground mb-2">
                            Write JavaScript code that returns true or false. Available variables: trigger, previous, user
                          </p>
                          <Textarea
                            placeholder={`function evaluate(data) {
  // Your condition logic here
  // Available: data.trigger, data.previous, data.user
  
  if (data.trigger.amount > 1000) {
    return true; // TRUE path
  }
  
  return false; // FALSE path
}`}
                            value={customCode}
                            onChange={(e) => setCustomCode(e.target.value)}
                            rows={12}
                            className="font-mono text-sm"
                          />
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h5 className="font-medium text-blue-900 mb-2">Available Data</h5>
                          <div className="text-sm text-blue-800 space-y-1">
                            <div><code>data.trigger</code> - Data from workflow trigger</div>
                            <div><code>data.previous</code> - Output from previous step</div>
                            <div><code>data.user</code> - Current user information</div>
                            <div><code>data.workflow</code> - Workflow metadata</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Variable Helper */}
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Variable Reference</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium mb-1">Trigger Data</h5>
                          <div className="space-y-1 text-muted-foreground">
                            <div><code>trigger.field_name</code></div>
                            <div><code>trigger.amount</code></div>
                            <div><code>trigger.email</code></div>
                          </div>
                        </div>
                        <div>
                          <h5 className="font-medium mb-1">Previous Step</h5>
                          <div className="space-y-1 text-muted-foreground">
                            <div><code>previous.output</code></div>
                            <div><code>previous.status</code></div>
                            <div><code>previous.data</code></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={testCondition}>
                        <Play className="h-4 w-4 mr-2" />
                        Test Condition
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
                <span>Logic configured</span>
              </div>
              
              {/* Show execution stats */}
              {(nodeData.trueCount || nodeData.falseCount) && (
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>True: {nodeData.trueCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>False: {nodeData.falseCount || 0}</span>
                  </div>
                </div>
              )}

              {/* Show condition summary */}
              <div className="text-xs text-muted-foreground">
                {conditionType === 'code' ? (
                  <span>Custom JavaScript logic</span>
                ) : (
                  <span>
                    {localConditions.rules.length} rule{localConditions.rules.length !== 1 ? 's' : ''} 
                    ({localConditions.logic})
                  </span>
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

      {/* Output Handles - TRUE and FALSE paths */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{
          background: '#10b981',
          width: 12,
          height: 12,
          border: '2px solid white',
          top: '30%',
        }}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{
          background: '#ef4444',
          width: 12,
          height: 12,
          border: '2px solid white',
          top: '70%',
        }}
      />

      {/* Output Labels */}
      <div className="absolute -right-8 top-[25%] text-xs text-green-600 font-medium">
        TRUE
      </div>
      <div className="absolute -right-8 top-[65%] text-xs text-red-600 font-medium">
        FALSE
      </div>
    </>
  )
})

ConditionNode.displayName = 'ConditionNode'