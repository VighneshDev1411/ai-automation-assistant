'use client'

import React from 'react'
import { Menu, Bell, Search, User, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
  className?: string
}

export function Header({ onMenuClick, showMenuButton, className }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false)
  const router = useRouter()
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
        <div className="relative ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <User className="h-5 w-5" />
          </Button>

          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-popover text-popover-foreground rounded-md border shadow-md z-50">
                <div className="px-2 py-1.5 text-sm font-semibold">My Account</div>
                <div className="h-px bg-border my-1" />

                <button
                  onClick={() => {
                    router.push('/profile')
                    setIsUserMenuOpen(false)
                  }}
                  className="w-full flex items-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => {
                    router.push('/settings')
                    setIsUserMenuOpen(false)
                  }}
                  className="w-full flex items-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </button>

                <div className="h-px bg-border my-1" />

                <button
                  onClick={() => {
                    console.log('Logout clicked')
                    setIsUserMenuOpen(false)
                  }}
                  className="w-full flex items-center px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}