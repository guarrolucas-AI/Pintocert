'use client'
import { formatARS } from '@/lib/utils'
import type { FlujoCajaCentral } from '@/lib/types'

interface DetailedMonthlyTableProps {
  dataByMonth: FlujoCajaCentral[]
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/**
 * Detailed Monthly Table Component
 *
 * Displays month-by-month breakdown of expenses by type:
 * Columns: Mes | Sueldos | Combustible | Máquinas | Materiales | Retiros | Otros | Total Mes | Saldo Acumulado
 *
 * Features:
 * - All 12 months shown (even if no data)
 * - Saldo_acumulado color-coded: green if positive, red if negative
 * - Total Mes column right-aligned and bold
 * - Responsive table with horizontal scroll on mobile
 *
 * Pure presentational component, no state or side effects
 */
export function DetailedMonthlyTable({ dataByMonth }: DetailedMonthlyTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-slate-900">Mes</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-900 text-xs uppercase tracking-wide">Sueldos</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-900 text-xs uppercase tracking-wide">Combustible</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-900 text-xs uppercase tracking-wide">Máquinas</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-900 text-xs uppercase tracking-wide">Materiales</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-900 text-xs uppercase tracking-wide">Retiros</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-900 text-xs uppercase tracking-wide">Otros</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-900 text-xs uppercase tracking-wide">Total Mes</th>
            <th className="text-right px-4 py-3 font-semibold text-slate-900 text-xs uppercase tracking-wide">Saldo Acum.</th>
          </tr>
        </thead>
        <tbody>
          {dataByMonth.map((data, idx) => (
            <tr key={data.mes} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'} transition-colors`}>
              <td className="px-4 py-3 font-medium text-slate-900">{MESES[data.mes - 1]}</td>
              <td className="text-right px-4 py-3 text-slate-600">{formatARS(data.egresos_sueldo)}</td>
              <td className="text-right px-4 py-3 text-slate-600">{formatARS(data.egresos_combustible)}</td>
              <td className="text-right px-4 py-3 text-slate-600">{formatARS(data.egresos_maquina)}</td>
              <td className="text-right px-4 py-3 text-slate-600">{formatARS(data.egresos_material)}</td>
              <td className="text-right px-4 py-3 text-slate-600">{formatARS(data.egresos_retiro_socio)}</td>
              <td className="text-right px-4 py-3 text-slate-600">{formatARS(data.egresos_otro)}</td>
              <td className="text-right px-4 py-3 font-semibold text-slate-900">
                {formatARS(data.egresos_total)}
              </td>
              <td className={`text-right px-4 py-3 font-semibold ${data.saldo_acumulado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatARS(data.saldo_acumulado)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
