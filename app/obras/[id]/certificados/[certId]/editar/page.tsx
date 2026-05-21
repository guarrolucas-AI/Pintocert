import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { EditCertClient } from './EditCertClient'
import type { Obra, Certificado, CertificadoItem, ItemObra } from '@/lib/types'

export const revalidate = 0

export default async function EditarCertPage({
  params,
}: {
  params: Promise<{ id: string; certId: string }>
}) {
  const { id, certId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const [{ data: obra }, { data: cert }, { data: items }, { data: perfil }] = await Promise.all([
    supabase.from('obras').select('*').eq('id', id).single(),
    supabase.from('certificados').select('*').eq('id', certId).single(),
    supabase.from('items_obra').select('*').eq('obra_id', id).order('orden'),
    admin.from('perfiles').select('rol').eq('id', user.id).single(),
  ])

  if (!obra || !cert) notFound()

  // Solo se pueden editar borradores
  if ((cert as Certificado).estado !== 'borrador') {
    redirect(`/obras/${id}/certificados/${certId}`)
  }

  // Solo admin y capataz pueden editar
  if (!perfil || !['admin', 'capataz'].includes(perfil.rol)) {
    redirect(`/obras/${id}/certificados/${certId}`)
  }

  // Items del certificado actual (para initialPcts)
  const { data: currentCertItems } = await supabase
    .from('certificado_items')
    .select('*')
    .eq('certificado_id', certId)

  // Certificado aprobado anterior (para ultimosCertItems / acumulado anterior)
  const { data: prevCert } = await supabase
    .from('certificados')
    .select('id, numero')
    .eq('obra_id', id)
    .eq('estado', 'aprobado')
    .lt('numero', (cert as Certificado).numero)
    .order('numero', { ascending: false })
    .limit(1)
    .single()

  let ultimosCertItems: Record<string, CertificadoItem> = {}
  if (prevCert) {
    const { data: prevItems } = await supabase
      .from('certificado_items')
      .select('*')
      .eq('certificado_id', prevCert.id)
    if (prevItems) {
      prevItems.forEach((ci: CertificadoItem) => {
        ultimosCertItems[ci.item_id] = ci
      })
    }
  }

  // Porcentajes de período del cert actual
  const initialPcts: Record<string, number> = {}
  ;(currentCertItems ?? []).forEach((ci: CertificadoItem) => {
    initialPcts[ci.item_id] = ci.pct_periodo
  })

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Obras', href: '/dashboard' },
          { label: (obra as Obra).nombre, href: `/obras/${id}` },
          {
            label: `Certificado #${(cert as Certificado).numero}`,
            href: `/obras/${id}/certificados/${certId}`,
          },
          { label: 'Editar' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Editar certificado #{(cert as Certificado).numero}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {(obra as Obra).nombre} · {(obra as Obra).cliente}
        </p>
      </div>
      <EditCertClient
        cert={cert as Certificado}
        items={(items ?? []) as ItemObra[]}
        ultimosCertItems={ultimosCertItems}
        initialPcts={initialPcts}
      />
    </div>
  )
}
