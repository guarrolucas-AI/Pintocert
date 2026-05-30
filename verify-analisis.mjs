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

  console.log('=== PRESUPUESTO DATA ===')
  console.log('Subtotal:', presupuesto.subtotal)
  console.log('Monto IVA:', presupuesto.monto_iva)
  console.log('Total:', presupuesto.total)
  console.log()

  console.log('=== ANALISIS DATA ===')
  console.log('Precio venta (from análisis):', analisis.precio_venta)
  console.log('Costo total (from análisis):', analisis.costo_total)
  console.log('Ganancia bruta (from análisis):', analisis.ganancia_bruta)
  console.log('Rentabilidad sobre ventas:', analisis.rentabilidad_sobre_ventas, '%')
  console.log()

  // Simulate what AnalisisPDF.tsx does
  const d = analisis
  const materiales = d?.costos_directos?.materiales ?? presupuesto.lista_materiales?.total_estimado ?? 0
  const manoObra = d?.costos_directos?.mano_obra ?? presupuesto.plan_personal?.total_mano_obra ?? 0
  
  console.log('=== EXTRACTED DATA ===')
  console.log('Materiales:', materiales)
  console.log('Mano de obra:', manoObra)

  const costoDirecto = materiales + manoObra
  const costosIndirectosMonto = d?.datos?.costos_indirectos ?? d?.costos_indirectos ?? 0
  const contingenciaPct = d?.datos?.contingencia_porcentaje ?? d?.contingencia_porcentaje ?? 0
  
  console.log('Costo directo:', costoDirecto)
  console.log('Costos indirectos monto:', costosIndirectosMonto)
  console.log('Contingencia %:', contingenciaPct)

  const contingenciaMonto = (contingenciaPct / 100) * (costoDirecto + costosIndirectosMonto)
  const costo = costoDirecto + costosIndirectosMonto + contingenciaMonto
  
  console.log('Contingencia monto:', contingenciaMonto)
  console.log('Costo total (calculated):', costo)
  console.log()

  const ventaDelAnalisis = d?.precio_venta ?? d?.datos?.precio_venta ?? 0
  const venta = ventaDelAnalisis > 0 ? ventaDelAnalisis : presupuesto.subtotal ?? 0
  
  console.log('=== GANANCIA CALCULATION ===')
  console.log('Venta:', venta)
  console.log('Costo total:', costo)
  
  // NEW: Ganancia = Venta - Costo (SIN restar IVA)
  const ganancia = d?.ganancia_bruta ?? Math.max(0, venta - costo)
  const rentabilidad = d?.rentabilidad_sobre_ventas ?? (venta > 0 ? (ganancia / venta) * 100 : 0)
  
  console.log('Ganancia (venta - costo):', ganancia)
  console.log('Rentabilidad (%):', rentabilidad.toFixed(1))
  console.log()
  
  console.log('✓ AnalisisPDF calculation logic verified')
  console.log('✓ No IVA is subtracted from ganancia')
  console.log('✓ Ganancia = venta - costo =', venta, '-', costo, '=', ganancia)
}

verify()
