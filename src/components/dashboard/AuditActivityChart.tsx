import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { chartData } from '@/data/mockData'

export function AuditActivityChart() {
  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Audit Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClaims" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--color-primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--color-primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" stroke="currentColor" />
              <XAxis dataKey="month" className="text-xs text-muted-foreground" tick={{ fontSize: 11 }} />
              <YAxis className="text-xs text-muted-foreground" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="claims"
                stroke="hsl(var(--color-primary))"
                fillOpacity={1}
                fill="url(#colorClaims)"
                strokeWidth={2}
                name="Total Claims"
              />
              <Area
                type="monotone"
                dataKey="fraud"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorFraud)"
                strokeWidth={2}
                name="Fraud Alerts"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
