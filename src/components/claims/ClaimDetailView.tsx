import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { AIFindingsPanel } from './AIFindingsPanel'
import { HumanReviewSection } from './HumanReviewSection'
import { useData } from '@/store/DataContext'
import { dataService } from '@/services/dataService'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, Audit, Workshop as WorkshopType, TimelineEvent } from '@/types'
import { workshops as mockWorkshops } from '@/data/mockData'
import {
  ArrowLeft,
  Building2,
  FileText,
  Calendar,
  User,
  Car,
  FileSpreadsheet,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Bell,
  Info,
  Loader2,
} from 'lucide-react'

const statusIcons = {
  approved: CheckCircle2,
  review: Clock,
  rejected: AlertTriangle,
  missing_data: Info,
}

export function ClaimDetailView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { claims } = useData()
  const [claim, setClaim] = useState<typeof claims[0] | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [audit, setAudit] = useState<Audit | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [workshop, setWorkshop] = useState<WorkshopType | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const c = claims.find(c => c.id === id)
    if (!c) { setLoading(false); return }
    setClaim(c)

    Promise.all([
      dataService.getInvoice(c),
      dataService.getAudit(c),
      dataService.getTimeline(c.claimId),
      dataService.getWorkshops(),
    ]).then(([inv, aud, tl, wrks]) => {
      setInvoice(inv)
      setAudit(aud)
      setTimeline(tl)
      setWorkshop(wrks.find(w => w.id === c?.workshopId) || mockWorkshops.find(w => w.id === c?.workshopId))
      setLoading(false)
    })
  }, [id, claims])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!claim || !audit || !invoice) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Claim not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/claims')}>Back to Claims</Button>
      </div>
    )
  }

  const StatusIcon = statusIcons[claim.status]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/claims')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{claim.claimId}</h1>
            <Badge
              variant={
                claim.status === 'approved' ? 'success' :
                claim.status === 'review' ? 'warning' :
                claim.status === 'rejected' ? 'destructive' : 'secondary'
              }
              className="capitalize"
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {claim.status.replace('_', ' ')}
            </Badge>
            {claim.riskScore >= 80 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> Fraud Alert
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{claim.claimantName} &middot; {claim.vehicleInfo}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Comparison</TabsTrigger>
          <TabsTrigger value="findings">AI Findings ({audit.findings.length})</TabsTrigger>
          <TabsTrigger value="review">Human Review</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Claim Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Policy Number</span>
                  <span className="text-sm font-mono font-medium">{claim.policyNumber}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Claimant</span>
                  <span className="text-sm font-medium">{claim.claimantName}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vehicle</span>
                  <span className="text-sm font-medium">{claim.vehicleInfo}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date Filed</span>
                  <span className="text-sm font-medium">{formatDate(claim.date)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Workshop Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{claim.workshopName}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="text-sm">{workshop?.address || '-'}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Risk Level</span>
                  <Badge
                    variant={workshop?.riskLevel === 'high' ? 'destructive' : workshop?.riskLevel === 'medium' ? 'warning' : 'success'}
                    className="capitalize"
                  >
                    {workshop?.riskLevel || 'Unknown'}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Flagged Claims</span>
                  <span className="text-sm font-medium text-red-500">{workshop?.flaggedClaims || 0}/{workshop?.totalClaims || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Total</span>
                  <span className="text-sm font-mono font-medium text-emerald-500">{formatCurrency(claim.totalEstimated)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Invoiced Total</span>
                  <span className="text-sm font-mono font-medium">{formatCurrency(claim.totalInvoiced)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Discrepancy</span>
                  <span className={`text-sm font-mono font-bold ${claim.discrepancyAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {claim.discrepancyAmount > 0 ? '+' : ''}{formatCurrency(claim.discrepancyAmount)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Risk Score</span>
                  <div className="flex items-center gap-2">
                    <Progress value={claim.riskScore} className="h-1.5 w-16" />
                    <span className={`text-sm font-bold ${
                      claim.riskScore >= 80 ? 'text-red-500' :
                      claim.riskScore >= 50 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {claim.riskScore}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <AIFindingsPanel
            findings={audit.findings}
            aiConfidence={audit.aiConfidence}
            aiRecommendation={audit.aiRecommendation}
            totalDiscrepancy={audit.totalDiscrepancy}
          />
        </TabsContent>

        <TabsContent value="invoice" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Invoice #{invoice.invoiceNumber}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-muted-foreground font-medium">Item</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Est. Qty</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Inv. Qty</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Est. Price</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Inv. Price</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Est. Total</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Inv. Total</th>
                    <th className="text-right p-3 text-muted-foreground font-medium">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => {
                    const diff = item.invoicedTotal - item.estimatedTotal
                    return (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="p-3 font-medium">{item.description}</td>
                        <td className="p-3 text-right">{item.estimatedQty}</td>
                        <td className={`p-3 text-right ${item.invoicedQty !== item.estimatedQty ? 'text-red-500 font-medium' : ''}`}>
                          {item.invoicedQty}
                        </td>
                        <td className="p-3 text-right font-mono">{formatCurrency(item.estimatedPrice)}</td>
                        <td className={`p-3 text-right font-mono ${item.invoicedPrice !== item.estimatedPrice ? 'text-red-500 font-medium' : ''}`}>
                          {formatCurrency(item.invoicedPrice)}
                        </td>
                        <td className="p-3 text-right font-mono">{formatCurrency(item.estimatedTotal)}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(item.invoicedTotal)}</td>
                        <td className={`p-3 text-right font-mono font-medium ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-emerald-500' : ''}`}>
                          {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td className="p-3 font-semibold" colSpan={4}>Totals</td>
                    <td className="p-3 text-right font-mono font-semibold">{formatCurrency(invoice.subtotal)}</td>
                    <td className="p-3 text-right font-mono font-semibold">{formatCurrency(invoice.subtotal)}</td>
                    <td className="p-3 text-right font-mono font-semibold text-red-500">
                      +{formatCurrency(Math.max(0, invoice.total - claim.totalEstimated))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="findings">
          <AIFindingsPanel
            findings={audit.findings}
            aiConfidence={audit.aiConfidence}
            aiRecommendation={audit.aiRecommendation}
            totalDiscrepancy={audit.totalDiscrepancy}
          />
        </TabsContent>

        <TabsContent value="review">
          <HumanReviewSection claimId={claim.id} />
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {timeline.map((event, idx) => {
                  const eventIcons = { system: Clock, reviewer: User, upload: Upload, alert: Bell }
                  const Icon = eventIcons[event.type]
                  return (
                    <div key={event.id} className="flex gap-4 pb-6 last:pb-0 relative">
                      {idx < timeline.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                      )}
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                        event.type === 'alert' ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950' : 'border-border bg-background'
                      }`}>
                        <Icon className={`h-4 w-4 ${event.type === 'alert' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{event.action}</p>
                          <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">by {event.user}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
