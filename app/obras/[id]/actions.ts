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

  const { error } = await admin
    .from('obras')
    .update({ estado: 'archivado' })
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

  // Eliminar en cascada: certificado_items → certificados → pagos → items_obra → obra
  const { data: certs } = await admin
    .from('certificados')
    .select('id')
    .eq('obra_id', obraId)

  if (certs && certs.length > 0) {
    const certIds = certs.map((c) => c.id)
    await admin.from('certificado_items').delete().in('certificado_id', certIds)
    await admin.from('certificados').delete().in('id', certIds)
  }

  await admin.from('pagos').delete().eq('obra_id', obraId)
  await admin.from('items_obra').delete().eq('obra_id', obraId)

  const { error } = await admin.from('obras').delete().eq('id', obraId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { error: null }
}
