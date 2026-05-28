import type { ObraConAvance, EstadoObra } from '@/lib/types'

export interface DashboardKPIs {
  presupuestadoTotal: number
  ejecutadoTotal: number
  saldoTotal: number
  porcentajeAvancePromedio: number
  totalObras: number
  obrasPorEstado: Record<EstadoObra, number>
  montosPorEstado: Record<EstadoObra, number>
}

export function calculateDashboardKPIs(obras: ObraConAvance[]): DashboardKPIs {
  const presupuestadoTotal = obras.reduce((sum, o) => sum + o.presupuesto_total, 0)
  const ejecutadoTotal = obras.reduce((sum, o) => sum + o.ejecutado_total, 0)
  const saldoTotal = presupuestadoTotal - ejecutadoTotal

  // Calculate average percentage, handling division by zero
  let porcentajeAvancePromedio = 0
  if (obras.length > 0) {
    const totalPorcentajes = obras.reduce((sum, o) => {
      if (o.presupuesto_total > 0) {
        return sum + (o.ejecutado_total / o.presupuesto_total) * 100
      }
      return sum
    }, 0)
    porcentajeAvancePromedio = Math.round(totalPorcentajes / obras.length)
  }

  // Group by estado
  const obrasPorEstado: Record<EstadoObra, number> = {
    borrador: 0,
    enviado_aprobacion: 0,
    aprobado: 0,
    en_ejecucion: 0,
    pausado: 0,
    terminado: 0,
    rechazado: 0,
  }

  const montosPorEstado: Record<EstadoObra, number> = {
    borrador: 0,
    enviado_aprobacion: 0,
    aprobado: 0,
    en_ejecucion: 0,
    pausado: 0,
    terminado: 0,
    rechazado: 0,
  }

  obras.forEach((obra) => {
    obrasPorEstado[obra.estado]++
    montosPorEstado[obra.estado] += obra.presupuesto_total
  })

  return {
    presupuestadoTotal,
    ejecutadoTotal,
    saldoTotal,
    porcentajeAvancePromedio,
    totalObras: obras.length,
    obrasPorEstado,
    montosPorEstado,
  }
}

export function groupObrasPorEstado(obras: ObraConAvance[]): Record<EstadoObra, ObraConAvance[]> {
  const grouped = {
    borrador: [] as ObraConAvance[],
    enviado_aprobacion: [] as ObraConAvance[],
    aprobado: [] as ObraConAvance[],
    en_ejecucion: [] as ObraConAvance[],
    pausado: [] as ObraConAvance[],
    terminado: [] as ObraConAvance[],
    rechazado: [] as ObraConAvance[],
  }

  obras.forEach((obra) => {
    grouped[obra.estado].push(obra)
  })

  return grouped
}

export function getSaldoColor(saldo: number): string {
  return saldo < 0 ? 'text-red-600' : 'text-slate-900'
}

export function getEstadoLabel(estado: EstadoObra): string {
  const labels: Record<EstadoObra, string> = {
    borrador: 'Borrador',
    enviado_aprobacion: 'Pendiente Aprobación',
    aprobado: 'Aprobado',
    en_ejecucion: 'En Ejecución',
    pausado: 'Pausado',
    terminado: 'Terminado',
    rechazado: 'Rechazado',
  }
  return labels[estado]
}

export function getEstadoVariant(
  estado: EstadoObra
): 'success' | 'warning' | 'muted' | 'destructive' {
  const variants: Record<EstadoObra, 'success' | 'warning' | 'muted' | 'destructive'> = {
    borrador: 'muted',
    enviado_aprobacion: 'warning',
    aprobado: 'success',
    en_ejecucion: 'success',
    pausado: 'warning',
    terminado: 'muted',
    rechazado: 'destructive',
  }
  return variants[estado]
}
