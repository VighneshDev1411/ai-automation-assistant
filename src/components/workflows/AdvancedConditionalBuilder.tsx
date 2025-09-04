import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  Trash2,
  Copy,
  Play,
  Settings,
  Filter,
  Calendar,
  Type,
  FileText,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

// Types
interface AdvancedCondition {
  id: string
  type: 'simple' | 'complex' | 'filter' | 'custom'
  field?: string
  operator: string
  value: any
  conditions?: AdvancedCondition[]
  customFunction?: string
  metadata?: {
    name?: string
    description?: string
    priority?: number
    tags?: string[]
  }
}

interface FilterConfig {
  id: string
  name: string
  field: string
  operator: string
  value: any
  enabled: boolean
  priority?: number
}

// Operator definitions
const OPERATORS = {
  basic: [
    { value: 'equals', label: 'Equals', icon: '=' },
    { value: 'not_equals', label: 'Not Equals', icon: '≠' },
    { value: 'contains', label: 'Contains', icon: '⊃' },
    { value: 'not_contains', label: 'Not Contains', icon: '⊅' },
    { value: 'starts_with', label: 'Starts With', icon: 'A*' },
    { value: 'ends_with', label: 'Ends With', icon: '*A' },
    { value: 'matches_regex', label: 'Matches Regex', icon: '.*' },
  ],
  numeric: [
    { value: 'greater_than', label: 'Greater Than', icon: '>' },
    {
      value: 'greater_than_or_equal',
      label: 'Greater Than or Equal',
      icon: '≥',
    },
    { value: 'less_than', label: 'Less Than', icon: '<' },
    { value: 'less_than_or_equal', label: 'Less Than or Equal', icon: '≤' },
    { value: 'between', label: 'Between', icon: '⟷' },
    { value: 'not_between', label: 'Not Between', icon: '⟷̸' },
  ],
  array: [
    { value: 'in', label: 'In Array', icon: '∈' },
    { value: 'not_in', label: 'Not In Array', icon: '∉' },
    { value: 'includes_any', label: 'Includes Any', icon: '⋂' },
    { value: 'includes_all', label: 'Includes All', icon: '⋃' },
    { value: 'array_length_equals', label: 'Array Length Equals', icon: '#=' },
    { value: 'array_length_greater_than', label: 'Array Length >', icon: '#>' },
  ],
  existence: [
    { value: 'exists', label: 'Exists', icon: '∃' },
    { value: 'not_exists', label: 'Not Exists', icon: '∄' },
    { value: 'is_null', label: 'Is Null', icon: '∅' },
    { value: 'is_not_null', label: 'Is Not Null', icon: '∅̸' },
    { value: 'is_empty', label: 'Is Empty', icon: '□' },
    { value: 'is_not_empty', label: 'Is Not Empty', icon: '■' },
  ],
  date: [
    { value: 'date_equals', label: 'Date Equals', icon: '📅=' },
    { value: 'date_after', label: 'Date After', icon: '📅>' },
    { value: 'date_before', label: 'Date Before', icon: '📅<' },
    { value: 'date_between', label: 'Date Between', icon: '📅⟷' },
    { value: 'date_is_today', label: 'Is Today', icon: '📅🕐' },
    { value: 'date_is_this_week', label: 'Is This Week', icon: '📅📆' },
  ],
  logical: [
    { value: 'and', label: 'AND', icon: '∧' },
    { value: 'or', label: 'OR', icon: '∨' },
    { value: 'not', label: 'NOT', icon: '¬' },
    { value: 'xor', label: 'XOR', icon: '⊕' },
  ],
}

