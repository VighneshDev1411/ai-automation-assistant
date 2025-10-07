'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles,
  Search,
  Download,
  Upload,
  Star,
  TrendingUp,
  Clock,
  Users,
  Filter,
  Grid,
  List,
  Eye,
  Copy,
  Heart,
  Share2,
  Zap,
  Mail,
  Calendar,
  FileText,
  Database,
  MessageSquare,
  ShoppingCart,
  BarChart,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  Lock,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  config: {
    nodes: any[]
    edges: any[]
  }
  author: {
    id: string
    name: string
    avatar?: string
  }
  stats: {
    views: number
    downloads: number
    likes: number
    rating: number
  }
  is_public: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  preview_image?: string
  use_cases: string[]
  integrations_required: string[]
}

interface WorkflowTemplatesProps {
  onSelectTemplate?: (template: WorkflowTemplate) => void
  onImport?: (config: any) => void
}

// Template categories with icons
const CATEGORIES = [
  { id: 'all', name: 'All Templates', icon: Grid },
  { id: 'automation', name: 'Automation', icon: Zap },
  { id: 'communication', name: 'Communication', icon: MessageSquare },
  { id: 'data', name: 'Data Processing', icon: Database },
  { id: 'marketing', name: 'Marketing', icon: TrendingUp },
  { id: 'sales', name: 'Sales', icon: ShoppingCart },
  { id: 'productivity', name: 'Productivity', icon: Calendar },
  { id: 'analytics', name: 'Analytics', icon: BarChart },
  { id: 'email', name: 'Email', icon: Mail },
]

