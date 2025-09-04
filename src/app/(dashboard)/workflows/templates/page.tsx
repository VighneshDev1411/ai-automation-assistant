// src/app/(dashboard)/workflows/templates/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  Search,
  Filter,
  Star,
  Download,
  Eye,
  Copy,
  Clock,
  Users,
  Zap,
  Mail,
  Database,
  Globe,
  FileText,
  BarChart3,
  MessageSquare,
  ShoppingCart,
  Calendar,
  Shield,
  Plus,
  Sparkles,
} from 'lucide-react'

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  estimatedTime: string
  usageCount: number
  rating: number
  tags: string[]
  author: string
  createdAt: string
  updatedAt: string
  preview: {
    triggerType: string
    actionCount: number
    conditionCount: number
  }
  icon: React.ElementType
  featured: boolean
}

const mockTemplates: WorkflowTemplate[] = [
  {
    id: '1',
    name: 'Email Campaign Automation',
    description:
      'Automatically send personalized emails based on user behavior and triggers',
    category: 'Marketing',
    difficulty: 'Intermediate',
    estimatedTime: '30 min',
    usageCount: 1247,
    rating: 4.8,
    tags: ['email', 'marketing', 'automation', 'personalization'],
    author: 'Marketing Team',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-15',
    preview: {
      triggerType: 'Event-based',
      actionCount: 5,
      conditionCount: 3,
    },
    icon: Mail,
    featured: true,
  },
  {
    id: '2',
    name: 'Lead Scoring & Qualification',
    description:
      'Automatically score and qualify leads based on multiple criteria and actions',
    category: 'Sales',
    difficulty: 'Advanced',
    estimatedTime: '45 min',
    usageCount: 856,
    rating: 4.9,
    tags: ['lead scoring', 'sales', 'crm', 'qualification'],
    author: 'Sales Operations',
    createdAt: '2024-01-08',
    updatedAt: '2024-01-14',
    preview: {
      triggerType: 'Multi-trigger',
      actionCount: 8,
      conditionCount: 6,
    },
    icon: BarChart3,
    featured: true,
  },
  {
    id: '3',
    name: 'Customer Onboarding Flow',
    description:
      'Complete customer onboarding sequence with welcome emails, tutorials, and follow-ups',
    category: 'Customer Success',
    difficulty: 'Beginner',
    estimatedTime: '20 min',
    usageCount: 2103,
    rating: 4.7,
    tags: ['onboarding', 'customer success', 'tutorial', 'welcome'],
    author: 'Customer Success',
    createdAt: '2024-01-12',
    updatedAt: '2024-01-16',
    preview: {
      triggerType: 'User signup',
      actionCount: 4,
      conditionCount: 2,
    },
    icon: Users,
    featured: false,
  },
  {
    id: '4',
    name: 'Slack Daily Standup Bot',
    description:
      'Automatically collect and summarize daily standup reports from team members',
    category: 'Team Management',
    difficulty: 'Intermediate',
    estimatedTime: '25 min',
    usageCount: 679,
    rating: 4.6,
    tags: ['slack', 'standup', 'team', 'automation'],
    author: 'DevOps Team',
    createdAt: '2024-01-09',
    updatedAt: '2024-01-13',
    preview: {
      triggerType: 'Schedule',
      actionCount: 6,
      conditionCount: 1,
    },
    icon: MessageSquare,
    featured: false,
  },
  {
    id: '5',
    name: 'Invoice Processing & Approval',
    description:
      'Automated invoice processing with approval workflow and payment tracking',
    category: 'Finance',
    difficulty: 'Advanced',
    estimatedTime: '60 min',
    usageCount: 432,
    rating: 4.9,
    tags: ['finance', 'invoice', 'approval', 'accounting'],
    author: 'Finance Team',
    createdAt: '2024-01-11',
    updatedAt: '2024-01-15',
    preview: {
      triggerType: 'Document upload',
      actionCount: 10,
      conditionCount: 5,
    },
    icon: FileText,
    featured: false,
  },
  {
    id: '6',
    name: 'E-commerce Order Fulfillment',
    description:
      'Complete order processing from payment to shipping with customer notifications',
    category: 'E-commerce',
    difficulty: 'Intermediate',
    estimatedTime: '40 min',
    usageCount: 1089,
    rating: 4.8,
    tags: ['ecommerce', 'orders', 'fulfillment', 'shipping'],
    author: 'E-commerce Team',
    createdAt: '2024-01-07',
    updatedAt: '2024-01-14',
    preview: {
      triggerType: 'Payment received',
      actionCount: 7,
      conditionCount: 4,
    },
    icon: ShoppingCart,
    featured: true,
  },
]

