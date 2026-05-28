'use client'

import { useState } from 'react'
import { formatARS } from '@/lib/utils'
import type { FlujoCajaReal, ObraConAvance } from '@/lib/types'

interface FlujoCajaChartsClientProps {
  flujoCaja: FlujoCajaReal[]
  obras: ObraConAvance[]
}

export function FlujoCajaChartsClient({ flujoCaja, obras }: FlujoCajaChartsClientProps) {
  const [selectedObraId, setSelectedObraId] = useState<string | null>(null)

  // Filter data by selected obra
  const filteredData = selectedObraId
    ? flujoCaja.filter((f) => f.obra_id === selectedObraId)
    : flujoCaja

  // Group by obra and get latest data
  const obraStats = obras.map((obra) => {
    const obraFlujoCaja = flujoCaja.filter((f) => f.obra_id === obra.obra_id)
    if (obraFlujoCaja.length === 0) return null

    const totalIngresos = obraFlujoCaja.reduce((sum, f) => sum + f.ingresos_total, 0)
    const totalEgresos = obraFlujoCaja.reduce((sum, f) => sum + f.egresos_total, 0)
    const saldoFinal = obraFlujoCaja[0]?.saldo_acumulado || 0

    return {
      obra_id: obra.obra_id,
      nombre: obra.nombre,
      totalIngresos,
      totalEgresos,
      saldoFinal,
      mesesRegistrados: obraFlujoCaja.length,
    }
  }).filter(Boolean)

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  // Get monthly data for charts
  const monthlyData = filteredData
    .sort((a, b) => {
      if (a.anio !== b.anio) return a.anio - b.anio
      return a.mes - b.mes
    })
    .map((f) => ({
      mes: monthNames[f.mes - 1],
      mesNum: f.mes,
      año: f.anio,
      ingresos: f.ingresos_total,
      egresos: f.egresos_total,
      saldo: f.saldo_mes,
      saldoAcumulado: f.saldo_acumulado,
    }))

  return (
    <div className="space-y-6">
      {/* Resumen por Obra */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Resumen por Obra</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {obraStats.map((stat) => {
            const isSelected = selectedObraId === stat.obra_id
            return (
              <button
                key={stat.obra_id}
                onClick={() => setSelectedObraId(isSelected ? null : stat.obra_id)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  isSelected
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <p className="font-medium text-slate-900 truncate">{stat.nombre}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Ingresos</p>
                    <p className="font-semibold text-green-600">{formatARS(stat.totalIngresos)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Egresos</p>
                    <p className="font-semibold text-red-600">{formatARS(stat.totalEgresos)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Saldo</p>
                    <p className={`font-semibold ${stat.saldoFinal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatARS(stat.saldoFinal)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Charts */}
      {monthlyData.length > 0 && (
        <div className="space-y-6">
          {/* Ingresos vs Egresos */}
          <div className="rounded-lg border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Ingresos vs Egresos Mensual</h3>
            <div className="space-y-3">
              {monthlyData.map((data, idx) => {
                const maxValue = Math.max(data.ingresos, data.egresos)
                const ingresosPct = (data.ingresos / maxValue) * 100 || 0
                const egresosPct = (data.egresos / maxValue) * 100 || 0

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium text-slate-700">
                        {data.mes} {data.año}
                      </p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-green-600">Ing: {formatARS(data.ingresos)}</span>
                        <span className="text-red-600">Egr: {formatARS(data.egresos)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-6 rounded overflow-hidden bg-slate-100">
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${ingresosPct}%` }}
                        title={`Ingresos: ${formatARS(data.ingresos)}`}
                      />
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${egresosPct}%` }}
                        title={`Egresos: ${formatARS(data.egresos)}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Saldo Acumulado */}
          <div className="rounded-lg border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Saldo Acumulado</h3>
            <div className="space-y-2">
              {monthlyData.map((data, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <p className="w-16 font-medium text-slate-700">{data.mes} {data.año}</p>
                  <div className="flex-1 h-6 rounded bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        data.saldoAcumulado >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(Math.abs(data.saldoAcumulado) / 10000, 100)}%`,
                      }}
                      title={`Saldo: ${formatARS(data.saldoAcumulado)}`}
                    />
                  </div>
                  <p
                    className={`w-32 text-right font-semibold ${
                      data.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatARS(data.saldoAcumulado)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
