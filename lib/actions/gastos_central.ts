'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { GastoCentral } from '@/lib/types'

// ──────────────────────────────────────────────────────────────────────
// Central Expenses CRUD Operations
// ──────────────────────────────────────────────────────────────────────

export async function createGastoCentral(gastoData: {
  fecha: string
  tipo_gasto: string
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
  if (!gastoData.tipo_gasto) return { error: 'Tipo de gasto requerido' }

  const fecha = new Date(gastoData.fecha)
  if (fecha > new Date()) return { error: 'No se puede registrar gasto a fecha futura' }

  // Validate tipo_gasto
  const validTypes = ['sueldo', 'combustible', 'maquina', 'material', 'retiro_socio', 'otro']
  if (!validTypes.includes(gastoData.tipo_gasto)) {
    return { error: 'Tipo de gasto inválido' }
  }

  // Upload comprobante if provided
  let comprobante_url: string | null = null
  if (gastoData.comprobante_archivo) {
    const timestamp = Date.now()
    const fileExt = gastoData.comprobante_archivo.name.split('.').pop()
    const fileName = `${user.id}/central_gastos/gasto_${timestamp}.${fileExt}`

    const { error: uploadError } = await supabase.storage
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
    .from('gastos_central')
    .insert({
      fecha: gastoData.fecha,
      tipo_gasto: gastoData.tipo_gasto,
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

  // Recalculate flujo_caja_central for that month
  await recalculateFlujoCajaCentral(fecha)

  revalidatePath('/contabilidad/central')
  return { success: true, data }
}

export async function updateGastoCentral(
  gastoId: string,
  updates: Partial<Omit<GastoCentral, 'id' | 'created_by' | 'created_at'>>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Get gasto to check ownership and get fecha for flujo_caja recalc
  const { data: gasto, error: fetchError } = await supabase
    .from('gastos_central')
    .select('created_by, fecha')
    .eq('id', gastoId)
    .single()

  if (fetchError || !gasto) return { error: 'Gasto no encontrado' }
  if (gasto.created_by !== user.id) {
    const userProfile = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()
    if (userProfile.data?.rol !== 'admin') {
      return { error: 'No tienes permiso para modificar este gasto' }
    }
  }

  // Update
  const { error } = await supabase
    .from('gastos_central')
    .update(updates)
    .eq('id', gastoId)

  if (error) return { error: error.message }

  // Recalculate flujo_caja_central for that month
  await recalculateFlujoCajaCentral(new Date(gasto.fecha))

  revalidatePath('/contabilidad/central')
  return { success: true }
}

export async function deleteGastoCentral(gastoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Get gasto to check ownership and get fecha for flujo_caja recalc
  const { data: gasto, error: fetchError } = await supabase
    .from('gastos_central')
    .select('created_by, fecha, comprobante_url')
    .eq('id', gastoId)
    .single()

  if (fetchError || !gasto) return { error: 'Gasto no encontrado' }
  if (gasto.created_by !== user.id) {
    const userProfile = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()
    if (userProfile.data?.rol !== 'admin') {
      return { error: 'No tienes permiso para eliminar este gasto' }
    }
  }

  // Delete file from storage if exists
  if (gasto.comprobante_url) {
    const urlParts = gasto.comprobante_url.split('/comprobantes_gastos/')
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      await supabase.storage.from('comprobantes_gastos').remove([filePath])
    }
  }

  // Delete record from database
  const { error } = await supabase
    .from('gastos_central')
    .delete()
    .eq('id', gastoId)

  if (error) return { error: error.message }

  // Recalculate flujo_caja_central for that month
  await recalculateFlujoCajaCentral(new Date(gasto.fecha))

  revalidatePath('/contabilidad/central')
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────
// Category Management
// ──────────────────────────────────────────────────────────────────────

export async function createCategoriaGastoCentral(categoriaData: {
  nombre: string
  color_hex?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Check user is admin
  const userProfile = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (userProfile.data?.rol !== 'admin') {
    return { error: 'Solo administradores pueden crear categorías' }
  }

  if (!categoriaData.nombre.trim()) return { error: 'Nombre de categoría requerido' }

  const { data, error } = await supabase
    .from('categorias_gasto_central')
    .insert({
      nombre: categoriaData.nombre.trim(),
      color_hex: categoriaData.color_hex || null,
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

  revalidatePath('/contabilidad/central')
  return { success: true, data }
}

export async function deleteCategoriaGastoCentral(categoriaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Check user is admin
  const userProfile = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (userProfile.data?.rol !== 'admin') {
    return { error: 'Solo administradores pueden eliminar categorías' }
  }

  // Check if category is in use
  const { data: gastos } = await supabase
    .from('gastos_central')
    .select('id')
    .eq('categoria', categoriaId)
    .limit(1)

  if (gastos && gastos.length > 0) {
    return { error: 'No se puede eliminar una categoría que tiene gastos asociados' }
  }

  const { error } = await supabase
    .from('categorias_gasto_central')
    .delete()
    .eq('id', categoriaId)

  if (error) return { error: error.message }

  revalidatePath('/contabilidad/central')
  return { success: true }
}

// ──────────────────────────────────────────────────────────────────────
// Data Retrieval
// ──────────────────────────────────────────────────────────────────────

export async function getGastosCentral(filters?: {
  mes?: number
  anio?: number
  tipo_gasto?: string
  categoria?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('gastos_central')
    .select('*')
    .order('fecha', { ascending: false })

  if (filters?.mes && filters?.anio) {
    const mesInicio = new Date(filters.anio, filters.mes - 1, 1)
    const mesFin = new Date(filters.anio, filters.mes, 0)
    query = query
      .gte('fecha', mesInicio.toISOString().split('T')[0])
      .lte('fecha', mesFin.toISOString().split('T')[0])
  }

  if (filters?.tipo_gasto) {
    query = query.eq('tipo_gasto', filters.tipo_gasto)
  }

  if (filters?.categoria) {
    query = query.eq('categoria', filters.categoria)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data: data as GastoCentral[] }
}

export async function getCategoriasGastoCentral() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categorias_gasto_central')
    .select('*')
    .eq('activa', true)
    .order('nombre', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

export async function getFlujoCajaCentral(anio: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('flujo_caja_central')
    .select('*')
    .eq('anio', anio)
    .order('mes', { ascending: true })

  if (error) return { error: error.message }
  return { data }
}

// ──────────────────────────────────────────────────────────────────────
// Cash Flow Calculations
// ──────────────────────────────────────────────────────────────────────

export async function recalculateFlujoCajaCentral(fecha: Date) {
  const admin = createAdminClient()
  const mes = fecha.getMonth() + 1
  const anio = fecha.getFullYear()

  // Get date range for the month
  const mesInicio = new Date(anio, mes - 1, 1)
  const mesFin = new Date(anio, mes, 0, 23, 59, 59)

  // Calculate egresos from gastos_central by tipo_gasto
  const { data: gastos } = await admin
    .from('gastos_central')
    .select('tipo_gasto, monto')
    .gte('fecha', mesInicio.toISOString().split('T')[0])
    .lte('fecha', mesFin.toISOString().split('T')[0])

  let egresosTotal = 0
  let egresosSueldo = 0
  let egresosCombustible = 0
  let egresosMaquina = 0
  let egresosMaterial = 0
  let egresosRetiroSocio = 0
  let egresosOtro = 0

  if (gastos) {
    for (const gasto of gastos) {
      egresosTotal += gasto.monto

      if (gasto.tipo_gasto === 'sueldo') {
        egresosSueldo += gasto.monto
      } else if (gasto.tipo_gasto === 'combustible') {
        egresosCombustible += gasto.monto
      } else if (gasto.tipo_gasto === 'maquina') {
        egresosMaquina += gasto.monto
      } else if (gasto.tipo_gasto === 'material') {
        egresosMaterial += gasto.monto
      } else if (gasto.tipo_gasto === 'retiro_socio') {
        egresosRetiroSocio += gasto.monto
      } else {
        egresosOtro += gasto.monto
      }
    }
  }

  // Calculate saldo for this month (central doesn't have ingresos, just shows egresos)
  const saldoMes = -egresosTotal // negative because expenses reduce balance

  // Get previous month saldo_acumulado for cumulative calculation
  let saldoAnterior = 0
  if (mes > 1) {
    const { data: mesAnterior } = await admin
      .from('flujo_caja_central')
      .select('saldo_acumulado')
      .eq('mes', mes - 1)
      .eq('anio', anio)
      .single()

    saldoAnterior = mesAnterior?.saldo_acumulado || 0
  } else {
    // First month of year: check last month of previous year
    const { data: mesAnterior } = await admin
      .from('flujo_caja_central')
      .select('saldo_acumulado')
      .eq('mes', 12)
      .eq('anio', anio - 1)
      .single()

    saldoAnterior = mesAnterior?.saldo_acumulado || 0
  }

  const saldoAcumulado = saldoMes + saldoAnterior

  // Upsert flujo_caja_central
  const { error } = await admin
    .from('flujo_caja_central')
    .upsert({
      mes,
      anio,
      ingresos_total: 0,
      egresos_total: egresosTotal,
      egresos_sueldo: egresosSueldo,
      egresos_combustible: egresosCombustible,
      egresos_maquina: egresosMaquina,
      egresos_material: egresosMaterial,
      egresos_retiro_socio: egresosRetiroSocio,
      egresos_otro: egresosOtro,
      saldo_mes: saldoMes,
      saldo_acumulado: saldoAcumulado,
    })

  if (error) {
    console.error('Error updating flujo_caja_central:', error)
  }
}
