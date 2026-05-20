import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { CertPreview } from '@/components/certificados/CertPreview'
import { AprobacionClient } from './AprobacionClient'
import type { Obra, Certificado, CertificadoItem, ItemObra } from '@/lib/types'

export const revalidate = 0

export default async function CertPage({
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
  const [{ data: obra }, { data: cert }, { data: certItems }, { data: items }, { data: perfil }] =
    await Promise.all([
      supabase.from('obras').select('*').eq('id', id).single(),
      supabase.from('certificados').select('*').eq('id', certId).single(),
      supabase.from('certificado_items').select('*').eq('certificado_id', certId),
      supabase.from('items_obra').select('*').eq('obra_id', id).order('orden'),
      admin.from('perfiles').select('rol').eq('id', user.id).single(),
    ])

  if (!obra || !cert) notFound()

  const isAdmin = perfil?.rol === 'admin'
  const itemsMap: Record<string, ItemObra> = {}
  ;(items ?? []).forEach((it: ItemObra) => (itemsMap[it.id] = it))

  const certConItems = {
    ...(cert as Certificado),
    obra: obra as Obra,
    items: (certItems ?? []).map((ci: CertificadoItem) => ({
      ...ci,
      item: itemsMap[ci.item_id],
    })),
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Obras', href: '/dashboard' },
          { label: (obra as Obra).nombre, href: `/obras/${id}` },
          { label: `Certificado #${(cert as Certificado).numero}` },
        ]}
      />

      <CertPreview cert={certConItems} />

      {isAdmin && (cert as Certificado).estado === 'borrador' && (
        <AprobacionClient certId={certId} obraId={id} />
      )}
    </div>
  )
}
