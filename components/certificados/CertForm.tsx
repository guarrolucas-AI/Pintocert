'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { certificadoSchema, type CertificadoFormData } from '@/lib/validations'
import { calcCertItem, formatARS, nombreMes } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { ItemObra, CertificadoItem } from '@/lib/types'

interface CertFormProps {
  obraId: string
  items: ItemObra[]
  ultimosCertItems: Record<string, CertificadoItem>
  numeroCert: number
  onSubmit: (data: CertificadoFormData, rows: RowData[]) => Promise<void>
}

export interface RowData {
  item_id: string
  pct_acumulado_anterior: number
  pct_periodo: number
  pct_acumulado_total: number
  importe_periodo: number
  importe_acumulado_anterior: number
  importe_acumulado_total: number
}

export function CertForm({
  obraId,
  items,
  ultimosCertItems,
  numeroCert,
  onSubmit,
}: CertFormProps) {
  const now = new Date()
  const [pcts, setPcts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    items.forEach((it) => (init[it.id] = 0))
    return init
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CertificadoFormData>({
    resolver: zodResolver(certificadoSchema),
    defaultValues: {
      fecha_medicion: now.toISOString().slice(0, 10),
      periodo_mes: now.getMonth() + 1,
      periodo_anio: now.getFullYear(),
      notas: null,
    },
  })

  function setPct(itemId: string, value: string) {
    const anterior = ultimosCertItems[itemId]?.pct_acumulado_total ?? 0
    const max = 100 - anterior
    const num = Math.min(max, Math.max(0, Number(value) || 0))
    setPcts((prev) => ({ ...prev, [itemId]: num }))
  }

  const rows: RowData[] = items.map((it) => {
    const anterior = ultimosCertItems[it.id]?.pct_acumulado_total ?? 0
    const pctPeriodo = pcts[it.id] ?? 0
    const calcs = calcCertItem(it.presupuesto, anterior, pctPeriodo)
    return {
      item_id: it.id,
      pct_acumulado_anterior: anterior,
      pct_periodo: pctPeriodo,
      ...calcs,
    }
  })

  const totalPeriodo = rows.reduce((s, r) => s + r.importe_periodo, 0)
  const totalAcumAnterior = rows.reduce((s, r) => s + r.importe_acumulado_anterior, 0)
  const totalAcumTotal = rows.reduce((s, r) => s + r.importe_acumulado_total, 0)
  const totalPpto = items.reduce((s, it) => s + it.presupuesto, 0)

  async function handleFormSubmit(data: CertificadoFormData) {
    await onSubmit(data, rows)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Datos del certificado */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="fecha_medicion">Fecha de medición *</Label>
          <Input id="fecha_medicion" type="date" {...register('fecha_medicion')} />
          {errors.fecha_medicion && (
            <p className="text-xs text-destructive">{errors.fecha_medicion.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodo_mes">Mes *</Label>
          <select
            id="periodo_mes"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('periodo_mes', { valueAsNumber: true })}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {nombreMes(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="periodo_anio">Año *</Label>
          <Input
            id="periodo_anio"
            type="number"
            min={2020}
            max={2099}
            {...register('periodo_anio', { valueAsNumber: true })}
          />
          {errors.periodo_anio && (
            <p className="text-xs text-destructive">{errors.periodo_anio.message}</p>
          )}
        </div>
      </div>

      {/* Resumen del certificado */}
      <div className="rounded-lg border-2 border-primary bg-primary/5 p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Importe presente certificado N° {numeroCert}
        </p>
        <p className="text-3xl font-bold text-primary">{formatARS(totalPeriodo)}</p>
        <p className="text-sm text-muted-foreground">
          Acumulado anterior: {formatARS(totalAcumAnterior)} · Acumulado total: {formatARS(totalAcumTotal)}
        </p>
      </div>

      {/* Tabla de ítems */}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs text-muted-foreground">
              <th className="px-3 py-3 text-left font-medium min-w-[180px]">Ítem</th>
              <th className="px-3 py-3 text-right font-medium min-w-[110px]">Presupuesto</th>
              <th className="px-3 py-3 text-right font-medium min-w-[80px]">Acum. ant. %</th>
              <th className="px-3 py-3 text-right font-medium min-w-[90px]">$ Acum. ant.</th>
              <th className="px-3 py-3 text-center font-medium min-w-[90px]">% Período</th>
              <th className="px-3 py-3 text-right font-medium min-w-[110px]">$ Período</th>
              <th className="px-3 py-3 text-right font-medium min-w-[80px]">Acum. total %</th>
              <th className="px-3 py-3 text-right font-medium min-w-[110px]">$ Acum. total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const row = rows[idx]
              const maxPct = 100 - row.pct_acumulado_anterior
              return (
                <tr key={it.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium text-slate-800">{it.descripcion}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">
                    {formatARS(it.presupuesto)}
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground">
                    {row.pct_acumulado_anterior.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground">
                    {formatARS(row.importe_acumulado_anterior)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1 justify-center">
                      <Input
                        type="number"
                        min={0}
                        max={maxPct}
                        step={0.5}
                        value={pcts[it.id] ?? 0}
                        onChange={(e) => setPct(it.id, e.target.value)}
                        className="h-8 w-20 text-center text-sm"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground mt-0.5">
                      máx. {maxPct.toFixed(1)}%
                    </p>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-primary">
                    {formatARS(row.importe_periodo)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {row.pct_acumulado_total.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {formatARS(row.importe_acumulado_total)}
                  </td>
                </tr>
              )
            })}
            {/* Fila totales */}
            <tr className="border-t-2 bg-slate-50 font-semibold text-slate-900">
              <td className="px-3 py-3">TOTALES</td>
              <td className="px-3 py-3 text-right">{formatARS(totalPpto)}</td>
              <td className="px-3 py-3 text-right">—</td>
              <td className="px-3 py-3 text-right">{formatARS(totalAcumAnterior)}</td>
              <td className="px-3 py-3 text-center">—</td>
              <td className="px-3 py-3 text-right text-primary">{formatARS(totalPeriodo)}</td>
              <td className="px-3 py-3 text-right">—</td>
              <td className="px-3 py-3 text-right">{formatARS(totalAcumTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas del certificado</Label>
        <Textarea
          id="notas"
          placeholder="Observaciones, condiciones de aprobación, etc."
          rows={3}
          {...register('notas')}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar certificado'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
