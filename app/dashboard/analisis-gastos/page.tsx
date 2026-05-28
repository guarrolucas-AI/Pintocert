import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { AnalisisGastosTableClient } from '@/components/dashboard/AnalisisGastosTableClient'
import { AnalisisGastosChartsClient } from '@/components/dashboard/AnalisisGastosChartsClient'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
import type { ObraConAvance, GastoObra } from '@/lib/types'

export const revalidate = 0

export default async function AnalisisGastosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get todas las obras con avance
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

  // Get todos los gastos
  const { data: gastos, error: gastosError } = await supabase
    .from('gastos_obra')
    .select('*')
    .order('fecha', { ascending: false })

  if (gastosError) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Error al cargar gastos: {gastosError.message}
      </div>
    )
  }

  const gastosData = (gastos as GastoObra[]) || []

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard' }, { label: 'Análisis de Gastos' }]} />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Análisis de Gastos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comparación entre presupuesto ejecutado y gastos reales por obra
        </p>
      </div>

      {/* Dashboard Navigation */}
      <DashboardNav current="analisis-gastos" />

      {gastosData.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            No hay gastos registrados aún
          </p>
          <p className="text-xs text-muted-foreground">
            Comienza a registrar gastos en las obras para ver el análisis comparativo
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts */}
          <AnalisisGastosChartsClient obras={obrasData} gastos={gastosData} />

          {/* Table */}
          <AnalisisGastosTableClient obras={obrasData} gastos={gastosData} />
        </div>
      )}
    </div>
  )
}
