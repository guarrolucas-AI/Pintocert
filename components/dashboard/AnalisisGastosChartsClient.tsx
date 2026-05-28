'use client'

import { useState } from 'react'
import { formatARS } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ObraConAvance, GastoObra } from '@/lib/types'

interface AnalisisGastosChartsClientProps {
  obras: ObraConAvance[]
  gastos: GastoObra[]
}

const CATEGORIAS_COLORES = {
  materiales: '#3B82F6',
  mano_obra: '#10B981',
  otros: '#8B5CF6',
}

export function AnalisisGastosChartsClient({ obras, gastos }: AnalisisGastosChartsClientProps) {
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null)

  // Calculate stats per obra
  const obraStats = obras.map((obra) => {
    const obraGastos = gastos.filter((g) => g.obra_id === obra.obra_id)
    const totalGastos = obraGastos.reduce((sum, g) => sum + g.monto, 0)
    const presupuesto = obra.presupuesto_total
    const ejecutado = obra.ejecutado_total
    const varianza = presupuesto - totalGastos
    const pctGastosPresupuesto = presupuesto > 0 ? (totalGastos / presupuesto) * 100 : 0

    // Gastos por categoría
    const gastosPorCategoria = {
      materiales: 0,
      mano_obra: 0,
      otros: 0,
    } as Record<string, number>

    obraGastos.forEach((g) => {
      if (g.categoria === 'materiales') gastosPorCategoria.materiales += g.monto
      else if (g.categoria === 'mano_obra') gastosPorCategoria.mano_obra += g.monto
      else gastosPorCategoria.otros += g.monto
    })

    return {
      obra_id: obra.obra_id,
      nombre: obra.nombre,
      presupuesto,
      ejecutado,
      totalGastos,
      varianza,
      pctGastosPresupuesto,
      gastoCount: obraGastos.length,
      gastosPorCategoria,
      excedido: totalGastos > presupuesto,
    }
  })

  const filteredStats = selectedObraId ? obraStats.filter((s) => s.obra_id === selectedObraId) : obraStats

  // Calculate aggregate stats
  const aggregateStats = {
    totalPresupuesto: obras.reduce((sum, o) => sum + o.presupuesto_total, 0),
    totalEjecutado: obras.reduce((sum, o) => sum + o.ejecutado_total, 0),
    totalGastos: gastos.reduce((sum, g) => sum + g.monto, 0),
    totalObras: obras.length,
    obrasConGastos: obraStats.filter((s) => s.gastoCount > 0).length,
    obrasExcedidas: obraStats.filter((s) => s.excedido).length,
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase">Total Presupuestado</p>
          <p className="text-2xl font-bold text-slate-900">{formatARS(aggregateStats.totalPresupuesto)}</p>
          <p className="text-xs text-muted-foreground">{aggregateStats.totalObras} obras</p>
        </div>

        <div className="rounded-lg border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase">Gastos Registrados</p>
          <p className="text-2xl font-bold text-slate-900">{formatARS(aggregateStats.totalGastos)}</p>
          <p className="text-xs text-muted-foreground">
            {((aggregateStats.totalGastos / aggregateStats.totalPresupuesto) * 100).toFixed(1)}% del presupuesto
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase">Diferencia</p>
          <p className={`text-2xl font-bold ${aggregateStats.totalPresupuesto - aggregateStats.totalGastos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatARS(aggregateStats.totalPresupuesto - aggregateStats.totalGastos)}
          </p>
          <p className="text-xs text-muted-foreground">Presupuesto vs Gastos</p>
        </div>

        <div className="rounded-lg border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase">Obras Excedidas</p>
          <p className="text-2xl font-bold text-red-600">{aggregateStats.obrasExcedidas}</p>
          <p className="text-xs text-muted-foreground">de {aggregateStats.obrasConGastos} obras con gastos</p>
        </div>
      </div>

      {/* Obras Breakdown */}
      <div className="rounded-lg border border-slate-200 p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">Desglose por Obra</h3>

        <div className="space-y-3">
          {filteredStats.map((stat) => {
            const isSelected = selectedObraId === stat.obra_id
            return (
              <div
                key={stat.obra_id}
                onClick={() => setSelectedObraId(isSelected ? null : stat.obra_id)}
                className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                  isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{stat.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.gastoCount} gastos registrados
                    </p>
                  </div>
                  <Badge variant={stat.excedido ? 'destructive' : 'default'}>
                    {stat.pctGastosPresupuesto.toFixed(0)}%
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Presupuesto</span>
                    <span className="font-medium">{formatARS(stat.presupuesto)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        stat.excedido ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(stat.pctGastosPresupuesto, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Gastos</span>
                    <span className={`font-medium ${stat.excedido ? 'text-red-600' : 'text-green-600'}`}>
                      {formatARS(stat.totalGastos)}
                    </span>
                  </div>
                </div>

                {/* Category breakdown */}
                {stat.gastoCount > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-slate-200">
                    <div>
                      <p className="text-muted-foreground">Materiales</p>
                      <p className="font-medium text-slate-900">{formatARS(stat.gastosPorCategoria.materiales)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mano de Obra</p>
                      <p className="font-medium text-slate-900">{formatARS(stat.gastosPorCategoria.mano_obra)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Otros</p>
                      <p className="font-medium text-slate-900">{formatARS(stat.gastosPorCategoria.otros)}</p>
                    </div>
                  </div>
                )}

                {/* Varianza */}
                <div className="mt-3 text-sm">
                  <span className={`font-semibold ${stat.varianza >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.varianza >= 0 ? '↓' : '↑'} {formatARS(Math.abs(stat.varianza))} {stat.varianza >= 0 ? 'disponible' : 'excedido'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Category Summary */}
      <div className="rounded-lg border border-slate-200 p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">Gastos Totales por Categoría</h3>

        <div className="space-y-3">
          {['materiales', 'mano_obra', 'otros'].map((categoria) => {
            const filteredGastos = selectedObraId
              ? gastos.filter((g) => g.obra_id === selectedObraId && g.categoria === categoria)
              : gastos.filter((g) => g.categoria === categoria)

            const total = filteredGastos.reduce((sum, g) => sum + g.monto, 0)
            const pct =
              (total / (selectedObraId ? filteredStats[0]?.totalGastos || 1 : aggregateStats.totalGastos)) * 100 || 0

            const categoryLabel =
              categoria === 'materiales'
                ? 'Materiales'
                : categoria === 'mano_obra'
                  ? 'Mano de Obra'
                  : 'Otros'

            return (
              <div key={categoria} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: CATEGORIAS_COLORES[categoria as keyof typeof CATEGORIAS_COLORES],
                      }}
                    />
                    <p className="font-medium text-slate-700">{categoryLabel}</p>
                  </div>
                  <p className="text-slate-900 font-semibold">{formatARS(total)}</p>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      backgroundColor: CATEGORIAS_COLORES[categoria as keyof typeof CATEGORIAS_COLORES],
                      width: `${pct}%`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
