'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CategoriaCompromiso } from '@/lib/types'

// ── Compromisos ───────────────────────────────────────────────────────

export async function crearCompromiso(data: {
  obra_id: string
  descripcion: string
  proveedor?: string
  categoria: CategoriaCompromiso
  monto_total: number
  notas?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('compromisos_proveedor').insert({
    ...data,
    proveedor: data.proveedor || null,
    notas: data.notas || null,
    created_by: user.id,
    estado: 'pendiente_aprobacion',
  })
  if (error) return { error: error.message }

  revalidatePath(`/obras/${data.obra_id}`)
  return { success: true }
}

export async function aprobarCompromiso(id: string, obraId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return { error: 'Solo admins pueden aprobar' }

  const { error } = await supabase.from('compromisos_proveedor').update({
    estado: 'aprobado',
    aprobado_por: user.id,
    aprobado_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/obras/${obraId}`)
  return { success: true }
}

export async function cancelarCompromiso(id: string, obraId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('compromisos_proveedor').update({
    estado: 'cancelado',
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(`/obras/${obraId}`)
  return { success: true }
}

// ── Pagos ─────────────────────────────────────────────────────────────

export async function registrarPagoCompromiso(data: {
  compromiso_id: string
  obra_id: string
  monto: number
  fecha: string
  descripcion?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verify compromiso exists and is approved
  const { data: compromiso } = await supabase
    .from('compromisos_proveedor')
    .select('monto_total, estado')
    .eq('id', data.compromiso_id)
    .single()
  if (!compromiso) return { error: 'Compromiso no encontrado' }
  if (compromiso.estado !== 'aprobado') return { error: 'Solo se puede pagar un compromiso aprobado' }

  const { error } = await supabase.from('compromiso_pagos').insert({
    compromiso_id: data.compromiso_id,
    monto: data.monto,
    fecha: data.fecha,
    descripcion: data.descripcion || null,
    created_by: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath(`/obras/${data.obra_id}`)
  return { success: true }
}

export async function eliminarPago(pagoId: string, obraId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return { error: 'Solo admins pueden eliminar pagos' }

  const { error } = await supabase.from('compromiso_pagos').delete().eq('id', pagoId)
  if (error) return { error: error.message }

  revalidatePath(`/obras/${obraId}`)
  return { success: true }
}
