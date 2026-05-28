'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function archivarObra(obraId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  // Solo admin puede archivar
  const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return { error: 'Sin permisos' }

  // Try 'pausada' state instead of 'archivado'
  const { error } = await admin
    .from('obras')
    .update({ estado: 'pausada' })
    .eq('id', obraId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}

export async function eliminarObra(obraId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()

  // Solo admin puede eliminar
  const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return { error: 'Sin permisos' }

  // IMPORTANT: Delete in reverse order of foreign keys:
  // 1. presupuesto_mensajes (references presupuestos)
  // 2. presupuestos (references obras)
  // 3. certificado_items (references certificados)
  // 4. certificados (references obras)
  // 5. pagos (references obras)
  // 6. items_obra (references obras)
  // 7. obras

  // Delete presupuesto messages first
  const { data: presupuestos } = await admin
    .from('presupuestos')
    .select('id')
    .eq('obra_id', obraId)

  if (presupuestos && presupuestos.length > 0) {
    const presupuestoIds = presupuestos.map((p) => p.id)
    await admin.from('presupuesto_mensajes').delete().in('presupuesto_id', presupuestoIds)
    await admin.from('presupuestos').delete().in('id', presupuestoIds)
  }

  // Delete certificates and related data
  const { data: certs } = await admin
    .from('certificados')
    .select('id')
    .eq('obra_id', obraId)

  if (certs && certs.length > 0) {
    const certIds = certs.map((c) => c.id)
    await admin.from('certificado_items').delete().in('certificado_id', certIds)
    await admin.from('certificados').delete().in('id', certIds)
  }

  // Delete payments and work items
  await admin.from('pagos').delete().eq('obra_id', obraId)
  await admin.from('items_obra').delete().eq('obra_id', obraId)

  // Finally, delete the obra itself
  const { error } = await admin.from('obras').delete().eq('id', obraId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}
