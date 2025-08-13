'use client'

import { cn } from '@/lib/utils'
import { useBreakpoint } from '@/hooks/use-media-query'
import { MobileMenu } from '@/components/ui/mobile-menu'

interface ResponsiveSidebarProps {
  children: React.ReactNode
  className?: string
  mobileContent?: React.ReactNode
}

export function ResponsiveSidebar({
  children,
  className,
  mobileContent
}: ResponsiveSidebarProps) {
  const { isMobile } = useBreakpoint()

  if (isMobile && mobileContent) {
    return <MobileMenu>{mobileContent}</MobileMenu>
  }

  return (
    <aside className={cn(
      'hidden lg:block w-64 border-r bg-background',
      className
    )}>
      {children}
    </aside>
  )
}
