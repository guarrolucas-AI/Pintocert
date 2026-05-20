'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as string }
  const admin = createAdminClient()
  const { data: perfil } = await admin.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return { error: 'Sin permiso' as string }
  return { error: null, admin }
}

export async function crearColaborador(formData: FormData) {
  const { error, admin } = await requireAdminUser()
  if (error || !admin) return { error: error ?? 'Error' }

  const nombre = (formData.get('nombre') as string).trim()
  const email = (formData.get('email') as string).trim().toLowerCase()
  const rol = formData.get('rol') as string
  const password = (formData.get('password') as string).trim()

  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres' }

  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError) return { error: createError.message }

  const { error: perfilError } = await admin.from('perfiles').insert({
    id: data.user.id,
    nombre,
    email,
    rol,
  })
  if (perfilError) return { error: perfilError.message }

  revalidatePath('/usuarios')
  return { success: true }
}

export async function eliminarUsuario(userId: string) {
  const { error, admin } = await requireAdminUser()
  if (error || !admin) return { error: error ?? 'Error' }

  await admin.from('perfiles').delete().eq('id', userId)
  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) return { error: authError.message }

  revalidatePath('/usuarios')
  return { success: true }
}
