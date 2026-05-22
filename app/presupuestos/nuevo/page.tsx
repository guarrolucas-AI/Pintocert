import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { NuevoPresupuestoClient } from './NuevoPresupuestoClient'

export default async function NuevoPresupuestoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 88px)' }}>
      <div className="flex items-center justify-between shrink-0">
        <Breadcrumb
          items={[
            { label: 'Presupuestos', href: '/presupuestos' },
            { label: 'Nuevo presupuesto' },
          ]}
        />
      </div>
      <NuevoPresupuestoClient userId={user.id} />
    </div>
  )
}
