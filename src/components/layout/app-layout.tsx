// src/components/layout/app-layout.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { PageTransition } from '@/components/common/page-transition'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Workflow,
  LayoutDashboard,
  Zap,
  BarChart3,
  Settings,
  Users,
  Bot,
  Globe,
  Menu,
  X,
  Search,
  Bell,
  User,
  LogOut,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  Database,
  Calendar,
  MessageSquare,
  Shield,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  badgeKey?: string  // Key to identify dynamic badges
}

const navigation: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Workflows', href: '/workflows', icon: Workflow, badgeKey: 'workflows' },
  { title: 'Schedules', href: '/schedules', icon: Calendar },
  { title: 'Integrations', href: '/integrations', icon: Zap },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'AI Agents', href: '/ai-agents', icon: Bot },
  { title: 'Team', href: '/team', icon: Users },
  { title: 'Settings', href: '/settings', icon: Settings },
]

const bottomNavigation: NavItem[] = [
  { title: 'Documentation', href: '/docs', icon: FileText },
  { title: 'Help & Support', href: '/support', icon: HelpCircle },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dynamicBadges, setDynamicBadges] = useState<Record<string, string>>({})

  // Fetch dynamic badge counts
  useEffect(() => {
    const fetchBadgeCounts = async () => {
      try {
        // Fetch workflow count
        const workflowResponse = await fetch('/api/workflows')
        const workflowData = await workflowResponse.json()
        const workflowCount = workflowData.workflows?.length || 0

        setDynamicBadges(prev => ({
          ...prev,
          workflows: workflowCount > 0 ? workflowCount.toString() : ''
        }))
      } catch (error) {
        console.error('Error fetching badge counts:', error)
      }
    }

    fetchBadgeCounts()
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        toast({
          title: "Error",
          description: "Failed to log out. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })

      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-background">
      // src/components/layout/app-layout.tsx
// Replace ONLY the header section with this:

{/* Top Header */}
<header className="fixed top-0 left-0 right-0 z-50 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="flex h-full items-center justify-between px-4">
    {/* Left Section - Logo and Mobile Menu */}
    <div className="flex items-center gap-4">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 group">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <span className="font-bold text-xl hidden sm:block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          CogniFlow
        </span>
      </Link>
    </div>

    {/* Center - Search */}
    <div className="flex-1 max-w-2xl mx-8 hidden md:block">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workflows, integrations, or docs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-muted/50 border-0 focus:bg-background transition-colors"
        />
      </div>
    </div>

    {/* Right Section - Icons */}
    <div className="flex items-center gap-2">
      {/* Mobile search button */}
      <Button variant="ghost" size="icon" className="md:hidden">
        <Search className="h-5 w-5" />
      </Button>

      {/* Theme Toggle */}
      <ThemeToggle />
      
      {/* Notifications */}
      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5" />
      </Button>
      
      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="flex cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 dark:text-red-400"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</header>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] bg-background border-r transition-all duration-300 ease-in-out overflow-hidden',
          // Width transitions
          sidebarOpen ? 'w-64' : 'w-20',
          // Mobile visibility
          mobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Mobile Close Button */}
          <div className="flex items-center justify-end p-2 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-2">
            {navigation.map(item => {
              const isActive = pathname === item.href
              const badgeValue = item.badgeKey ? dynamicBadges[item.badgeKey] : item.badge
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />

                  {/* FIXED: Proper text hiding */}
                  {sidebarOpen && (
                    <span className="whitespace-nowrap">{item.title}</span>
                  )}

                  {/* FIXED: Proper badge hiding - now with dynamic badges */}
                  {badgeValue && sidebarOpen && (
                    <span
                      className={cn(
                        'ml-auto rounded-full px-2 py-0.5 text-xs',
                        isActive
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-primary/10 text-primary'
                      )}
                    >
                      {badgeValue}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="border-t p-3 space-y-1">
            {bottomNavigation.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {/* FIXED: Proper text hiding */}
                {sidebarOpen && (
                  <span className="whitespace-nowrap">{item.title}</span>
                )}
              </Link>
            ))}
          </div>

          {/* Sidebar Collapse Toggle (Desktop) */}
          <div className="hidden lg:flex border-t p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Collapse</span>
                </>
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen pt-16 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        )}
      >
        <div className="p-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  )
}
