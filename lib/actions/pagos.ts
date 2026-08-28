'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, user: null, error: 'No autenticado' as string }
  const admin = createAdminClient()
  const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return { supabase: null, user: null, error: 'Sin permiso' as string }
  return { supabase, user, error: null }
}

export async function registrarPago(obraId: string, formData: FormData) {
  const { supabase, user, error } = await requireAdmin()
  if (error || !supabase || !user) return { error: error ?? 'Error' }

  const importe = parseFloat(formData.get('importe') as string)
  if (isNaN(importe) || importe <= 0) return { error: 'Importe inválido' }

  // Upload comprobante if provided
  let comprobante_url: string | null = null
  const archivo = formData.get('comprobante') as File | null
  if (archivo && archivo.size > 0) {
    const ext = archivo.name.split('.').pop() ?? 'png'
    const fileName = `${user.id}/${obraId}/pago_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('comprobantes_gastos')
      .upload(fileName, archivo, { upsert: false })
    if (uploadError) return { error: `Error subiendo comprobante: ${uploadError.message}` }
    const { data: urlData } = supabase.storage.from('comprobantes_gastos').getPublicUrl(fileName)
    comprobante_url = urlData?.publicUrl ?? null
  }

  const { error: dbError } = await supabase.from('pagos').insert({
    obra_id: obraId,
    fecha_pago: formData.get('fecha_pago') as string,
    importe,
    referencia: (formData.get('referencia') as string) || null,
    notas: (formData.get('notas') as string) || null,
    comprobante_url,
    created_by: user.id,
  })

  if (dbError) return { error: dbError.message }
  revalidatePath(`/obras/${obraId}`)
  return { success: true }
}

export async function eliminarPago(pagoId: string, obraId: string) {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error: error ?? 'Error' }

  const { error: dbError } = await supabase.from('pagos').delete().eq('id', pagoId)
  if (dbError) return { error: dbError.message }
  revalidatePath(`/obras/${obraId}`)
  return { success: true }
}
