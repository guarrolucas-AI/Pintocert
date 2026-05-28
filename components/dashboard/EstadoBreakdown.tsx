'use client'

import { formatARS } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { EstadoObra } from '@/lib/types'
import type { DashboardKPIs } from '@/lib/types'
import { getEstadoLabel, getEstadoVariant } from '@/lib/dashboard-utils'

interface EstadoBreakdownProps {
  kpis: DashboardKPIs
  selectedEstado?: EstadoObra | null
  onFilterChange?: (estado: EstadoObra | null) => void
}

const ESTADOS: EstadoObra[] = [
  'borrador',
  'enviado_aprobacion',
  'aprobado',
  'en_ejecucion',
  'pausado',
  'terminado',
  'rechazado',
]

export function EstadoBreakdown({
  kpis,
  selectedEstado,
  onFilterChange,
}: EstadoBreakdownProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Por Estado</h2>
        {selectedEstado && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange?.(null)}
            className="h-8"
          >
            <X className="w-4 h-4 mr-1" />
            Limpiar filtro
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ESTADOS.map((estado) => {
          const count = kpis.obrasPorEstado[estado]
          const monto = kpis.montosPorEstado[estado]
          const isSelected = selectedEstado === estado
          const isClickable = count > 0

          return (
            <button
              key={estado}
              onClick={() => {
                if (isClickable) {
                  onFilterChange?.(isSelected ? null : estado)
                }
              }}
              disabled={!isClickable}
              className={`rounded-lg border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-yellow-400 bg-yellow-50'
                  : isClickable
                    ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                    : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={getEstadoVariant(estado)}>
                  {getEstadoLabel(estado)}
                </Badge>
              </div>

              <p className="text-sm font-semibold text-slate-900">
                {count} {count === 1 ? 'obra' : 'obras'}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {formatARS(monto)}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
