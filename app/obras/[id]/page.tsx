import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ItemsTable } from '@/components/obras/ItemsTable'
import { CertHistorial } from '@/components/certificados/CertHistorial'
import { PagosPanel } from '@/components/pagos/PagosPanel'
import { formatARS, nombreMes } from '@/lib/utils'
import type { Obra, ItemObra, Certificado, ObraConAvance, Pago } from '@/lib/types'
import { Plus, Pencil } from 'lucide-react'

export const revalidate = 0

const ESTADO_CONFIG = {
  activo: { label: 'Activo', variant: 'success' as const },
  pausado: { label: 'Pausado', variant: 'warning' as const },
  terminado: { label: 'Terminado', variant: 'muted' as const },
}

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const [{ data: obra }, { data: items }, { data: certificados }, { data: avance }, { data: perfil }, { data: pagos }] =
    await Promise.all([
      supabase.from('obras').select('*').eq('id', id).single(),
      supabase.from('items_obra').select('*').eq('obra_id', id).order('orden'),
      supabase
        .from('certificados')
        .select('*')
        .eq('obra_id', id)
        .order('numero', { ascending: false }),
      supabase.from('obras_avance').select('*').eq('obra_id', id).single(),
      admin.from('perfiles').select('rol').eq('id', user.id).single(),
      supabase.from('pagos').select('*').eq('obra_id', id).order('fecha_pago', { ascending: false }),
    ])

  if (!obra) notFound()

  const canEdit = perfil?.rol === 'admin' || perfil?.rol === 'capataz'
  const avancePct =
    avance && avance.presupuesto_total > 0
      ? Math.round((avance.ejecutado_total / avance.presupuesto_total) * 100)
      : 0
  const { label, variant } = ESTADO_CONFIG[(obra as Obra).estado]

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: 'Obras', href: '/dashboard' }, { label: (obra as Obra).nombre }]}
      />

      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{(obra as Obra).nombre}</h1>
            <Badge variant={variant}>{label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{(obra as Obra).direccion}</p>
          <p className="text-sm text-muted-foreground">Cliente: <strong>{(obra as Obra).cliente}</strong></p>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <Button asChild variant="outline" size="sm">
              <Link href={`/obras/${id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/obras/${id}/certificados/nuevo`}>
                <Plus className="h-4 w-4" />
                Nuevo certificado
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-lg border bg-white p-4">
        <div>
          <p className="text-xs text-muted-foreground">Presupuesto</p>
          <p className="text-lg font-bold text-slate-900">
            {formatARS((obra as Obra).presupuesto_total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ejecutado</p>
          <p className="text-lg font-bold text-green-700">
            {formatARS(avance?.ejecutado_total ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className="text-lg font-bold text-slate-700">
            {formatARS((obra as Obra).presupuesto_total - (avance?.ejecutado_total ?? 0))}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avance global</p>
          <p className="text-lg font-bold text-slate-900">{avancePct}%</p>
        </div>
      </div>
      <Progress value={avancePct} className="h-2" />

      {/* Ítems de la obra */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Ítems presupuestados</h2>
          <span className="text-sm text-muted-foreground">{items?.length ?? 0} ítems</span>
        </div>
        <ItemsTable
          items={(items as ItemObra[]) ?? []}
          obraId={id}
          canEdit={canEdit}
        />
      </div>

      <Separator />

      {/* Historial de certificados */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Certificados</h2>
          {canEdit && (
            <Button asChild size="sm">
              <Link href={`/obras/${id}/certificados/nuevo`}>
                <Plus className="h-4 w-4" />
                Nuevo
              </Link>
            </Button>
          )}
        </div>
        <CertHistorial certificados={(certificados as Certificado[]) ?? []} obraId={id} />
      </div>

      <Separator />

      {/* Cobros */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Cobros</h2>
        </div>
        <PagosPanel
          obraId={id}
          pagos={(pagos as Pago[]) ?? []}
          totalCertificado={avance?.ejecutado_total ?? 0}
          isAdmin={perfil?.rol === 'admin'}
        />
      </div>

      {(obra as Obra).notas && (
        <>
          <Separator />
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-1">Notas</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{(obra as Obra).notas}</p>
          </div>
        </>
      )}
    </div>
  )
}
