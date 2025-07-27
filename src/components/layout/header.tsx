'use client'

import { Menu, Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
  className?: string
}

export function Header({ onMenuClick, showMenuButton, className }: HeaderProps) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(max-width: 1024px)')

  return (
    <header className={cn(
      'h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      'flex items-center justify-between px-4 md:px-6',
      'transition-all duration-300',
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo/Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          {!isMobile && (
            <span className="font-semibold text-lg">Automation Platform</span>
          )}
        </div>
      </div>

      {/* Center Section - Search (hidden on mobile) */}
      {!isMobile && (
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows, integrations..."
              className="pl-10 bg-muted/50 border-none focus:bg-background"
            />
          </div>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search Button */}
        {isMobile && (
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            3
          </span>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle variant="icon" />

        {/* User Menu */}
        <Button variant="ghost" size="icon" className="ml-2">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}