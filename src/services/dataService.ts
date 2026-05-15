import { n8n, getN8nWebhookUrl } from './n8nWebhooks'
import { claims as mockClaims, getInvoiceForClaim, getAuditForClaim, getTimelineForClaim, getDashboardStats, chartData as mockChartData, flaggedWorkshops as mockFlaggedWorkshops, workshops as mockWorkshops } from '@/data/mockData'
import type { Claim, Invoice, Audit, TimelineEvent, ChartData, Workshop } from '@/types'

const CACHE_PREFIX = 'insuraudit_data_'
const CACHE_TTL = 5 * 60 * 1000

interface CacheEntry<T> {
  data: T
  timestamp: number
}

function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

function setCache<T>(key: string, data: T) {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch { /* quota exceeded */ }
}

async function fetchFromN8n<T>(endpoint: string, cacheKey: string, mockFallback: () => T): Promise<T> {
  const cached = getCache<T>(cacheKey)
  if (cached) return cached

  const baseUrl = getN8nWebhookUrl()
  if (!baseUrl || baseUrl === 'http://localhost:5678/webhook') {
    const mockData = mockFallback()
    setCache(cacheKey, mockData)
    return mockData
  }

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'fetch_data', timestamp: new Date().toISOString() }),
    })
    if (res.ok) {
      const data = await res.json()
      setCache(cacheKey, data)
      return data as T
    }
  } catch { /* fallback to mock */ }

  const mockData = mockFallback()
  setCache(cacheKey, mockData)
  return mockData
}

function addToStore<T>(key: string, item: T, getId: (item: T) => string) {
  const existing = getCache<T[]>(key) || []
  const idx = existing.findIndex((e: T) => getId(e) === getId(item))
  if (idx >= 0) existing[idx] = item
  else existing.unshift(item)
  setCache(key, existing)
}

export const dataService = {
  async getClaims(): Promise<Claim[]> {
    return fetchFromN8n<Claim[]>('/insurtech/claims', 'claims', () => mockClaims)
  },

  async getClaim(id: string): Promise<Claim | undefined> {
    const claims = await this.getClaims()
    return claims.find(c => c.id === id || c.claimId === id)
  },

  async getInvoice(claim: Claim): Promise<Invoice> {
    return fetchFromN8n<Invoice>(`/insurtech/invoice/${claim.claimId}`, `invoice_${claim.id}`, () => getInvoiceForClaim(claim))
  },

  async getAudit(claim: Claim): Promise<Audit> {
    return fetchFromN8n<Audit>(`/insurtech/audit/${claim.claimId}`, `audit_${claim.id}`, () => getAuditForClaim(claim))
  },

  async getTimeline(claimId: string): Promise<TimelineEvent[]> {
    return fetchFromN8n<TimelineEvent[]>(`/insurtech/timeline/${claimId}`, `timeline_${claimId}`, () => getTimelineForClaim(claimId))
  },

  async getAnalytics() {
    const stats = getDashboardStats()
    const chartData = await fetchFromN8n<ChartData[]>('/insurtech/analytics/charts', 'chartData', () => mockChartData)
    const flaggedWorkshops = await fetchFromN8n('/insurtech/analytics/workshops', 'flaggedWorkshops', () => mockFlaggedWorkshops)
    return { stats, chartData, flaggedWorkshops }
  },

  async getWorkshops(): Promise<Workshop[]> {
    return fetchFromN8n<Workshop[]>('/insurtech/workshops', 'workshops', () => mockWorkshops)
  },

  addClaimFromUpload(data: Record<string, unknown>) {
    const claim: Claim = {
      id: `claim-upload-${Date.now()}`,
      claimId: `CLM-${String(Math.floor(10000 + Math.random() * 90000))}`,
      invoiceNumber: (data.invoiceNumber as string) || `INV-${Date.now()}`,
      workshopId: 'w-upload',
      workshopName: (data.workshop as string) || 'Uploaded Workshop',
      status: 'review',
      riskScore: Math.floor(Math.random() * 40) + 20,
      discrepancyAmount: 0,
      humanReview: true,
      date: new Date().toISOString().split('T')[0],
      policyNumber: 'POL-UPLOAD',
      claimantName: 'Uploaded Claim',
      vehicleInfo: 'Vehicle pending',
      totalEstimated: 0,
      totalInvoiced: (data.total as number) || 0,
    }
    addToStore<Claim>('claims', claim, c => c.id)
    return claim
  },
}

export function clearDataCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
  keys.forEach(k => localStorage.removeItem(k))
}
