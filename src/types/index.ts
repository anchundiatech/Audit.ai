export type ClaimStatus = 'approved' | 'review' | 'rejected' | 'missing_data'
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low'
export type FindingType =
  | 'duplicate_charge'
  | 'overpriced'
  | 'unauthorized_item'
  | 'quantity_mismatch'
  | 'missing_item'
  | 'price_mismatch'

export interface Claim {
  id: string
  claimId: string
  invoiceNumber: string
  workshopId: string
  workshopName: string
  status: ClaimStatus
  riskScore: number
  discrepancyAmount: number
  humanReview: boolean
  date: string
  policyNumber: string
  claimantName: string
  vehicleInfo: string
  totalEstimated: number
  totalInvoiced: number
}

export interface InvoiceItem {
  id: string
  description: string
  estimatedQty: number
  invoicedQty: number
  estimatedPrice: number
  invoicedPrice: number
  estimatedTotal: number
  invoicedTotal: number
  notes?: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  workshopId: string
  workshopName: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  status: string
}

export interface AuditFinding {
  id: string
  type: FindingType
  severity: FindingSeverity
  description: string
  estimatedAmount: number
  invoicedAmount: number
  discrepancyAmount: number
  itemDescription: string
  recommendation: string
}

export interface Audit {
  id: string
  claimId: string
  status: ClaimStatus
  findings: AuditFinding[]
  totalDiscrepancy: number
  aiConfidence: number
  aiRecommendation: string
  reviewedBy?: string
  reviewDate?: string
  reviewerNotes?: string
  escalated: boolean
}

export interface Workshop {
  id: string
  name: string
  address: string
  phone: string
  email: string
  totalClaims: number
  flaggedClaims: number
  avgDiscrepancy: number
  riskLevel: string
}

export interface TimelineEvent {
  id: string
  date: string
  action: string
  description: string
  user: string
  type: 'system' | 'reviewer' | 'upload' | 'alert'
}

export interface ChartData {
  month: string
  claims: number
  approved: number
  reviewed: number
  rejected: number
  fraud: number
  discrepancy: number
}
