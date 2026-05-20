'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatARS, nombreMes } from '@/lib/utils'
import type { CertificadoConItems } from '@/lib/types'
import { Download } from 'lucide-react'

const CertPDFDownload = dynamic(
  () => import('./CertPDFDownload').then((m) => m.CertPDFDownload),
  { ssr: false, loading: () => <Button disabled>Cargando PDF…</Button> }
)

interface CertPreviewProps {
  cert: CertificadoConItems
}

export function CertPreview({ cert }: CertPreviewProps) {
  const obra = cert.obra!
  const totalPeriodo = cert.items.reduce((s, ci) => s + ci.importe_periodo, 0)
  const totalAcumTotal = cert.items.reduce((s, ci) => s + ci.importe_acumulado_total, 0)
  const saldo = obra.presupuesto_total - totalAcumTotal

  return (
    <div className="space-y-4">
      {/* Header de acciones */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Certificado #{cert.numero}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={cert.estado === 'aprobado' ? 'success' : 'warning'}>
              {cert.estado === 'aprobado' ? 'Aprobado' : 'Borrador'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {nombreMes(cert.periodo_mes)} {cert.periodo_anio}
            </span>
          </div>
        </div>
        <CertPDFDownload cert={cert} />
      </div>

      {/* Vista previa del certificado */}
      <div className="rounded-lg border bg-white p-6 space-y-5 print:border-0">
        {/* Encabezado empresa */}
        <div className="text-center border-b pb-4">
          <h2 className="text-lg font-bold text-slate-900">
            {process.env.NEXT_PUBLIC_EMPRESA_NOMBRE ?? 'Empresa de Pintura'}
          </h2>
          <p className="text-sm text-muted-foreground">
            CUIT: {process.env.NEXT_PUBLIC_EMPRESA_CUIT ?? '—'}
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-3">
            CERTIFICADO DE AVANCE DE OBRA N° {cert.numero}
          </h3>
          <p className="text-sm text-muted-foreground">
            Emitido el {new Date().toLocaleDateString('es-AR')}
          </p>
        </div>

        {/* Datos de la obra */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Obra</p>
            <p className="font-medium">{obra.nombre}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dirección</p>
            <p className="font-medium">{obra.direccion}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Comitente</p>
            <p className="font-medium">{obra.cliente}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Período</p>
            <p className="font-medium">
              {nombreMes(cert.periodo_mes)} {cert.periodo_anio}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha de medición</p>
            <p className="font-medium">
              {new Date(cert.fecha_medicion + 'T12:00:00').toLocaleDateString('es-AR')}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monto de contrato</p>
            <p className="font-medium">{formatARS(obra.presupuesto_total)}</p>
          </div>
        </div>

        <Separator />

        {/* Tabla de ítems */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-slate-50 text-[11px] text-muted-foreground">
                <th className="px-3 py-2 text-left">N°</th>
                <th className="px-3 py-2 text-left">Descripción</th>
                <th className="px-3 py-2 text-right">Presupuesto</th>
                <th className="px-3 py-2 text-right">Acum. ant. %</th>
                <th className="px-3 py-2 text-right">Acum. ant. $</th>
                <th className="px-3 py-2 text-right">Pres. cert. %</th>
                <th className="px-3 py-2 text-right">Pres. cert. $</th>
                <th className="px-3 py-2 text-right">Acum. total %</th>
                <th className="px-3 py-2 text-right">Acum. total $</th>
              </tr>
            </thead>
            <tbody>
              {cert.items.map((ci, idx) => (
                <tr key={ci.id} className="border-b last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium">{ci.item?.descripcion}</td>
                  <td className="px-3 py-2 text-right">{formatARS(ci.item?.presupuesto ?? 0)}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {ci.pct_acumulado_anterior.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {formatARS(ci.importe_acumulado_anterior)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">
                    {ci.pct_periodo.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">
                    {formatARS(ci.importe_periodo)}
                  </td>
                  <td className="px-3 py-2 text-right">{ci.pct_acumulado_total.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right">{formatARS(ci.importe_acumulado_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Separator />

        {/* Resumen financiero */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-[#FFD600] text-[#0a0a0a] p-4 text-center">
            <p className="text-xs opacity-70">Presente certificado</p>
            <p className="text-xl font-bold mt-1">{formatARS(totalPeriodo)}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-xs text-muted-foreground">Acumulado a origen</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatARS(totalAcumTotal)}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-xs text-muted-foreground">Saldo de contrato</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatARS(saldo)}</p>
          </div>
        </div>

        {cert.notas && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Notas</p>
            <p className="text-slate-700">{cert.notas}</p>
          </div>
        )}

        {/* Firmas */}
        <div className="grid grid-cols-3 gap-8 pt-8">
          {['Empresa contratista', 'Inspector / Capataz', 'Comitente'].map((firma) => (
            <div key={firma} className="text-center">
              <div className="border-t border-slate-400 pt-2 mt-12">
                <p className="text-xs font-medium text-slate-700">{firma}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
