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
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
      {/* Total Egresos Card */}
      <div className="bg-red-50 rounded-lg p-6 border border-red-200">
        <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">Total Egresos ({anio})</p>
        <p className="text-2xl font-bold text-red-900">{formatARS(totalEgresos)}</p>
      </div>

      {/* Final Saldo Card */}
      <div className={`rounded-lg p-6 border ${finalSaldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
        <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{color: finalSaldo >= 0 ? '#1e40af' : '#991b1b'}}>
          Saldo Final
        </p>
        <p className={`text-2xl font-bold ${finalSaldo >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
          {formatARS(finalSaldo)}
        </p>
      </div>

      {/* Average Monthly Card */}
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">Promedio Mensual</p>
        <p className="text-2xl font-bold text-slate-900">{formatARS(avgMonthly)}</p>
      </div>
    </div>
  )
}
