'use client'

import { cn } from '@/lib/utils'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  const { isMd } = useBreakpoint()

  return (
    <div className={cn(
      'flex flex-col gap-4 pb-8 border-b',
      isMd && 'flex-row items-center justify-between',
      className
    )}>
      <div className="space-y-2">
        <h1 className={cn(
          'font-bold tracking-tight',
          !isMd && 'text-2xl',
          isMd && 'text-3xl lg:text-4xl'
        )}>
          {title}
        </h1>
        {description && (
          <p className={cn(
            'text-muted-foreground',
            !isMd && 'text-sm',
            isMd && 'text-base lg:text-lg'
          )}>
            {description}
          </p>
        )}
      </div>
      
      {children && (
        <div className={cn(
          'flex gap-2',
          !isMd && 'flex-col',
          isMd && 'flex-row items-center'
        )}>
          {children}
        </div>
      )}
    </div>
  )
}