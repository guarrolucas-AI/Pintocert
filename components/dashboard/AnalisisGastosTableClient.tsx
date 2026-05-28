'use client'

import { useState } from 'react'
import { formatARS } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ObraConAvance, GastoObra } from '@/lib/types'

interface AnalisisGastosTableClientProps {
  obras: ObraConAvance[]
  gastos: GastoObra[]
}

export function AnalisisGastosTableClient({ obras, gastos }: AnalisisGastosTableClientProps) {
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null)

  // Calculate data per obra
  const obraAnalisis = obras.map((obra) => {
    const obraGastos = gastos.filter((g) => g.obra_id === obra.obra_id)
    const totalGastos = obraGastos.reduce((sum, g) => sum + g.monto, 0)
    const presupuesto = obra.presupuesto_total
    const varianza = presupuesto - totalGastos
    const pctVarianza = presupuesto > 0 ? (varianza / presupuesto) * 100 : 0
    const pctGastos = presupuesto > 0 ? (totalGastos / presupuesto) * 100 : 0

    // Gastos por categoría
    const materiales = obraGastos
      .filter((g) => g.categoria === 'materiales')
      .reduce((sum, g) => sum + g.monto, 0)
    const manoObra = obraGastos
      .filter((g) => g.categoria === 'mano_obra')
      .reduce((sum, g) => sum + g.monto, 0)
    const otros = obraGastos
      .filter((g) => g.categoria === 'otros')
      .reduce((sum, g) => sum + g.monto, 0)

    return {
      ...obra,
      totalGastos,
      materiales,
      manoObra,
      otros,
      varianza,
      pctVarianza,
      pctGastos,
      gastoCount: obraGastos.length,
      excedido: totalGastos > presupuesto,
    }
  })

  const filteredAnalisis = selectedObraId
    ? obraAnalisis.filter((a) => a.obra_id === selectedObraId)
    : obraAnalisis.filter((a) => a.gastoCount > 0)

  // Sort by presupuesto descending
  filteredAnalisis.sort((a, b) => b.presupuesto_total - a.presupuesto_total)

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedObraId(null)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            selectedObraId === null
              ? 'bg-blue-500 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          Con gastos
        </button>
        {obraAnalisis.map((analisis) => (
          <button
            key={analisis.obra_id}
            onClick={() => setSelectedObraId(analisis.obra_id)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedObraId === analisis.obra_id
                ? 'bg-blue-500 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {analisis.nombre}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Obra</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Presupuesto</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Materiales</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Mano de Obra</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Otros</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Total Gastos</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">% Ejecutado</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Varianza</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredAnalisis.map((analisis, idx) => (
              <tr
                key={analisis.obra_id}
                className={`border-b last:border-b-0 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                } hover:bg-slate-100 transition-colors`}
              >
                <td className="px-4 py-3 font-medium text-slate-900">{analisis.nombre}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {formatARS(analisis.presupuesto_total)}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatARS(analisis.materiales)}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatARS(analisis.manoObra)}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatARS(analisis.otros)}
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${analisis.excedido ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatARS(analisis.totalGastos)}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {analisis.pctGastos.toFixed(1)}%
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    analisis.varianza >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatARS(analisis.varianza)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={analisis.excedido ? 'destructive' : 'default'}>
                    {analisis.excedido ? 'Excedido' : 'Normal'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 sm:hidden">
        {filteredAnalisis.map((analisis) => (
          <div key={analisis.obra_id} className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-slate-900">{analisis.nombre}</p>
                <p className="text-xs text-muted-foreground">{analisis.gastoCount} gastos registrados</p>
              </div>
              <Badge variant={analisis.excedido ? 'destructive' : 'default'}>
                {analisis.pctGastos.toFixed(0)}%
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Presupuesto</p>
                <p className="font-semibold text-slate-900">{formatARS(analisis.presupuesto_total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Gastos</p>
                <p className={`font-semibold ${analisis.excedido ? 'text-red-600' : 'text-slate-900'}`}>
                  {formatARS(analisis.totalGastos)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Materiales</p>
                <p className="font-medium text-slate-700">{formatARS(analisis.materiales)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mano de Obra</p>
                <p className="font-medium text-slate-700">{formatARS(analisis.manoObra)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Otros</p>
                <p className="font-medium text-slate-700">{formatARS(analisis.otros)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Varianza</p>
                <p className={`font-semibold ${analisis.varianza >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatARS(analisis.varianza)}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Ejecución</span>
                <span className="font-medium">{analisis.pctGastos.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    analisis.excedido ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(analisis.pctGastos, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAnalisis.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {selectedObraId ? 'No hay gastos para esta obra' : 'No hay obras con gastos registrados'}
          </p>
        </div>
      )}
    </div>
  )
}
