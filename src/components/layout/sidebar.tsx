'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Workflow, 
  Plug, 
  BarChart3, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  FolderOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
  className?: string
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Workflows', href: '/workflows', icon: Workflow },
  { name: 'Integrations', href: '/integrations', icon: Plug },
  { name: 'AI Agents', href: '/ai-agents', icon: Sparkles },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar({ isCollapsed = false, onToggle, className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn(
      'flex flex-col bg-card border-r transition-all duration-300 ease-in-out',
      isCollapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold">Platform</span>
          </div>
        )}
        
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                'hover:bg-muted hover:text-foreground',
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="font-medium truncate">{item.name}</span>
              )}
              
              {isActive && !isCollapsed && (
                <div className="ml-auto w-2 h-2 bg-primary-foreground rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        {!isCollapsed ? (
          <div className="glass-card p-3 text-center">
            <div className="text-2xl mb-2">🚀</div>
            <div className="text-sm font-medium mb-1">Upgrade to Pro</div>
            <div className="text-xs text-muted-foreground mb-2">
              Unlock AI agents and advanced features
            </div>
            <Button size="sm" className="w-full">
              Upgrade
            </Button>
          </div>
        ) : (
          <Button size="icon" variant="outline" className="w-full">
            <Sparkles className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}