'use client'

import { formatARS } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

interface KPIHeaderProps {
  presupuestadoTotal: number
  ejecutadoTotal: number
  saldoTotal: number
  porcentajeAvancePromedio: number
}

export function KPIHeader({
  presupuestadoTotal,
  ejecutadoTotal,
  saldoTotal,
  porcentajeAvancePromedio,
}: KPIHeaderProps) {
  const kpis = [
    {
      label: 'Presupuestado Total',
      value: formatARS(presupuestadoTotal),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Ejecutado Total',
      value: formatARS(ejecutadoTotal),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Saldo Disponible',
      value: formatARS(saldoTotal),
      color: saldoTotal >= 0 ? 'text-slate-900' : 'text-red-600',
      bgColor: saldoTotal >= 0 ? 'bg-slate-50' : 'bg-red-50',
    },
    {
      label: '% Avance Promedio',
      value: `${porcentajeAvancePromedio}%`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className={`rounded-lg border border-slate-200 p-4 ${kpi.bgColor}`}
        >
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            {kpi.label}
          </p>
          <p className={`text-2xl font-bold mt-2 ${kpi.color}`}>
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  )
}
