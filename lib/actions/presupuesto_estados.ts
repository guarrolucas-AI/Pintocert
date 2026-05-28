'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { EstadoPresupuesto } from '@/lib/types'

// ──────────────────────────────────────────────────────────────────────
// Presupuesto State Transitions
// ──────────────────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado', admin: null }

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') {
    return { error: 'Sin permiso de administrador', admin: null }
  }

  return { error: null, admin }
}

// Borrador → Enviado Aprobación
export async function enviarPresupuestoAprobacion(presupuestoId: string) {
  const user = await requireUser()
  if (!user) return { error: 'No autenticado' }

  const supabase = await createClient()

  // Get presupuesto
  const { data: presupuesto, error: fetchError } = await supabase
    .from('presupuestos')
    .select('id, estado, subtotal, items')
    .eq('id', presupuestoId)
    .single()

  if (fetchError || !presupuesto) return { error: 'Presupuesto no encontrado' }

  if (presupuesto.estado !== 'borrador') {
    return { error: `No se puede enviar un presupuesto en estado "${presupuesto.estado}"` }
  }

  // Basic validation
  if (!presupuesto.items || presupuesto.items.length === 0) {
    return { error: 'El presupuesto debe tener al menos un item' }
  }

  // Update to enviado_aprobacion
  const { error: updateError } = await supabase
    .from('presupuestos')
    .update({ estado: 'enviado_aprobacion' as EstadoPresupuesto })
    .eq('id', presupuestoId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/presupuestos/${presupuestoId}`)
  revalidatePath('/presupuestos')
  return { success: true }
}

// Enviado Aprobación → Aprobado (admin only)
export async function aprobarPresupuesto(presupuestoId: string) {
  const { error: permError, admin } = await requireAdmin()
  if (permError || !admin) return { error: permError }

  // Get presupuesto
  const { data: presupuesto, error: fetchError } = await admin
    .from('presupuestos')
    .select('id, estado')
    .eq('id', presupuestoId)
    .single()

  if (fetchError || !presupuesto) return { error: 'Presupuesto no encontrado' }

  if (presupuesto.estado !== 'enviado_aprobacion') {
    return { error: `No se puede aprobar un presupuesto en estado "${presupuesto.estado}"` }
  }

  // Update to aprobado and set fecha_aprobacion
  const { error: updateError } = await admin
    .from('presupuestos')
    .update({
      estado: 'aprobado' as EstadoPresupuesto,
      fecha_aprobacion: new Date().toISOString(),
    })
    .eq('id', presupuestoId)

  if (updateError) return { error: updateError.message }

  // TODO: Create flujo_caja_proyectado based on plan_ejecucion and analisis_economico
  // This will be done in Phase 4

  revalidatePath(`/presupuestos/${presupuestoId}`)
  revalidatePath('/presupuestos')
  return { success: true }
}

// Enviado Aprobación → Rechazado (admin only)
export async function rechazarPresupuesto(presupuestoId: string, razon?: string) {
  const { error: permError, admin } = await requireAdmin()
  if (permError || !admin) return { error: permError }

  // Get presupuesto
  const { data: presupuesto, error: fetchError } = await admin
    .from('presupuestos')
    .select('id, estado, notas')
    .eq('id', presupuestoId)
    .single()

  if (fetchError || !presupuesto) return { error: 'Presupuesto no encontrado' }

  if (presupuesto.estado !== 'enviado_aprobacion') {
    return { error: `No se puede rechazar un presupuesto en estado "${presupuesto.estado}"` }
  }

  // Update to rechazado
  const notasActuales = presupuesto.notas || ''
  const notasActualizadas = razon
    ? `${notasActuales}\n\n[RECHAZADO] ${razon}`
    : notasActuales

  const { error: updateError } = await admin
    .from('presupuestos')
    .update({
      estado: 'rechazado' as EstadoPresupuesto,
      notas: notasActualizadas,
    })
    .eq('id', presupuestoId)

  if (updateError) return { error: updateError.message }

  revalidatePath(`/presupuestos/${presupuestoId}`)
  revalidatePath('/presupuestos')
  return { success: true }
}

// Aprobado → En Ejecución
export async function iniciarEjecucionObra(presupuestoId: string) {
  const user = await requireUser()
  if (!user) return { error: 'No autenticado' }

  const supabase = await createClient()

  // Get presupuesto
  const { data: presupuesto, error: fetchError } = await supabase
    .from('presupuestos')
    .select('id, estado, obra_id, cliente, obra_descripcion, obra_direccion, subtotal')
    .eq('id', presupuestoId)
    .single()

  if (fetchError || !presupuesto) return { error: 'Presupuesto no encontrado' }

  if (presupuesto.estado !== 'aprobado') {
    return { error: `No se puede iniciar ejecución de un presupuesto en estado "${presupuesto.estado}"` }
  }

  // Create or get obra
  let obraId = presupuesto.obra_id

  if (!obraId) {
    // Create new obra from presupuesto data
    const { data: newObra, error: obraCreateError } = await supabase
      .from('obras')
      .insert({
        nombre: presupuesto.obra_descripcion,
        cliente: presupuesto.cliente,
        direccion: presupuesto.obra_direccion,
        presupuesto_total: presupuesto.subtotal,
        estado: 'en_ejecucion' as any,
        created_by: user.id,
      })
      .select()
      .single()

    if (obraCreateError || !newObra) {
      return { error: `Error creando obra: ${obraCreateError?.message}` }
    }

    obraId = newObra.id
  } else {
    // Update existing obra estado
    const { error: obraUpdateError } = await supabase
      .from('obras')
      .update({ estado: 'en_ejecucion' as any })
      .eq('id', obraId)

    if (obraUpdateError) {
      return { error: `Error actualizando obra: ${obraUpdateError.message}` }
    }
  }

  // Update presupuesto estado and obra_id
  const { error: presupuestoUpdateError } = await supabase
    .from('presupuestos')
    .update({
      estado: 'en_ejecucion' as EstadoPresupuesto,
      obra_id: obraId,
    })
    .eq('id', presupuestoId)

  if (presupuestoUpdateError) {
    return { error: presupuestoUpdateError.message }
  }

  revalidatePath(`/presupuestos/${presupuestoId}`)
  revalidatePath('/presupuestos')
  return { success: true, obraId }
}

// En Ejecución → Pausado
export async function pausarObraEjecucion(presupuestoId: string, razon?: string) {
  const user = await requireUser()
  if (!user) return { error: 'No autenticado' }

  const supabase = await createClient()

  // Get presupuesto
  const { data: presupuesto, error: fetchError } = await supabase
    .from('presupuestos')
    .select('id, estado, obra_id, notas')
    .eq('id', presupuestoId)
    .single()

  if (fetchError || !presupuesto) return { error: 'Presupuesto no encontrado' }

  if (presupuesto.estado !== 'en_ejecucion') {
    return { error: `No se puede pausar un presupuesto en estado "${presupuesto.estado}"` }
  }

  // Update presupuesto
  const notasActualizadas = razon
    ? `${presupuesto.notas || ''}\n\n[PAUSADO] ${razon}`
    : presupuesto.notas

  const { error: presupuestoError } = await supabase
    .from('presupuestos')
    .update({
      estado: 'pausado' as EstadoPresupuesto,
      notas: notasActualizadas,
    })
    .eq('id', presupuestoId)

  if (presupuestoError) return { error: presupuestoError.message }

  // Update obra if exists
  if (presupuesto.obra_id) {
    await supabase
      .from('obras')
      .update({ estado: 'pausado' as any })
      .eq('id', presupuesto.obra_id)
  }

  revalidatePath(`/presupuestos/${presupuestoId}`)
  revalidatePath('/presupuestos')
  return { success: true }
}

// Pausado → En Ejecución (resume)
export async function reanudaObraEjecucion(presupuestoId: string) {
  const user = await requireUser()
  if (!user) return { error: 'No autenticado' }

  const supabase = await createClient()

  // Get presupuesto
  const { data: presupuesto, error: fetchError } = await supabase
    .from('presupuestos')
    .select('id, estado, obra_id')
    .eq('id', presupuestoId)
    .single()

  if (fetchError || !presupuesto) return { error: 'Presupuesto no encontrado' }

  if (presupuesto.estado !== 'pausado') {
    return { error: `No se puede reanudar un presupuesto en estado "${presupuesto.estado}"` }
  }

  // Update presupuesto
  const { error: presupuestoError } = await supabase
    .from('presupuestos')
    .update({ estado: 'en_ejecucion' as EstadoPresupuesto })
    .eq('id', presupuestoId)

  if (presupuestoError) return { error: presupuestoError.message }

  // Update obra if exists
  if (presupuesto.obra_id) {
    await supabase
      .from('obras')
      .update({ estado: 'en_ejecucion' as any })
      .eq('id', presupuesto.obra_id)
  }

  revalidatePath(`/presupuestos/${presupuestoId}`)
  revalidatePath('/presupuestos')
  return { success: true }
}

// En Ejecución → Terminado
export async function terminarObraEjecucion(presupuestoId: string) {
  const user = await requireUser()
  if (!user) return { error: 'No autenticado' }

  const supabase = await createClient()

  // Get presupuesto
  const { data: presupuesto, error: fetchError } = await supabase
    .from('presupuestos')
    .select('id, estado, obra_id')
    .eq('id', presupuestoId)
    .single()

  if (fetchError || !presupuesto) return { error: 'Presupuesto no encontrado' }

  if (!['en_ejecucion', 'pausado'].includes(presupuesto.estado)) {
    return { error: `No se puede terminar un presupuesto en estado "${presupuesto.estado}"` }
  }

  // Update presupuesto
  const { error: presupuestoError } = await supabase
    .from('presupuestos')
    .update({ estado: 'terminado' as EstadoPresupuesto })
    .eq('id', presupuestoId)

  if (presupuestoError) return { error: presupuestoError.message }

  // Update obra if exists
  if (presupuesto.obra_id) {
    await supabase
      .from('obras')
      .update({ estado: 'terminado' as any })
      .eq('id', presupuesto.obra_id)
  }

  revalidatePath(`/presupuestos/${presupuestoId}`)
  revalidatePath('/presupuestos')
  return { success: true }
}

// Helper: Get valid transitions for current estado
export function getValidTransitions(
  estado: EstadoPresupuesto
): Array<{ to: EstadoPresupuesto; label: string; color: string; requiresAdmin: boolean }> {
  const transitions: Record<EstadoPresupuesto, any[]> = {
    borrador: [
      { to: 'enviado_aprobacion', label: 'Enviar para Aprobación', color: 'blue', requiresAdmin: false },
    ],
    enviado_aprobacion: [
      { to: 'aprobado', label: 'Aprobar', color: 'green', requiresAdmin: true },
      { to: 'rechazado', label: 'Rechazar', color: 'red', requiresAdmin: true },
    ],
    aprobado: [
      { to: 'en_ejecucion', label: 'Iniciar Ejecución', color: 'orange', requiresAdmin: false },
    ],
    en_ejecucion: [
      { to: 'pausado', label: 'Pausar', color: 'yellow', requiresAdmin: false },
      { to: 'terminado', label: 'Terminar Obra', color: 'gray', requiresAdmin: false },
    ],
    pausado: [
      { to: 'en_ejecucion', label: 'Reanudar', color: 'orange', requiresAdmin: false },
      { to: 'terminado', label: 'Terminar Obra', color: 'gray', requiresAdmin: false },
    ],
    terminado: [],
    rechazado: [],
  }

  return transitions[estado] || []
}
