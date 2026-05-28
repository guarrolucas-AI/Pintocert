'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import type { ItemPresupuesto, Presupuesto } from '@/lib/types'

export async function aprobarPresupuesto(presupuestoId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', obraId: null }

  const admin = createAdminClient()

  const { data: p, error: pErr } = await admin
    .from('presupuestos')
    .select('*')
    .eq('id', presupuestoId)
    .single()

  if (pErr || !p) return { error: 'Presupuesto no encontrado', obraId: null }

  const presupuesto = p as Presupuesto

  // Crear la obra
  const { data: obra, error: obraErr } = await admin
    .from('obras')
    .insert([
      {
        nombre: `Obra — ${presupuesto.cliente}`,
        direccion: presupuesto.obra_direccion,
        cliente: presupuesto.cliente,
        presupuesto_total: presupuesto.total,
        notas: presupuesto.obra_descripcion || null,
        estado: 'activo',
        created_by: user.id,
      },
    ])
    .select()
    .single()

  if (obraErr || !obra) return { error: obraErr?.message ?? 'Error al crear la obra', obraId: null }

  // Crear ítems de la obra desde los ítems del presupuesto
  if (presupuesto.items && presupuesto.items.length > 0) {
    const itemsObra = (presupuesto.items as ItemPresupuesto[]).map((item, idx) => ({
      obra_id: obra.id,
      descripcion: item.descripcion,
      presupuesto: item.subtotal,
      orden: idx + 1,
    }))
    const { error: itemsErr } = await admin.from('items_obra').insert(itemsObra)
    if (itemsErr) return { error: itemsErr.message, obraId: null }
  }

  // Aprobar el presupuesto y vincular la obra
  const { error: updateErr } = await admin
    .from('presupuestos')
    .update({
      estado: 'aprobado',
      fecha_aprobacion: new Date().toISOString(),
      obra_id: obra.id,
    })
    .eq('id', presupuestoId)

  if (updateErr) return { error: updateErr.message, obraId: null }

  return { error: null, obraId: obra.id }
}

/**
 * Usa Haiku para distribuir un total confirmado (sin IVA) entre los ítems existentes.
 * Cada ítem recibe un precio_unitario razonable según la descripción y cantidad.
 * Actualiza directamente en Supabase y devuelve los ítems actualizados.
 */
/**
 * Estrategia: pedir PORCENTAJES a Haiku (no precios absolutos).
 * Los porcentajes se normalizan matemáticamente → la suma siempre es exacta.
 * Pasar costos confirmados (materiales, MO) para que Haiku asigne proporciones correctas.
 */
export async function distribuirPreciosDesdeAnalisis(
  presupuestoId: string,
  items: ItemPresupuesto[],
  totalSinIva: number,
  ivaPorcentaje: number,
  costosConfirmados?: {
    totalMateriales?: number
    totalManoObra?: number
  }
): Promise<{
  items?: ItemPresupuesto[]
  subtotal?: number
  monto_iva?: number
  total?: number
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const moTotal = costosConfirmados?.totalManoObra ?? 0
  const matTotal = costosConfirmados?.totalMateriales ?? 0
  const target = Math.round(totalSinIva)

  const itemsList = items
    .map((item, i) => `${i + 1}. ${item.descripcion} | ${item.cantidad} ${item.unidad}`)
    .join('\n')

  // Contexto de costos para que Haiku asigne proporciones correctas
  const costoCtx =
    moTotal > 0 || matTotal > 0
      ? `\nCOSTOS CONFIRMADOS DE LA OBRA:
- Costo materiales (precio de costo): $${matTotal.toLocaleString('es-AR')}
- Costo mano de obra (precio de costo): $${moTotal.toLocaleString('es-AR')}
- Precio de venta total SIN IVA (lo que cobra el contratista): $${target.toLocaleString('es-AR')}
`
      : `Precio de venta total SIN IVA: $${target.toLocaleString('es-AR')}\n`

  const prompt = `Distribuí un presupuesto de obra entre ${items.length} ítems asignando qué PORCENTAJE del total le corresponde a cada uno.
${costoCtx}
Ítems:
${itemsList}

REGLAS:
- La suma de los porcentajes debe ser exactamente 100
- Usá los costos confirmados como guía de proporciones (NO precios de mercado)
- Si hay un ítem "Mano de obra" (unidad global), dale el porcentaje que corresponde a MO en el precio de venta
- Los demás ítems comparten el porcentaje restante según complejidad y superficie

Respondé SOLO con un array JSON de porcentajes: [pct1, pct2, ...]`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/\[[\s\S]*?\]/)
    if (!match) return { error: 'El agente no devolvió pesos válidos' }

    const pesos = JSON.parse(match[0]) as number[]
    if (!Array.isArray(pesos) || pesos.length !== items.length) {
      return { error: `Se esperaban ${items.length} pesos, se recibieron ${pesos.length}` }
    }

    // Normalizar: garantiza suma = 1.0 sin importar lo que devolvió la IA
    const sumaTotal = pesos.reduce((s, p) => s + Math.max(0, p), 0)
    if (sumaTotal <= 0) return { error: 'Los pesos son todos cero' }
    const norm = pesos.map(p => Math.max(0, p) / sumaTotal)

    // Calcular precios. El último ítem absorbe el redondeo → suma EXACTA garantizada
    let acumulado = 0
    const updatedItems: ItemPresupuesto[] = items.map((item, i) => {
      const esUltimo = i === items.length - 1
      const itemTotal = esUltimo
        ? target - acumulado
        : Math.round(target * norm[i])
      if (!esUltimo) acumulado += itemTotal
      const pu = item.cantidad > 0 ? Math.round(itemTotal / item.cantidad) : 0
      return { ...item, precio_unitario: pu, subtotal: Math.round(item.cantidad * pu) }
    })

    const subtotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0)
    const monto_iva = Math.round((subtotal * ivaPorcentaje) / 100)
    const total = subtotal + monto_iva

    const { error } = await supabase
      .from('presupuestos')
      .update({ items: updatedItems, subtotal, monto_iva, total })
      .eq('id', presupuestoId)

    if (error) return { error: error.message }
    return { items: updatedItems, subtotal, monto_iva, total }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function cambiarEstadoPresupuesto(
  presupuestoId: string,
  estado: 'pendiente' | 'rechazado' | 'borrador'
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase
    .from('presupuestos')
    .update({ estado })
    .eq('id', presupuestoId)

  return { error: error?.message ?? null }
}
