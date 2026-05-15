import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Eye,
  Loader2,
  ArrowRight,
  FileJson,
  Bot,
} from 'lucide-react'
import { n8n } from '@/services/n8nWebhooks'
import { extractDocument } from '@/services/documentExtractor'

type UploadPhase = 'idle' | 'uploading' | 'extracting' | 'complete' | 'error'

interface ExtractedInvoice {
  invoiceNumber: string
  date: string
  workshop: string
  workshopAddress?: string
  workshopPhone?: string
  claimId?: string
  policyNumber?: string
  vehicleInfo?: string
  claimantName?: string
  subtotal?: number
  tax?: number
  total: number
  items: Array<{
    description: string
    partNumber?: string
    qty: number
    unitPrice: number
    total: number
  }>
  notes?: string
}

export function UploadPage() {
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [files, setFiles] = useState<{ name: string; size: string; status: 'pending' | 'done' | 'error'; isJson: boolean }[]>([])
  const [extractedData, setExtractedData] = useState<ExtractedInvoice | null>(null)
  const [showJson, setShowJson] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [n8nConfigured, setN8nConfigured] = useState(false)
  const [n8nError, setN8nError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function parseInvoiceJson(parsed: Record<string, unknown>): ExtractedInvoice {
    return {
      invoiceNumber: (parsed.invoiceNumber as string) || (parsed.estimationId as string) || `FILE-${Date.now()}`,
      date: (parsed.date as string) || 'Unknown',
      workshop: ((parsed.workshop as Record<string, string>)?.name as string) || (parsed.workshop as string) || 'Unknown',
      workshopAddress: (parsed.workshop as Record<string, string>)?.address,
      workshopPhone: (parsed.workshop as Record<string, string>)?.phone,
      claimId: ((parsed.claimInfo as Record<string, string>)?.claimId as string) || (parsed.claimId as string),
      policyNumber: ((parsed.claimInfo as Record<string, string>)?.policyNumber as string) || (parsed.policyNumber as string),
      vehicleInfo: ((parsed.claimInfo as Record<string, string>)?.vehicleInfo as string) || (parsed.vehicleInfo as string),
      claimantName: ((parsed.claimInfo as Record<string, string>)?.claimantName as string) || (parsed.claimantName as string),
      subtotal: parsed.subtotal as number,
      tax: parsed.tax as number,
      total: (parsed.total as number) || ((parsed.items as Array<Record<string, unknown>>) || [])?.reduce((s, i) => s + ((i.total as number) || 0), 0) || 0,
      items: ((parsed.items as Array<Record<string, unknown>>) || (parsed.approvedItems as Array<Record<string, unknown>>) || []).map((i) => ({
        description: (i.description as string) || 'Unknown',
        partNumber: i.partNumber as string,
        qty: (i.qty as number) ?? 0,
        unitPrice: (i.unitPrice as number) ?? 0,
        total: (i.total as number) ?? 0,
      })),
      notes: parsed.notes as string,
    }
  }

  const processFile = useCallback(async (file: File) => {
    setPhase('uploading')
    setProgress(0)
    setParseError(null)

    const isJson = file.name.endsWith('.json')

    if (isJson) {
      await new Promise(r => setTimeout(r, 400))
      setProgress(40)
      setPhase('extracting')
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        await new Promise(r => setTimeout(r, 600))
        setProgress(90)
        const extracted = parseInvoiceJson(parsed)
        setExtractedData(extracted)
        setProgress(100)
        setPhase('complete')
        setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'done' as const } : f))
      } catch (err) {
        setParseError(`Error parsing JSON: ${err instanceof SyntaxError ? 'Invalid JSON format' : String(err)}`)
        setPhase('error')
        setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'error' as const } : f))
      }
      return
    }

    setProgress(20)
    setPhase('extracting')

    const webhookUrl = localStorage.getItem('insuraudit_n8n_url') || import.meta.env.VITE_N8N_WEBHOOK_URL || ''
    if (!webhookUrl) {
      setN8nConfigured(false)
      setPhase('complete')
      setProgress(100)
      setExtractedData({
        invoiceNumber: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
        date: new Date().toISOString().split('T')[0],
        workshop: file.name,
        total: 0,
        items: [],
      })
      setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'done' as const } : f))
      return
    }

    setN8nConfigured(true)
    setN8nError(null)

    try {
      const base64 = await readFileAsBase64(file)
      setProgress(50)

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'document_uploaded',
          timestamp: new Date().toISOString(),
          data: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || file.name.split('.').pop(),
            fileBase64: base64,
          },
        }),
      })

      setProgress(80)

      if (res.ok) {
        const body = await res.json().catch(() => ({}))
        if (body && body.invoiceNumber) {
          setExtractedData(parseInvoiceJson(body as Record<string, unknown>))
        } else {
          setN8nError('n8n responded but returned no invoice data')
          setExtractedData({
            invoiceNumber: `PROCESSED-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            workshop: file.name,
            total: 0,
            items: [],
          })
        }
        setPhase('complete')
      } else {
        setN8nError(`n8n returned HTTP ${res.status}`)
        setExtractedData({
          invoiceNumber: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
          date: new Date().toISOString().split('T')[0],
          workshop: file.name,
          total: 0,
          items: [],
        })
        setPhase('complete')
      }
    } catch (err) {
      setN8nError(String(err))
      setExtractedData({
        invoiceNumber: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
        date: new Date().toISOString().split('T')[0],
        workshop: file.name,
        total: 0,
        items: [],
      })
      setPhase('complete')
    }

    setProgress(100)
    setFiles(prev => prev.map(f => f.name === file.name ? { ...f, status: 'done' as const } : f))
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.pdf') || f.name.endsWith('.json') || f.name.endsWith('.xml') ||
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') ||
      f.type === 'image/jpeg' || f.type === 'image/png'
    )
    if (dropped.length > 0) {
      setFiles(prev => [
        ...prev,
        ...dropped.map(f => ({
          name: f.name,
          size: `${(f.size / 1024).toFixed(0)} KB`,
          status: 'pending' as const,
          isJson: f.name.endsWith('.json'),
        })),
      ])
      processFile(dropped[0])
    }
  }, [processFile])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length > 0) {
      setFiles(prev => [
        ...prev,
        ...selected.map(f => ({
          name: f.name,
          size: `${(f.size / 1024).toFixed(0)} KB`,
          status: 'pending' as const,
          isJson: f.name.endsWith('.json'),
        })),
      ])
      processFile(selected[0])
    }
  }

  const resetUpload = () => {
    setPhase('idle')
    setProgress(0)
    setFiles([])
    setExtractedData(null)
    setShowJson(false)
    setParseError(null)
    setN8nConfigured(false)
    setN8nError(null)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload workshop invoices and claim estimations for AI auditing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-8">
              <div
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 transition-colors ${
                  dragOver
                    ? 'border-primary bg-primary/5'
                    : phase === 'idle'
                    ? 'border-border hover:border-primary/50 hover:bg-muted/30'
                    : 'border-border pointer-events-none opacity-60'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => phase === 'idle' && inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.json,.xml,.xlsx,.xls,.jpg,.jpeg,.png"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {phase === 'idle' && (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-4">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-base font-semibold">Drop files here or click to upload</p>
                    <p className="text-sm text-muted-foreground mt-1">PDF, JSON, XML, Excel, JPEG, PNG - Max 25MB each</p>
                    <div className="flex gap-2 mt-4">
                      <Badge variant="secondary">Invoice PDF</Badge>
                      <Badge variant="secondary">Estimation File</Badge>
                      <Badge variant="secondary">Supporting Docs</Badge>
                    </div>
                  </>
                )}

                {phase !== 'idle' && (
                  <div className="text-center space-y-3">
                    {phase === 'uploading' && <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />}
                    {phase === 'extracting' && <FileSpreadsheet className="h-8 w-8 text-amber-500 mx-auto animate-pulse" />}
                    {phase === 'complete' && <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />}
                    {phase === 'error' && <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />}
                    <p className="text-base font-semibold">
                      {phase === 'uploading' && 'Uploading documents...'}
                      {phase === 'extracting' && 'Extracting invoice data...'}
                      {phase === 'complete' && 'Document processed successfully!'}
                      {phase === 'error' && 'Upload failed. Please try again.'}
                    </p>
                    <Progress value={progress} className="h-2 max-w-xs mx-auto" />
                    <p className="text-xs text-muted-foreground">{progress}%</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {files.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Uploaded Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    {file.isJson ? (
                      <FileJson className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                    </div>
                    {phase === 'complete' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : phase === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {phase === 'error' && parseError && (
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {phase === 'complete' && extractedData && extractedData.items.length === 0 && !n8nConfigured && (
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">n8n not configured</p>
                <p className="text-muted-foreground mt-1">
                  Configurá tu webhook de n8n en <strong>Settings &gt; Integrations</strong> para extraer datos de PDFs automáticamente.
                </p>
              </div>
            </div>
          )}
          {phase === 'complete' && extractedData && extractedData.items.length === 0 && n8nConfigured && !n8nError && (
            <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm flex items-start gap-2">
              <FileSpreadsheet className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">Sent to n8n — no invoice data returned</p>
                <p className="text-muted-foreground mt-1">
                  Tu agente de n8n debe responder al webhook con un JSON que contenga <code className="text-[10px] bg-muted px-1 rounded">invoiceNumber</code>, <code className="text-[10px] bg-muted px-1 rounded">items</code> y <code className="text-[10px] bg-muted px-1 rounded">total</code>.
                </p>
              </div>
            </div>
          )}
          {phase === 'complete' && extractedData && extractedData.items.length === 0 && n8nError && (
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-600 dark:text-red-400">n8n error</p>
                <p className="text-muted-foreground mt-1">{n8nError}</p>
              </div>
            </div>
          )}

          {phase === 'complete' && extractedData && extractedData.items.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    Extracted Data Preview
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowJson(!showJson)} className="text-xs gap-1">
                    <Eye className="h-3 w-3" />
                    {showJson ? 'Formatted View' : 'JSON Preview'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showJson ? (
                  <pre className="p-4 rounded-lg bg-muted text-xs overflow-x-auto">
                    {JSON.stringify(extractedData, null, 2)}
                  </pre>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Invoice Number</p>
                        <p className="text-sm font-mono font-medium">{extractedData.invoiceNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="text-sm font-medium">{extractedData.date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Workshop</p>
                        <p className="text-sm font-medium">{extractedData.workshop}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                        <p className="text-sm font-mono font-bold">${extractedData.total.toFixed(2)}</p>
                      </div>
                    </div>
                    <Separator />
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 text-muted-foreground text-xs font-medium">Item</th>
                          <th className="text-right p-2 text-muted-foreground text-xs font-medium">Qty</th>
                          <th className="text-right p-2 text-muted-foreground text-xs font-medium">Unit Price</th>
                          <th className="text-right p-2 text-muted-foreground text-xs font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractedData.items.map((item, i) => (
                          <tr key={i} className="border-b border-border">
                            <td className="p-2">
                              {item.description}
                              {item.partNumber && (
                                <span className="text-xs text-muted-foreground ml-1">({item.partNumber})</span>
                              )}
                            </td>
                            <td className="p-2 text-right">{item.qty}</td>
                            <td className="p-2 text-right font-mono">${item.unitPrice.toFixed(2)}</td>
                            <td className="p-2 text-right font-mono">${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {phase === 'complete' && (
            <div className="flex gap-2">
              <Button onClick={resetUpload} variant="outline" className="gap-1">
                <X className="h-4 w-4" /> Clear & Upload More
              </Button>
              <Button
                className="gap-1"
                onClick={async () => {
                  await n8n.documentUploaded('CLM-NEW', {
                    invoiceNumber: extractedData?.invoiceNumber,
                    workshop: extractedData?.workshop,
                    total: extractedData?.total,
                    itemsCount: extractedData?.items?.length,
                    fileName: files[0]?.name,
                  })
                }}
              >
                Start Audit <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Upload Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">PDF invoices with clear itemized charges</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Approved estimation documents from adjuster</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Supporting photos (JPEG/PNG) of damage</span>
              </div>
              <Separator />
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Max file size: 25MB per document</span>
              </div>
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">Supported: PDF, JSON, XML, Excel, JPEG, PNG</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: 'INV-93842.pdf', status: 'Audited', time: '2 hours ago' },
                { name: 'estimate-773.pdf', status: 'Audited', time: '4 hours ago' },
                { name: 'INV-88123.pdf', status: 'Processing', time: '1 hour ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.time}</p>
                  </div>
                  <Badge variant={item.status === 'Audited' ? 'success' : 'warning'} className="text-[10px]">
                    {item.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
