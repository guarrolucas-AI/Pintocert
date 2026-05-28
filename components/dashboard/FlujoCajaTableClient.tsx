'use client'

import { useState } from 'react'
import { formatARS } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { FlujoCajaReal, ObraConAvance } from '@/lib/types'

interface FlujoCajaTableClientProps {
  flujoCaja: FlujoCajaReal[]
  obras: ObraConAvance[]
}

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function FlujoCajaTableClient({ flujoCaja, obras }: FlujoCajaTableClientProps) {
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null)

  // Get obra names map
  const obraMap = new Map(obras.map((o) => [o.obra_id, o.nombre]))

  // Filter data
  const filteredData = selectedObraId
    ? flujoCaja.filter((f) => f.obra_id === selectedObraId)
    : flujoCaja

  // Sort by year and month
  const sortedData = filteredData.sort((a, b) => {
    if (a.anio !== b.anio) return b.anio - a.anio
    return b.mes - a.mes
  })

  const uniqueObras = Array.from(new Set(flujoCaja.map((f) => f.obra_id)))

  return (
    <div className="space-y-4">
      {/* Obra Filter */}
      {uniqueObras.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedObraId(null)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedObraId === null
                ? 'bg-blue-500 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            Todas las obras
          </button>
          {uniqueObras.map((obraId) => (
            <button
              key={obraId}
              onClick={() => setSelectedObraId(obraId)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedObraId === obraId
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {obraMap.get(obraId)}
            </button>
          ))}
        </div>
      )}

      {/* Table - Desktop */}
      <div className="hidden sm:block rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Obra</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Período</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Ingresos</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Certificados</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Egresos Total</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Materiales</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Mano de Obra</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Otros</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Saldo Mes</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Saldo Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((flujo, idx) => {
              const saldoNegativo = flujo.saldo_mes < 0 || flujo.saldo_acumulado < 0

              return (
                <tr
                  key={flujo.id}
                  className={`border-b last:border-b-0 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  } hover:bg-slate-100 transition-colors`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {obraMap.get(flujo.obra_id)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {monthNames[flujo.mes - 1]} {flujo.anio}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">
                    {formatARS(flujo.ingresos_total)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatARS(flujo.ingresos_certificados)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                    {formatARS(flujo.egresos_total)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatARS(flujo.egresos_materiales)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatARS(flujo.egresos_mano_obra)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatARS(flujo.egresos_otros)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      flujo.saldo_mes >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatARS(flujo.saldo_mes)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      flujo.saldo_acumulado >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatARS(flujo.saldo_acumulado)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cards - Mobile */}
      <div className="space-y-3 sm:hidden">
        {sortedData.map((flujo) => (
          <div key={flujo.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-semibold text-slate-900">{obraMap.get(flujo.obra_id)}</p>
                <p className="text-xs text-muted-foreground">
                  {monthNames[flujo.mes - 1]} {flujo.anio}
                </p>
              </div>
              <Badge
                variant={flujo.saldo_acumulado >= 0 ? 'default' : 'destructive'}
                className="shrink-0"
              >
                {formatARS(flujo.saldo_acumulado)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Ingresos</p>
                <p className="font-semibold text-green-600">{formatARS(flujo.ingresos_total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Egresos</p>
                <p className="font-semibold text-red-600">{formatARS(flujo.egresos_total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Materiales</p>
                <p className="font-medium text-slate-700">{formatARS(flujo.egresos_materiales)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mano de Obra</p>
                <p className="font-medium text-slate-700">{formatARS(flujo.egresos_mano_obra)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Otros</p>
                <p className="font-medium text-slate-700">{formatARS(flujo.egresos_otros)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Saldo Mes</p>
                <p
                  className={`font-medium ${
                    flujo.saldo_mes >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatARS(flujo.saldo_mes)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedData.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {selectedObraId ? 'No hay datos de flujo de caja para esta obra' : 'No hay datos de flujo de caja disponibles'}
          </p>
        </div>
      )}
    </div>
  )
}
