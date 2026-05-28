import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatARS } from '@/lib/utils'
import type { ObraConAvance } from '@/lib/types'

const ESTADO_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'muted' }> = {
  borrador: { label: 'Borrador', variant: 'muted' },
  enviado_aprobacion: { label: 'Enviado Aprobación', variant: 'warning' },
  aprobado: { label: 'Aprobado', variant: 'success' },
  en_ejecucion: { label: 'En Ejecución', variant: 'success' },
  pausado: { label: 'Pausado', variant: 'warning' },
  terminado: { label: 'Terminado', variant: 'muted' },
  rechazado: { label: 'Rechazado', variant: 'muted' },
}

interface ObraCardProps {
  obra: ObraConAvance
}

export function ObraCard({ obra }: ObraCardProps) {
  const avancePct =
    obra.presupuesto_total > 0
      ? Math.round((obra.ejecutado_total / obra.presupuesto_total) * 100)
      : 0
  const { label, variant } = ESTADO_CONFIG[obra.estado]

  return (
    <Link href={`/obras/${obra.obra_id}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{obra.nombre}</h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{obra.direccion}</p>
            </div>
            <Badge variant={variant} className="shrink-0">
              {label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="text-sm font-medium text-slate-800">{obra.cliente}</p>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Avance ejecutado</span>
              <span className="font-semibold text-slate-700">{avancePct}%</span>
            </div>
            <Progress value={avancePct} className="h-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <p className="text-xs text-muted-foreground">Presupuesto</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatARS(obra.presupuesto_total)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Certificados</p>
              <p className="text-sm font-semibold text-slate-900">
                {obra.total_certificados}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
