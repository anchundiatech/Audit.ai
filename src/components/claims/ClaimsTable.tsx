import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useData } from '@/store/DataContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpDown,
  Loader2,
} from 'lucide-react'

export function ClaimsTable() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''

  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const perPage = 10
  const allClaims = useData().claims

  const filtered = useMemo(() => {
    let result = [...allClaims]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        c =>
          c.claimId.toLowerCase().includes(q) ||
          c.invoiceNumber.toLowerCase().includes(q) ||
          c.workshopName.toLowerCase().includes(q) ||
          c.claimantName.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter)
    }

    if (riskFilter !== 'all') {
      if (riskFilter === 'high') result = result.filter(c => c.riskScore >= 80)
      else if (riskFilter === 'medium') result = result.filter(c => c.riskScore >= 50 && c.riskScore < 80)
      else if (riskFilter === 'low') result = result.filter(c => c.riskScore < 50)
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      else if (sortField === 'riskScore') cmp = a.riskScore - b.riskScore
      else if (sortField === 'discrepancyAmount') cmp = a.discrepancyAmount - b.discrepancyAmount
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [search, statusFilter, riskFilter, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Claims</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} claims found</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, invoice, workshop..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[130px] h-9">
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="missing_data">Missing Data</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={v => { setRiskFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="high">High (80+)</SelectItem>
                  <SelectItem value="medium">Medium (50-79)</SelectItem>
                  <SelectItem value="low">Low (0-49)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Workshop</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('riskScore')}>
                    <span className="flex items-center gap-1">Risk Score <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('discrepancyAmount')}>
                    <span className="flex items-center gap-1">Discrepancy <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead>Human Review</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('date')}>
                    <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((claim) => (
                  <TableRow
                    key={claim.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/claims/${claim.id}`)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{claim.claimId}</TableCell>
                    <TableCell className="font-mono text-xs">{claim.invoiceNumber}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{claim.workshopName}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          claim.status === 'approved' ? 'success' :
                          claim.status === 'review' ? 'warning' :
                          claim.status === 'rejected' ? 'destructive' : 'secondary'
                        }
                        className="capitalize whitespace-nowrap"
                      >
                        {claim.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              claim.riskScore >= 80 ? 'bg-red-500' :
                              claim.riskScore >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${claim.riskScore}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          claim.riskScore >= 80 ? 'text-red-500' :
                          claim.riskScore >= 50 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                          {claim.riskScore}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {claim.discrepancyAmount > 0 ? (
                        <span className="text-red-500">+{formatCurrency(claim.discrepancyAmount)}</span>
                      ) : (
                        <span className="text-emerald-500">$0.00</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {claim.humanReview ? (
                        <Badge variant="warning" className="whitespace-nowrap">Required</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(claim.date)}
                    </TableCell>
                    <TableCell>
                      {claim.riskScore >= 75 && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) pageNum = i + 1
                else if (page <= 3) pageNum = i + 1
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = page - 2 + i
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
