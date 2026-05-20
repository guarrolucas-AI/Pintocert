import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { NuevaObraClient } from './NuevaObraClient'

export default async function NuevaObraPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || !['admin', 'capataz'].includes(perfil.rol)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: 'Obras', href: '/dashboard' }, { label: 'Nueva obra' }]}
      />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nueva obra</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Completá los datos para registrar una nueva obra.
        </p>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <NuevaObraClient userId={user.id} />
      </div>
    </div>
  )
}
