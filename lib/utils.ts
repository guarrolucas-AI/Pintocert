import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function nombreMes(mes: number): string {
  return new Date(2024, mes - 1, 1).toLocaleString('es-AR', { month: 'long' })
}

export function calcCertItem(
  presupuesto: number,
  pctAcumuladoAnterior: number,
  pctPeriodo: number
) {
  const pctAcumuladoTotal = Math.min(100, pctAcumuladoAnterior + pctPeriodo)
  return {
    pct_acumulado_total: pctAcumuladoTotal,
    importe_acumulado_anterior: (presupuesto * pctAcumuladoAnterior) / 100,
    importe_periodo: (presupuesto * pctPeriodo) / 100,
    importe_acumulado_total: (presupuesto * pctAcumuladoTotal) / 100,
  }
}

export function calcAvanceObra(
  items: { presupuesto: number; id: string }[],
  pctsPorItem: Record<string, number>
): number {
  const totalPpto = items.reduce((s, it) => s + it.presupuesto, 0)
  if (totalPpto === 0) return 0
  const totalEjec = items.reduce(
    (s, it) => s + (it.presupuesto * (pctsPorItem[it.id] ?? 0)) / 100,
    0
  )
  return Math.round((totalEjec / totalPpto) * 100)
}
