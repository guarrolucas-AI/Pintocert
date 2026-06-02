'use client'
import { formatARS } from '@/lib/utils'
import type { FlujoCajaCentral } from '@/lib/types'

interface KPICardsProps {
  dataByMonth: FlujoCajaCentral[]
  anio: number
}

/**
 * KPI Cards Component
 *
 * Displays 3 key performance indicators for central accounting:
 * - Total Egresos (year-to-date) in red
 * - Saldo Final (December closing balance) in blue
 * - Promedio Mensual (average monthly expenses) in gray
 *
 * Responsive: 2 columns on mobile, 3 columns on desktop (sm breakpoint)
 * Pure presentational component, no state or side effects
 */
export function KPICards({ dataByMonth, anio }: KPICardsProps) {
  const totalEgresos = dataByMonth.reduce((sum, d) => sum + d.egresos_total, 0)
  const finalSaldo = dataByMonth[11]?.saldo_acumulado || 0
  const avgMonthly = totalEgresos / 12

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {/* Total Egresos Card */}
      <div className="bg-red-50 rounded-lg p-4 border border-red-100">
        <p className="text-sm text-red-600 mb-1 font-medium">Total Egresos ({anio})</p>
        <p className="text-2xl font-bold text-red-700">{formatARS(totalEgresos)}</p>
      </div>

      {/* Final Saldo Card */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <p className="text-sm text-blue-600 mb-1 font-medium">Saldo Final</p>
        <p className={`text-2xl font-bold ${finalSaldo >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
          {formatARS(finalSaldo)}
        </p>
      </div>

      {/* Average Monthly Card */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
        <p className="text-sm text-slate-600 mb-1 font-medium">Promedio Mensual</p>
        <p className="text-2xl font-bold text-slate-700">{formatARS(avgMonthly)}</p>
      </div>
    </div>
  )
}
