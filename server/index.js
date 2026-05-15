import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 5678

app.use(cors())
app.use(express.json({ limit: '25mb' }))

function formatCurrency(n) {
  if (n == null) return 0
  return Number(n.toFixed(2))
}

function runAudit(factura, estimacion) {
  const factItems = (factura?.items || []).map(i => ({
    codigo: i.codigo || '',
    descripcion: i.descripcion || '',
    cantidad: i.cantidad || 0,
    precio: i.precio_unitario || 0,
    total: i.total || 0,
  }))

  const estimItems = (estimacion?.items_aprobados || []).map(i => ({
    codigo: i.codigo || '',
    descripcion: i.descripcion || '',
    cantidad: i.cantidad_aprobada || 0,
    precio: i.precio_acordado || 0,
    total: i.total_aprobado || 0,
  }))

  const findings = []
  const recommendations = []
  let totalDiscrepancies = 0
  let discrepancyAmount = 0

  const estimMap = {}
  for (const e of estimItems) {
    estimMap[e.codigo] = e
  }

  const factMap = {}
  for (const f of factItems) {
    factMap[f.codigo] = f
  }

  const processedCodes = new Set()

  for (const inv of factItems) {
    processedCodes.add(inv.codigo)
    const est = estimMap[inv.codigo]

    if (!est) {
      findings.push({
        codigo: inv.codigo,
        description: inv.descripcion,
        issue: 'Item no autorizado en la estimación',
        severity: 'high',
      })
      totalDiscrepancies++
      discrepancyAmount += inv.total
      recommendations.push(`El item ${inv.codigo} (${inv.descripcion}) no está en la estimación aprobada — corresponde rechazar.`)
      continue
    }

    if (inv.cantidad > est.cantidad) {
      const diffQty = inv.cantidad - est.cantidad
      const extraCost = diffQty * inv.precio
      findings.push({
        codigo: inv.codigo,
        description: inv.descripcion,
        issue: `Cantidad excede lo aprobado: factura ${inv.cantidad} vs estimación ${est.cantidad}`,
        severity: 'high',
      })
      totalDiscrepancies++
      discrepancyAmount += extraCost
      recommendations.push(`Verificar cargo de mano de obra para ${inv.codigo}: factura ${inv.cantidad} unidades vs ${est.cantidad} aprobadas.`)
    }

    if (inv.precio > est.precio) {
      const diffPrice = inv.precio - est.precio
      const extraCost = diffPrice * inv.cantidad
      findings.push({
        codigo: inv.codigo,
        description: inv.descripcion,
        issue: `Precio superior al acordado: $${inv.precio} vs $${est.precio}`,
        severity: 'high',
      })
      totalDiscrepancies++
      discrepancyAmount += extraCost
      recommendations.push(`Revisar diferencia de precio para ${inv.codigo}: factura $${inv.precio} vs estimación $${est.precio}.`)
    }

    if (inv.cantidad <= est.cantidad && inv.precio <= est.precio) {
      findings.push({
        codigo: inv.codigo,
        description: inv.descripcion,
        issue: 'Item dentro de lo aprobado',
        severity: 'low',
      })
    }
  }

  for (const est of estimItems) {
    if (processedCodes.has(est.codigo)) continue
    processedCodes.add(est.codigo)

    findings.push({
      codigo: est.codigo,
      description: est.descripcion,
      issue: 'Item aprobado pero no facturado',
      severity: 'medium',
    })
    totalDiscrepancies++
    recommendations.push(`El item ${est.codigo} (${est.descripcion}) fue aprobado pero no aparece en la factura.`)
  }

  const totalFactura = factItems.reduce((s, i) => s + i.total, 0)
  const totalEstimado = estimItems.reduce((s, i) => s + i.total, 0)
  const approvedAmount = totalEstimado
  const hasDiscrepancies = totalDiscrepancies > 0

  return {
    status: hasDiscrepancies ? 'PENDING_REVIEW' : 'APPROVED',
    siniestro_id: factura?.siniestro_id || estimacion?.siniestro_id || `SIN-${Date.now()}`,
    taller: factura?.taller || estimacion?.taller || 'Taller',
    numero_factura: factura?.numero || factura?.numero_factura || `FAC-${Date.now()}`,
    totalDiscrepancies,
    discrepancyAmount: formatCurrency(discrepancyAmount),
    approvedAmount: formatCurrency(approvedAmount),
    requiresHumanReview: hasDiscrepancies,
    recommendations: recommendations.length > 0
      ? recommendations
      : ['La factura coincide con la estimación aprobada', 'No se detectaron discrepancias'],
    findings,
    duplicateCharges: [],
    auditedBy: 'AI Agent (local)',
    auditedAt: new Date().toISOString(),
  }
}

app.post('/webhook/invoice-audit', (req, res) => {
  const { factura, estimacion } = req.body

  if (!factura || !estimacion) {
    return res.status(400).json({
      error: 'Se requieren los campos "factura" y "estimacion"',
    })
  }

  const result = runAudit(factura, estimacion)
  res.json(result)
})

const eventHandlers = {
  claim_approved: (data) => ({ ok: true, event: 'claim_approved', claimId: data.claimId }),
  claim_rejected: (data) => ({ ok: true, event: 'claim_rejected', claimId: data.claimId }),
  fraud_escalated: (data) => ({ ok: true, event: 'fraud_escalated', claimId: data.claimId }),
  audit_completed: (data) => ({ ok: true, event: 'audit_completed', claimId: data.claimId }),
  document_uploaded: (data) => ({
    ok: true,
    event: 'document_uploaded',
    claimId: data.claimId,
    invoiceNumber: `PROC-${Date.now()}`,
    items: [],
    total: 0,
  }),
  review_started: (data) => ({ ok: true, event: 'review_started', claimId: data.claimId }),
  ping: () => ({ ok: true, message: 'pong' }),
}

app.post('/webhook/insurtech/:event', (req, res) => {
  const { event } = req.params
  const handler = eventHandlers[event]

  if (!handler) {
    return res.status(404).json({ error: `Unknown event: ${event}` })
  }

  const result = handler(req.body.data || {})
  res.json(result)
})

app.post('/webhook', (req, res) => {
  const { event } = req.body

  if (event === 'ping') {
    return res.json({ ok: true, message: 'pong' })
  }

  const handler = eventHandlers[event]
  if (handler) {
    const result = handler(req.body.data || {})
    return res.json(result)
  }

  res.status(404).json({ error: `Unknown event: ${event}` })
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`[webhook-server] Running on http://localhost:${PORT}`)
  console.log(`[webhook-server] Invoice audit: POST http://localhost:${PORT}/webhook/invoice-audit`)
  console.log(`[webhook-server] Event endpoints: POST http://localhost:${PORT}/webhook/insurtech/:event`)
})
