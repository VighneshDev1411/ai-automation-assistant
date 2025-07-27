'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { ReactNode } from 'react'

interface ResponsiveCardProps {
  title?: string
  children: ReactNode
  className?: string
  mobileFullWidth?: boolean
  tabletSpan?: number
  desktopSpan?: number
  interactive?: boolean
  glassEffect?: boolean
}

export function ResponsiveCard({
  title,
  children,
  className,
  mobileFullWidth = true,
  tabletSpan = 1,
  desktopSpan = 1,
  interactive = false,
  glassEffect = false
}: ResponsiveCardProps) {
  const { isMd, isLg } = useBreakpoint()

  return (
    <Card className={cn(
      'transition-all duration-300',
      mobileFullWidth && 'w-full',
      interactive && 'hover:shadow-lg hover:-translate-y-1 cursor-pointer',
      glassEffect && 'glass-card',
      !isMd && 'rounded-lg',
      isMd && !isLg && `md:col-span-${tabletSpan}`,
      isLg && `lg:col-span-${desktopSpan}`,
      className
    )}>
      {title && (
        <CardHeader className={cn(
          'pb-3',
          !isMd && 'px-4 pt-4',
          isMd && 'px-6 pt-6'
        )}>
          <CardTitle className={cn(
            !isMd && 'text-lg',
            isMd && 'text-xl'
          )}>
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(
        !isMd && 'px-4 pb-4',
        isMd && 'px-6 pb-6',
        title && 'pt-0'
      )}>
        {children}
      </CardContent>
    </Card>
  )
}

interface ResponsiveCardGridProps {
  children: ReactNode
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: number
  className?: string
}

export function ResponsiveCardGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 6,
  className
}: ResponsiveCardGridProps) {
  return (
    <div className={cn(
      'grid',
      `grid-cols-${cols.mobile || 1}`,
      `md:grid-cols-${cols.tablet || 2}`,
      `lg:grid-cols-${cols.desktop || 3}`,
      `gap-${gap}`,
      className
    )}>
      {children}
    </div>
  )
}