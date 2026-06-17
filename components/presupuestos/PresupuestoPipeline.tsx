import Link from 'next/link'
import { formatARS } from '@/lib/utils'
import type { Presupuesto, EstadoPresupuesto } from '@/lib/types'
import { MapPin, AlertCircle, Clock, Plus } from 'lucide-react'

// ─── Column config ────────────────────────────────────────────────────────────

type ColumnId = 'borrador' | 'negociacion' | 'aprobado'

const COLUMNS: {
  id: ColumnId
  label: string
  estados: EstadoPresupuesto[]
  headerBg: string
  headerBorder: string
  headerText: string
  dot: string
}[] = [
  {
    id: 'borrador',
    label: 'Borrador',
    estados: ['borrador'],
    headerBg: 'bg-slate-100',
    headerBorder: 'border-slate-300',
    headerText: 'text-slate-700',
    dot: 'bg-slate-400',
  },
  {
    id: 'negociacion',
    label: 'En Negociación',
    estados: ['enviado_aprobacion', 'pausado'],
    headerBg: 'bg-amber-50',
    headerBorder: 'border-amber-300',
    headerText: 'text-amber-800',
    dot: 'bg-amber-400',
  },
  {
    id: 'aprobado',
    label: 'Aprobado',
    estados: ['aprobado', 'en_ejecucion'],
    headerBg: 'bg-emerald-50',
    headerBorder: 'border-emerald-300',
    headerText: 'text-emerald-800',
    dot: 'bg-emerald-500',
  },
]

// ─── Urgency helpers ──────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  )
}

type UrgencyLevel = 'ok' | 'caution' | 'urgent'

function getUrgency(p: Presupuesto): { level: UrgencyLevel; days: number } {
  if (p.estado === 'enviado_aprobacion') {
    const days = daysSince(p.updated_at)
    return { level: days >= 10 ? 'urgent' : days >= 5 ? 'caution' : 'ok', days }
  }
  if (p.estado === 'borrador') {
    const days = daysSince(p.created_at)
    return { level: days >= 14 ? 'urgent' : days >= 7 ? 'caution' : 'ok', days }
  }
  return { level: 'ok', days: daysSince(p.updated_at) }
}

// ─── Pipeline card ────────────────────────────────────────────────────────────

function PipelineCard({ p }: { p: Presupuesto }) {
  const { level, days } = getUrgency(p)

  const borderClass =
    level === 'urgent'
      ? 'border-red-300 ring-1 ring-red-100'
      : level === 'caution'
        ? 'border-amber-200'
        : 'border-slate-200'

  return (
    <Link
      href={`/presupuestos/${p.id}`}
      className={`block bg-white rounded-lg border p-4 hover:shadow-md transition-all group ${borderClass}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-sm text-slate-900 truncate group-hover:text-yellow-600 transition-colors leading-snug">
          {p.cliente || 'Sin nombre'}
        </span>
        {level !== 'ok' && (
          <span
            className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              level === 'urgent'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Clock className="w-3 h-3" />
            {days}d
          </span>
        )}
      </div>

      {/* Location */}
      {(p.obra_localidad || p.obra_direccion) && (
        <div className="flex items-center gap-1 text-xs text-slate-400 mb-3 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {p.obra_localidad || p.obra_direccion}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          {p.items.length} ítem{p.items.length !== 1 ? 's' : ''}
        </span>
        <span className="font-bold text-sm text-slate-900">
          {p.total > 0 ? formatARS(p.total) : '—'}
        </span>
      </div>

      {/* Urgent warning */}
      {level === 'urgent' && (
        <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {days} días sin respuesta
        </p>
      )}
    </Link>
  )
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export function PresupuestoPipeline({
  presupuestos,
}: {
  presupuestos: Presupuesto[]
}) {
  // Build columns with sorted items
  const columns = COLUMNS.map((col) => {
    const items = presupuestos
      .filter((p) => (col.estados as string[]).includes(p.estado))
      .sort((a, b) => {
        if (col.id === 'negociacion') {
          // Most days waiting → top
          return getUrgency(b).days - getUrgency(a).days
        }
        // Newest first for the rest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

    const budget = items.reduce((s, p) => s + (p.total ?? 0), 0)
    return { ...col, items, budget }
  })

  const urgentItems = presupuestos.filter(
    (p) => getUrgency(p).level === 'urgent'
  )

  const archivados = presupuestos.filter((p) =>
    (['terminado', 'rechazado'] as EstadoPresupuesto[]).includes(p.estado)
  )

  const grandTotal = presupuestos
    .filter((p) => !(['terminado', 'rechazado'] as EstadoPresupuesto[]).includes(p.estado))
    .reduce((s, p) => s + (p.total ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* KPI summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {columns.map((col) => (
          <div
            key={col.id}
            className={`rounded-lg border ${col.headerBorder} ${col.headerBg} px-4 py-3`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <span className={`text-xs font-medium ${col.headerText}`}>
                {col.label}
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900 leading-tight">
              {formatARS(col.budget)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {col.items.length} presupuesto{col.items.length !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Grand total + urgent alert */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-slate-500">
          Pipeline total:{' '}
          <span className="font-bold text-slate-900">{formatARS(grandTotal)}</span>
        </div>

        {urgentItems.length > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>{urgentItems.length}</strong> presupuesto
              {urgentItems.length !== 1 ? 's' : ''} sin respuesta hace más de 10
              días
            </span>
          </div>
        )}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {columns.map((col) => (
          <div key={col.id} className="flex flex-col gap-2">
            {/* Column header */}
            <div
              className={`flex items-center justify-between rounded-lg border ${col.headerBorder} ${col.headerBg} px-3 py-2.5`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className={`text-sm font-semibold ${col.headerText}`}>
                  {col.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 ${col.headerText}`}
                >
                  {col.items.length}
                </span>
                {col.budget > 0 && (
                  <span className={`text-xs font-semibold ${col.headerText} hidden sm:block`}>
                    {formatARS(col.budget)}
                  </span>
                )}
              </div>
            </div>

            {/* Cards */}
            {col.items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                Sin presupuestos
              </div>
            ) : (
              col.items.map((p) => <PipelineCard key={p.id} p={p} />)
            )}
          </div>
        ))}
      </div>

      {/* Archived */}
      {archivados.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer select-none flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors py-1">
            <span className="group-open:rotate-90 transition-transform inline-block text-xs">
              ▶
            </span>
            Archivados — terminados y rechazados ({archivados.length})
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archivados.map((p) => (
              <PipelineCard key={p.id} p={p} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
