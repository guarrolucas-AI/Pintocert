'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { FotoObra } from '@/lib/types'

export async function uploadFotoObra({
  obraId,
  titulo,
  descripcion,
  fechaFoto,
  tags,
  archivo,
}: {
  obraId: string
  titulo: string
  descripcion?: string
  fechaFoto: string
  tags?: string[]
  archivo: File
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Validate
  if (!titulo.trim()) return { error: 'Título requerido' }
  if (!archivo) return { error: 'Archivo requerido' }

  // Check that obra exists
  const { data: obra, error: obraError } = await supabase
    .from('obras')
    .select('id')
    .eq('id', obraId)
    .single()

  if (obraError || !obra) return { error: 'Obra no encontrada' }

  // Validate file
  const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  if (!validMimes.includes(archivo.type)) {
    return { error: 'Formato de imagen no válido (JPG, PNG, WebP, AVIF)' }
  }

  if (archivo.size > 50 * 1024 * 1024) {
    return { error: 'La imagen debe ser menor a 50 MB' }
  }

  // Upload file to storage
  const timestamp = Date.now()
  const fileExt = archivo.name.split('.').pop()
  const fileName = `${user.id}/${obraId}/foto_${timestamp}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('fotos_obra')
    .upload(fileName, archivo, { upsert: false })

  if (uploadError) {
    return { error: `Error subiendo imagen: ${uploadError.message}` }
  }

  // Get public URL
  const { data: publicUrl } = supabase.storage
    .from('fotos_obra')
    .getPublicUrl(fileName)

  const fotoUrl = publicUrl?.publicUrl

  if (!fotoUrl) {
    return { error: 'Error generando URL pública de imagen' }
  }

  // Insert record in database
  const { data, error } = await supabase
    .from('fotos_obra')
    .insert({
      obra_id: obraId,
      foto_url: fotoUrl,
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || null,
      fecha_foto: fechaFoto,
      tags: tags || [],
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/obras/${obraId}`)
  return { success: true, data }
}

export async function getFotosObra(obraId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('fotos_obra')
    .select('*')
    .eq('obra_id', obraId)
    .order('fecha_foto', { ascending: false })

  if (error) return { error: error.message }
  return { data: data as FotoObra[] }
}

export async function deleteFotoObra(fotoId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Get foto to check ownership and get URL
  const { data: foto, error: fetchError } = await supabase
    .from('fotos_obra')
    .select('foto_url, obra_id, created_by')
    .eq('id', fotoId)
    .single()

  if (fetchError || !foto) return { error: 'Foto no encontrada' }
  if (foto.created_by !== user.id) return { error: 'No tienes permiso para eliminar esta foto' }

  // Delete file from storage
  if (foto.foto_url) {
    // Extract file path from public URL
    const urlParts = foto.foto_url.split('/fotos_obra/')
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      await supabase.storage.from('fotos_obra').remove([filePath])
    }
  }

  // Delete record from database
  const { error } = await supabase.from('fotos_obra').delete().eq('id', fotoId)

  if (error) return { error: error.message }

  revalidatePath(`/obras/${foto.obra_id}`)
  return { success: true }
}

export async function updateFotoObra(
  fotoId: string,
  updates: Partial<Omit<FotoObra, 'id' | 'obra_id' | 'created_by' | 'created_at' | 'updated_at'>>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Get foto to check ownership
  const { data: foto, error: fetchError } = await supabase
    .from('fotos_obra')
    .select('created_by, obra_id')
    .eq('id', fotoId)
    .single()

  if (fetchError || !foto) return { error: 'Foto no encontrada' }
  if (foto.created_by !== user.id) return { error: 'No tienes permiso para editar esta foto' }

  // Update
  const { error } = await supabase.from('fotos_obra').update(updates).eq('id', fotoId)

  if (error) return { error: error.message }

  revalidatePath(`/obras/${foto.obra_id}`)
  return { success: true }
}