// Single Condition Builder Component
const ConditionBuilder: React.FC<{
  condition: AdvancedCondition
  onUpdate: (condition: AdvancedCondition) => void
  onDelete: () => void
  fields: string[]
}> = ({ condition, onUpdate, onDelete, fields }) => {
  const [expanded, setExpanded] = useState(true)

  const getOperatorsByCategory = () => {
    return Object.entries(OPERATORS).map(([category, ops]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      operators: ops,
    }))
  }

  const handleFieldChange = (field: string) => {
    onUpdate({
      ...condition,
      field,
      value: condition.type === 'simple' ? '' : condition.value,
    })
  }

  const handleOperatorChange = (operator: string) => {
    onUpdate({
      ...condition,
      operator,
      value: getDefaultValueForOperator(operator),
    })
  }

  const handleValueChange = (value: any) => {
    onUpdate({
      ...condition,
      value,
    })
  }

  const getDefaultValueForOperator = (operator: string) => {
    switch (operator) {
      case 'between':
      case 'not_between':
      case 'date_between':
        return ['', '']
      case 'in':
      case 'not_in':
      case 'includes_any':
      case 'includes_all':
        return []
      default:
        return ''
    }
  }

  const renderValueInput = () => {
    const { operator, value } = condition

    if (
      [
        'exists',
        'not_exists',
        'is_null',
        'is_not_null',
        'is_empty',
        'is_not_empty',
        'date_is_today',
        'date_is_this_week',
      ].includes(operator)
    ) {
      return (
        <div className="text-sm text-muted-foreground italic">
          No value required
        </div>
      )
    }

    if (['between', 'not_between', 'date_between'].includes(operator)) {
      return (
        <div className="flex items-center gap-2">
          <Input
            placeholder="From"
            value={value[0] || ''}
            onChange={e => handleValueChange([e.target.value, value[1] || ''])}
            className="flex-1"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            placeholder="To"
            value={value[1] || ''}
            onChange={e => handleValueChange([value[0] || '', e.target.value])}
            className="flex-1"
          />
        </div>
      )
    }

    if (['in', 'not_in', 'includes_any', 'includes_all'].includes(operator)) {
      return (
        <Textarea
          placeholder="Enter values separated by commas"
          value={Array.isArray(value) ? value.join(', ') : ''}
          onChange={e =>
            handleValueChange(
              e.target.value
                .split(',')
                .map(v => v.trim())
                .filter(v => v)
            )
          }
          className="min-h-[80px]"
        />
      )
    }

    if (operator.startsWith('date_')) {
      return (
        <Input
          type="date"
          value={value}
          onChange={e => handleValueChange(e.target.value)}
        />
      )
    }

    if (
      [
        'array_length_equals',
        'array_length_greater_than',
        'array_length_less_than',
      ].includes(operator)
    ) {
      return (
        <Input
          type="number"
          placeholder="Number"
          value={value}
          onChange={e => handleValueChange(Number(e.target.value))}
        />
      )
    }

    return (
      <Input
        placeholder="Enter value"
        value={value}
        onChange={e => handleValueChange(e.target.value)}
      />
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="p-1 h-6 w-6"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <Badge variant="outline" className="text-xs">
              {condition.type}
            </Badge>
            <span className="text-sm font-medium">
              {condition.metadata?.name ||
                `Condition ${condition.id.slice(-4)}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-1">
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 w-6 p-1 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Field Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Field</Label>
              <Select
                value={condition.field || ''}
                onValueChange={handleFieldChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {fields.map(field => (
                    <SelectItem key={field} value={field}>
                      <div className="flex items-center gap-2">
                        <Type className="h-3 w-3" />
                        {field}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operator Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Operator</Label>
              <Select
                value={condition.operator}
                onValueChange={handleOperatorChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  {getOperatorsByCategory().map(category => (
                    <div key={category.category}>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                        {category.category}
                      </div>
                      {category.operators.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{op.icon}</span>
                            {op.label}
                          </div>
                        </SelectItem>
                      ))}
                      <Separator className="my-1" />
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Value Input */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Value</Label>
              {renderValueInput()}
            </div>

            {/* Metadata */}
            {condition.metadata && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Metadata</Label>
                <div className="flex flex-wrap gap-1">
                  {condition.metadata.tags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {condition.metadata.priority && (
                    <Badge variant="outline" className="text-xs">
                      Priority: {condition.metadata.priority}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Complex Condition Builder (for logical operators)
const ComplexConditionBuilder: React.FC<{
  condition: AdvancedCondition
  onUpdate: (condition: AdvancedCondition) => void
  onDelete: () => void
  fields: string[]
}> = ({ condition, onUpdate, onDelete, fields }) => {
  const [expanded, setExpanded] = useState(true)

  const addSubCondition = () => {
    const newCondition: AdvancedCondition = {
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'simple',
      operator: 'equals',
      value: '',
    }

    onUpdate({
      ...condition,
      conditions: [...(condition.conditions || []), newCondition],
    })
  }

  const updateSubCondition = (
    index: number,
    subCondition: AdvancedCondition
  ) => {
    const newConditions = [...(condition.conditions || [])]
    newConditions[index] = subCondition
    onUpdate({
      ...condition,
      conditions: newConditions,
    })
  }

  const deleteSubCondition = (index: number) => {
    const newConditions = [...(condition.conditions || [])]
    newConditions.splice(index, 1)
    onUpdate({
      ...condition,
      conditions: newConditions,
    })
  }

  return (
    <Card className="w-full border-2 border-dashed">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="p-1 h-6 w-6"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <Badge variant="secondary" className="text-xs">
              Complex
            </Badge>
            <Select
              value={condition.operator}
              onValueChange={op => onUpdate({ ...condition, operator: op })}
            >
              <SelectTrigger className="w-20 h-6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.logical.map(op => (
                  <SelectItem key={op.value} value={op.value}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{op.icon}</span>
                      {op.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={addSubCondition}
              className="h-6 w-6 p-1"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 w-6 p-1 text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {condition.conditions?.map((subCondition, index) => (
              <div key={subCondition.id} className="relative">
                {index > 0 && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge variant="outline" className="text-xs bg-background">
                      {condition.operator.toUpperCase()}
                    </Badge>
                  </div>
                )}
                {subCondition.type === 'complex' ? (
                  <ComplexConditionBuilder
                    condition={subCondition}
                    onUpdate={updated => updateSubCondition(index, updated)}
                    onDelete={() => deleteSubCondition(index)}
                    fields={fields}
                  />
                ) : (
                  <ConditionBuilder
                    condition={subCondition}
                    onUpdate={updated => updateSubCondition(index, updated)}
                    onDelete={() => deleteSubCondition(index)}
                    fields={fields}
                  />
                )}
              </div>
            ))}

            {(!condition.conditions || condition.conditions.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conditions yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSubCondition}
                  className="mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Condition
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Filter Builder Component
const FilterBuilder: React.FC<{
  filters: FilterConfig[]
  onUpdate: (filters: FilterConfig[]) => void
  fields: string[]
}> = ({ filters, onUpdate, fields }) => {
  const [expanded, setExpanded] = useState(true)

  const addFilter = () => {
    const newFilter: FilterConfig = {
      id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Filter ${filters.length + 1}`,
      field: '',
      operator: 'equals',
      value: '',
      enabled: true,
      priority: 1,
    }
    onUpdate([...filters, newFilter])
  }

  const updateFilter = (index: number, filter: FilterConfig) => {
    const newFilters = [...filters]
    newFilters[index] = filter
    onUpdate(newFilters)
  }

  const deleteFilter = (index: number) => {
    const newFilters = [...filters]
    newFilters.splice(index, 1)
    onUpdate(newFilters)
  }

  return (
    <Card className="w-full border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="p-1 h-6 w-6"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <Filter className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">
              Filters ({filters.length})
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={addFilter}>
            <Plus className="h-3 w-3 mr-1" />
            Add Filter
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {filters.map((filter, index) => (
              <Card key={filter.id} className="border border-muted">
                <CardContent className="pt-4 pb-4">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Enable/Disable Toggle */}
                    <div className="col-span-1">
                      <Switch
                        checked={filter.enabled}
                        onCheckedChange={enabled =>
                          updateFilter(index, { ...filter, enabled })
                        }
                      />
                    </div>

                    {/* Filter Name */}
                    <div className="col-span-2">
                      <Input
                        placeholder="Filter name"
                        value={filter.name}
                        onChange={e =>
                          updateFilter(index, {
                            ...filter,
                            name: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Field */}
                    <div className="col-span-2">
                      <Select
                        value={filter.field}
                        onValueChange={field =>
                          updateFilter(index, { ...filter, field })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {fields.map(field => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator */}
                    <div className="col-span-2">
                      <Select
                        value={filter.operator}
                        onValueChange={operator =>
                          updateFilter(index, { ...filter, operator })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(OPERATORS).map(([category, ops]) => (
                            <div key={category}>
                              {ops.slice(0, 3).map(op => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Value */}
                    <div className="col-span-3">
                      <Input
                        placeholder="Value"
                        value={filter.value}
                        onChange={e =>
                          updateFilter(index, {
                            ...filter,
                            value: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Priority */}
                    <div className="col-span-1">
                      <Input
                        type="number"
                        placeholder="1"
                        value={filter.priority || 1}
                        onChange={e =>
                          updateFilter(index, {
                            ...filter,
                            priority: Number(e.target.value),
                          })
                        }
                        className="h-8 text-xs"
                        min="1"
                        max="10"
                      />
                    </div>

                    {/* Delete */}
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFilter(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filters.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No filters configured</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFilter}
                  className="mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Filter
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Main Advanced Conditional Builder
const AdvancedConditionalBuilder: React.FC = () => {
  const [conditions, setConditions] = useState<AdvancedCondition[]>([])
  const [filters, setFilters] = useState<FilterConfig[]>([])
  const [testResult, setTestResult] = useState<any>(null)
  const [isTestingConditions, setIsTestingConditions] = useState(false)

  // Sample fields for demonstration
  const availableFields = [
    'user.email',
    'user.name',
    'user.age',
    'user.department',
    'order.total',
    'order.items',
    'order.date',
    'trigger.timestamp',
    'previous_step.result',
    'workflow.status',
  ]

  const addCondition = (type: 'simple' | 'complex' = 'simple') => {
    const newCondition: AdvancedCondition = {
      id: `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      operator: type === 'complex' ? 'and' : 'equals',
      value: type === 'complex' ? null : '',
      conditions: type === 'complex' ? [] : undefined,
      metadata: {
        name: `${type === 'complex' ? 'Complex' : 'Simple'} Condition ${conditions.length + 1}`,
        priority: 1,
      },
    }
    setConditions([...conditions, newCondition])
  }

  const updateCondition = (index: number, condition: AdvancedCondition) => {
    const newConditions = [...conditions]
    newConditions[index] = condition
    setConditions(newConditions)
  }

  const deleteCondition = (index: number) => {
    const newConditions = [...conditions]
    newConditions.splice(index, 1)
    setConditions(newConditions)
  }

  const testConditions = async () => {
    setIsTestingConditions(true)

    // Simulate testing with mock data
    setTimeout(() => {
      const mockResult = {
        success: true,
        results: conditions.map(condition => ({
          conditionId: condition.id,
          passed: Math.random() > 0.3,
          executionTime: Math.random() * 100,
          details: `Evaluated ${condition.type} condition`,
        })),
        filters: {
          passed: Math.random() > 0.2,
          matchedCount: Math.floor(Math.random() * filters.length),
          totalCount: filters.length,
        },
      }
      setTestResult(mockResult)
      setIsTestingConditions(false)
    }, 2000)
  }

  const exportConfiguration = () => {
    const config = {
      conditions,
      filters,
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0',
      },
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'advanced-conditions.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Advanced Conditionals & Filters
          </h1>
          <p className="text-muted-foreground">
            Build complex conditional logic with advanced operators and
            filtering capabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportConfiguration}>
            <FileText className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={testConditions} disabled={isTestingConditions}>
            {isTestingConditions ? (
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Test Conditions
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addCondition('simple')}
            >
              <Plus className="h-3 w-3 mr-1" />
              Simple Condition
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addCondition('complex')}
            >
              <Plus className="h-3 w-3 mr-1" />
              Complex Condition
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters([
                  ...filters,
                  {
                    id: `filter_${Date.now()}`,
                    name: 'Email Filter',
                    field: 'user.email',
                    operator: 'matches_regex',
                    value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
                    enabled: true,
                    priority: 1,
                  },
                ])
              }
            >
              <Filter className="h-3 w-3 mr-1" />
              Email Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters([
                  ...filters,
                  {
                    id: `filter_${Date.now()}`,
                    name: 'Date Range',
                    field: 'order.date',
                    operator: 'date_between',
                    value: [
                      new Date().toISOString().split('T')[0],
                      new Date().toISOString().split('T')[0],
                    ],
                    enabled: true,
                    priority: 1,
                  },
                ])
              }
            >
              <Calendar className="h-3 w-3 mr-1" />
              Date Range
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conditions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Conditions ({conditions.length})
          </h2>
          <Badge variant="outline">
            {conditions.filter(c => c.type === 'simple').length} Simple,{' '}
            {conditions.filter(c => c.type === 'complex').length} Complex
          </Badge>
        </div>

        {conditions.map((condition, index) => (
          <div key={condition.id}>
            {condition.type === 'complex' ? (
              <ComplexConditionBuilder
                condition={condition}
                onUpdate={updated => updateCondition(index, updated)}
                onDelete={() => deleteCondition(index)}
                fields={availableFields}
              />
            ) : (
              <ConditionBuilder
                condition={condition}
                onUpdate={updated => updateCondition(index, updated)}
                onDelete={() => deleteCondition(index)}
                fields={availableFields}
              />
            )}
          </div>
        ))}

        {conditions.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  No Conditions Configured
                </h3>
                <p className="text-sm mb-4">
                  Add simple or complex conditions to build your workflow logic
                </p>
                <div className="flex justify-center gap-2">
                  <Button onClick={() => addCondition('simple')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Simple Condition
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addCondition('complex')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Complex Condition
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters Section */}
      <FilterBuilder
        filters={filters}
        onUpdate={setFilters}
        fields={availableFields}
      />

      {/* Test Results */}
      {testResult && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <CardTitle className="text-base">Test Results</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Condition Results */}
              <div>
                <h4 className="text-sm font-medium mb-2">Condition Results</h4>
                <div className="space-y-2">
                  {testResult.results.map((result: any, index: number) => (
                    <div
                      key={result.conditionId}
                      className="flex items-center justify-between p-2 rounded border"
                    >
                      <span className="text-sm">Condition {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={result.passed ? 'default' : 'destructive'}
                        >
                          {result.passed ? 'Passed' : 'Failed'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {result.executionTime.toFixed(1)}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter Results */}
              {testResult.filters && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Filter Results</h4>
                  <div className="p-2 rounded border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {testResult.filters.matchedCount} of{' '}
                        {testResult.filters.totalCount} filters matched
                      </span>
                      <Badge
                        variant={
                          testResult.filters.passed ? 'default' : 'destructive'
                        }
                      >
                        {testResult.filters.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 border rounded">
              <div className="text-2xl font-bold text-blue-500">
                {conditions.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Conditions
              </div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-2xl font-bold text-green-500">
                {filters.filter(f => f.enabled).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Active Filters
              </div>
            </div>
            <div className="p-4 border rounded">
              <div className="text-2xl font-bold text-purple-500">
                {
                  [
                    ...new Set(
                      [
                        ...conditions.map(c => c.field),
                        ...filters.map(f => f.field),
                      ].filter(Boolean)
                    ),
                  ].length
                }
              </div>
              <div className="text-sm text-muted-foreground">Unique Fields</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdvancedConditionalBuilder
