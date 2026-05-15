import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  n8n,
  getN8nWebhookUrl,
  getN8nEndpoints,
  setN8nWebhookUrl,
  getN8nSingleMode,
  setN8nSingleMode,
} from '@/services/n8nWebhooks'
import { Loader2, Power, PowerOff, Webhook, RefreshCw, CheckCircle2, XCircle, Save, Link2, GitBranch } from 'lucide-react'

export function N8nSettings() {
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'online' | 'offline'>('untested')
  const [statusMsg, setStatusMsg] = useState('')
  const [urlInput, setUrlInput] = useState(getN8nWebhookUrl())
  const [singleMode, setSingleMode] = useState(getN8nSingleMode())
  const endpoints = getN8nEndpoints()

  useEffect(() => {
    const saved = getN8nWebhookUrl()
    if (saved && saved !== 'http://localhost:5678/webhook') {
      testConnection(saved)
    }
  }, [])

  const testConnection = async (url?: string) => {
    setTesting(true)
    setStatusMsg('')
    const res = await n8n.testConnection(url || urlInput)
    setConnectionStatus(res.ok ? 'online' : 'offline')
    setStatusMsg(res.message)
    setTesting(false)
  }

  const saveUrl = () => {
    setSaving(true)
    setN8nWebhookUrl(urlInput)
    setN8nSingleMode(singleMode)
    setConnectionStatus('untested')
    setStatusMsg('URL saved. Test the connection to verify.')
    setTimeout(() => setSaving(false), 500)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure external services and webhook endpoints</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              n8n Webhook Integration
            </CardTitle>
            <Badge
              variant={
                connectionStatus === 'online' ? 'success' :
                connectionStatus === 'offline' ? 'destructive' : 'secondary'
              }
              className="gap-1"
            >
              {connectionStatus === 'online' && <><Power className="h-3 w-3" /> Connected</>}
              {connectionStatus === 'offline' && <><PowerOff className="h-3 w-3" /> Offline</>}
              {connectionStatus === 'untested' && 'Not tested'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Webhook URL</label>
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setConnectionStatus('untested'); setStatusMsg('') }}
                placeholder="https://oportunogo.app.n8n.cloud/webhook/your-id"
                className="font-mono text-xs"
              />
              <Button variant="default" size="sm" className="gap-1.5" onClick={saveUrl} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Save
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => testConnection()} disabled={testing}>
                {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Saved in localStorage. Falls back to <code className="text-[10px] bg-muted px-1 py-0.5 rounded">VITE_N8N_WEBHOOK_URL</code>.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${singleMode ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Link2 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Single webhook endpoint</p>
              <p className="text-xs text-muted-foreground">All events sent to one URL, differentiated by the <code className="text-[10px] bg-muted px-1 rounded">event</code> field in the payload</p>
            </div>
            <button
              onClick={() => setSingleMode(true)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${singleMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input'}`}
            >
              On
            </button>
            <button
              onClick={() => setSingleMode(false)}
              className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${!singleMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input'}`}
            >
              Off
            </button>
          </div>

          {statusMsg && (
            <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
              connectionStatus === 'online'
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                : connectionStatus === 'offline'
                ? 'text-red-600 dark:text-red-400 bg-red-500/5'
                : 'text-muted-foreground bg-muted'
            }`}>
              {connectionStatus === 'online' && <CheckCircle2 className="h-3 w-3 shrink-0" />}
              {connectionStatus === 'offline' && <XCircle className="h-3 w-3 shrink-0" />}
              {statusMsg}
            </div>
          )}

          <Separator />

          <div>
            <p className="text-sm font-medium mb-2">
              {singleMode ? 'Payload Structure' : 'Webhook Endpoints'}
            </p>
            {singleMode ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  All events POST to your single URL. Your n8n agent can route by the <code className="text-[10px] bg-muted px-1 rounded">event</code> field:
                </p>
                <pre className="p-3 rounded-lg bg-muted text-xs overflow-x-auto whitespace-pre-wrap">{`{
  "event": "claim_approved | fraud_escalated | claim_rejected | ...",
  "timestamp": "2026-05-14T18:00:00.000Z",
  "data": {
    "claimId": "CLM-123",
    "notes": "reviewer notes here"
  }
}`}</pre>
                <div className="space-y-1.5 mt-2">
                  {Object.keys(endpoints).map(event => (
                    <div key={event} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-mono text-[10px]">{event}</Badge>
                      <span className="text-muted-foreground">→ {urlInput}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Create a POST webhook in n8n for each path:
                </p>
                <div className="space-y-1.5">
                  {Object.entries(endpoints).map(([event, path]) => (
                    <div key={event} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-mono text-[10px] w-28 justify-center shrink-0">
                        {event}
                      </Badge>
                      <code className="text-muted-foreground font-mono text-[10px] break-all">{urlInput}{path}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