// Mock featured templates
const FEATURED_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'template_1',
    name: 'Customer Onboarding Automation',
    description:
      'Automatically onboard new customers with email sequences, Slack notifications, and CRM updates',
    category: 'automation',
    tags: ['email', 'slack', 'crm', 'onboarding'],
    difficulty: 'intermediate',
    config: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'New Customer Signup' },
        },
        {
          id: '2',
          type: 'action',
          position: { x: 300, y: 100 },
          data: { label: 'Send Welcome Email' },
        },
        {
          id: '3',
          type: 'action',
          position: { x: 500, y: 100 },
          data: { label: 'Create CRM Contact' },
        },
        {
          id: '4',
          type: 'action',
          position: { x: 700, y: 100 },
          data: { label: 'Notify Sales Team' },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
      ],
    },
    author: {
      id: 'user_1',
      name: 'Sarah Johnson',
      avatar: '/avatars/sarah.jpg',
    },
    stats: {
      views: 1250,
      downloads: 320,
      likes: 145,
      rating: 4.8,
    },
    is_public: true,
    is_featured: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z',
    use_cases: ['Customer onboarding', 'Sales automation', 'CRM integration'],
    integrations_required: ['Gmail', 'Slack', 'Salesforce'],
  },
  {
    id: 'template_2',
    name: 'Lead Scoring with AI',
    description:
      'Automatically score and qualify leads using AI analysis of form submissions and behavior data',
    category: 'sales',
    tags: ['ai', 'lead-scoring', 'sales', 'automation'],
    difficulty: 'advanced',
    config: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Form Submission' },
        },
        {
          id: '2',
          type: 'aiAgent',
          position: { x: 300, y: 100 },
          data: { label: 'AI Lead Analysis' },
        },
        {
          id: '3',
          type: 'condition',
          position: { x: 500, y: 100 },
          data: { label: 'Score > 80?' },
        },
        {
          id: '4',
          type: 'action',
          position: { x: 700, y: 50 },
          data: { label: 'Alert Sales Team' },
        },
        {
          id: '5',
          type: 'action',
          position: { x: 700, y: 150 },
          data: { label: 'Add to Nurture Campaign' },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4', label: 'Yes' },
        { id: 'e3-5', source: '3', target: '5', label: 'No' },
      ],
    },
    author: {
      id: 'user_2',
      name: 'Michael Chen',
      avatar: '/avatars/michael.jpg',
    },
    stats: {
      views: 2100,
      downloads: 567,
      likes: 289,
      rating: 4.9,
    },
    is_public: true,
    is_featured: true,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-25T12:00:00Z',
    use_cases: ['Lead qualification', 'Sales automation', 'AI scoring'],
    integrations_required: ['OpenAI', 'Salesforce', 'HubSpot'],
  },
  {
    id: 'template_3',
    name: 'Invoice Processing & Approval',
    description:
      'Automate invoice processing with OCR, validation, approval workflows, and payment scheduling',
    category: 'automation',
    tags: ['finance', 'ocr', 'approval', 'automation'],
    difficulty: 'intermediate',
    config: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Invoice Email Received' },
        },
        {
          id: '2',
          type: 'action',
          position: { x: 300, y: 100 },
          data: { label: 'Extract Invoice Data' },
        },
        {
          id: '3',
          type: 'condition',
          position: { x: 500, y: 100 },
          data: { label: 'Amount > $1000?' },
        },
        {
          id: '4',
          type: 'action',
          position: { x: 700, y: 50 },
          data: { label: 'Request Manager Approval' },
        },
        {
          id: '5',
          type: 'action',
          position: { x: 700, y: 150 },
          data: { label: 'Auto-Approve & Schedule' },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4', label: 'Yes' },
        { id: 'e3-5', source: '3', target: '5', label: 'No' },
      ],
    },
    author: {
      id: 'user_3',
      name: 'Emma Wilson',
      avatar: '/avatars/emma.jpg',
    },
    stats: {
      views: 980,
      downloads: 234,
      likes: 112,
      rating: 4.7,
    },
    is_public: true,
    is_featured: true,
    created_at: '2024-01-18T14:00:00Z',
    updated_at: '2024-01-22T09:30:00Z',
    use_cases: [
      'Invoice automation',
      'Approval workflows',
      'Finance automation',
    ],
    integrations_required: ['Gmail', 'Google Drive', 'Slack'],
  },
  {
    id: 'template_4',
    name: 'Social Media Content Pipeline',
    description:
      'AI-powered content creation, scheduling, and performance tracking across multiple platforms',
    category: 'marketing',
    tags: ['social-media', 'ai', 'content', 'marketing'],
    difficulty: 'advanced',
    config: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'Content Ideas Input' },
        },
        {
          id: '2',
          type: 'aiAgent',
          position: { x: 300, y: 100 },
          data: { label: 'Generate Posts (AI)' },
        },
        {
          id: '3',
          type: 'action',
          position: { x: 500, y: 100 },
          data: { label: 'Schedule to Platforms' },
        },
        {
          id: '4',
          type: 'action',
          position: { x: 700, y: 100 },
          data: { label: 'Track Performance' },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
      ],
    },
    author: {
      id: 'user_4',
      name: 'David Park',
      avatar: '/avatars/david.jpg',
    },
    stats: {
      views: 1567,
      downloads: 412,
      likes: 198,
      rating: 4.6,
    },
    is_public: true,
    is_featured: true,
    created_at: '2024-01-12T11:00:00Z',
    updated_at: '2024-01-24T16:45:00Z',
    use_cases: [
      'Content marketing',
      'Social media automation',
      'AI content generation',
    ],
    integrations_required: ['OpenAI', 'Twitter', 'LinkedIn', 'Facebook'],
  },
  {
    id: 'template_5',
    name: 'Support Ticket Routing',
    description:
      'Intelligent support ticket classification and routing based on content, priority, and expertise',
    category: 'automation',
    tags: ['support', 'ai', 'routing', 'customer-service'],
    difficulty: 'intermediate',
    config: {
      nodes: [
        {
          id: '1',
          type: 'trigger',
          position: { x: 100, y: 100 },
          data: { label: 'New Support Ticket' },
        },
        {
          id: '2',
          type: 'aiAgent',
          position: { x: 300, y: 100 },
          data: { label: 'Analyze Ticket' },
        },
        {
          id: '3',
          type: 'condition',
          position: { x: 500, y: 100 },
          data: { label: 'Priority Level?' },
        },
        {
          id: '4',
          type: 'action',
          position: { x: 700, y: 50 },
          data: { label: 'Urgent Queue' },
        },
        {
          id: '5',
          type: 'action',
          position: { x: 700, y: 150 },
          data: { label: 'Standard Queue' },
        },
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4', label: 'High' },
        { id: 'e3-5', source: '3', target: '5', label: 'Normal' },
      ],
    },
    author: {
      id: 'user_5',
      name: 'Lisa Anderson',
      avatar: '/avatars/lisa.jpg',
    },
    stats: {
      views: 1123,
      downloads: 289,
      likes: 134,
      rating: 4.5,
    },
    is_public: true,
    is_featured: true,
    created_at: '2024-01-16T09:00:00Z',
    updated_at: '2024-01-23T13:20:00Z',
    use_cases: ['Customer support', 'Ticket routing', 'AI classification'],
    integrations_required: ['Zendesk', 'Slack', 'OpenAI'],
  },
]

