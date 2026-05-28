import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { FlujoCajaTableClient } from '@/components/dashboard/FlujoCajaTableClient'
import { FlujoCajaChartsClient } from '@/components/dashboard/FlujoCajaChartsClient'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import { RecalculateFlujoCajaButton } from '@/components/dashboard/RecalculateFlujoCajaButton'
import type { FlujoCajaReal, ObraConAvance } from '@/lib/types'

export const revalidate = 0

export default async function FlujoCajaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get todas las obras
  const { data: obras, error: obrasError } = await supabase
    .from('obras_avance')
    .select('*')
    .order('created_at', { ascending: false })

  if (obrasError) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Error al cargar obras: {obrasError.message}
      </div>
    )
  }

  const obrasData = (obras as ObraConAvance[]) || []

  // Get flujo de caja data for all obras
  const { data: flujoCaja, error: flujoError } = await supabase
    .from('flujo_caja_real')
    .select('*')
    .order('anio', { ascending: false })
    .order('mes', { ascending: false })

  if (flujoError) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Error al cargar flujo de caja: {flujoError.message}
      </div>
    )
  }

  const flujoCajaData = (flujoCaja as FlujoCajaReal[]) || []

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard' }, { label: 'Flujo de Caja' }]} />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Flujo de Caja Real</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Análisis mensual de ingresos vs egresos por obra
        </p>
      </div>

      {/* Dashboard Navigation */}
      <DashboardNav current="flujo-caja" />

      {flujoCajaData.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-muted-foreground mb-6">
            No hay datos de flujo de caja aún
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Los datos de flujo de caja se generan automáticamente al registrar gastos en obras en ejecución
          </p>
          <div className="flex justify-center">
            <RecalculateFlujoCajaButton />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts */}
          <FlujoCajaChartsClient flujoCaja={flujoCajaData} obras={obrasData} />

          {/* Table */}
          <FlujoCajaTableClient flujoCaja={flujoCajaData} obras={obrasData} />
        </div>
      )}
    </div>
  )
}
