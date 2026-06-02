'use client'
import { KPICards } from './KPICards'
import { DetailedMonthlyTable } from './DetailedMonthlyTable'
import { FlujoCajaCharts } from './FlujoCajaCharts'
import type { FlujoCajaCentral } from '@/lib/types'

interface FlujoCajaCentralChartProps {
  flujoCaja: FlujoCajaCentral[]
  anio: number
}

/**
 * Flujo Caja Central Chart - Main Container Component
 *
 * Orchestrates the display of central accounting financial data across three
 * specialized views:
 *
 * 1. **KPI Cards** - Top-level metrics (Total Egresos, Saldo Final, Promedio Mensual)
 * 2. **Detailed Monthly Table** - Month-by-month expense breakdown by category
 * 3. **Flujo Caja Charts** - Visual charts (simple bars + stacked bars)
 *
 * Props:
 * - flujoCaja: Array of monthly cash flow records from database
 * - anio: Year for which data is displayed
 *
 * The component ensures all 12 months are displayed, filling in zeros for
 * months with no data, providing a complete annual view.
 */
export function FlujoCajaCentralChart({ flujoCaja, anio }: FlujoCajaCentralChartProps) {
  // Create array with all 12 months (fill with zeros if no data)
  const dataByMonth = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1
    return (
      flujoCaja.find((f) => f.mes === mes) || {
        id: `placeholder-${mes}`,
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

  return (
    <div className="space-y-8">
      <KPICards dataByMonth={dataByMonth} anio={anio} />
      <DetailedMonthlyTable dataByMonth={dataByMonth} />
      <FlujoCajaCharts dataByMonth={dataByMonth} />
    </div>
  )
}
