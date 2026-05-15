import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { chartData, flaggedWorkshops, getDashboardStats } from '@/data/mockData'
import { formatCurrency } from '@/lib/utils'
import { TrendingDown, TrendingUp, AlertTriangle, DollarSign, FileCheck, BarChart3 } from 'lucide-react'

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#3b82f6']

export function AnalyticsPage() {
  const stats = getDashboardStats()
  const approvalRate = Math.round((stats.approved / stats.total) * 100)
  const avgDiscrepancy = stats.totalDiscrepancy / stats.total

  const statusData = [
    { name: 'Approved', value: stats.approved, color: '#10b981' },
    { name: 'Review', value: stats.review, color: '#f59e0b' },
    { name: 'Rejected', value: stats.rejected, color: '#ef4444' },
    { name: 'Missing Data', value: stats.missingData, color: '#6366f1' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Audit performance metrics and fraud insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approval Rate</p>
                <p className="text-2xl font-bold mt-1">{approvalRate}%</p>
              </div>
              <div className="rounded-lg p-2.5 bg-emerald-100 dark:bg-emerald-500/10">
                <FileCheck className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
              <TrendingUp className="h-3 w-3" /> 3% improvement
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Discrepancy</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(avgDiscrepancy)}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-red-100 dark:bg-red-500/10">
                <DollarSign className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-red-500">
              <TrendingUp className="h-3 w-3" /> 7% increase
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fraud Rate</p>
                <p className="text-2xl font-bold mt-1">{Math.round((stats.fraudAlerts / stats.total) * 100)}%</p>
              </div>
              <div className="rounded-lg p-2.5 bg-amber-100 dark:bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-amber-500">
              <TrendingUp className="h-3 w-3" /> 2% increase
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Volume</p>
                <p className="text-2xl font-bold mt-1">{chartData[chartData.length - 1].claims}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-100 dark:bg-blue-500/10">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
              <TrendingDown className="h-3 w-3" /> 8% from peak
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Fraud Detection Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                  <Legend />
                  <Line type="monotone" dataKey="fraud" stroke="#ef4444" strokeWidth={2} name="Fraud Alerts" dot={{ fill: '#ef4444', r: 3 }} />
                  <Line type="monotone" dataKey="discrepancy" stroke="#f59e0b" strokeWidth={2} name="Discrepancy ($000s)" dot={{ fill: '#f59e0b', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Claims Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Most Flagged Workshops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flaggedWorkshops.slice(0, 6)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" stroke="currentColor" />
                  <XAxis type="number" className="text-xs text-muted-foreground" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" className="text-xs" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="flagged" fill="#ef4444" name="Flagged Claims" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="total" fill="#3b82f6" name="Total Claims" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Monthly Claims Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                  <Legend />
                  <Bar dataKey="approved" stackId="a" fill="#10b981" name="Approved" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="reviewed" stackId="a" fill="#f59e0b" name="Review" />
                  <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Rejected" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
