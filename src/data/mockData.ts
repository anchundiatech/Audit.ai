import type { Claim, Invoice, InvoiceItem, AuditFinding, Audit, Workshop, TimelineEvent, ChartData, ClaimStatus } from '@/types'

export const workshops: Workshop[] = [
  { id: 'w1', name: 'AutoCare Center', address: '123 Main St, City', phone: '(555) 123-4567', email: 'info@autocare.com', totalClaims: 145, flaggedClaims: 23, avgDiscrepancy: 1250, riskLevel: 'medium' },
  { id: 'w2', name: 'Premium Body Shop', address: '456 Oak Ave, City', phone: '(555) 234-5678', email: 'contact@premiumbody.com', totalClaims: 98, flaggedClaims: 31, avgDiscrepancy: 2100, riskLevel: 'high' },
  { id: 'w3', name: 'QuickFix Garage', address: '789 Elm St, City', phone: '(555) 345-6789', email: 'service@quickfix.com', totalClaims: 212, flaggedClaims: 12, avgDiscrepancy: 680, riskLevel: 'low' },
  { id: 'w4', name: 'Elite Collision Repairs', address: '321 Pine Rd, City', phone: '(555) 456-7890', email: 'claims@elitecollision.com', totalClaims: 167, flaggedClaims: 45, avgDiscrepancy: 3400, riskLevel: 'high' },
  { id: 'w5', name: 'Budget Auto Services', address: '654 Cedar Ln, City', phone: '(555) 567-8901', email: 'info@budgetauto.com', totalClaims: 78, flaggedClaims: 8, avgDiscrepancy: 450, riskLevel: 'low' },
  { id: 'w6', name: 'Metro Garage & Body', address: '987 Maple Dr, City', phone: '(555) 678-9012', email: 'hello@metrogarage.com', totalClaims: 134, flaggedClaims: 19, avgDiscrepancy: 980, riskLevel: 'medium' },
]

const itemTemplates = [
  { description: 'Front Bumper Replacement', estPrice: 1200, notes: 'OEM part required' },
  { description: 'Rear Bumper Repair', estPrice: 850, notes: 'Aftermarket part' },
  { description: 'Windshield Replacement', estPrice: 450, notes: '' },
  { description: 'Left Front Door Panel', estPrice: 780, notes: 'Color matching required' },
  { description: 'Right Rear Quarter Panel', estPrice: 1100, notes: 'OEM part' },
  { description: 'Engine Oil Change', estPrice: 85, notes: 'Synthetic oil' },
  { description: 'Brake Pad Replacement - Front', estPrice: 320, notes: 'Ceramic pads' },
  { description: 'Brake Rotor Replacement - Front', estPrice: 450, notes: 'OEM rotors' },
  { description: 'Headlight Assembly - Left', estPrice: 520, notes: 'LED assembly' },
  { description: 'Tail Light Assembly - Right', estPrice: 380, notes: '' },
  { description: 'Radiator Replacement', estPrice: 650, notes: '' },
  { description: 'AC Compressor', estPrice: 980, notes: 'Reconditioned unit' },
  { description: 'Transmission Fluid Change', estPrice: 250, notes: 'ATF fluid' },
  { description: 'Wheel Alignment', estPrice: 120, notes: '4-wheel alignment' },
  { description: 'Tire Replacement - Set of 4', estPrice: 800, notes: 'All-season tires' },
  { description: 'Power Steering Pump', estPrice: 420, notes: 'Rebuilt unit' },
  { description: 'Starter Motor Replacement', estPrice: 350, notes: '' },
  { description: 'Alternator Replacement', estPrice: 480, notes: '' },
  { description: 'Catalytic Converter', estPrice: 1250, notes: 'OEM required' },
  { description: 'Muffler Replacement', estPrice: 280, notes: 'Aftermarket' },
]

