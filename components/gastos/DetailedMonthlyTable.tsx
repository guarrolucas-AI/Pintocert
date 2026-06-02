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
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 border-b">
          <tr>
            <th className="text-left px-4 py-2 font-semibold text-slate-900">Mes</th>
            <th className="text-right px-4 py-2 font-semibold text-slate-900">Sueldos</th>
            <th className="text-right px-4 py-2 font-semibold text-slate-900">Combustible</th>
            <th className="text-right px-4 py-2 font-semibold text-slate-900">Máquinas</th>
            <th className="text-right px-4 py-2 font-semibold text-slate-900">Materiales</th>
            <th className="text-right px-4 py-2 font-semibold text-slate-900">Retiros</th>
            <th className="text-right px-4 py-2 font-semibold text-slate-900">Otros</th>
            <th className="text-right px-4 py-2 font-semibold text-slate-900">Total Mes</th>
            <th className="text-right px-4 py-2 font-semibold text-slate-900">Saldo Acum.</th>
          </tr>
        </thead>
        <tbody>
          {dataByMonth.map((data, idx) => (
            <tr key={data.mes} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="px-4 py-2 font-medium text-slate-900">{MESES[data.mes - 1]}</td>
              <td className="text-right px-4 py-2 text-slate-700">{formatARS(data.egresos_sueldo)}</td>
              <td className="text-right px-4 py-2 text-slate-700">{formatARS(data.egresos_combustible)}</td>
              <td className="text-right px-4 py-2 text-slate-700">{formatARS(data.egresos_maquina)}</td>
              <td className="text-right px-4 py-2 text-slate-700">{formatARS(data.egresos_material)}</td>
              <td className="text-right px-4 py-2 text-slate-700">{formatARS(data.egresos_retiro_socio)}</td>
              <td className="text-right px-4 py-2 text-slate-700">{formatARS(data.egresos_otro)}</td>
              <td className="text-right px-4 py-2 font-semibold text-slate-900">
                {formatARS(data.egresos_total)}
              </td>
              <td className={`text-right px-4 py-2 font-semibold ${data.saldo_acumulado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatARS(data.saldo_acumulado)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
