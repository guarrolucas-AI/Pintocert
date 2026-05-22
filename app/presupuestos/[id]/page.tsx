import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { DetallePresupuestoClient } from './DetallePresupuestoClient'
import type { Presupuesto, PresupuestoMensajes, ModuloAgente } from '@/lib/types'

export const revalidate = 0

export default async function PresupuestoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: presupuesto }, { data: mensajes }] = await Promise.all([
    supabase.from('presupuestos').select('*').eq('id', id).single(),
    supabase
      .from('presupuesto_mensajes')
      .select('*')
      .eq('presupuesto_id', id),
  ])

  if (!presupuesto) notFound()

  // Convertir mensajes en un mapa { modulo -> messages[] }
  const mensajesPorModulo: Partial<Record<ModuloAgente, PresupuestoMensajes>> = {}
  if (mensajes) {
    for (const m of mensajes as PresupuestoMensajes[]) {
      mensajesPorModulo[m.modulo] = m
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Presupuestos', href: '/presupuestos' },
          { label: (presupuesto as Presupuesto).cliente || 'Sin nombre' },
        ]}
      />
      <DetallePresupuestoClient
        presupuesto={presupuesto as Presupuesto}
        mensajesPorModulo={mensajesPorModulo}
        userId={user.id}
      />
    </div>
  )
}
