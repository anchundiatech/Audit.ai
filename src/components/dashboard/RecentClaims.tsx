import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useData } from '@/store/DataContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowRight, AlertTriangle } from 'lucide-react'

export function RecentClaims() {
  const navigate = useNavigate()
  const { claims } = useData()
  const recentClaims = claims.slice(0, 5)

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Recent Claims</CardTitle>
        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/claims')}>
          View All <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim ID</TableHead>
              <TableHead>Workshop</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Discrepancy</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentClaims.map((claim) => (
              <TableRow
                key={claim.id}
                className="cursor-pointer"
                onClick={() => navigate(`/claims/${claim.id}`)}
              >
                <TableCell className="font-mono text-xs font-medium">{claim.claimId}</TableCell>
                <TableCell className="text-sm">{claim.workshopName}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      claim.status === 'approved' ? 'success' :
                      claim.status === 'review' ? 'warning' :
                      claim.status === 'rejected' ? 'destructive' : 'secondary'
                    }
                    className="capitalize"
                  >
                    {claim.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${
                      claim.riskScore >= 80 ? 'bg-red-500' :
                      claim.riskScore >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className="text-sm">{claim.riskScore}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm font-medium">
                  {claim.discrepancyAmount > 0 ? (
                    <span className="text-red-500">+{formatCurrency(claim.discrepancyAmount)}</span>
                  ) : (
                    <span className="text-emerald-500">$0.00</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(claim.date)}</TableCell>
                <TableCell>
                  {claim.riskScore >= 75 && (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