function generateInvoiceItems(count: number, fraudMultiplier: number = 1): InvoiceItem[] {
  const items: InvoiceItem[] = []
  const selected = [...itemTemplates].sort(() => Math.random() - 0.5).slice(0, count)
  selected.forEach((tmpl, i) => {
    const qty = Math.floor(Math.random() * 2) + 1
    const estTotal = tmpl.estPrice * qty
    const inflate = fraudMultiplier > 1 ? fraudMultiplier : 1 + (Math.random() * 0.15)
    const invoicedPrice = Math.round(tmpl.estPrice * inflate)
    const invoicedQty = Math.random() > 0.85 ? qty + 1 : qty
    items.push({
      id: `item-${i}`,
      description: tmpl.description,
      estimatedQty: qty,
      invoicedQty,
      estimatedPrice: tmpl.estPrice,
      invoicedPrice,
      estimatedTotal: estTotal,
      invoicedTotal: invoicedPrice * invoicedQty,
      notes: Math.random() > 0.7 ? tmpl.notes : undefined,
    })
  })
  return items
}

function generateAuditFindings(items: InvoiceItem[], fraudLevel: number): AuditFinding[] {
  const findings: AuditFinding[] = []
  const types: Array<{ type: AuditFinding['type']; sev: AuditFinding['severity']; desc: string; rec: string }> = [
    { type: 'overpriced', sev: 'high', desc: 'Unit price exceeds estimation', rec: 'Adjust to estimated unit price' },
    { type: 'quantity_mismatch', sev: 'medium', desc: 'Invoiced quantity differs from estimation', rec: 'Verify actual parts used' },
    { type: 'duplicate_charge', sev: 'critical', desc: 'Possible duplicate billing detected', rec: 'Flag for manual review' },
    { type: 'unauthorized_item', sev: 'critical', desc: 'Item not in approved estimation', rec: 'Request approval documentation' },
    { type: 'price_mismatch', sev: 'medium', desc: 'Price does not match agreed rate', rec: 'Apply contracted rate' },
  ]

  items.forEach((item, idx) => {
    if (item.invoicedPrice !== item.estimatedPrice && Math.random() < 0.6) {
      findings.push({
        id: `finding-${idx}-1`,
        type: 'overpriced',
        severity: item.invoicedPrice > item.estimatedPrice * 1.2 ? 'high' : 'medium',
        description: `${item.description}: invoiced at $${item.invoicedPrice} vs estimated $${item.estimatedPrice}`,
        estimatedAmount: item.estimatedTotal,
        invoicedAmount: item.invoicedPrice * item.invoicedQty,
        discrepancyAmount: Math.abs((item.invoicedPrice * item.invoicedQty) - item.estimatedTotal),
        itemDescription: item.description,
        recommendation: 'Apply estimated unit price',
      })
    }
    if (item.invoicedQty !== item.estimatedQty && Math.random() < 0.5) {
      findings.push({
        id: `finding-${idx}-2`,
        type: 'quantity_mismatch',
        severity: Math.abs(item.invoicedQty - item.estimatedQty) > 1 ? 'high' : 'low',
        description: `${item.description}: qty ${item.invoicedQty} vs estimated ${item.estimatedQty}`,
        estimatedAmount: item.estimatedTotal,
        invoicedAmount: item.invoicedPrice * item.invoicedQty,
        discrepancyAmount: Math.abs(item.estimatedQty - item.invoicedQty) * item.estimatedPrice,
        itemDescription: item.description,
        recommendation: 'Verify quantity with workshop',
      })
    }
  })

  if (fraudLevel > 0.7 && Math.random() < 0.4) {
    const dupItem = items[Math.floor(Math.random() * items.length)]
    findings.push({
      id: `finding-dup-${Date.now()}`,
      type: 'duplicate_charge',
      severity: 'critical',
      description: `Possible duplicate: ${dupItem.description} appears twice in invoice`,
      estimatedAmount: dupItem.estimatedTotal,
      invoicedAmount: dupItem.invoicedTotal * 2,
      discrepancyAmount: dupItem.invoicedTotal,
      itemDescription: dupItem.description,
      recommendation: 'Flag for manual review - possible fraudulent billing',
    })
  }

  if (fraudLevel > 0.8 && Math.random() < 0.3) {
    findings.push({
      id: `finding-unauth-${Date.now()}`,
      type: 'unauthorized_item',
      severity: 'critical',
      description: 'Item not present in approved estimation',
      estimatedAmount: 0,
      invoicedAmount: 450,
      discrepancyAmount: 450,
      itemDescription: 'Undefined Service Charge',
      recommendation: 'Request prior authorization documentation',
    })
  }

  return findings
}

