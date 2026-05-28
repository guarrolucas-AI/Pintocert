'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { GastoObra } from '@/lib/types'

// ──────────────────────────────────────────────────────────────────────
// Gastos CRUD Operations
// ──────────────────────────────────────────────────────────────────────

export async function createGasto(gastoData: {
  obra_id: string
  fecha: string
  categoria: string
  descripcion: string
  monto: number
  comprobante_numero?: string
  proveedor?: string
  comprobante_url?: string
  notas?: string
  comprobante_archivo?: File
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Validate
  if (!gastoData.descripcion.trim()) return { error: 'Descripción requerida' }
  if (gastoData.monto <= 0) return { error: 'Monto debe ser mayor a 0' }

  const fecha = new Date(gastoData.fecha)
  if (fecha > new Date()) return { error: 'No se puede registrar gasto a fecha futura' }

  // Check that obra exists and is in valid state
  const { data: obra, error: obraError } = await supabase
    .from('obras')
    .select('id, estado')
    .eq('id', gastoData.obra_id)
    .single()

  if (obraError || !obra) return { error: 'Obra no encontrada' }
  if (!['en_ejecucion', 'pausado'].includes(obra.estado)) {
    return { error: 'Solo se pueden registrar gastos en obras en ejecución o pausadas' }
  }

  // Upload comprobante if provided
  let comprobante_url: string | null = null
  if (gastoData.comprobante_archivo) {
    const timestamp = Date.now()
    const fileExt = gastoData.comprobante_archivo.name.split('.').pop()
    const fileName = `${user.id}/${gastoData.obra_id}/gasto_${timestamp}.${fileExt}`

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('comprobantes_gastos')
      .upload(fileName, gastoData.comprobante_archivo, { upsert: false })

    if (uploadError) return { error: `Error subiendo comprobante: ${uploadError.message}` }

    const { data: publicUrl } = supabase.storage
      .from('comprobantes_gastos')
      .getPublicUrl(fileName)

    comprobante_url = publicUrl?.publicUrl || null
  }

  // Insert gasto
  const { data, error } = await supabase
    .from('gastos_obra')
    .insert({
      obra_id: gastoData.obra_id,
      fecha: gastoData.fecha,
      categoria: gastoData.categoria,
      descripcion: gastoData.descripcion.trim(),
      monto: gastoData.monto,
      comprobante_numero: gastoData.comprobante_numero?.trim() || null,
      proveedor: gastoData.proveedor?.trim() || null,
      comprobante_url,
      notas: gastoData.notas?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Recalculate flujo_caja_real for that month
  await recalculateFlujoCajaReal(gastoData.obra_id, fecha)

  revalidatePath('/presupuestos')
  return { success: true, data }
}

export async function updateGasto(
  gastoId: string,
  updates: Partial<Omit<GastoObra, 'id' | 'created_by' | 'created_at'>>,
  comprobante_archivo?: File
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Get original gasto to find obra_id
  const { data: gasto, error: fetchError } = await supabase
    .from('gastos_obra')
    .select('obra_id, fecha, comprobante_url')
    .eq('id', gastoId)
    .single()

  if (fetchError || !gasto) return { error: 'Gasto no encontrado' }

  // Validate updates
  if (updates.monto !== undefined && updates.monto <= 0) {
    return { error: 'Monto debe ser mayor a 0' }
  }
  if (updates.fecha) {
    const fecha = new Date(updates.fecha)
    if (fecha > new Date()) return { error: 'No se puede registrar gasto a fecha futura' }
  }

  // Handle comprobante file upload
  let updateData = { ...updates }
  if (comprobante_archivo) {
    const timestamp = Date.now()
    const fileExt = comprobante_archivo.name.split('.').pop()
    const fileName = `${user.id}/${gasto.obra_id}/gasto_${timestamp}.${fileExt}`

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('comprobantes_gastos')
      .upload(fileName, comprobante_archivo, { upsert: false })

    if (uploadError) return { error: `Error subiendo comprobante: ${uploadError.message}` }

    const { data: publicUrl } = supabase.storage
      .from('comprobantes_gastos')
      .getPublicUrl(fileName)

    updateData.comprobante_url = publicUrl?.publicUrl || null
  }

  // Update gasto
  const { error: updateError } = await supabase
    .from('gastos_obra')
    .update(updateData)
    .eq('id', gastoId)

  if (updateError) return { error: updateError.message }

  // Recalculate flujo_caja_real for affected months
  const originalDate = new Date(gasto.fecha)
  const newDate = updates.fecha ? new Date(updates.fecha) : originalDate

  await recalculateFlujoCajaReal(gasto.obra_id, originalDate)
  if (updates.fecha) {
    await recalculateFlujoCajaReal(gasto.obra_id, newDate)
  }

  revalidatePath(`/presupuestos/${gasto.obra_id}`)
  return { success: true }
}

export async function deleteGasto(gastoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Get original gasto to find obra_id
  const { data: gasto, error: fetchError } = await supabase
    .from('gastos_obra')
    .select('obra_id, fecha')
    .eq('id', gastoId)
    .single()

  if (fetchError || !gasto) return { error: 'Gasto no encontrado' }

  // Delete
  const { error } = await supabase
    .from('gastos_obra')
    .delete()
    .eq('id', gastoId)

  if (error) return { error: error.message }

  // Recalculate flujo_caja_real for that month
  await recalculateFlujoCajaReal(gasto.obra_id, new Date(gasto.fecha))

  revalidatePath(`/presupuestos/${gasto.obra_id}`)
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────
// Categorías personalizadas
// ──────────────────────────────────────────────────────────────────────

export async function createCategoriaPersonalizada(nombre: string, colorHex?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  if (!nombre.trim()) return { error: 'Nombre requerido' }

  const { data, error } = await supabase
    .from('categorias_gasto_personalizado')
    .insert({
      user_id: user.id,
      nombre: nombre.trim(),
      color_hex: colorHex || null,
      activa: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Esta categoría ya existe' }
    }
    return { error: error.message }
  }

  return { success: true, data }
}

export async function deleteCategoriaPersonalizada(categoriaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Check if categoria is in use
  const { count } = await supabase
    .from('gastos_obra')
    .select('id', { count: 'exact', head: true })
    .eq('categoria', categoriaId)

  if (count && count > 0) {
    return { error: 'No se puede eliminar una categoría en uso' }
  }

  const { error } = await supabase
    .from('categorias_gasto_personalizado')
    .delete()
    .eq('id', categoriaId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────
// Cash Flow Calculations
// ──────────────────────────────────────────────────────────────────────

export async function recalculateFlujoCajaReal(obraId: string, fecha: Date) {
  const admin = createAdminClient()
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

  // Upsert flujo_caja_real
  const { error } = await admin
    .from('flujo_caja_real')
    .upsert({
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
    })

  if (error) {
    console.error('Error updating flujo_caja_real:', error)
  }
}

export async function getGastosByObra(obraId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('gastos_obra')
    .select('*')
    .eq('obra_id', obraId)
    .order('fecha', { ascending: false })

  if (error) return { error: error.message }
  return { data: data as GastoObra[] }
}

export async function getCategoriasPredefinidas() {
  return {
    data: [
      { id: 'materiales', nombre: 'Materiales', color: '#3B82F6' },
      { id: 'mano_obra', nombre: 'Mano de Obra', color: '#10B981' },
      { id: 'otros', nombre: 'Otros', color: '#8B5CF6' },
    ],
  }
}

export async function getCategoriasPersonalizadasUsuario() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data, error } = await supabase
    .from('categorias_gasto_personalizado')
    .select('*')
    .eq('user_id', user.id)
    .eq('activa', true)
    .order('nombre', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}