const categories = [
  'All',
  'Marketing',
  'Sales',
  'Customer Success',
  'Team Management',
  'Finance',
  'E-commerce',
  'HR',
  'Operations',
]
const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced']

export default function WorkflowTemplatesPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(mockTemplates)
  const [filteredTemplates, setFilteredTemplates] =
    useState<WorkflowTemplate[]>(mockTemplates)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedDifficulty, setSelectedDifficulty] = useState('All')
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplate | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const { toast } = useToast()

  // Filter templates based on search and filters
  useEffect(() => {
    let filtered = templates

    if (searchQuery) {
      filtered = filtered.filter(
        template =>
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          template.tags.some(tag =>
            tag.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(
        template => template.category === selectedCategory
      )
    }

    if (selectedDifficulty !== 'All') {
      filtered = filtered.filter(
        template => template.difficulty === selectedDifficulty
      )
    }

    setFilteredTemplates(filtered)
  }, [searchQuery, selectedCategory, selectedDifficulty, templates])

  const handleUseTemplate = (template: WorkflowTemplate) => {
    toast({
      title: 'Template Applied',
      description: `${template.name} has been added to your workflows.`,
    })
    // TODO: Implement actual template application logic
  }

  const handlePreviewTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template)
    setIsPreviewOpen(true)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'badge-success'
      case 'Intermediate':
        return 'badge-warning'
      case 'Advanced':
        return 'badge-error'
      default:
        return 'badge-neutral'
    }
  }

  const formatUsageCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  return (
    <div className="container-padding section-spacing space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight gradient-text">
            Workflow Templates
          </h1>
          <p className="text-lg text-muted-foreground">
            Pre-built workflows to accelerate your automation journey
          </p>
        </div>
        <Button className="btn-shine">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Featured Templates */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Featured Templates</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates
            .filter(t => t.featured)
            .map(template => {
              const IconComponent = template.icon
              return (
                <Card
                  key={template.id}
                  className="glass-card hover-lift cursor-pointer group"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="status-icon-bg info w-12 h-12">
                          <IconComponent className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {template.name}
                          </CardTitle>
                          <Badge
                            className={getDifficultyColor(template.difficulty)}
                          >
                            {template.difficulty}
                          </Badge>
                        </div>
                      </div>
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-sm leading-relaxed">
                      {template.description}
                    </CardDescription>

                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {template.estimatedTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Download className="h-4 w-4" />
                          {formatUsageCount(template.usageCount)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        {template.rating}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handlePreviewTemplate(template)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        onClick={() => handleUseTemplate(template)}
                        size="sm"
                        className="flex-1 btn-shine"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedDifficulty}
                onValueChange={setSelectedDifficulty}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map(difficulty => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {difficulty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map(template => {
              const IconComponent = template.icon
              return (
                <Card
                  key={template.id}
                  className="clean-card hover-lift cursor-pointer group"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="status-icon-bg purple w-10 h-10">
                          <IconComponent className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base group-hover:text-primary transition-colors">
                            {template.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {template.category}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={getDifficultyColor(template.difficulty)}
                        variant="outline"
                      >
                        {template.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {template.estimatedTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {formatUsageCount(template.usageCount)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        {template.rating}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handlePreviewTemplate(template)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        onClick={() => handleUseTemplate(template)}
                        size="sm"
                        className="flex-1"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Use
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or explore different
                categories.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="status-icon-bg info w-10 h-10">
                    <selectedTemplate.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {selectedTemplate.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedTemplate.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Template Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {selectedTemplate.preview.actionCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Actions</div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {selectedTemplate.preview.conditionCount}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Conditions
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedTemplate.estimatedTime}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Setup Time
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {selectedTemplate.rating}
                    </div>
                    <div className="text-sm text-muted-foreground">Rating</div>
                  </div>
                </div>

                {/* Template Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Category</h4>
                    <Badge>{selectedTemplate.category}</Badge>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.tags.map(tag => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Trigger Type</h4>
                    <p className="text-muted-foreground">
                      {selectedTemplate.preview.triggerType}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleUseTemplate(selectedTemplate)
                      setIsPreviewOpen(false)
                    }}
                    className="btn-shine"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Use This Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsPreviewOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
