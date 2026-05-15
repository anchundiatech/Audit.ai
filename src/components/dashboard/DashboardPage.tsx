import { useState, useEffect } from 'react'
import { FileCheck, FileSearch, FileX, FileWarning, AlertTriangle, DollarSign, Shield, RefreshCw, Loader2 } from 'lucide-react'
import { StatsCard } from '@/components/dashboard/StatsCards'
import { AuditActivityChart } from '@/components/dashboard/AuditActivityChart'
import { RecentClaims } from '@/components/dashboard/RecentClaims'
import { Button } from '@/components/ui/button'
import { useData } from '@/store/DataContext'
import { formatCurrency } from '@/lib/utils'

export function DashboardPage() {
  const { claims, loading, refreshing, refresh } = useData()
  const [stats, setStats] = useState({ total: 0, approved: 0, review: 0, rejected: 0, missingData: 0, fraudAlerts: 0, totalDiscrepancy: 0, avgRisk: 0 })

  useEffect(() => {
    const total = claims.length
    setStats({
      total,
      approved: claims.filter(c => c.status === 'approved').length,
      review: claims.filter(c => c.status === 'review').length,
      rejected: claims.filter(c => c.status === 'rejected').length,
      missingData: claims.filter(c => c.status === 'missing_data').length,
      fraudAlerts: claims.filter(c => c.riskScore >= 75).length,
      totalDiscrepancy: claims.reduce((s, c) => s + c.discrepancyAmount, 0),
      avgRisk: total ? Math.round(claims.reduce((s, c) => s + c.riskScore, 0) / total) : 0,
    })
  }, [claims])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Insurance claim audit overview and insights</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={refresh} disabled={loading || refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Total Claims Audited" value={stats.total} change={12} icon={Shield} iconColor="text-blue-600" iconBg="bg-blue-100 dark:bg-blue-500/10" />
            <StatsCard title="Approved" value={stats.approved} change={8} icon={FileCheck} iconColor="text-emerald-600" iconBg="bg-emerald-100 dark:bg-emerald-500/10" />
            <StatsCard title="Under Review" value={stats.review} change={-3} icon={FileSearch} iconColor="text-amber-600" iconBg="bg-amber-100 dark:bg-amber-500/10" />
            <StatsCard title="Rejected" value={stats.rejected} change={5} icon={FileX} iconColor="text-red-600" iconBg="bg-red-100 dark:bg-red-500/10" />
            <StatsCard title="Fraud Alerts" value={stats.fraudAlerts} change={15} icon={AlertTriangle} iconColor="text-red-600" iconBg="bg-red-100 dark:bg-red-500/10" />
            <StatsCard title="Total Discrepancy" value={formatCurrency(stats.totalDiscrepancy)} change={7} icon={DollarSign} iconColor="text-orange-600" iconBg="bg-orange-100 dark:bg-orange-500/10" />
            <StatsCard title="Missing Data" value={stats.missingData} change={-2} icon={FileWarning} iconColor="text-slate-600" iconBg="bg-slate-100 dark:bg-slate-500/10" />
            <StatsCard title="Avg Risk Score" value={`${stats.avgRisk}%`} change={-4} icon={Shield} iconColor="text-purple-600" iconBg="bg-purple-100 dark:bg-purple-500/10" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AuditActivityChart />
            <RecentClaims />
          </div>
        </>
      )}
    </div>
  )
}
