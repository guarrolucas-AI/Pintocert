'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'
import { formatARS, nombreMes } from '@/lib/utils'
import type { CertificadoConItems } from '@/lib/types'
import { Download, Pencil, Trash2 } from 'lucide-react'

const CertPDFDownload = dynamic(
  () => import('./CertPDFDownload').then((m) => m.CertPDFDownload),
  { ssr: false, loading: () => <Button disabled>Cargando PDF…</Button> }
)

interface CertPreviewProps {
  cert: CertificadoConItems
  canEdit?: boolean
}

export function CertPreview({ cert, canEdit }: CertPreviewProps) {
  const obra = cert.obra!
  const router = useRouter()
  const [delOpen, setDelOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const totalPeriodo = cert.items.reduce((s, ci) => s + ci.importe_periodo, 0)
  const totalAcumTotal = cert.items.reduce((s, ci) => s + ci.importe_acumulado_total, 0)
  const saldo = obra.presupuesto_total - totalAcumTotal

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('certificado_items').delete().eq('certificado_id', cert.id)
    const { error } = await supabase.from('certificados').delete().eq('id', cert.id)
    setDeleting(false)
    setDelOpen(false)
    if (error) {
      toast.error('Error al eliminar: ' + error.message)
    } else {
      toast.success('Certificado eliminado')
      router.push(`/obras/${cert.obra_id}`)
      router.refresh()
    }
  }

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
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/obras/${cert.obra_id}/certificados/${cert.id}/editar`)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/5"
                onClick={() => setDelOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            </>
          )}
          <CertPDFDownload cert={cert} />
        </div>
      </div>

      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar certificado #{cert.numero}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el certificado borrador y todos sus ítems. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando…' : 'Eliminar certificado'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vista previa del certificado */}
      <div className="rounded-lg border bg-white p-6 space-y-5 print:border-0">
        {/* Encabezado empresa */}
        <div className="flex items-center justify-between rounded-lg bg-[#0a0a0a] px-5 py-4 border-b-4 border-[#FFD600] -m-6 mb-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Logo" className="h-9 w-auto object-contain" />
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                {process.env.NEXT_PUBLIC_EMPRESA_NOMBRE ?? 'Empresa de Pintura'}
              </p>
              <p className="text-xs text-neutral-400">
                CUIT: {process.env.NEXT_PUBLIC_EMPRESA_CUIT ?? '—'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-[#FFD600] leading-tight">
              CERTIFICADO DE AVANCE DE OBRA N° {cert.numero}
            </p>
            <p className="text-xs text-neutral-400">
              Emitido el {new Date().toLocaleDateString('es-AR')}
            </p>
          </div>
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
