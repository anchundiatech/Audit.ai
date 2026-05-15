import { getN8nWebhookUrl, getN8nSingleMode } from './n8nWebhooks'

interface ExtractResult {
  ok: boolean
  data?: Record<string, unknown>
  error?: string
}

export async function extractDocument(file: File): Promise<ExtractResult> {
  const baseUrl = getN8nWebhookUrl()
  const singleMode = getN8nSingleMode()

  const url = singleMode
    ? baseUrl
    : `${baseUrl}/insurtech/extract`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('event', 'document_extract')
  formData.append('timestamp', new Date().toISOString())

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `n8n returned HTTP ${res.status}: ${text}` }
    }

    const data = await res.json()
    return { ok: true, data }
  } catch (err) {
    const msg = err instanceof TypeError && err.message.includes('fetch')
      ? 'CORS error — check n8n CORS settings'
      : `Connection error: ${err}`
    return { ok: false, error: msg }
  }
}
