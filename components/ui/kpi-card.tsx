import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react'

type Status = 'good' | 'warning' | 'critical' | 'neutral'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  status?: Status
  trend?: {
    value: number
    label: string
  }
  icon?: LucideIcon
  className?: string
}

const statusStyles: Record<Status, string> = {
  good: 'border-l-4 border-l-green-500 bg-gradient-to-br from-green-50/50 to-white',
  warning: 'border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-white',
  critical: 'border-l-4 border-l-red-500 bg-gradient-to-br from-red-50/50 to-white',
  neutral: 'border-l-4 border-l-gray-300',
}

const statusTextStyles: Record<Status, string> = {
  good: 'text-green-700',
  warning: 'text-amber-700',
  critical: 'text-red-700',
  neutral: 'text-gray-700',
}

export function KpiCard({
  title,
  value,
  subtitle,
  status = 'neutral',
  trend,
  icon: Icon,
  className,
}: KpiCardProps) {
  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null

  const trendColorClass = trend
    ? trend.value > 0
      ? 'text-green-600'
      : trend.value < 0
      ? 'text-red-600'
      : 'text-gray-500'
    : ''

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', statusStyles[status], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', statusTextStyles[status])}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && TrendIcon && (
          <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trendColorClass)}>
            <TrendIcon className="h-3 w-3" />
            <span>
              {trend.value > 0 ? '+' : ''}
              {(trend.value * 100).toFixed(1)}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface KpiGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5
}

export function KpiGrid({ children, columns = 4 }: KpiGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-3 lg:grid-cols-5',
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns])}>
      {children}
    </div>
  )
}
