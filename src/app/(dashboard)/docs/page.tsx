'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Zap,
  Code,
  Rocket,
  Search,
  ExternalLink,
  FileText,
  Video,
  GitBranch,
  Settings
} from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

interface DocItem {
  title: string
  description: string
  category: string
  icon: React.ElementType
  href: string
  type: 'guide' | 'tutorial' | 'reference' | 'video'
}

const docItems: DocItem[] = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of creating your first workflow',
    category: 'Basics',
    icon: Rocket,
    href: '#getting-started',
    type: 'guide'
  },
  {
    title: 'Workflow Builder',
    description: 'Complete guide to using the visual workflow builder',
    category: 'Basics',
    icon: GitBranch,
    href: '#workflow-builder',
    type: 'tutorial'
  },
  {
    title: 'Integrations Setup',
    description: 'How to connect and configure integrations',
    category: 'Integrations',
    icon: Zap,
    href: '#integrations',
    type: 'guide'
  },
  {
    title: 'Slack Integration',
    description: 'Send messages and notifications to Slack',
    category: 'Integrations',
    icon: Zap,
    href: '#slack',
    type: 'tutorial'
  },
  {
    title: 'Google Workspace',
    description: 'Connect Gmail, Calendar, and Drive',
    category: 'Integrations',
    icon: Zap,
    href: '#google',
    type: 'tutorial'
  },
  {
    title: 'API Reference',
    description: 'Complete API documentation and endpoints',
    category: 'Developers',
    icon: Code,
    href: '#api',
    type: 'reference'
  },
  {
    title: 'Webhooks Guide',
    description: 'Trigger workflows with webhooks',
    category: 'Developers',
    icon: Code,
    href: '#webhooks',
    type: 'guide'
  },
  {
    title: 'Custom Functions',
    description: 'Write custom JavaScript functions in workflows',
    category: 'Advanced',
    icon: Code,
    href: '#functions',
    type: 'tutorial'
  },
  {
    title: 'Error Handling',
    description: 'Best practices for handling errors',
    category: 'Advanced',
    icon: Settings,
    href: '#errors',
    type: 'guide'
  },
  {
    title: 'Video Tutorials',
    description: 'Watch step-by-step video guides',
    category: 'Resources',
    icon: Video,
    href: '#videos',
    type: 'video'
  }
]

export default function DocumentationPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDocs = docItems.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const categories = Array.from(new Set(docItems.map(doc => doc.category)))

  const getTypeBadge = (type: DocItem['type']) => {
    switch (type) {
      case 'guide':
        return <Badge variant="secondary">Guide</Badge>
      case 'tutorial':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">Tutorial</Badge>
      case 'reference':
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">Reference</Badge>
      case 'video':
        return <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">Video</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Documentation</h1>
        <p className="text-muted-foreground mt-2">
          Everything you need to know about building workflows
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
              <Rocket className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-base">Quick Start</CardTitle>
            <CardDescription>
              Get up and running in 5 minutes
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
              <Code className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-base">API Docs</CardTitle>
            <CardDescription>
              Complete API reference
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader>
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-2">
              <Video className="h-5 w-5 text-green-600" />
            </div>
            <CardTitle className="text-base">Video Tutorials</CardTitle>
            <CardDescription>
              Watch and learn
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Documentation by Category */}
      {categories.map(category => {
        const categoryDocs = filteredDocs.filter(doc => doc.category === category)

        if (categoryDocs.length === 0) return null

        return (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-semibold">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {categoryDocs.map(doc => {
                const Icon = doc.icon
                return (
                  <Card
                    key={doc.title}
                    className="cursor-pointer hover:border-primary transition-colors"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">{doc.title}</CardTitle>
                              {getTypeBadge(doc.type)}
                            </div>
                            <CardDescription>{doc.description}</CardDescription>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* External Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>More ways to learn and get help</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Link
              href="#"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Blog & Tutorials</p>
                  <p className="text-sm text-muted-foreground">
                    Learn from real-world examples
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="#"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">GitHub Repository</p>
                  <p className="text-sm text-muted-foreground">
                    View source code and examples
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Link
              href="#"
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Changelog</p>
                  <p className="text-sm text-muted-foreground">
                    See what's new and updated
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* No Results */}
      {filteredDocs.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No results found</h3>
          <p className="text-muted-foreground">
            Try searching with different keywords
          </p>
        </div>
      )}
    </div>
  )
}
