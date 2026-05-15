import { useState, useCallback, useRef } from 'react'
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Bot,
  ClipboardCheck,
  Copy,
  Ban,
  FileSearch,
  Loader2,
  Shield,
  FileJson,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { n8n } from '@/services/n8nWebhooks'

type AuditPhase = 'upload' | 'running' | 'result'
type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface Step {
  id: string
  label: string
  icon: typeof FileText
  status: StepStatus
}

interface Finding {
  codigo: string
  issue: string
  severity: 'low' | 'medium' | 'high'
}

interface DuplicateCharge {
  codigo: string
  total: number
}

interface AuditResult {
  status: 'APPROVED' | 'PENDING_REVIEW'
  siniestro_id: string
  taller: string
  numero_factura: string
  totalDiscrepancies: number
  discrepancyAmount: number
  approvedAmount: number
  requiresHumanReview: boolean
  recommendations: string[]
  findings: Finding[]
  duplicateCharges: DuplicateCharge[]
  auditedBy: string
  auditedAt: string
}

interface UploadedDoc {
  name: string
  label: string
  uploaded: boolean
  type: 'estimation' | 'invoice'
}

const initialSteps: Step[] = [
  { id: 'extraction', label: 'Extracción de documentos', icon: FileText, status: 'pending' },
  { id: 'rate-card', label: 'Verificación de tarifas', icon: ClipboardCheck, status: 'pending' },
  { id: 'duplicate', label: 'Detección de duplicados', icon: Copy, status: 'pending' },
  { id: 'unauthorized', label: 'Revisión de ítems no autorizados', icon: Ban, status: 'pending' },
  { id: 'report', label: 'Generación de reporte', icon: FileSearch, status: 'pending' },
]

const mockResult: AuditResult = {
  status: 'APPROVED',
  siniestro_id: 'SIN-2024-0000',
  taller: 'Taller de Prueba',
  numero_factura: 'FAC-2024-0000',
  totalDiscrepancies: 0,
  discrepancyAmount: 0,
  approvedAmount: 2995.00,
  requiresHumanReview: false,
  recommendations: ['La factura coincide con la estimación aprobada', 'No se detectaron discrepancias'],
  findings: [],
  duplicateCharges: [],
  auditedBy: 'AI Agent',
  auditedAt: new Date().toISOString(),
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#22c55e]">
        <CheckCircle2 className="h-4 w-4 text-white" />
      </div>
    )
  }
  if (status === 'running') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#185FA5] animate-pulse">
        <Loader2 className="h-4 w-4 text-white animate-spin" />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive">
        <X className="h-4 w-4 text-white" />
      </div>
    )
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e2e8f0]">
      <div className="h-2 w-2 rounded-full bg-[#64748b]" />
    </div>
  )
}

function formatCurrency(n: number | undefined | null) {
  if (n == null) return '$0.00'
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function renderRecommendations(recommendations: string | string[] | undefined | null) {
  if (!recommendations || (Array.isArray(recommendations) && recommendations.length === 0)) {
    return <p style={{ fontSize: 13, color: '#94a3b8', margin: '8px auto 0', maxWidth: 400, fontStyle: 'italic' }}>Sin recomendaciones</p>
  }
  if (Array.isArray(recommendations)) {
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', textAlign: 'center' }}>
        {recommendations.map((rec, i) => (
          <li key={i} style={{ fontSize: 13, color: '#64748b', padding: '2px 0' }}>{rec}</li>
        ))}
      </ul>
    )
  }
  return <p style={{ fontSize: 13, color: '#64748b', margin: '8px auto 0', maxWidth: 400 }}>{recommendations}</p>
}

function getVerdict(result: AuditResult): 'approved' | 'pending' {
  if (result.status === 'APPROVED') return 'approved'
  return 'pending'
}

function getEstimacionItems(data: Record<string, unknown> | null) {
  if (!data) return []
  const raw = (data.items_aprobados as Array<Record<string, unknown>>) || []
  return raw.map(i => ({
    codigo: (i.codigo as string) || '',
    descripcion: (i.descripcion as string) || '',
    cantidad: (i.cantidad_aprobada as number) ?? 0,
    precio: (i.precio_acordado as number) ?? 0,
    total: (i.total_aprobado as number) ?? 0,
  }))
}

