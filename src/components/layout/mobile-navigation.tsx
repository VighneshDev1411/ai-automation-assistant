'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  X, 
  Home, 
  Workflow, 
  Plug, 
  BarChart3, 
  Settings,
  Sparkles,
  Users,
  FolderOpen,
  Search,
  Bell,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  isOpen: boolean
  onToggle: () => void
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

export function MobileNav({ isOpen, onToggle }: MobileNavProps) {
  const pathname = usePathname()

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-all duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onToggle}
      />

      {/* Mobile Menu */}
      <div className={cn(
        'fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-background border-r z-50 transform transition-all duration-300 ease-in-out md:hidden',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold">Platform</span>
          </div>
          
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 bg-muted/50"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onToggle}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200',
                  'hover:bg-muted hover:text-foreground',
                  'touch-manipulation', // Better touch response
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
                
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-primary-foreground rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
            <ThemeToggle variant="icon" />
          </div>
          
          <Button variant="outline" className="w-full justify-start">
            <User className="h-4 w-4 mr-2" />
            Profile Settings
          </Button>
          
          <div className="glass-card p-3 text-center">
            <div className="text-2xl mb-2">🚀</div>
            <div className="text-sm font-medium mb-1">Upgrade to Pro</div>
            <div className="text-xs text-muted-foreground mb-2">
              Unlock AI agents
            </div>
            <Button size="sm" className="w-full">
              Upgrade
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}