const URL_STORAGE_KEY = 'insuraudit_n8n_url'
const SINGLE_MODE_KEY = 'insuraudit_n8n_single'

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(URL_STORAGE_KEY)
    if (stored) return stored
  }
  return import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'
}

function isSingleEndpoint(): boolean {
  if (typeof window !== 'undefined') {
    const val = localStorage.getItem(SINGLE_MODE_KEY)
    return val === 'true'
  }
  return false
}

interface N8nPayload {
  event: string
  timestamp: string
  data: Record<string, unknown>
}

const WEBHOOK_ENDPOINTS: Record<string, string> = {
  claim_approved: '/insurtech/claim-approved',
  claim_rejected: '/insurtech/claim-rejected',
  fraud_escalated: '/insurtech/fraud-escalated',
  audit_completed: '/insurtech/audit-completed',
  document_uploaded: '/insurtech/document-uploaded',
  review_started: '/insurtech/review-started',
}

async function sendToN8n(event: string, data: Record<string, unknown>) {
  const payload: N8nPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  }

  const single = isSingleEndpoint()
  const baseUrl = getBaseUrl()
  const endpoint = WEBHOOK_ENDPOINTS[event]

  if (!single && !endpoint) {
    console.warn(`[n8n] No endpoint configured for event: ${event}`)
    return { ok: false }
  }

  const url = single ? baseUrl : `${baseUrl}${endpoint}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      console.error(`[n8n] HTTP ${res.status} for ${event}`)
      return { ok: false, status: res.status }
    }

    console.log(`[n8n] ${event} sent successfully`)
    return { ok: true, status: res.status }
  } catch (err) {
    const isCors = err instanceof TypeError && err.message.includes('fetch')
    return { ok: false, error: err, isCors }
  }
}

export const n8n = {
  claimApproved(claimId: string, data: Record<string, unknown> = {}) {
    return sendToN8n('claim_approved', { claimId, ...data })
  },
  claimRejected(claimId: string, data: Record<string, unknown> = {}) {
    return sendToN8n('claim_rejected', { claimId, ...data })
  },
  fraudEscalated(claimId: string, data: Record<string, unknown> = {}) {
    return sendToN8n('fraud_escalated', { claimId, ...data })
  },
  auditCompleted(claimId: string, data: Record<string, unknown> = {}) {
    return sendToN8n('audit_completed', { claimId, ...data })
  },
  documentUploaded(claimId: string, data: Record<string, unknown> = {}) {
    return sendToN8n('document_uploaded', { claimId, ...data })
  },
  reviewStarted(claimId: string, data: Record<string, unknown> = {}) {
    return sendToN8n('review_started', { claimId, ...data })
  },

  async testConnection(url?: string): Promise<{ ok: boolean; message: string }> {
    const targetUrl = url || getBaseUrl()
    const payload = { event: 'ping', timestamp: new Date().toISOString(), data: {} }
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) return { ok: true, message: `n8n reachable (HTTP ${res.status})` }
      return { ok: false, message: `n8n returned HTTP ${res.status} — check your webhook path` }
    } catch {
      return { ok: false, message: 'Cannot reach n8n — verify the URL and CORS config' }
    }
  },
}

export function getN8nWebhookUrl(): string {
  return getBaseUrl()
}

export function setN8nWebhookUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(URL_STORAGE_KEY, url)
  }
}

export function getN8nSingleMode(): boolean {
  return isSingleEndpoint()
}

export function setN8nSingleMode(single: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SINGLE_MODE_KEY, String(single))
  }
}

export function getN8nEndpoints(): Record<string, string> {
  return { ...WEBHOOK_ENDPOINTS }
}