function getFacturaItems(data: Record<string, unknown> | null) {
  if (!data) return []
  const raw = (data.items as Array<Record<string, unknown>>) || []
  return raw.map(i => ({
    codigo: (i.codigo as string) || '',
    descripcion: (i.descripcion as string) || '',
    cantidad: (i.cantidad as number) ?? 0,
    precio: (i.precio_unitario as number) ?? 0,
    total: (i.total as number) ?? 0,
  }))
}

function normalizeAuditResult(data: Record<string, unknown>): AuditResult {
  const auditStatus = (data.auditStatus as string || data.status as string || '').toUpperCase()
  return {
    status: auditStatus === 'APPROVED' ? 'APPROVED' : 'PENDING_REVIEW',
    siniestro_id: (data.siniestro_id || data.siniestroId || '') as string,
    taller: (data.taller || data.workshop || '') as string,
    numero_factura: (data.numero_factura || data.numeroFactura || data.numero || data.invoiceNumber || '') as string,
    totalDiscrepancies: (data.totalDiscrepancies ?? data.total_discrepancias ?? 0) as number,
    discrepancyAmount: (data.discrepancyAmount ?? data.discrepancy_amount ?? data.monto_discrepancia ?? 0) as number,
    approvedAmount: (data.approvedAmount ?? data.approved_amount ?? data.monto_aprobado ?? 0) as number,
    requiresHumanReview: (data.requiresHumanReview ?? data.requires_human_review ?? data.requiere_revision_humana ?? true) as boolean,
    recommendations: (data.recommendations || data.recomendaciones || []) as string[],
    findings: (data.findings || data.hallazgos || data.discrepancias || []) as Finding[],
    duplicateCharges: (data.duplicateCharges || data.duplicate_charges || data.cargos_duplicados || []) as DuplicateCharge[],
    auditedBy: (data.auditedBy || data.audited_by || data.auditado_por || 'AI Agent') as string,
    auditedAt: (data.auditedAt || data.audited_at || data.fecha_auditoria || new Date().toISOString()) as string,
  }
}

interface EstimItem {
  codigo: string
  descripcion: string
  cantidad: number
  precio: number
  total: number
}

function performLocalAudit(estimacion: Record<string, unknown> | null, factura: Record<string, unknown> | null): AuditResult {
  const estimItems = getEstimacionItems(estimacion)
  const factItems = getFacturaItems(factura)

  const findings: Finding[] = []
  const duplicateCharges: DuplicateCharge[] = []
  let discrepancyAmount = 0

  const estimMap = new Map<string, EstimItem>(estimItems.map(i => [i.codigo, i]))

  for (const invItem of factItems) {
    const estItem = estimMap.get(invItem.codigo)
    if (!estItem) {
      findings.push({
        codigo: invItem.codigo,
        issue: `Ítem "${invItem.descripcion}" no está en la estimación aprobada`,
        severity: 'high',
      })
      discrepancyAmount += invItem.total
      continue
    }
    if (invItem.cantidad !== estItem.cantidad) {
      findings.push({
        codigo: invItem.codigo,
        issue: `Cantidad facturada (${invItem.cantidad}) no coincide con la estimada (${estItem.cantidad})`,
        severity: 'medium',
      })
      discrepancyAmount += Math.abs(invItem.total - estItem.total)
    }
    if (invItem.precio !== estItem.precio) {
      findings.push({
        codigo: invItem.codigo,
        issue: `Precio unitario facturado ($${invItem.precio.toFixed(2)}) no coincide con el acordado ($${estItem.precio.toFixed(2)})`,
        severity: 'medium',
      })
      discrepancyAmount += Math.abs(invItem.total - estItem.total)
    }
  }

  const seen = new Map<string, number>()
  for (const item of factItems) {
    const idx = seen.get(item.codigo)
    if (idx !== undefined) {
      duplicateCharges.push({ codigo: item.codigo, total: item.total })
    }
    seen.set(item.codigo, (idx ?? 0) + 1)
  }

  const requiresHumanReview = findings.length > 0 || duplicateCharges.length > 0
  const totalFactura = factItems.reduce((s, i) => s + i.total, 0)

  return {
    status: requiresHumanReview ? 'PENDING_REVIEW' : 'APPROVED',
    siniestro_id: (estimacion?.siniestro_id as string) || (factura?.siniestro_id as string) || '',
    taller: (estimacion?.taller as string) || (factura?.taller as string) || '',
    numero_factura: (factura?.numero_factura as string) || (factura?.invoiceNumber as string) || '',
    totalDiscrepancies: findings.length + duplicateCharges.length,
    discrepancyAmount,
    approvedAmount: totalFactura - discrepancyAmount,
    requiresHumanReview,
    recommendations: requiresHumanReview
      ? ['Se encontraron discrepancias que requieren revisión humana']
      : ['La factura coincide con la estimación aprobada', 'No se detectaron discrepancias'],
    findings,
    duplicateCharges,
    auditedBy: 'AI Agent',
    auditedAt: new Date().toISOString(),
  }
}