function generateClaims(): Claim[] {
  const claims: Claim[] = []
  const statuses: Claim['status'][] = ['approved', 'review', 'rejected', 'missing_data']
  const claimIds = new Set<string>()

  for (let i = 1; i <= 50; i++) {
    const workshop = workshops[Math.floor(Math.random() * workshops.length)]
    const isHighRiskWorkshop = workshop.riskLevel === 'high'
    const statusWeights = isHighRiskWorkshop
      ? ['review', 'review', 'rejected', 'approved', 'review']
      : statuses
    const status = statusWeights[Math.floor(Math.random() * statusWeights.length)]
    const riskScore = isHighRiskWorkshop
      ? Math.min(100, Math.floor(Math.random() * 40) + 35 + Math.floor(Math.random() * 26))
      : Math.floor(Math.random() * 60) + Math.floor(Math.random() * 41)

    let claimId: string
    do { claimId = `CLM-${String(Math.floor(10000 + Math.random() * 90000))}` } while (claimIds.has(claimId))
    claimIds.add(claimId)

    const invNum = `INV-${String(Math.floor(10000 + Math.random() * 90000))}`
    const itemCount = Math.floor(Math.random() * 5) + 3
    const fraudMultiplier = status === 'rejected' || status === 'review' ? 1.3 + Math.random() * 0.5 : 1 + Math.random() * 0.1
    const items = generateInvoiceItems(itemCount, fraudMultiplier)
    const estTotal = items.reduce((s, it) => s + it.estimatedTotal, 0)
    const invTotal = items.reduce((s, it) => s + it.invoicedTotal, 0)
    const discrepancy = Math.max(0, invTotal - estTotal)

    const daysAgo = Math.floor(Math.random() * 90)
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)

    claims.push({
      id: `claim-${i}`,
      claimId,
      invoiceNumber: invNum,
      workshopId: workshop.id,
      workshopName: workshop.name,
      status: status as ClaimStatus,
      riskScore: Math.min(100, riskScore),
      discrepancyAmount: Math.round(discrepancy),
      humanReview: status === 'review' || Math.random() > 0.7,
      date: d.toISOString().split('T')[0],
      policyNumber: `POL-${String(Math.floor(100000 + Math.random() * 900000))}`,
      claimantName: ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'Robert Wilson', 'Lisa Anderson', 'David Martinez', 'Jennifer Taylor'][Math.floor(Math.random() * 8)],
      vehicleInfo: ['2023 Toyota Camry', '2022 Honda Accord', '2024 Ford F-150', '2021 BMW X5', '2023 Tesla Model 3', '2022 Mercedes C300', '2024 Audi Q5', '2021 Hyundai Tucson'][Math.floor(Math.random() * 8)],
      totalEstimated: estTotal,
      totalInvoiced: invTotal,
    })
  }

  return claims.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export const claims: Claim[] = generateClaims()

export function getInvoiceForClaim(claim: Claim): Invoice {
  const itemCount = Math.floor(Math.random() * 5) + 3
  const fraudMultiplier = claim.status === 'rejected' || claim.status === 'review' ? 1.3 + Math.random() * 0.5 : 1 + Math.random() * 0.1
  const items = generateInvoiceItems(itemCount, fraudMultiplier)
  const subtotal = items.reduce((s, it) => s + it.invoicedTotal, 0)
  const tax = Math.round(subtotal * 0.08)
  return {
    id: `inv-${claim.id}`,
    invoiceNumber: claim.invoiceNumber,
    date: claim.date,
    workshopId: claim.workshopId,
    workshopName: claim.workshopName,
    items,
    subtotal,
    tax,
    total: subtotal + tax,
    status: claim.status,
  }
}

export function getAuditForClaim(claim: Claim): Audit {
  const items = getInvoiceForClaim(claim).items
  const fraudLevel = claim.riskScore / 100
  const findings = generateAuditFindings(items, fraudLevel)
  const totalDisc = findings.reduce((s, f) => s + f.discrepancyAmount, 0)

  return {
    id: `audit-${claim.id}`,
    claimId: claim.claimId,
    status: claim.status,
    findings,
    totalDiscrepancy: totalDisc,
    aiConfidence: Math.max(50, Math.min(99, 85 - (claim.riskScore * 0.3) + Math.random() * 10)),
    aiRecommendation: claim.riskScore > 70
      ? 'High probability of overbilling. Recommend manual review and possible fraud investigation.'
      : claim.riskScore > 40
      ? 'Minor discrepancies detected. Recommend adjusting invoice to match estimation.'
      : 'Invoice aligns with estimation within acceptable tolerance. Recommend approval.',
    escalated: claim.riskScore > 80,
  }
}

