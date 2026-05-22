import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { formatARS } from '@/lib/utils'
import type { Presupuesto, EstadoPresupuesto } from '@/lib/types'
import { MapPin, Calendar, User } from 'lucide-react'

const ESTADO_CONFIG: Record<
  EstadoPresupuesto,
  { label: string; variant: 'success' | 'warning' | 'muted' | 'destructive' }
> = {
  borrador: { label: 'Borrador', variant: 'muted' },
  pendiente: { label: 'Pendiente', variant: 'warning' },
  aprobado: { label: 'Aprobado', variant: 'success' },
  rechazado: { label: 'Rechazado', variant: 'destructive' },
}

export function PresupuestoCard({ presupuesto: p }: { presupuesto: Presupuesto }) {
  const { label, variant } = ESTADO_CONFIG[p.estado]

  return (
    <Link
      href={`/presupuestos/${p.id}`}
      className="block rounded-lg border bg-white p-5 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-slate-900 truncate group-hover:text-yellow-600 transition-colors">
          {p.cliente || 'Sin nombre'}
        </h3>
        <Badge variant={variant} className="shrink-0">
          {label}
        </Badge>
      </div>

      <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
        {p.obra_direccion && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{p.obra_direccion}</span>
          </div>
        )}
        {(p.obra_localidad || p.obra_provincia) && (
          <div className="flex items-center gap-1.5 ml-5">
            <span className="text-xs">
              {[p.obra_localidad, p.obra_provincia].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs">
            {new Date(p.created_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-xs text-muted-foreground">{p.items.length} ítem{p.items.length !== 1 ? 's' : ''} · IVA {p.iva_porcentaje}%</span>
        <span className="font-bold text-slate-900 text-sm">
          {p.total > 0 ? formatARS(p.total) : '—'}
        </span>
      </div>
    </Link>
  )
}
