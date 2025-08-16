// src/components/ui/loading-states.tsx
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, RefreshCw, Clock } from 'lucide-react'

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'primary' | 'secondary'
}

export function LoadingSpinner({ 
  className, 
  size = 'md', 
  variant = 'default',
  ...props 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const variantClasses = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    secondary: 'text-secondary'
  }

  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      <Loader2 className={cn(
        'animate-spin',
        sizeClasses[size],
        variantClasses[variant]
      )} />
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  text?: string
  fullScreen?: boolean
}

export function LoadingOverlay({ 
  isLoading, 
  children, 
  text = 'Loading...',
  fullScreen = false 
}: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>

  return (
    <div className="relative">
      {children}
      <div className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm',
        fullScreen && 'fixed'
      )}>
        <LoadingSpinner size="lg" variant="primary" />
        {text && (
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  )
}

interface SkeletonTableProps {
  rows?: number
  columns?: number
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded animate-pulse flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-4 bg-muted rounded animate-pulse flex-1"
              style={{ animationDelay: `${(rowIndex + colIndex) * 100}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

interface LoadingCardProps {
  showImage?: boolean
  showActions?: boolean
}

export function LoadingCard({ showImage = false, showActions = false }: LoadingCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      {showImage && (
        <div className="h-48 bg-muted rounded-md animate-pulse" />
      )}
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-3 bg-muted rounded animate-pulse w-full" />
        <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
      </div>
      {showActions && (
        <div className="flex gap-2 pt-4">
          <div className="h-9 bg-muted rounded animate-pulse flex-1" />
          <div className="h-9 bg-muted rounded animate-pulse flex-1" />
        </div>
      )}
    </div>
  )
}

interface LoadingDotsProps {
  className?: string
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}

interface RefreshIndicatorProps {
  isRefreshing: boolean
  onRefresh?: () => void
  lastUpdated?: Date
}

export function RefreshIndicator({ 
  isRefreshing, 
  onRefresh,
  lastUpdated 
}: RefreshIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
      >
        <RefreshCw className={cn(
          'h-4 w-4',
          isRefreshing && 'animate-spin'
        )} />
      </button>
      {lastUpdated && (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  )
}

// Export all loading components
export default {
  LoadingSpinner,
  LoadingOverlay,
  SkeletonTable,
  LoadingCard,
  LoadingDots,
  RefreshIndicator
}