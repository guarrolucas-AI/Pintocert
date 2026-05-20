import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { InviteForm } from '@/components/usuarios/InviteForm'
import { UsuarioRow } from '@/components/usuarios/UsuarioRow'
import type { Perfil } from '@/lib/types'

export const revalidate = 0

export default async function UsuariosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const [{ data: perfil }, { data: perfiles }] = await Promise.all([
    admin.from('perfiles').select('rol').eq('id', user.id).single(),
    admin.from('perfiles').select('*').order('created_at'),
  ])

  if (perfil?.rol !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {perfiles?.length ?? 0} usuarios registrados
          </p>
        </div>
        <InviteForm />
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs text-muted-foreground">
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Desde</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(perfiles as Perfil[] | null)?.map((p) => (
              <UsuarioRow key={p.id} perfil={p} currentUserId={user.id} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
