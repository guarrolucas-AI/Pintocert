'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteCertificado(certId: string, obraId: string) {
  // Verificar que el usuario está autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar que el cert existe y está en borrador
  const { data: cert } = await supabase
    .from('certificados')
    .select('estado')
    .eq('id', certId)
    .single()

  if (!cert || cert.estado !== 'borrador') {
    return { error: 'Solo se pueden eliminar certificados en borrador' }
  }

  // Usar admin client para bypasear RLS
  const admin = createAdminClient()

  const { error: itemsError } = await admin
    .from('certificado_items')
    .delete()
    .eq('certificado_id', certId)

  if (itemsError) return { error: itemsError.message }

  const { error: certError } = await admin
    .from('certificados')
    .delete()
    .eq('id', certId)

  if (certError) return { error: certError.message }

  return { error: null }
}
