'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
}

export function ResponsiveGrid({ 
  children, 
  className,
  cols = { default: 1, sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 4
}: ResponsiveGridProps) {
  const gridCols = cn(
    'grid',
    `gap-${gap}`,
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    className
  )

  return <div className={gridCols}>{children}</div>
}

interface GridItemProps {
  children: React.ReactNode
  className?: string
  span?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

export function GridItem({ children, className, span }: GridItemProps) {
  const spanClasses = cn(
    span?.default && `col-span-${span.default}`,
    span?.sm && `sm:col-span-${span.sm}`,
    span?.md && `md:col-span-${span.md}`,
    span?.lg && `lg:col-span-${span.lg}`,
    span?.xl && `xl:col-span-${span.xl}`,
    className
  )

  return <div className={spanClasses}>{children}</div>
}