'use client'

import { formatARS } from '@/lib/utils'
import type { Pago, GastoObra, CompromisoPago } from '@/lib/types'

interface Props {
  cobros: Pago[]
  gastos: GastoObra[]
  pagosProveedores: CompromisoPago[]
}

type Movimiento = {
  fecha: string
  tipo: 'cobro' | 'gasto' | 'pago_proveedor'
  descripcion: string
  ingreso: number
  egreso: number
}

export function EstadoCuentaPanel({ cobros, gastos, pagosProveedores }: Props) {
  const totalCobrado = cobros.reduce((s, p) => s + p.importe, 0)
  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
  const totalProveedores = pagosProveedores.reduce((s, p) => s + p.monto, 0)
  const totalEgresado = totalGastos + totalProveedores
  const saldo = totalCobrado - totalEgresado

  const movimientos: Movimiento[] = [
    ...cobros.map(p => ({
      fecha: p.fecha_pago,
      tipo: 'cobro' as const,
      descripcion: p.referencia || p.notas || 'Cobro',
      ingreso: p.importe,
      egreso: 0,
    })),
    ...gastos.map(g => ({
      fecha: g.fecha,
      tipo: 'gasto' as const,
      descripcion: `${g.descripcion}${g.proveedor ? ` — ${g.proveedor}` : ''}`,
      ingreso: 0,
      egreso: g.monto,
    })),
    ...pagosProveedores.map(p => ({
      fecha: p.fecha,
      tipo: 'pago_proveedor' as const,
      descripcion: p.descripcion || 'Pago a proveedor',
      ingreso: 0,
      egreso: p.monto,
    })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Saldo acumulado por movimiento
  let acum = 0
  const rows = movimientos.map(m => {
    acum += m.ingreso - m.egreso
    return { ...m, acumulado: acum }
  })

  const tipoConfig = {
    cobro: { label: 'Cobro', color: 'text-green-700 bg-green-50' },
    gasto: { label: 'Gasto', color: 'text-red-700 bg-red-50' },
    pago_proveedor: { label: 'Proveedor', color: 'text-orange-700 bg-orange-50' },
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 rounded-lg border bg-white p-4">
        <div>
          <p className="text-xs text-muted-foreground">Total cobrado</p>
          <p className="text-lg font-bold text-green-700">{formatARS(totalCobrado)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{cobros.length} cobros</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total gastado</p>
          <p className="text-lg font-bold text-red-700">{formatARS(totalEgresado)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatARS(totalGastos)} gastos · {formatARS(totalProveedores)} proveedores
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Saldo caja</p>
          <p className={`text-lg font-bold ${saldo >= 0 ? 'text-slate-900' : 'text-red-700'}`}>
            {formatARS(saldo)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {saldo >= 0 ? 'A favor' : 'En rojo'}
          </p>
        </div>
      </div>

      {/* Movimientos */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos registrados</p>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Descripción</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-green-700">Ingreso</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-red-700">Egreso</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => {
                const cfg = tipoConfig[m.tipo]
                const [y, mo, d] = m.fecha.split('-')
                const fecha = `${d}/${mo}/${y}`
                return (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fecha}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 max-w-xs truncate">{m.descripcion}</td>
                    <td className="px-3 py-2 text-right text-green-700 font-medium">
                      {m.ingreso > 0 ? formatARS(m.ingreso) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-red-700 font-medium">
                      {m.egreso > 0 ? formatARS(m.egreso) : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${m.acumulado >= 0 ? 'text-slate-900' : 'text-red-700'}`}>
                      {formatARS(m.acumulado)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
