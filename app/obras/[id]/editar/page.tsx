import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { EditarObraClient } from './EditarObraClient'
import type { Obra } from '@/lib/types'

export default async function EditarObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const [{ data: obra }, { data: perfil }] = await Promise.all([
    supabase.from('obras').select('*').eq('id', id).single(),
    admin.from('perfiles').select('rol').eq('id', user.id).single(),
  ])

  if (!obra) notFound()
  if (!perfil || !['admin', 'capataz'].includes(perfil.rol)) redirect(`/obras/${id}`)

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Obras', href: '/dashboard' },
          { label: (obra as Obra).nombre, href: `/obras/${id}` },
          { label: 'Editar' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Editar obra</h1>
      </div>
      <div className="rounded-lg border bg-white p-6">
        <EditarObraClient obra={obra as Obra} />
      </div>
    </div>
  )
}
