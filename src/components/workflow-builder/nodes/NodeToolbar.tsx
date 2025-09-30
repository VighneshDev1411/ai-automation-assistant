'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Zap,
  Play,
  GitBranch,
  Bot,
  Clock,
  Webhook,
  Mail,
  Database,
  FileText,
  MessageSquare,
  Calendar,
  Image,
  Code,
  Link,
  BarChart3,
  Filter,
  Shuffle,
  Settings,
  Plus,
  Search,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState } from 'react'

// Node category definitions
interface NodeTemplate {
  id: string
  type: string
  label: string
  description: string
  icon: React.ReactNode
  category: string
  color: string
  isPopular?: boolean
  isPro?: boolean
}

const nodeTemplates: NodeTemplate[] = [
  // Triggers
  {
    id: 'webhook-trigger',
    type: 'trigger',
    label: 'Webhook',
    description: 'Trigger when HTTP request received',
    icon: <Webhook className="h-4 w-4" />,
    category: 'Triggers',
    color: 'bg-green-500',
    isPopular: true,
  },
  {
    id: 'schedule-trigger',
    type: 'trigger',
    label: 'Schedule',
    description: 'Trigger on a schedule (cron)',
    icon: <Clock className="h-4 w-4" />,
    category: 'Triggers',
    color: 'bg-green-500',
    isPopular: true,
  },
  {
    id: 'email-trigger',
    type: 'trigger',
    label: 'Email Received',
    description: 'Trigger when email is received',
    icon: <Mail className="h-4 w-4" />,
    category: 'Triggers',
    color: 'bg-green-500',
  },
  {
    id: 'file-trigger',
    type: 'trigger',
    label: 'File Upload',
    description: 'Trigger when file is uploaded',
    icon: <FileText className="h-4 w-4" />,
    category: 'Triggers',
    color: 'bg-green-500',
  },
  
  // Actions
  {
    id: 'send-email',
    type: 'action',
    label: 'Send Email',
    description: 'Send email via Gmail/Outlook',
    icon: <Mail className="h-4 w-4" />,
    category: 'Actions',
    color: 'bg-blue-500',
    isPopular: true,
  },
  {
    id: 'create-record',
    type: 'action',
    label: 'Create Record',
    description: 'Create record in database/CRM',
    icon: <Database className="h-4 w-4" />,
    category: 'Actions',
    color: 'bg-blue-500',
    isPopular: true,
  },
  {
    id: 'send-slack',
    type: 'action',
    label: 'Send Slack Message',
    description: 'Send message to Slack channel',
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'Actions',
    color: 'bg-blue-500',
    isPopular: true,
  },
  {
    id: 'create-calendar',
    type: 'action',
    label: 'Create Calendar Event',
    description: 'Create event in Google/Outlook calendar',
    icon: <Calendar className="h-4 w-4" />,
    category: 'Actions',
    color: 'bg-blue-500',
  },
  {
    id: 'upload-file',
    type: 'action',
    label: 'Upload File',
    description: 'Upload file to cloud storage',
    icon: <FileText className="h-4 w-4" />,
    category: 'Actions',
    color: 'bg-blue-500',
  },
  {
    id: 'call-api',
    type: 'action',
    label: 'API Call',
    description: 'Make HTTP request to any API',
    icon: <Link className="h-4 w-4" />,
    category: 'Actions',
    color: 'bg-blue-500',
  },

  // AI Agents
  {
    id: 'ai-text-analysis',
    type: 'aiAgent',
    label: 'Text Analysis',
    description: 'Analyze text with AI (sentiment, extract data)',
    icon: <Bot className="h-4 w-4" />,
    category: 'AI Agents',
    color: 'bg-purple-500',
    isPopular: true,
    isPro: true,
  },
  {
    id: 'ai-content-generation',
    type: 'aiAgent',
    label: 'Content Generation',
    description: 'Generate content with AI (emails, docs)',
    icon: <Bot className="h-4 w-4" />,
    category: 'AI Agents',
    color: 'bg-purple-500',
    isPopular: true,
    isPro: true,
  },
  {
    id: 'ai-image-analysis',
    type: 'aiAgent',
    label: 'Image Analysis',
    description: 'Analyze images with AI vision',
    icon: <Image className="h-4 w-4" />,
    category: 'AI Agents',
    color: 'bg-purple-500',
    isPro: true,
  },
  {
    id: 'ai-data-processing',
    type: 'aiAgent',
    label: 'Data Processing',
    description: 'Process and transform data with AI',
    icon: <BarChart3 className="h-4 w-4" />,
    category: 'AI Agents',
    color: 'bg-purple-500',
    isPro: true,
  },

  // Logic & Control
  {
    id: 'condition',
    type: 'condition',
    label: 'Condition',
    description: 'Branch workflow based on conditions',
    icon: <GitBranch className="h-4 w-4" />,
    category: 'Logic',
    color: 'bg-orange-500',
    isPopular: true,
  },
  {
    id: 'delay',
    type: 'delay',
    label: 'Delay',
    description: 'Wait for specified time',
    icon: <Clock className="h-4 w-4" />,
    category: 'Logic',
    color: 'bg-orange-500',
  },
  {
    id: 'filter',
    type: 'condition',
    label: 'Filter',
    description: 'Filter data based on criteria',
    icon: <Filter className="h-4 w-4" />,
    category: 'Logic',
    color: 'bg-orange-500',
  },
  {
    id: 'transform',
    type: 'action',
    label: 'Transform Data',
    description: 'Transform and map data fields',
    icon: <Shuffle className="h-4 w-4" />,
    category: 'Logic',
    color: 'bg-orange-500',
  },

  // Advanced
  {
    id: 'custom-code',
    type: 'action',
    label: 'Custom Code',
    description: 'Execute custom JavaScript/Python',
    icon: <Code className="h-4 w-4" />,
    category: 'Advanced',
    color: 'bg-red-500',
    isPro: true,
  },
  {
    id: 'webhook-call',
    type: 'webhook',
    label: 'Webhook Call',
    description: 'Call external webhook',
    icon: <Webhook className="h-4 w-4" />,
    category: 'Advanced',
    color: 'bg-red-500',
  },
]

