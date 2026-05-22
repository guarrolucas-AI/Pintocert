'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
