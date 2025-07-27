'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    variant?: 'default' | 'success' | 'warning' | 'destructive'
    showValue?: boolean
  }
>(({ className, value = 0, variant = 'default', showValue = false, ...props }, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'destructive':
        return 'bg-red-500'
      default:
        return 'bg-primary'
    }
  }

  return (
    <div className="space-y-2">
      {showValue && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{value}%</span>
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        value={value}
        className={cn(
          'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full transition-all duration-500 ease-out',
            getVariantClasses()
          )}
          style={{ width: `${value}%` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
})
Progress.displayName = 'Progress'

export { Progress }
