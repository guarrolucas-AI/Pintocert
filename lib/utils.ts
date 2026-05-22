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

// ─── Presupuesto Auto-Calculation (Frontend) ───────────────────────────────────

import type { Presupuesto, ItemPresupuesto } from './types'

/**
 * Calculate subtotal for a single item (quantity × unit price)
 * Frontend always uses this, never trusts agent calculation
 */
export function calculateItemSubtotal(cantidad: number, precio_unitario: number): number {
  const result = cantidad * precio_unitario
  return isFinite(result) ? result : 0
}

/**
 * Calculate all totals for a presupuesto
 * Recalculates subtotal, IVA, and total from items
 */
export function calculatePresupuestoTotals(presupuesto: Presupuesto) {
  const subtotal = presupuesto.items.reduce(
    (sum, item) => sum + calculateItemSubtotal(item.cantidad, item.precio_unitario),
    0
  )
  const iva = subtotal * (presupuesto.iva_porcentaje / 100)
  const total = subtotal + iva
  return { subtotal, iva, total }
}

/**
 * Validate presupuesto before sending to agent
 * Prevents API calls with incomplete/invalid data
 */
export function validatePresupuesto(presupuesto: Presupuesto): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!presupuesto.cliente || presupuesto.cliente.trim() === '') {
    errors.push('Cliente requerido')
  }
  if (!presupuesto.obra_descripcion || presupuesto.obra_descripcion.trim() === '') {
    errors.push('Descripción de obra requerida')
  }
  if (presupuesto.items.length === 0) {
    errors.push('Se requiere al menos un ítem')
  }

  presupuesto.items.forEach((item, i) => {
    if (!item.descripcion || item.descripcion.trim() === '') {
      errors.push(`Ítem ${i+1}: descripción requerida`)
    }
    if (item.cantidad <= 0) {
      errors.push(`Ítem ${i+1}: cantidad debe ser > 0`)
    }
    if (item.precio_unitario < 0) {
      errors.push(`Ítem ${i+1}: precio unitario inválido`)
    }
  })

  return { valid: errors.length === 0, errors }
}
