import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold">{value}</div>

        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}

        {trend && (
          <p
            className={cn(
              'text-xs mt-2',
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {trend.isPositive ? '+' : '-'}
            {Math.abs(trend.value)}%
          </p>
        )}
      </CardContent>

      {/* Background decoration */}
      {Icon && (
        <Icon className="h-32 w-32 absolute -right-8 -bottom-8 text-muted-foreground/5" />
      )}
    </Card>
  )
}
