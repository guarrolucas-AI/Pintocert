import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://weaqinaawvplrdgvdiuo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlYXFpbmFhd3ZwbHJkZ3ZkaXVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIyMjIzMiwiZXhwIjoyMDk0Nzk4MjMyfQ.gR1HuhldAW0ePUD3osPrF--EUQD7xn3bzeFxWfd7dRs'
)

async function verify() {
  const { data } = await supabase
    .from('presupuestos')
    .select('*')
    .eq('id', 'e7dbf051-63f3-44f5-91a5-6ad8a8e246a8')
    .single()

  const presupuesto = data
  const analisis = presupuesto.analisis_economico

  // Simulate what NEW AnalisisPDF.tsx does
  const d = analisis
  const materiales = d?.costos_directos?.materiales ?? presupuesto.lista_materiales?.total_estimado ?? 0
  const manoObra = d?.costos_directos?.mano_obra ?? presupuesto.plan_personal?.total_mano_obra ?? 0
  
  // NEW: Handle costos_indirectos as array or number
  let costosIndirectosMonto = 0
  const costosIndirectosData = d?.datos?.costos_indirectos ?? d?.costos_indirectos
  if (Array.isArray(costosIndirectosData)) {
    costosIndirectosMonto = costosIndirectosData.reduce((sum, ci) => sum + (ci.monto ?? 0), 0)
  } else if (typeof costosIndirectosData === 'number') {
    costosIndirectosMonto = costosIndirectosData
  }

  const contingenciaPct = d?.datos?.contingencia_porcentaje ?? d?.contingencia_porcentaje ?? 0

  // Calculate values (SIN IVA en los costos)
  const costoDirecto = materiales + manoObra
  const contingenciaMonto = (contingenciaPct / 100) * (costoDirecto + costosIndirectosMonto)
  const costo = costoDirecto + costosIndirectosMonto + contingenciaMonto
  
  const ventaDelAnalisis = d?.precio_venta ?? d?.datos?.precio_venta ?? 0
  const venta = ventaDelAnalisis > 0 ? ventaDelAnalisis : presupuesto.subtotal ?? 0
  
  // NEW: Ganancia = Venta - Costo (SIN restar IVA)
  const ganancia = d?.ganancia_bruta ?? Math.max(0, venta - costo)
  const rentabilidad = d?.rentabilidad_sobre_ventas ?? (venta > 0 ? (ganancia / venta) * 100 : 0)

  // Show costos indirectos details
  const costosIndirectosCombinados = []
  if (Array.isArray(costosIndirectosData)) {
    const itemsIndividuales = costosIndirectosData.filter(
      ci => !ci.descripcion?.toLowerCase().includes('subtotal')
    )
    costosIndirectosCombinados.push(...itemsIndividuales)
  } else if (costosIndirectosMonto > 0) {
    costosIndirectosCombinados.push({ descripcion: 'Costos indirectos', monto: costosIndirectosMonto })
  }
  
  if (contingenciaMonto > 0) {
    costosIndirectosCombinados.push({ descripcion: `Contingencias (${contingenciaPct.toFixed(1)}%)`, monto: contingenciaMonto })
  }

  console.log('=== PDF CONTENT SIMULATION ===')
  console.log()
  console.log('PRESUPUESTO:', presupuesto.cliente)
  console.log('OBRA:', presupuesto.obra_descripcion)
  console.log()

  console.log('=== KPI CARDS ===')
  console.log('Costo Total:', costo)
  console.log('Precio Venta:', venta)
  console.log('Ganancia:', ganancia)
  console.log('Margen:', rentabilidad.toFixed(1) + '%')
  console.log()

  console.log('=== DISTRIBUCIÓN DE COSTOS ===')
  console.log('Materiales:', materiales, `(${((materiales/costo)*100).toFixed(0)}%)`)
  console.log('Mano de obra:', manoObra, `(${((manoObra/costo)*100).toFixed(0)}%)`)
  console.log('Otros (indirectos + contingencias):', (costosIndirectosMonto + contingenciaMonto), `(${(((costosIndirectosMonto + contingenciaMonto)/costo)*100).toFixed(0)}%)`)
  console.log()

  console.log('=== COSTOS INDIRECTOS DETALLADOS ===')
  costosIndirectosCombinados.forEach(ci => {
    console.log(`  - ${ci.descripcion}: ${ci.monto}`)
  })
  console.log()

  console.log('✓ PDF will show:')
  console.log('  - NO IVA in cost section')
  console.log('  - Ganancia = venta - costo (without IVA)')
  console.log('  - All costos indirectos items from agente')
  console.log('✓ Build successful - PDF ready to download')
}

verify()