// Group templates by category
const categories = Array.from(new Set(nodeTemplates.map(t => t.category)))

interface NodeToolbarProps {
  className?: string
}

export function NodeToolbar({ className }: NodeToolbarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Filter templates based on search and category
  const filteredTemplates = nodeTemplates.filter(template => {
    const matchesSearch = template.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Handle drag start
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className={`h-full flex flex-col border-r bg-background ${className}`}>
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Plus className="h-4 w-4 text-white" />
          </div>
          <h2 className="font-bold text-lg">Workflow Nodes</h2>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'All' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('All')}
            className="h-8 text-xs font-medium"
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="h-8 text-xs font-medium"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Popular Nodes - Only show when "All" is selected and not searching */}
          {selectedCategory === 'All' && !searchTerm && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-primary"></div>
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Popular</h3>
              </div>
              <div className="grid gap-2">
                {nodeTemplates
                  .filter(template => template.isPopular)
                  .map(template => (
                    <NodeTemplateCard
                      key={`popular-${template.id}`}
                      template={template}
                      onDragStart={onDragStart}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Nodes by Category */}
          {categories.map(category => {
            // Filter templates for this category, excluding popular ones if showing Popular section
            const categoryTemplates = filteredTemplates.filter(
              template => template.category === category &&
                         (selectedCategory === 'All' || selectedCategory === category) &&
                         !(selectedCategory === 'All' && !searchTerm && template.isPopular)
            )

            if (categoryTemplates.length === 0) return null

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary"></div>
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {category}
                  </h3>
                </div>
                <div className="grid gap-2">
                  {categoryTemplates.map(template => (
                    <NodeTemplateCard
                      key={template.id}
                      template={template}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No nodes found</p>
              <p className="text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Individual node template card component
interface NodeTemplateCardProps {
  template: NodeTemplate
  onDragStart: (event: React.DragEvent, nodeType: string) => void
}

function NodeTemplateCard({ template, onDragStart }: NodeTemplateCardProps) {
  return (
    <div
      className="p-3 border rounded-lg cursor-grab hover:shadow-md hover:border-primary/50 transition-all group relative bg-background/50 hover:bg-background"
      draggable
      onDragStart={(event) => onDragStart(event, template.type)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-9 h-9 rounded-lg ${template.color} text-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
          {template.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm leading-tight">{template.label}</h4>
            {template.isPro && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 flex-shrink-0">
                Pro
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
            {template.description}
          </p>
        </div>
      </div>

      {/* Drag indicator */}
      <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-50 transition-opacity">
        <svg
          width="14"
          height="14"
          viewBox="0 0 12 12"
          fill="none"
          className="text-muted-foreground"
        >
          <path
            d="M2 2h2v2H2V2zM2 5h2v2H2V5zM2 8h2v2H2V8zM5 2h2v2H5V2zM5 5h2v2H5V5zM5 8h2v2H5V8zM8 2h2v2H8V2zM8 5h2v2H8V5zM8 8h2v2H8V8z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  )
}