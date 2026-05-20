'use client'
import { useTransition } from 'react'
import { formatARS } from '@/lib/utils'
import { PagoForm } from './PagoForm'
import { eliminarPago } from '@/lib/actions/pagos'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import type { Pago } from '@/lib/types'

function PagoRow({ pago, obraId }: { pago: Pago; obraId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('¿Eliminar este cobro?')) return
    startTransition(async () => {
      const res = await eliminarPago(pago.id, obraId)
      if (res.error) toast.error(res.error)
    })
  }

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(pago.fecha_pago + 'T12:00:00').toLocaleDateString('es-AR')}
      </td>
      <td className="px-4 py-3 font-semibold text-slate-900">{formatARS(pago.importe)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{pago.referencia ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{pago.notas ?? ''}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  )
}

interface PagosPanelProps {
  obraId: string
  pagos: Pago[]
  totalCertificado: number
  isAdmin: boolean
}

export function PagosPanel({ obraId, pagos, totalCertificado, isAdmin }: PagosPanelProps) {
  const totalCobrado = pagos.reduce((s, p) => s + p.importe, 0)
  const porCobrar = totalCertificado - totalCobrado

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Certificado (aprobado)</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{formatARS(totalCertificado)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-muted-foreground">Cobrado</p>
          <p className="text-lg font-bold text-green-700 mt-1">{formatARS(totalCobrado)}</p>
        </div>
        <div
          className={`rounded-lg border p-4 ${
            porCobrar > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white'
          }`}
        >
          <p className="text-xs text-muted-foreground">Por cobrar</p>
          <p className={`text-lg font-bold mt-1 ${porCobrar > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {formatARS(Math.max(0, porCobrar))}
          </p>
        </div>
      </div>

      {pagos.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Importe</th>
                <th className="px-4 py-2 text-left">Referencia</th>
                <th className="px-4 py-2 text-left">Notas</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <PagoRow key={p.id} pago={p} obraId={obraId} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagos.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin cobros registrados aún.</p>
      )}

      {isAdmin && <PagoForm obraId={obraId} />}
    </div>
  )
}
