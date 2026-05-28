import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { KPIHeader } from '@/components/dashboard/KPIHeader'
import { EstadoBreakdown } from '@/components/dashboard/EstadoBreakdown'
import { ObrasAnalyticsTableClient } from '@/components/dashboard/ObrasAnalyticsTableClient'
import { calculateDashboardKPIs } from '@/lib/dashboard-utils'
import { Plus } from 'lucide-react'
import type { ObraConAvance } from '@/lib/types'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: obras, error } = await supabase
    .from('obras_avance')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Error al cargar: {error.message}
      </div>
    )
  }

  const obrasData = (obras as ObraConAvance[]) || []
  const kpis = calculateDashboardKPIs(obrasData)

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Comercial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visión general financiera de todas las obras
          </p>
        </div>
        <Button asChild>
          <Link href="/obras/nueva">
            <Plus className="h-4 w-4" />
            Nueva obra
          </Link>
        </Button>
      </div>

      {/* KPI Header */}
      <KPIHeader
        presupuestadoTotal={kpis.presupuestadoTotal}
        ejecutadoTotal={kpis.ejecutadoTotal}
        saldoTotal={kpis.saldoTotal}
        porcentajeAvancePromedio={kpis.porcentajeAvancePromedio}
      />

      {/* Estado Breakdown & Analytics Table */}
      <ObrasAnalyticsTableClient initialObras={obrasData} initialKPIs={kpis} />
    </div>
  )
}
