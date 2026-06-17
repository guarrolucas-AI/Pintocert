import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Button } from '@/components/ui/button'
import { PresupuestoPipeline } from '@/components/presupuestos/PresupuestoPipeline'
import type { Presupuesto } from '@/lib/types'
import { Plus } from 'lucide-react'

export const revalidate = 0

export default async function PresupuestosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: presupuestos, error } = await supabase
    .from('presupuestos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Error al cargar: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Presupuestos' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Presupuestos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {presupuestos?.length ?? 0} presupuesto
            {presupuestos?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/presupuestos/nuevo">
            <Plus className="h-4 w-4" />
            Nuevo presupuesto
          </Link>
        </Button>
      </div>

      {!presupuestos || presupuestos.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="font-semibold text-slate-900">No hay presupuestos todavía</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Usá el agente IA para generar tu primer presupuesto de obra.
          </p>
          <Button asChild>
            <Link href="/presupuestos/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo presupuesto
            </Link>
          </Button>
        </div>
      ) : (
        <PresupuestoPipeline presupuestos={presupuestos as Presupuesto[]} />
      )}
    </div>
  )
}