export const WorkflowTemplates: React.FC<WorkflowTemplatesProps> = ({
  onSelectTemplate,
  onImport,
}) => {
  const [templates, setTemplates] =
    useState<WorkflowTemplate[]>(FEATURED_TEMPLATES)
  const [filteredTemplates, setFilteredTemplates] =
    useState<WorkflowTemplate[]>(FEATURED_TEMPLATES)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating'>(
    'popular'
  )
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkflowTemplate | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    filterAndSortTemplates()
  }, [selectedCategory, searchQuery, sortBy, templates])

  // Fetch templates from database
  const fetchTemplates = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('is_template', true)
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform database templates to match interface
      const dbTemplates: WorkflowTemplate[] = (data || []).map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || '',
        category: workflow.template_category || 'automation',
        tags: workflow.tags || [],
        difficulty: 'intermediate' as const,
        config: {
          nodes: [],
          edges: [],
        },
        author: {
          id: workflow.created_by,
          name: 'User',
        },
        stats: {
          views: 0,
          downloads: 0,
          likes: 0,
          rating: 0,
        },
        is_public: true,
        is_featured: false,
        created_at: workflow.created_at,
        updated_at: workflow.updated_at,
        use_cases: [],
        integrations_required: [],
      }))

      // Combine featured templates with DB templates
      setTemplates([...FEATURED_TEMPLATES, ...dbTemplates])
    } catch (error: any) {
      console.error('Error fetching templates:', error)
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort templates
  const filterAndSortTemplates = () => {
    let filtered = [...templates]

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.stats.downloads - a.stats.downloads
        case 'recent':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        case 'rating':
          return b.stats.rating - a.stats.rating
        default:
          return 0
      }
    })

    setFilteredTemplates(filtered)
  }

  // Use template
  const useTemplate = async (template: WorkflowTemplate) => {
    try {
      setIsImporting(true)

      // Track usage
      await fetch('/api/templates/track-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      })

      onSelectTemplate?.(template)
      onImport?.(template.config)

      toast({
        title: 'Template Loaded',
        description: `"${template.name}" has been loaded into your workflow builder`,
      })

      setSelectedTemplate(null)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive',
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Like template
  const likeTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId)
      if (!template) return

      // Update local state
      setTemplates(
        templates.map(t =>
          t.id === templateId
            ? { ...t, stats: { ...t.stats, likes: t.stats.likes + 1 } }
            : t
        )
      )

      // Track in backend
      await fetch('/api/templates/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })

      toast({
        title: 'Liked!',
        description: 'Template added to your favorites',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to like template',
        variant: 'destructive',
      })
    }
  }

  // Import from file
  const importFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.config || !data.config.nodes || !data.config.edges) {
        throw new Error('Invalid workflow file format')
      }

      onImport?.(data.config)

      toast({
        title: 'Import Successful',
        description: `Workflow "${data.workflow_name || 'Untitled'}" imported successfully`,
      })
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message || 'Invalid file format',
        variant: 'destructive',
      })
    }
  }

  // Export template
  const exportTemplate = (template: WorkflowTemplate) => {
    const exportData = {
      workflow_name: template.name,
      description: template.description,
      exported_at: new Date().toISOString(),
      config: template.config,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Exported',
      description: 'Template downloaded successfully',
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500'
      case 'intermediate':
        return 'bg-yellow-500'
      case 'advanced':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category)
    return cat ? cat.icon : Grid
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Workflow Templates
          </h2>
          <p className="text-muted-foreground mt-1">
            {filteredTemplates.length} templates available
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => document.getElementById('import-file')?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={importFromFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(value: any) => setSortBy(value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Popular
                  </div>
                </SelectItem>
                <SelectItem value="recent">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent
                  </div>
                </SelectItem>
                <SelectItem value="rating">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Top Rated
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {CATEGORIES.map(category => {
            const Icon = category.icon
            return (
              <Button
                key={category.id}
                variant={
                  selectedCategory === category.id ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap"
              >
                <Icon className="mr-2 h-4 w-4" />
                {category.name}
              </Button>
            )
          })}
        </div>
      </ScrollArea>

      {/* Featured Section */}
      {selectedCategory === 'all' && !searchQuery && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Featured Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates
              .filter(t => t.is_featured)
              .slice(0, 3)
              .map(template => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className="bg-yellow-500">Featured</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          likeTemplate(template.id)
                        }}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map(tag => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {template.stats.downloads}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {template.stats.rating}
                          </span>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full ${getDifficultyColor(template.difficulty)}`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* All Templates */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          {selectedCategory !== 'all'
            ? CATEGORIES.find(c => c.id === selectedCategory)?.name
            : 'All Templates'}
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No templates found matching your criteria</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => {
              const CategoryIcon = getCategoryIcon(template.category)
              return (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-all"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground capitalize">
                          {template.category}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getDifficultyColor(template.difficulty)} text-white border-0`}
                      >
                        {template.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2 text-sm">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 4).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.tags.length - 4}
                          </Badge>
                        )}
                      </div>

                      {/* Author */}
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                          {template.author.name.charAt(0)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {template.author.name}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {template.stats.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {template.stats.downloads}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {template.stats.likes}
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          {template.stats.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTemplates.map(template => {
              const CategoryIcon = getCategoryIcon(template.category)
              return (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-all"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CategoryIcon className="h-8 w-8 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">
                              {template.name}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {template.description}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${getDifficultyColor(template.difficulty)} text-white border-0 flex-shrink-0`}
                          >
                            {template.difficulty}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {template.author.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {template.stats.downloads}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {template.stats.rating.toFixed(1)}
                          </span>
                          <span className="capitalize">
                            {template.category}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.slice(0, 5).map(tag => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <Dialog
          open={!!selectedTemplate}
          onOpenChange={() => setSelectedTemplate(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-2xl mb-2">
                    {selectedTemplate.name}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {selectedTemplate.description}
                  </DialogDescription>
                </div>
                {selectedTemplate.is_featured && (
                  <Badge className="bg-yellow-500 flex-shrink-0">
                    <Star className="mr-1 h-3 w-3" />
                    Featured
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Eye className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">
                      {selectedTemplate.stats.views}
                    </div>
                    <div className="text-xs text-muted-foreground">Views</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Download className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">
                      {selectedTemplate.stats.downloads}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Downloads
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Heart className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-2xl font-bold">
                      {selectedTemplate.stats.likes}
                    </div>
                    <div className="text-xs text-muted-foreground">Likes</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Star className="h-6 w-6 mx-auto mb-2 text-yellow-500 fill-yellow-500" />
                    <div className="text-2xl font-bold">
                      {selectedTemplate.stats.rating.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Rating</div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Use Cases</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {selectedTemplate.use_cases.map((useCase, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{useCase}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.tags.map(tag => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Author</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-medium">
                            {selectedTemplate.author.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {selectedTemplate.author.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created{' '}
                            {new Date(
                              selectedTemplate.created_at
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Workflow Tab */}
                <TabsContent value="workflow" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Workflow Structure
                      </CardTitle>
                      <CardDescription>
                        This template contains{' '}
                        {selectedTemplate.config.nodes.length} nodes and{' '}
                        {selectedTemplate.config.edges.length} connections
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedTemplate.config.nodes.map((node, index) => (
                          <div
                            key={node.id}
                            className="flex items-center gap-3 p-3 border rounded-lg"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {node.data.label}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize">
                                {node.type}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {node.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Difficulty Level
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${getDifficultyColor(selectedTemplate.difficulty)}`}
                        />
                        <span className="capitalize font-medium">
                          {selectedTemplate.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedTemplate.difficulty === 'beginner' &&
                          'Perfect for getting started. No advanced knowledge required.'}
                        {selectedTemplate.difficulty === 'intermediate' &&
                          'Requires basic understanding of workflow automation.'}
                        {selectedTemplate.difficulty === 'advanced' &&
                          'Recommended for experienced users with automation knowledge.'}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Integrations Tab */}
                <TabsContent value="integrations" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Required Integrations
                      </CardTitle>
                      <CardDescription>
                        You'll need to connect these services to use this
                        template
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedTemplate.integrations_required.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No external integrations required
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {selectedTemplate.integrations_required.map(
                            integration => (
                              <div
                                key={integration}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Zap className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {integration}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Required
                                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Available
                                </Badge>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Setup Instructions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2 text-sm">
                        <li className="flex gap-2">
                          <span className="font-medium">1.</span>
                          <span>
                            Connect all required integrations from the
                            Integrations page
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-medium">2.</span>
                          <span>
                            Click "Use Template" to load the workflow into your
                            builder
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-medium">3.</span>
                          <span>
                            Configure each node with your specific settings
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-medium">4.</span>
                          <span>Test the workflow before activating it</span>
                        </li>
                      </ol>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Template Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Category:
                          </span>
                          <span className="font-medium capitalize">
                            {selectedTemplate.category}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Visibility:
                          </span>
                          <div className="flex items-center gap-1">
                            {selectedTemplate.is_public ? (
                              <>
                                <Globe className="h-3 w-3" />
                                <span className="font-medium">Public</span>
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                <span className="font-medium">Private</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Created:
                          </span>
                          <span className="font-medium">
                            {new Date(
                              selectedTemplate.created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Last Updated:
                          </span>
                          <span className="font-medium">
                            {new Date(
                              selectedTemplate.updated_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Template ID:
                          </span>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {selectedTemplate.id.slice(0, 8)}...
                          </code>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Version History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="text-sm font-medium">
                              Version 1.0
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Initial release
                            </div>
                          </div>
                          <Badge variant="outline">Current</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">License</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        This template is provided as-is for use in your
                        workflows. You may modify and adapt it to suit your
                        needs.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1"
                  onClick={() => useTemplate(selectedTemplate)}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Use Template
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => likeTemplate(selectedTemplate.id)}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Like ({selectedTemplate.stats.likes})
                </Button>

                <Button
                  variant="outline"
                  onClick={() => exportTemplate(selectedTemplate)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>

                <Button variant="outline">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
