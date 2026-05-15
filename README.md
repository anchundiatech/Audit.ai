# Audit.ai — Auditor Agéntico de Facturas de Taller

Sistema de validación automática de facturas de talleres mecánicos para compañías de seguros. Compara facturas contra estimaciones aprobadas y detecta discrepancias, sobrecargos, ítems no autorizados y posibles fraudes.

## Arquitectura

```
Frontend (React + TypeScript)  ─►  n8n (Webhook AI Agent)  ─►  OpenAI GPT-4o
         │
         └── Auditoría local (comparación directa ítem por ítem)
```

- **Frontend**: Carga los JSON, ejecuta la auditoría local, muestra resultados
- **n8n**: Agente opcional que recibe los datos y usa GPT-4o para auditoría aumentada
- **OpenAI**: Modelo de lenguaje que analiza y emite el veredicto estructurado

## Datos de Ejemplo

En `src/data/` hay dos archivos JSON para pruebas:

### `estimacion-ejemplo.json`

```json
{
  "siniestro_id": "SIN-2024-0831",
  "ejecutivo": "Carlos Velez",
  "fecha_aprobacion": "2024-11-10",
  "total_estimado": 365,
  "items_aprobados": [
    { "codigo": "MO-001", "descripcion": "Labor painting complete", "cantidad_aprobada": 1, "precio_acordado": 85, "total_aprobado": 85 },
    { "codigo": "REP-045", "descripcion": "Front windshield",      "cantidad_aprobada": 1, "precio_acordado": 280, "total_aprobado": 280 }
  ]
}
```

### `factura-ejemplo.json`

```json
{
  "siniestro_id": "SIN-2024-0831",
  "taller": "Taller del Norte",
  "numero": "FAC-2024-0831",
  "fecha": "2024-11-15",
  "total_factura": 450,
  "items": [
    { "codigo": "MO-001", "descripcion": "Labor painting complete", "cantidad": 2, "precio_unitario": 85, "total": 170 },
    { "codigo": "REP-045", "descripcion": "Front windshield",        "cantidad": 1, "precio_unitario": 280, "total": 280 }
  ]
}
```

**Discrepancia**: La estimación aprueba 1 hora de mano de obra ($85), pero la factura cobra 2 horas ($170). La auditoría debe detectarlo.

## Uso

### 1. Prueba local (sin n8n)

1. Abrí la app en el navegador
2. En la sección **Subir Documentos**, arrastrá o seleccioná los JSON:
   - **Estimación**: `estimacion-ejemplo.json`
   - **Factura**: `factura-ejemplo.json`
3. Hacé clic en **Ejecutar Auditoría**
4. El frontend compara ítem por ítem localmente:
   - Ítems facturados sin aprobación → `high`
   - Cantidades incorrectas → `medium`
   - Precios incorrectos → `medium`
   - Códigos duplicados en factura → duplicate charge

### 2. Prueba con n8n (Agente AI opcional)

1. Configurá la URL del webhook en **Settings > Integrations** o via `VITE_N8N_WEBHOOK_URL`
2. El flujo es:
   - Frontend envía `{ event: "invoice_audit", data: { factura, estimacion } }` al webhook
   - n8n recibe, extrae los datos y se los pasa a GPT-4o
   - GPT-4o analiza y devuelve veredicto estructurado
   - n8n lo limpiar y normaliza
   - Frontend muestra el resultado

## Estructura Esperada de los JSON

### Estimación (`estimacion-ejemplo.json`)

| Campo | Tipo | Descripción |
|---|---|---|
| `siniestro_id` | string | ID del siniestro |
| `ejecutivo` | string | Nombre del ejecutivo |
| `fecha_aprobacion` | string | Fecha de aprobación |
| `total_estimado` | number | Monto total estimado |
| `items_aprobados` | array | Ítems aprobados |
| `items_aprobados[].codigo` | string | Código del ítem |
| `items_aprobados[].descripcion` | string | Descripción |
| `items_aprobados[].cantidad_aprobada` | number | Cantidad aprobada |
| `items_aprobados[].precio_acordado` | number | Precio unitario acordado |
| `items_aprobados[].total_aprobado` | number | Total aprobado |

### Factura (`factura-ejemplo.json`)

| Campo | Tipo | Descripción |
|---|---|---|
| `siniestro_id` | string | ID del siniestro |
| `taller` | string | Nombre del taller |
| `numero` | string | Número de factura |
| `fecha` | string | Fecha de emisión |
| `total_factura` | number | Monto total facturado |
| `items` | array | Ítems facturados |
| `items[].codigo` | string | Código del ítem |
| `items[].descripcion` | string | Descripción |
| `items[].cantidad` | number | Cantidad facturada |
| `items[].precio_unitario` | number | Precio unitario |
| `items[].total` | number | Total del ítem |

## Criterios de Auditoría

La auditoría local evalúa:

1. **Ítems no autorizados** — código en factura que no existe en estimación → `severity: high`
2. **Sobrecantidad** — cantidad facturada difiere de la aprobada → `severity: medium`
3. **Sobreprecio** — precio unitario facturado difiere del acordado → `severity: medium`
4. **Cargos duplicados** — mismo código repetido en la factura → `severity: high`

Si no hay hallazgos → `APPROVED`. Si hay al menos uno → `PENDING_REVIEW`.

## Configuración de n8n

El agente en n8n se compone de:

1. **Webhook** — escucha POST en `/webhook/invoice-audit`
2. **Analizar factura JSON** — extrae `factura` y `estimacion` del body (soporta `{ data: { factura, estimacion } }` y `{ body: { factura, estimacion } }`)
3. **Audit Agent** — llama a GPT-4o con el prompt de auditoría
4. **Parse Invoice JSON** — normaliza la respuesta de GPT (limpia markdown, parsea a objeto)
5. **Validation** — valida que los campos sean correctos, fuerza `rejected` si hay findings `high`
6. **IF** — bifurca entre aprobación automática o revisión humana

### Payload que envía el frontend

```json
{
  "event": "invoice_audit",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "data": {
    "factura": { ... },
    "estimacion": { ... }
  }
}
```

### Respuesta esperada de n8n

```json
{
  "parsed": {
    "auditStatus": "approved" | "rejected",
    "totalDiscrepancies": 0,
    "discrepancyAmount": 0,
    "approvedAmount": 365,
    "requiresHumanReview": false,
    "recommendations": ["..."],
    "findings": [],
    "duplicateCharges": []
  },
  "totalEstimado": 365,
  "totalFactura": 450
}
```

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- n8n (workflow automation)
- OpenAI GPT-4o
- Radix UI + Lucide icons
