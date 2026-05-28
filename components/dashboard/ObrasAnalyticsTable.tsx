'use client'

import Link from 'next/link'
import { formatARS } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ExternalLink } from 'lucide-react'
import type { ObraConAvance } from '@/lib/types'
import { getEstadoLabel, getEstadoVariant, getSaldoColor } from '@/lib/dashboard-utils'

interface ObrasAnalyticsTableProps {
  obras: ObraConAvance[]
}

export function ObrasAnalyticsTable({ obras }: ObrasAnalyticsTableProps) {
  if (obras.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-muted-foreground">No hay obras para mostrar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">Obras</h2>

      {/* Desktop View - Table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Obra</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Cliente</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Presupuesto</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Ejecutado</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-900">Saldo</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900">% Ejecución</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Estado</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-900">Certs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {obras.map((obra) => {
              const saldo = obra.presupuesto_total - obra.ejecutado_total
              const porcentajeEjecucion =
                obra.presupuesto_total > 0
                  ? Math.round((obra.ejecutado_total / obra.presupuesto_total) * 100)
                  : 0

              return (
                <tr key={obra.obra_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/obras/${obra.obra_id}`}
                      className="font-medium text-slate-900 hover:text-blue-600 flex items-center gap-2"
                    >
                      {obra.nombre}
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{obra.cliente}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatARS(obra.presupuesto_total)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-700">
                    {formatARS(obra.ejecutado_total)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${getSaldoColor(saldo)}`}>
                    {formatARS(saldo)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${Math.min(porcentajeEjecucion, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-10 text-right">
                        {porcentajeEjecucion}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getEstadoVariant(obra.estado)}>
                      {getEstadoLabel(obra.estado)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700">
                    {obra.total_certificados}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile View - Cards */}
      <div className="space-y-3 sm:hidden">
        {obras.map((obra) => {
          const saldo = obra.presupuesto_total - obra.ejecutado_total
          const porcentajeEjecucion =
            obra.presupuesto_total > 0
              ? Math.round((obra.ejecutado_total / obra.presupuesto_total) * 100)
              : 0

          return (
            <div key={obra.obra_id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/obras/${obra.obra_id}`}
                    className="font-semibold text-slate-900 hover:text-blue-600 line-clamp-2"
                  >
                    {obra.nombre}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">{obra.cliente}</p>
                </div>
                <Badge variant={getEstadoVariant(obra.estado)} className="shrink-0">
                  {getEstadoLabel(obra.estado)}
                </Badge>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Presupuesto</span>
                  <span className="font-semibold text-slate-900">
                    {formatARS(obra.presupuesto_total)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Ejecutado</span>
                  <span className="font-semibold text-green-700">
                    {formatARS(obra.ejecutado_total)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Saldo</span>
                  <span className={`font-semibold ${getSaldoColor(saldo)}`}>
                    {formatARS(saldo)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-700">Ejecución</span>
                  <span className="font-semibold text-slate-900">{porcentajeEjecucion}%</span>
                </div>
                <Progress value={porcentajeEjecucion} className="h-2" />
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-muted-foreground">
                <span>Certificados: {obra.total_certificados}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