export function InvoiceAuditor() {
  const [phase, setPhase] = useState<AuditPhase>('upload')
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  const [facturaData, setFacturaData] = useState<Record<string, unknown> | null>(null)
  const [estimacionData, setEstimacionData] = useState<Record<string, unknown> | null>(null)
  const [facturaName, setFacturaName] = useState('')
  const [estimacionName, setEstimacionName] = useState('')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [webhookError, setWebhookError] = useState<string | null>(null)
  const [extracting, setExtracting] = useState<{ idx: number; name: string } | null>(null)
  const inputRefEst = useRef<HTMLInputElement>(null)
  const inputRefInv = useRef<HTMLInputElement>(null)

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

  async function extractViaN8n(file: File, idx: number) {
    setExtracting({ idx, name: file.name })
    const webhookUrl = localStorage.getItem('insuraudit_n8n_url') || import.meta.env.VITE_N8N_WEBHOOK_URL || ''
    if (!webhookUrl) {
      setExtracting(null)
      alert('n8n webhook not configured. Configure it in Settings > Integrations to process non-JSON files.')
      return
    }
    try {
      const base64 = await readFileAsBase64(file)
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'document_uploaded',
          data: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || file.name.split('.').pop(),
            fileBase64: base64,
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (idx === 0) {
          setEstimacionName(file.name)
          setEstimacionData(data as Record<string, unknown>)
        } else {
          setFacturaName(file.name)
          setFacturaData(data as Record<string, unknown>)
        }
      } else {
        alert(`n8n returned HTTP ${res.status}`)
      }
    } catch {
      alert('Error connecting to n8n for file extraction')
    }
    setExtracting(null)
  }

  function processFile(file: File, idx: number) {
    if (file.name.endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (idx === 0) {
            setEstimacionName(file.name)
            setEstimacionData(data)
          } else {
            setFacturaName(file.name)
            setFacturaData(data)
          }
        } catch {
          alert('Archivo JSON inválido')
        }
      }
      reader.onerror = () => alert('Error al leer el archivo')
      reader.readAsText(file)
    } else {
      extractViaN8n(file, idx)
    }
  }

  function handleEstimacionInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file, 0)
  }

  function handleFacturaInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file, 1)
  }

  function handleEstimacionDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    setDragIndex(null)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file, 0)
  }

  function handleFacturaDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    setDragIndex(null)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file, 1)
  }

  const handleRunAudit = useCallback(async () => {
    if (!facturaData || !estimacionData) return

    setPhase('running')
    setWebhookError(null)
    setSteps(initialSteps.map(s => ({ ...s, status: 'pending' })))

    for (let i = 0; i < steps.length; i++) {
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s))
      await new Promise(r => setTimeout(r, 500))
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'done' } : s))
    }

    try {
      const webhookUrl = localStorage.getItem('insuraudit_n8n_url') || import.meta.env.VITE_N8N_WEBHOOK_URL || ''

      if (webhookUrl) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            factura: facturaData,
            estimacion: estimacionData,
          }),
        })

        if (response.ok) {
          const body = await response.json() as Record<string, unknown>
          const parsed = (body.parsed || body) as Record<string, unknown>
          setResult(normalizeAuditResult(parsed))
        } else {
          const text = await response.text().catch(() => '')
          setWebhookError(`n8n respondió con HTTP ${response.status}${text ? `: ${text}` : ''}`)
          setResult(performLocalAudit(estimacionData, facturaData))
        }
      } else {
        setResult(performLocalAudit(estimacionData, facturaData))
      }
    } catch (err) {
      setWebhookError('n8n no disponible — usando auditoría local')
      setResult(performLocalAudit(estimacionData, facturaData))
    }

    setPhase('result')
  }, [facturaData, estimacionData])

  const allUploaded = !!(facturaData && estimacionData) && !extracting

  function resetAll() {
    setPhase('upload')
    setSteps(initialSteps)
    setFacturaData(null)
    setEstimacionData(null)
    setFacturaName('')
    setEstimacionName('')
    setResult(null)
    setWebhookError(null)
  }

  const metricsCards = [
    { label: 'Facturas Procesadas', value: '1,284', color: '#0f172a' },
    { label: 'Aprobadas', value: '1,026', color: '#22c55e' },
    { label: 'Discrepancias', value: '196', color: '#f59e0b' },
    { label: 'Fraudes Detectados', value: '62', color: '#ef4444' },
  ]

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100%', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#0C447C' }}>Audit.ai</span>
          </div>
          <div style={{ width: 1, height: 32, backgroundColor: '#e2e8f0', margin: '0 8px' }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 500, color: '#0f172a', margin: 0 }}>Auditor de Facturas</h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Sistema de validación automática de facturas</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {metricsCards.map((m, i) => (
            <div key={i} style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px' }}>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', margin: 0 }}>{m.label}</p>
              <p style={{ fontSize: 28, fontWeight: 600, color: m.color, margin: '4px 0 0 0' }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        {phase === 'upload' || phase === 'running' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
            {/* Left Column — Upload Documents */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#0f172a', margin: '0 0 20px 0' }}>Subir Documentos</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Estimation Table Drop Zone */}
                <div
                  style={{
                    border: `2px dashed ${dragIndex === 0 || dragOver && phase === 'upload' ? '#185FA5' : '#e2e8f0'}`,
                    borderRadius: 12, padding: '24px', textAlign: 'center', cursor: phase === 'upload' ? 'pointer' : 'default',
                    backgroundColor: dragIndex === 0 ? '#E6F1FB' : '#ffffff', transition: 'all 0.2s',
                    opacity: phase === 'running' ? 0.6 : 1,
                    pointerEvents: phase === 'running' ? 'none' : 'auto',
                  }}
                  onDragOver={e => { e.preventDefault(); if (phase === 'upload') setDragIndex(0) }}
                  onDragLeave={() => setDragIndex(null)}
                  onDrop={handleEstimacionDrop}
                  onClick={() => phase === 'upload' && inputRefEst.current?.click()}
                >
                  <input ref={inputRefEst} type="file" accept=".json,.pdf,.xlsx,.xls,.jpg,.jpeg,.png" className="hidden" onChange={handleEstimacionInput} />
                  {estimacionName ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <FileSpreadsheet className="h-8 w-8" style={{ color: '#22c55e' }} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{estimacionName}</span>
                      <span style={{ fontSize: 12, color: '#22c55e' }}>Subido exitosamente</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8" style={{ color: '#185FA5', marginBottom: 12 }} />
                      <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Arrastra o haz clic para subir</p>
                      <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginTop: 12 }}>
                        Estimación aprobada por el ejecutivo
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>JSON, PDF, Excel, Image</p>
                    </>
                  )}
                </div>

                {/* Workshop Invoice Drop Zone */}
                <div
                  style={{
                    border: `2px dashed ${dragIndex === 1 || dragOver && phase === 'upload' ? '#185FA5' : '#e2e8f0'}`,
                    borderRadius: 12, padding: '24px', textAlign: 'center', cursor: phase === 'upload' ? 'pointer' : 'default',
                    backgroundColor: dragIndex === 1 ? '#E6F1FB' : '#ffffff', transition: 'all 0.2s',
                    opacity: phase === 'running' ? 0.6 : 1,
                    pointerEvents: phase === 'running' ? 'none' : 'auto',
                  }}
                  onDragOver={e => { e.preventDefault(); if (phase === 'upload') setDragIndex(1) }}
                  onDragLeave={() => setDragIndex(null)}
                  onDrop={handleFacturaDrop}
                  onClick={() => phase === 'upload' && inputRefInv.current?.click()}
                >
                  <input ref={inputRefInv} type="file" accept=".json,.pdf,.xlsx,.xls,.jpg,.jpeg,.png" className="hidden" onChange={handleFacturaInput} />
                  {facturaName ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <FileText className="h-8 w-8" style={{ color: '#22c55e' }} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a' }}>{facturaName}</span>
                      <span style={{ fontSize: 12, color: '#22c55e' }}>Subido exitosamente</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8" style={{ color: '#185FA5', marginBottom: 12 }} />
                      <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Arrastra o haz clic para subir</p>
                      <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginTop: 12 }}>
                        Factura enviada por el taller
                      </p>
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>JSON, PDF, Excel, Image</p>
                    </>
                  )}
                </div>
              </div>

              {extracting && (
                <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, backgroundColor: '#E6F1FB', border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extrayendo datos de <strong>{extracting.name}</strong> mediante n8n...
                </div>
              )}

              {/* Run Audit Button */}
              <Button
                onClick={handleRunAudit}
                disabled={!allUploaded || phase === 'running'}
                style={{
                  width: '100%', marginTop: 20, height: 44, borderRadius: 8, fontSize: 15, fontWeight: 500,
                  backgroundColor: !allUploaded || phase === 'running' ? '#94a3b8' : '#185FA5',
                  color: '#ffffff', border: 'none', cursor: !allUploaded || phase === 'running' ? 'not-allowed' : 'pointer',
                }}
              >
                {phase === 'running' ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Auditando...</>
                ) : (
                  <><Bot className="h-5 w-5" /> Ejecutar Auditoría</>
                )}
              </Button>

              {webhookError && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: 12, color: '#92400e' }}>
                  {webhookError}
                </div>
              )}
            </div>

            {/* Right Column — Agent Process */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 28 }}>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#0f172a', margin: '0 0 20px 0' }}>Proceso del Agente</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {steps.map((step, i) => (
                  <div key={step.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                      <StepIcon status={step.status} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <step.icon className="h-4 w-4" style={{ color: '#64748b' }} />
                          <span style={{ fontSize: 14, color: step.status === 'pending' ? '#94a3b8' : '#0f172a' }}>{step.label}</span>
                        </div>
                      </div>
                      {step.status === 'done' && <CheckCircle2 className="h-4 w-4" style={{ color: '#22c55e' }} />}
                      {step.status === 'running' && <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#185FA5' }} />}
                    </div>
                    {i < steps.length - 1 && (
                      <div style={{ marginLeft: 11, paddingLeft: 1, borderLeft: '2px solid #e2e8f0', height: 12 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Result Phase */}
        {phase === 'result' && result && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24 }}>
            {/* Left Panel — Documents & Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: '#0f172a', margin: '0 0 16px 0' }}>Documentos Subidos</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <FileSpreadsheet className="h-5 w-5" style={{ color: '#185FA5' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: 0 }}>{estimacionName || 'Estimation'}</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Estimación aprobada por el ejecutivo</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4" style={{ color: '#22c55e' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <FileText className="h-5 w-5" style={{ color: '#185FA5' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: 0 }}>{facturaName || 'Invoice'}</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Factura enviada por el taller</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4" style={{ color: '#22c55e' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: '#0f172a', margin: '0 0 16px 0' }}>Proceso del Agente</h3>
                {steps.map((step, i) => (
                  <div key={step.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                      <StepIcon status={step.status} />
                      <span style={{ fontSize: 14, color: '#0f172a' }}>{step.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div style={{ marginLeft: 11, borderLeft: '2px solid #e2e8f0', height: 8 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>

              {/* Right Panel — Audit Result */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 28 }}>
              {/* Result Header */}
              {(() => {
                const verdict = getVerdict(result)
                const badgeVariant = verdict === 'approved' ? 'success' : 'warning'
                const badgeText = verdict === 'approved' ? 'APPROVED' : 'REVIEW REQUIRED'
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 500, color: '#0f172a', margin: 0 }}>Resultado de Auditoría</h2>
                    <Badge variant={badgeVariant} style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', borderRadius: 99, padding: '4px 14px' }}>
                      {badgeText}
                    </Badge>
                  </div>
                )
              })()}

              {/* APPROVED State */}
              {getVerdict(result) === 'approved' && (
                <div style={{ backgroundColor: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0', padding: 32, textAlign: 'center', marginBottom: 20 }}>
                  <CheckCircle2 className="h-12 w-12" style={{ color: '#22c55e', margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: '#16a34a', margin: 0 }}>Factura aprobada automáticamente</h3>
                  <p style={{ fontSize: 14, color: '#64748b', margin: '8px 0' }}>Monto aprobado: <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(result.approvedAmount)}</span></p>
                  {renderRecommendations(result.recommendations)}
                  <button onClick={() => {}} style={{ marginTop: 16, padding: '10px 32px', borderRadius: 8, fontSize: 14, fontWeight: 500, backgroundColor: '#22c55e', color: '#ffffff', border: 'none', cursor: 'pointer' }}>
                    Procesar Pago
                  </button>
                </div>
              )}

              {/* PENDING State */}
              {getVerdict(result) === 'pending' && (
                <>
                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div style={{ backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', padding: '14px 16px' }}>
                      <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', margin: 0 }}>Discrepancias Totales</p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#ef4444', margin: '4px 0 0 0' }}>{result.totalDiscrepancies ?? 0}</p>
                    </div>
                    <div style={{ backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', padding: '14px 16px' }}>
                      <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', margin: 0 }}>Monto en Discrepancia</p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#ef4444', margin: '4px 0 0 0' }}>{formatCurrency(result.discrepancyAmount)}</p>
                    </div>
                    <div style={{ backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', padding: '14px 16px' }}>
                      <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', margin: 0 }}>Monto Aprobado</p>
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#22c55e', margin: '4px 0 0 0' }}>{formatCurrency(result.approvedAmount)}</p>
                    </div>
                    <div style={{ backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', padding: '14px 16px' }}>
                      <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', margin: 0 }}>Estado</p>
                      <Badge variant="warning" style={{ marginTop: 6, fontSize: 11, fontWeight: 600, borderRadius: 99 }}>
                        REVIEW REQUIRED
                      </Badge>
                    </div>
                  </div>

                  {/* Findings List */}
                  {(result.findings || []).map((finding, i) => {
                    const sevBg = finding.severity === 'high' ? '#fef2f2' : finding.severity === 'medium' ? '#fffbeb' : '#f0fdf4'
                    const sevText = finding.severity === 'high' ? '#ef4444' : finding.severity === 'medium' ? '#f59e0b' : '#22c55e'
                    return (
                      <div key={i} style={{ backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{finding.codigo}</span>
                              <span style={{ fontSize: 11, fontWeight: 500, borderRadius: 99, padding: '2px 10px', backgroundColor: sevBg, color: sevText }}>
                                {finding.severity?.toUpperCase() || 'UNKNOWN'}
                              </span>
                            </div>
                            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>{finding.issue}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Duplicate Charges Section */}
                  {(result.duplicateCharges || []).length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: '0 0 12px 0' }}>Cargos Duplicados</h3>
                      {(result.duplicateCharges || []).map((dup, i) => (
                        <div key={i} style={{ backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', padding: '12px 16px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <Copy className="h-5 w-5" style={{ color: '#ef4444', marginTop: 1 }} />
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', margin: 0 }}>Ítem: <span style={{ fontFamily: 'monospace' }}>{dup.codigo}</span></p>
                              <div style={{ marginTop: 6 }}>
                                <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', margin: 0 }}>Sobrecargo</p>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', margin: '2px 0 0 0' }}>{formatCurrency(dup.total)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Verdict Card */}
                  <div style={{ backgroundColor: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a', padding: 24, marginBottom: 20, textAlign: 'center' }}>
                    <AlertCircle className="h-10 w-10" style={{ color: '#f59e0b', margin: '0 auto 10px' }} />
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#92400e', margin: 0 }}>Factura pendiente de revisión</h3>
                    {renderRecommendations(result.recommendations)}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => {}} style={{ flex: 1, height: 44, borderRadius: 8, fontSize: 14, fontWeight: 500, backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer' }}>
                      Rechazar Factura
                    </button>
                    <button onClick={() => {}} style={{ flex: 1, height: 44, borderRadius: 8, fontSize: 14, fontWeight: 500, backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                      Enviar a Liquidador
                    </button>
                  </div>
                </>
              )}

              {/* Webhook Error Warning */}
              {webhookError && (
                <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 8, backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle className="h-4 w-4 shrink-0" style={{ color: '#f59e0b', marginTop: 1 }} />
                  <div>
                    <strong>Webhook no disponible — mostrando resultado simulado.</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#a16207' }}>{webhookError}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#a16207' }}>Los datos reales se mostrarán cuando el webhook de n8n responda correctamente.</p>
                  </div>
                </div>
              )}

              {/* Datos Enviados a Validación
              {(facturaData || estimacionData) && (
                <div style={{ marginTop: 20, marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
                    📄 Datos Enviados a Validación
                  </h3>

                  {(() => {
                    const estimItems = getEstimacionItems(estimacionData)
                    if (estimItems.length === 0) return null
                    return (
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#185FA5', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileSpreadsheet className="h-4 w-4" /> Estimación Aprobada — {estimacionName || 'estimacion.json'}
                        </h4>
                        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 500, fontSize: 11 }}>Código</th>
                              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 500, fontSize: 11 }}>Descripción</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 500, fontSize: 11 }}>Cant.</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 500, fontSize: 11 }}>Precio</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 500, fontSize: 11 }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {estimItems.map((item, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11 }}>{item.codigo}</td>
                                <td style={{ padding: '6px 8px', fontSize: 12 }}>{item.descripcion}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontSize: 12 }}>{item.cantidad}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(item.precio)}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                              </tr>
                            ))}
                            {(() => {
                              const totalEstimado = (estimacionData?.total_estimado as number) ?? estimItems.reduce((s, i) => s + i.total, 0)
                              return (
                                <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 600, backgroundColor: '#f8fafc' }}>
                                  <td colSpan={4} style={{ padding: '6px 8px', textAlign: 'right', fontSize: 12 }}>Total Estimado</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#185FA5' }}>{formatCurrency(totalEstimado)}</td>
                                </tr>
                              )
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}

                  {(() => {
                    const factItems = getFacturaItems(facturaData)
                    if (factItems.length === 0) return null
                    return (
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileText className="h-4 w-4" /> Factura del Taller — {facturaName || 'factura.json'}
                        </h4>
                        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 500, fontSize: 11 }}>Código</th>
                              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 500, fontSize: 11 }}>Descripción</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 500, fontSize: 11 }}>Cant.</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 500, fontSize: 11 }}>P/U</th>
                              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 500, fontSize: 11 }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {factItems.map((item, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 11 }}>{item.codigo}</td>
                                <td style={{ padding: '6px 8px', fontSize: 12 }}>{item.descripcion}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontSize: 12 }}>{item.cantidad}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12 }}>{formatCurrency(item.precio)}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                              </tr>
                            ))}
                            {(() => {
                              const totalFactura = (facturaData?.total_factura as number) ?? factItems.reduce((s, i) => s + i.total, 0)
                              return (
                                <tr style={{ borderTop: '2px solid #e2e8f0', fontWeight: 600, backgroundColor: '#f8fafc' }}>
                                  <td colSpan={4} style={{ padding: '6px 8px', textAlign: 'right', fontSize: 12 }}>Total Factura</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#ef4444' }}>{formatCurrency(totalFactura)}</td>
                                </tr>
                              )
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}

                  <details style={{ marginTop: 4 }}>
                    <summary style={{ fontSize: 12, color: '#64748b', cursor: 'pointer', userSelect: 'none' }}>
                      Ver JSON original de los documentos
                    </summary>
                    <pre style={{ marginTop: 8, padding: 12, borderRadius: 8, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 11, overflowX: 'auto', maxHeight: 300, lineHeight: 1.5 }}>
{JSON.stringify({ estimacion: estimacionData, factura: facturaData }, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
                */}

              {/* Realizar Otra */}
              <button
                onClick={resetAll}
                style={{ width: '100%', marginTop: 16, height: 44, borderRadius: 8, fontSize: 14, fontWeight: 500, backgroundColor: '#ffffff', color: '#185FA5', border: '2px solid #185FA5', cursor: 'pointer' }}
              >
                Realizar Otra Auditoría
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
