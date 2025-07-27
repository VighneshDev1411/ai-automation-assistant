'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface ResponsiveGridProps {
  children: ReactNode
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  gap?: number | string
  className?: string
}

export function ResponsiveGrid({ 
  children, 
  cols = { default: 1, md: 2, lg: 3 },
  gap = 6,
  className 
}: ResponsiveGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
  }

  const responsiveClasses = [
    cols.default && gridCols[cols.default as keyof typeof gridCols],
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`,
  ].filter(Boolean)

  return (
    <div className={cn(
      'grid',
      ...responsiveClasses,
      `gap-${gap}`,
      className
    )}>
      {children}
    </div>
  )
}

interface GridItemProps {
  children: ReactNode
  span?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
  }
  className?: string
}

export function GridItem({ children, span, className }: GridItemProps) {
  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12',
    full: 'col-span-full',
  }

  if (!span) {
    return <div className={className}>{children}</div>
  }

  const responsiveSpanClasses = [
    span.default && spanClasses[span.default as keyof typeof spanClasses],
    span.sm && `sm:col-span-${span.sm}`,
    span.md && `md:col-span-${span.md}`,
    span.lg && `lg:col-span-${span.lg}`,
    span.xl && `xl:col-span-${span.xl}`,
    span['2xl'] && `2xl:col-span-${span['2xl']}`,
  ].filter(Boolean)

  return (
    <div className={cn(...responsiveSpanClasses, className)}>
      {children}
    </div>
  )
}