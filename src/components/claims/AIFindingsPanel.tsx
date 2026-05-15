import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, CircleX, DollarSign, PackageOpen, Scale, FileWarning } from 'lucide-react'
import type { AuditFinding } from '@/types'

const severityConfig = {
  critical: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: CircleX },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: AlertTriangle },
  medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: DollarSign },
  low: { color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: FileWarning },
}

const typeLabels: Record<string, string> = {
  duplicate_charge: 'Duplicate Charge',
  overpriced: 'Overpriced',
  unauthorized_item: 'Unauthorized Item',
  quantity_mismatch: 'Quantity Mismatch',
  missing_item: 'Missing Item',
  price_mismatch: 'Price Mismatch',
}

interface AIFindingsPanelProps {
  findings: AuditFinding[]
  aiConfidence: number
  aiRecommendation: string
  totalDiscrepancy: number
}

export function AIFindingsPanel({ findings, aiConfidence, aiRecommendation, totalDiscrepancy }: AIFindingsPanelProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              AI Audit Findings
            </CardTitle>
            <Badge variant={aiConfidence > 85 ? 'success' : 'warning'}>
              {aiConfidence}% Confidence
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Total Discrepancy Detected</p>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDiscrepancy)}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Findings Count</p>
              <p className="text-2xl font-bold">{findings.length}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">AI Confidence</p>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={aiConfidence} className="h-2 flex-1" />
                <span className="text-sm font-semibold">{aiConfidence}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {findings.map((finding) => {
              const sev = severityConfig[finding.severity]
              const SevIcon = sev.icon
              return (
                <div
                  key={finding.id}
                  className={`p-3 rounded-lg border ${sev.border} ${sev.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <SevIcon className={`h-4 w-4 mt-0.5 shrink-0 ${sev.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={finding.severity === 'critical' ? 'destructive' : finding.severity === 'high' ? 'warning' : 'secondary'} className="text-[10px] uppercase">
                          {finding.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {typeLabels[finding.type] || finding.type}
                        </Badge>
                        <span className="text-sm font-medium">{finding.itemDescription}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span>Estimated: <span className="font-medium">{formatCurrency(finding.estimatedAmount)}</span></span>
                        <span>Invoiced: <span className="font-medium">{formatCurrency(finding.invoicedAmount)}</span></span>
                        <span className="text-red-500">Discrepancy: <span className="font-medium">{formatCurrency(finding.discrepancyAmount)}</span></span>
                      </div>
                      <div className="mt-2 p-2 rounded bg-background/50 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Recommendation:</span> {finding.recommendation}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <PackageOpen className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold mb-1">AI Recommendation</p>
                <p className="text-sm text-muted-foreground">{aiRecommendation}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