export function getTimelineForClaim(claimId: string): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { id: 't1', date: '2025-03-10', action: 'Claim Filed', description: 'Claim submitted by policyholder', user: 'System', type: 'system' },
    { id: 't2', date: '2025-03-11', action: 'Estimation Approved', description: 'Workshop estimation approved by adjuster', user: 'Sarah K.', type: 'system' },
    { id: 't3', date: '2025-03-15', action: 'Invoice Uploaded', description: 'Workshop invoice received for auditing', user: 'Workshop', type: 'upload' },
    { id: 't4', date: '2025-03-15', action: 'AI Audit Completed', description: 'Automated invoice analysis completed', user: 'AI System', type: 'system' },
    { id: 't5', date: '2025-03-15', action: 'Discrepancy Alert', description: 'Overpriced items detected in invoice', user: 'AI System', type: 'alert' },
    { id: 't6', date: '2025-03-16', action: 'Human Review Required', description: 'Flagged for manual review due to high risk score', user: 'System', type: 'alert' },
  ]
  return events
}

export const chartData: ChartData[] = [
  { month: 'Jan', claims: 145, approved: 98, reviewed: 28, rejected: 12, fraud: 7, discrepancy: 45200 },
  { month: 'Feb', claims: 162, approved: 112, reviewed: 30, rejected: 15, fraud: 5, discrepancy: 52300 },
  { month: 'Mar', claims: 158, approved: 105, reviewed: 32, rejected: 18, fraud: 8, discrepancy: 48700 },
  { month: 'Apr', claims: 178, approved: 120, reviewed: 35, rejected: 20, fraud: 11, discrepancy: 61200 },
  { month: 'May', claims: 195, approved: 130, reviewed: 38, rejected: 22, fraud: 9, discrepancy: 58400 },
  { month: 'Jun', claims: 210, approved: 145, reviewed: 40, rejected: 18, fraud: 7, discrepancy: 55600 },
  { month: 'Jul', claims: 225, approved: 158, reviewed: 42, rejected: 20, fraud: 12, discrepancy: 67800 },
  { month: 'Aug', claims: 240, approved: 168, reviewed: 45, rejected: 22, fraud: 14, discrepancy: 72300 },
  { month: 'Sep', claims: 218, approved: 152, reviewed: 40, rejected: 18, fraud: 10, discrepancy: 63400 },
  { month: 'Oct', claims: 198, approved: 140, reviewed: 35, rejected: 16, fraud: 8, discrepancy: 52100 },
  { month: 'Nov', claims: 182, approved: 128, reviewed: 32, rejected: 15, fraud: 6, discrepancy: 49800 },
  { month: 'Dec', claims: 165, approved: 115, reviewed: 30, rejected: 12, fraud: 5, discrepancy: 44500 },
]

export const flaggedWorkshops = workshops
  .map(w => ({ name: w.name, flagged: w.flaggedClaims, total: w.totalClaims, avgDiscrepancy: w.avgDiscrepancy }))
  .sort((a, b) => b.flagged - a.flagged)

export function getDashboardStats() {
  const total = claims.length
  const approved = claims.filter(c => c.status === 'approved').length
  const review = claims.filter(c => c.status === 'review').length
  const rejected = claims.filter(c => c.status === 'rejected').length
  const missingData = claims.filter(c => c.status === 'missing_data').length
  const fraudAlerts = claims.filter(c => c.riskScore >= 75).length
  const totalDiscrepancy = claims.reduce((s, c) => s + c.discrepancyAmount, 0)
  const avgRisk = Math.round(claims.reduce((s, c) => s + c.riskScore, 0) / total)

  return { total, approved, review, rejected, missingData, fraudAlerts, totalDiscrepancy, avgRisk }
}
