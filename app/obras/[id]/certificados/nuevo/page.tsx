import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { NuevoCertClient } from './NuevoCertClient'
import type { Obra, ItemObra, CertificadoItem } from '@/lib/types'

export default async function NuevoCertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const [{ data: obra }, { data: items }, { data: perfil }] = await Promise.all([
    supabase.from('obras').select('*').eq('id', id).single(),
    supabase.from('items_obra').select('*').eq('obra_id', id).order('orden'),
    admin.from('perfiles').select('rol').eq('id', user.id).single(),
  ])

  if (!obra) notFound()
  if (!perfil || !['admin', 'capataz'].includes(perfil.rol)) redirect(`/obras/${id}`)
  if (!items || items.length === 0) {
    redirect(`/obras/${id}?error=no-items`)
  }

  // Obtener el último certificado aprobado y sus items
  const { data: ultimoCert } = await supabase
    .from('certificados')
    .select('id, numero')
    .eq('obra_id', id)
    .eq('estado', 'aprobado')
    .order('numero', { ascending: false })
    .limit(1)
    .single()

  let ultimosCertItems: Record<string, CertificadoItem> = {}
  if (ultimoCert) {
    const { data: certItems } = await supabase
      .from('certificado_items')
      .select('*')
      .eq('certificado_id', ultimoCert.id)
    if (certItems) {
      certItems.forEach((ci: CertificadoItem) => {
        ultimosCertItems[ci.item_id] = ci
      })
    }
  }

  // Número del nuevo certificado
  const { data: numData } = await supabase.rpc('next_cert_numero', { p_obra_id: id })
  const numeroCert = numData ?? 1

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Obras', href: '/dashboard' },
          { label: (obra as Obra).nombre, href: `/obras/${id}` },
          { label: `Certificado #${numeroCert}` },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Nuevo certificado #{numeroCert}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {(obra as Obra).nombre} · {(obra as Obra).cliente}
        </p>
      </div>
      <NuevoCertClient
        obraId={id}
        userId={user.id}
        items={items as ItemObra[]}
        ultimosCertItems={ultimosCertItems}
        numeroCert={numeroCert}
      />
    </div>
  )
}
