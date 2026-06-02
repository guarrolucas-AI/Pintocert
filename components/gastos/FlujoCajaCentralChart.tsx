'use client'
import { formatARS } from '@/lib/utils'
import type { FlujoCajaCentral } from '@/lib/types'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TIPO_GASTO_COLORS: Record<string, string> = {
  egresos_sueldo: '#10B981',
  egresos_combustible: '#F59E0B',
  egresos_maquina: '#6366F1',
  egresos_material: '#3B82F6',
  egresos_retiro_socio: '#EF4444',
  egresos_otro: '#8B5CF6',
}

const TIPO_GASTO_LABELS: Record<string, string> = {
  egresos_sueldo: 'Sueldos',
  egresos_combustible: 'Combustible',
  egresos_maquina: 'Máquinas',
  egresos_material: 'Materiales',
  egresos_retiro_socio: 'Retiro de Socios',
  egresos_otro: 'Otros',
}

interface FlujoCajaCentralChartProps {
  flujoCaja: FlujoCajaCentral[]
  anio: number
}

export function FlujoCajaCentralChart({ flujoCaja, anio }: FlujoCajaCentralChartProps) {
  // Create array with all 12 months (fill with zeros if no data)
  const dataByMonth = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1
    return (
      flujoCaja.find((f) => f.mes === mes) || {
        mes,
        anio,
        ingresos_total: 0,
        egresos_total: 0,
        egresos_sueldo: 0,
        egresos_combustible: 0,
        egresos_maquina: 0,
        egresos_material: 0,
        egresos_retiro_socio: 0,
        egresos_otro: 0,
        saldo_mes: 0,
        saldo_acumulado: 0,
        created_at: '',
        updated_at: '',
      }
    )
  })

  const maxEgreso = Math.max(...dataByMonth.map((d) => d.egresos_total), 1)
  const minSaldo = Math.min(...dataByMonth.map((d) => d.saldo_acumulado), 0)
  const maxSaldo = Math.max(...dataByMonth.map((d) => d.saldo_acumulado), 0)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-600 mb-1">Total Egresos ({anio})</p>
          <p className="text-2xl font-bold text-red-700">
            {formatARS(dataByMonth.reduce((sum, d) => sum + d.egresos_total, 0))}
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 mb-1">Saldo Final</p>
          <p className="text-2xl font-bold text-blue-700">
            {formatARS(dataByMonth[11]?.saldo_acumulado || 0)}
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-600 mb-1">Promedio Mensual</p>
          <p className="text-2xl font-bold text-slate-700">
            {formatARS(dataByMonth.reduce((sum, d) => sum + d.egresos_total, 0) / 12)}
          </p>
        </div>
      </div>

      {/* Chart Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(TIPO_GASTO_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: TIPO_GASTO_COLORS[key] }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Monthly Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-3">Mes</th>
              <th className="text-right py-3 px-3">Sueldos</th>
              <th className="text-right py-3 px-3">Combustible</th>
              <th className="text-right py-3 px-3">Máquinas</th>
              <th className="text-right py-3 px-3">Materiales</th>
              <th className="text-right py-3 px-3">Retiros</th>
              <th className="text-right py-3 px-3">Otros</th>
              <th className="text-right py-3 px-3">Total Mes</th>
              <th className="text-right py-3 px-3 font-semibold">Saldo Acum.</th>
            </tr>
          </thead>
          <tbody>
            {dataByMonth.map((data) => (
              <tr key={data.mes} className="border-b hover:bg-slate-50">
                <td className="py-2 px-3 font-medium">{MESES[data.mes - 1]}</td>
                <td className="text-right py-2 px-3">{formatARS(data.egresos_sueldo)}</td>
                <td className="text-right py-2 px-3">{formatARS(data.egresos_combustible)}</td>
                <td className="text-right py-2 px-3">{formatARS(data.egresos_maquina)}</td>
                <td className="text-right py-2 px-3">{formatARS(data.egresos_material)}</td>
                <td className="text-right py-2 px-3">{formatARS(data.egresos_retiro_socio)}</td>
                <td className="text-right py-2 px-3">{formatARS(data.egresos_otro)}</td>
                <td className="text-right py-2 px-3 font-semibold text-red-600">
                  {formatARS(data.egresos_total)}
                </td>
                <td className="text-right py-2 px-3 font-semibold">
                  <span style={{ color: data.saldo_acumulado >= 0 ? '#10B981' : '#EF4444' }}>
                    {formatARS(data.saldo_acumulado)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visual Bar Chart */}
      <div className="space-y-4">
        <h3 className="font-semibold">Egresos Mensuales</h3>
        <div className="space-y-3">
          {dataByMonth.map((data) => {
            const barWidth = (data.egresos_total / maxEgreso) * 100
            return (
              <div key={data.mes} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{MESES[data.mes - 1]}</span>
                  <span className="text-slate-600">{formatARS(data.egresos_total)}</span>
                </div>
                <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all"
                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stacked Bar for Expense Categories */}
      <div className="space-y-4">
        <h3 className="font-semibold">Composición de Egresos por Mes</h3>
        <div className="space-y-3">
          {dataByMonth.map((data) => (
            <div key={data.mes} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{MESES[data.mes - 1]}</span>
                <span className="text-slate-600">{formatARS(data.egresos_total)}</span>
              </div>
              <div className="h-6 bg-slate-100 rounded-full overflow-hidden flex">
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
