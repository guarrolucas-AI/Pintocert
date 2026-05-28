'use client'

import { useState } from 'react'
import { EstadoBreakdown } from './EstadoBreakdown'
import { ObrasAnalyticsTable } from './ObrasAnalyticsTable'
import type { ObraConAvance, EstadoObra, DashboardKPIs } from '@/lib/types'

interface ObrasAnalyticsTableClientProps {
  initialObras: ObraConAvance[]
  initialKPIs: DashboardKPIs
}

export function ObrasAnalyticsTableClient({
  initialObras,
  initialKPIs,
}: ObrasAnalyticsTableClientProps) {
  const [selectedEstado, setSelectedEstado] = useState<EstadoObra | null>(null)

  const filteredObras = selectedEstado
    ? initialObras.filter((o) => o.estado === selectedEstado)
    : initialObras

  return (
    <>
      {/* Estado Breakdown */}
      {initialObras.length > 0 && (
        <EstadoBreakdown
          kpis={initialKPIs}
          selectedEstado={selectedEstado}
          onFilterChange={setSelectedEstado}
        />
      )}

      {/* Obras Analytics Table */}
      <ObrasAnalyticsTable obras={filteredObras} />
    </>
  )
}
