'use client'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface ResponsiveCardProps extends React.ComponentProps<typeof Card> {
  fullWidthOnMobile?: boolean
  hover?: boolean
}

export function ResponsiveCard({
  fullWidthOnMobile = true,
  hover = true,
  className,
  ...props
}: ResponsiveCardProps) {
  return (
    <Card
      className={cn(
        fullWidthOnMobile && 'w-full sm:w-auto',
        hover && 'transition-all hover:shadow-lg hover:-translate-y-1',
        className
      )}
      {...props}
    />
  )
}

export function ResponsiveCardGrid({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
      className
    )}>
      {children}
    </div>
  )
}