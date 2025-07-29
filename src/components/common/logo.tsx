import { cn } from '@/lib/utils'
import { Zap } from 'lucide-react'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showText?: boolean
}

export function Logo({ size = 'md', className, showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'rounded-lg bg-primary p-2 text-primary-foreground',
        size === 'lg' && 'p-2.5'
      )}>
        <Zap className={cn('fill-current', sizeClasses[size])} />
      </div>
      {showText && (
        <span className={cn('font-bold', textSizeClasses[size])}>
          AI Automation
        </span>
      )}
    </div>
  )
}