import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface ContainerProps {
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  className?: string
}

const containerSizes = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-screen-2xl',
  full: 'max-w-full',
}

const containerPadding = {
  none: '',
  sm: 'px-4 sm:px-6',
  md: 'px-4 sm:px-6 lg:px-8',
  lg: 'px-4 sm:px-6 lg:px-8 xl:px-12',
}

export function Container({ 
  children, 
  size = 'lg', 
  padding = 'md',
  className 
}: ContainerProps) {
  return (
    <div className={cn(
      'mx-auto w-full',
      containerSizes[size],
      containerPadding[padding],
      className
    )}>
      {children}
    </div>
  )
}