'use client'
import { formatARS } from '@/lib/utils'
import type { FlujoCajaCentral } from '@/lib/types'

interface FlujoCajaChartsProps {
  dataByMonth: FlujoCajaCentral[]
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TIPO_GASTO_COLORS: Record<string, string> = {
  egresos_sueldo: '#DC2626', // Red
  egresos_combustible: '#EA580C', // Orange
  egresos_maquina: '#0EA5E9', // Blue
  egresos_material: '#16A34A', // Green
  egresos_retiro_socio: '#A855F7', // Purple
  egresos_otro: '#64748B', // Slate
}

const TIPO_GASTO_LABELS: Record<string, string> = {
  egresos_sueldo: 'Sueldos',
  egresos_combustible: 'Combustible',
  egresos_maquina: 'Máquinas',
  egresos_material: 'Materiales',
  egresos_retiro_socio: 'Retiro de Socios',
  egresos_otro: 'Otros',
}

/**
 * Flujo Caja Charts Component
 *
 * Displays two visualizations of expense data:
 *
 * 1. **Chart A - Simple Bar Chart (Egresos Mensuales)**
 *    - Shows total monthly expenses as horizontal bars
 *    - Max bar scales to 100% based on highest value
 *    - Color: Red gradient (#ef4444)
 *
 * 2. **Chart B - Stacked Bar Chart (Composición de Egresos)**
 *    - Each month's bar divided by expense type
 *    - Colors: 6 distinct colors for 6 expense types
 *    - Tooltips show individual amounts on hover
 *    - Demonstrates expense composition changes month-to-month
 *
 * Legend shows all 6 expense types with colors
 *
 * Pure presentational component, no state or side effects
 */
export function FlujoCajaCharts({ dataByMonth }: FlujoCajaChartsProps) {
  const maxEgreso = Math.max(...dataByMonth.map((d) => d.egresos_total), 1)

  return (
    <div className="space-y-8">
      {/* Chart Legend */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-slate-900 mb-3">Leyenda de Gastos</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(TIPO_GASTO_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: TIPO_GASTO_COLORS[key] }}
              />
              <span className="text-slate-700">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart A: Simple Bar Chart - Monthly Egresos */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Egresos Mensuales</h3>
        <div className="space-y-3">
          {dataByMonth.map((data) => {
            const barWidth = (data.egresos_total / maxEgreso) * 100
            return (
              <div key={data.mes} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-900">{MESES[data.mes - 1]}</span>
                  <span className="text-slate-600">{formatARS(data.egresos_total)}</span>
                </div>
                <div className="h-6 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-700 rounded-lg transition-all"
                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chart B: Stacked Bar Chart - Expense Categories Composition */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Composición de Egresos por Mes</h3>
        <div className="space-y-3">
          {dataByMonth.map((data) => (
            <div key={data.mes} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-900">{MESES[data.mes - 1]}</span>
                <span className="text-slate-600">{formatARS(data.egresos_total)}</span>
              </div>
              <div className="h-6 bg-slate-100 rounded-lg overflow-hidden flex border border-slate-200">
                {/* Sueldo */}
                {data.egresos_sueldo > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(data.egresos_sueldo / data.egresos_total) * 100}%`,
                      backgroundColor: TIPO_GASTO_COLORS.egresos_sueldo,
                    }}
                    title={`Sueldos: ${formatARS(data.egresos_sueldo)}`}
                  />
                )}
                {/* Combustible */}
                {data.egresos_combustible > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(data.egresos_combustible / data.egresos_total) * 100}%`,
                      backgroundColor: TIPO_GASTO_COLORS.egresos_combustible,
                    }}
                    title={`Combustible: ${formatARS(data.egresos_combustible)}`}
                  />
                )}
                {/* Máquinas */}
                {data.egresos_maquina > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(data.egresos_maquina / data.egresos_total) * 100}%`,
                      backgroundColor: TIPO_GASTO_COLORS.egresos_maquina,
                    }}
                    title={`Máquinas: ${formatARS(data.egresos_maquina)}`}
                  />
                )}
                {/* Materiales */}
                {data.egresos_material > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(data.egresos_material / data.egresos_total) * 100}%`,
                      backgroundColor: TIPO_GASTO_COLORS.egresos_material,
                    }}
                    title={`Materiales: ${formatARS(data.egresos_material)}`}
                  />
                )}
                {/* Retiro de Socios */}
                {data.egresos_retiro_socio > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(data.egresos_retiro_socio / data.egresos_total) * 100}%`,
                      backgroundColor: TIPO_GASTO_COLORS.egresos_retiro_socio,
                    }}
                    title={`Retiro de Socios: ${formatARS(data.egresos_retiro_socio)}`}
                  />
                )}
                {/* Otros */}
                {data.egresos_otro > 0 && (
                  <div
                    className="h-full"
                    style={{
                      width: `${(data.egresos_otro / data.egresos_total) * 100}%`,
                      backgroundColor: TIPO_GASTO_COLORS.egresos_otro,
                    }}
                    title={`Otros: ${formatARS(data.egresos_otro)}`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
