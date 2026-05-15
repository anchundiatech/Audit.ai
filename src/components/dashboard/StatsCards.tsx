import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ElementType
  iconColor?: string
  iconBg?: string
}

export function StatsCard({ title, value, change, icon: Icon, iconColor, iconBg }: StatsCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                {change >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={cn(change >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                  {Math.abs(change)}% from last month
                </span>
              </div>
            )}
          </div>
          <div className={cn('rounded-lg p-2.5', iconBg || 'bg-primary/10')}>
            <Icon className={cn('h-4 w-4', iconColor || 'text-primary')} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
