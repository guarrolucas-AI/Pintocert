#!/usr/bin/env node
/**
 * Standalone script to recalculate flujo_caja_real for all obras
 * Usage: node scripts/recalculate-flujo-caja.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseKey)

async function recalculateFlujoCajaReal(obraId, fecha) {
  const mes = fecha.getMonth() + 1
  const anio = fecha.getFullYear()

  // Get date range for the month
  const mesInicio = new Date(anio, mes - 1, 1)
  const mesFin = new Date(anio, mes, 0, 23, 59, 59)

  // Calculate ingresos from certificados
  const { data: certificados } = await admin
    .from('certificados')
    .select('id')
    .eq('obra_id', obraId)
    .eq('estado', 'aprobado')

  let ingresosTotal = 0
  let ingresosCertificados = 0

  if (certificados) {
    for (const cert of certificados) {
      const { data: items } = await admin
        .from('certificados_items')
        .select('importe_periodo')
        .eq('certificado_id', cert.id)

      if (items) {
        const itemSum = items.reduce((sum, item) => sum + (item.importe_periodo || 0), 0)
        ingresosCertificados += itemSum
      }
    }
  }

  ingresosTotal = ingresosCertificados

  // Calculate egresos from gastos_obra
  const { data: gastos } = await admin
    .from('gastos_obra')
    .select('categoria, monto')
    .eq('obra_id', obraId)
    .gte('fecha', mesInicio.toISOString().split('T')[0])
    .lte('fecha', mesFin.toISOString().split('T')[0])

  let egresosTotal = 0
  let egresosMateriales = 0
  let egresosManoObra = 0
  let egresosOtros = 0

  if (gastos) {
    for (const gasto of gastos) {
      egresosTotal += gasto.monto

      if (gasto.categoria === 'materiales') {
        egresosMateriales += gasto.monto
      } else if (gasto.categoria === 'mano_obra') {
        egresosManoObra += gasto.monto
      } else {
        egresosOtros += gasto.monto
      }
    }
  }

  // Calculate saldo for this month
  const saldoMes = ingresosTotal - egresosTotal

  // Get previous month saldo_acumulado for cumulative calculation
  let saldoAnterior = 0
  if (mes > 1) {
    const { data: mesAnterior } = await admin
      .from('flujo_caja_real')
      .select('saldo_acumulado')
      .eq('obra_id', obraId)
      .eq('mes', mes - 1)
      .eq('anio', anio)
      .single()

    saldoAnterior = mesAnterior?.saldo_acumulado || 0
  } else {
    // First month of year: check last month of previous year
    const { data: mesAnterior } = await admin
      .from('flujo_caja_real')
      .select('saldo_acumulado')
      .eq('obra_id', obraId)
      .eq('mes', 12)
      .eq('anio', anio - 1)
      .single()

    saldoAnterior = mesAnterior?.saldo_acumulado || 0
  }

  const saldoAcumulado = saldoMes + saldoAnterior

  // Upsert flujo_caja_real with proper conflict resolution
  const { error } = await admin
    .from('flujo_caja_real')
    .upsert(
      {
        obra_id: obraId,
        mes,
        anio,
        ingresos_total: ingresosTotal,
        ingresos_certificados: ingresosCertificados,
        ingresos_otros: 0,
        egresos_total: egresosTotal,
        egresos_materiales: egresosMateriales,
        egresos_mano_obra: egresosManoObra,
        egresos_otros: egresosOtros,
        saldo_mes: saldoMes,
        saldo_acumulado: saldoAcumulado,
      },
      { onConflict: 'obra_id,mes,anio' }
    )

  if (error) {
    console.error('Error updating flujo_caja_real:', error)
    return false
  }

  return true
}

async function main() {
  console.log('📊 Recalculando Flujo de Caja para todas las obras...\n')

  // Get all unique (obra_id, mes, anio) combinations from gastos_obra
  const { data: gastos, error: gastosError } = await admin
    .from('gastos_obra')
    .select('obra_id, fecha')

  if (gastosError || !gastos || gastos.length === 0) {
    console.log('❌ No hay gastos registrados')
    process.exit(1)
  }

  console.log(`📝 Encontrados ${gastos.length} registros de gastos`)

  // Extract unique combinations
  const uniqueCombos = new Map()
  for (const gasto of gastos) {
    const fecha = new Date(gasto.fecha)
    // Use | separator since obra_id contains - characters (UUID format)
    const key = `${gasto.obra_id}|${fecha.getFullYear()}-${fecha.getMonth() + 1}`
    if (!uniqueCombos.has(key)) {
      uniqueCombos.set(key, { obra_id: gasto.obra_id, fecha })
    }
  }

  console.log(`🔄 Recalculando ${uniqueCombos.size} períodos de flujo de caja...\n`)

  let recalculados = 0
  const errores = []

  for (const [key, combo] of uniqueCombos) {
    const obraId = combo.obra_id
    const fecha = combo.fecha
    try {
      const success = await recalculateFlujoCajaReal(obraId, fecha)
      if (success) {
        recalculados++
        console.log(`✅ ${obraId} (${fecha.toISOString().split('T')[0]})`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errores.push(`${obraId}: ${msg}`)
      console.log(`❌ ${obraId} - ${msg}`)
    }
  }

  console.log(`\n📊 Resultado:`)
  console.log(`   ✅ Recalculados: ${recalculados}/${uniqueCombos.size}`)

  if (errores.length > 0) {
    console.log(`   ❌ Errores: ${errores.length}`)
    errores.forEach(err => console.log(`      - ${err}`))
  } else {
    console.log(`✨ Todos los períodos se recalcularon correctamente`)
  }

  process.exit(errores.length > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
