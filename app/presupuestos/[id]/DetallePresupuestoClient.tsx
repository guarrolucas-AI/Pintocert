'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import AgentChat from '@/components/agente/AgentChat'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatARS, calculateItemSubtotal, calculatePresupuestoTotals } from '@/lib/utils'
import { aprobarPresupuesto, cambiarEstadoPresupuesto, distribuirPreciosDesdeAnalisis } from './actions'
import type {
  Presupuesto,
  PresupuestoMensajes,
  ModuloAgente,
  MensajeChat,
  EstadoPresupuesto,
  MaterialesData,
  PersonalData,
  HerramientasData,
  AnalisisData,
  ItemPresupuesto,
} from '@/lib/types'
import {
  FileText,
  Bot,
  Package,
  Users,
  HardHat,
  BarChart3,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RotateCcw,
  Edit,
  X,
  Save,
  Loader2,
  Sparkles,
} from 'lucide-react'

const PresupuestoPDFDownload = dynamic(
  () => import('@/components/presupuestos/PresupuestoPDFDownload'),
  { ssr: false }
)

const ESTADO_CONFIG: Record<
  EstadoPresupuesto,
  { label: string; variant: 'success' | 'warning' | 'muted' | 'destructive'; icon: React.ElementType }
> = {
  borrador: { label: 'Borrador', variant: 'muted', icon: AlertCircle },
  pendiente: { label: 'Pendiente aprobación', variant: 'warning', icon: Clock },
  aprobado: { label: 'Aprobado', variant: 'success', icon: CheckCircle },
  rechazado: { label: 'Rechazado', variant: 'destructive', icon: XCircle },
}

type TabId = 'resumen' | ModuloAgente

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'resumen', label: 'Resumen', icon: FileText },
  { id: 'materiales', label: 'Materiales', icon: Package },
  { id: 'personal', label: 'Personal', icon: Users },
  { id: 'herramientas', label: 'Herramientas', icon: HardHat },
  { id: 'analisis', label: 'Análisis', icon: BarChart3 },
]

const MODULO_CAMPO: Record<string, keyof Presupuesto> = {
  materiales_completo: 'lista_materiales',
  personal_completo: 'plan_personal',
  herramientas_completo: 'herramientas_seguridad',
  analisis_completo: 'analisis_economico',
}

const MODULO_TAB: Record<string, ModuloAgente> = {
  materiales_completo: 'materiales',
  personal_completo: 'personal',
  herramientas_completo: 'herramientas',
  analisis_completo: 'analisis',
}

interface Props {
  presupuesto: Presupuesto
  mensajesPorModulo: Partial<Record<ModuloAgente, PresupuestoMensajes>>
  userId: string
}

export function DetallePresupuestoClient({ presupuesto: initialP, mensajesPorModulo, userId }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('resumen')
  const [presupuesto, setPresupuesto] = useState(initialP)
  const [editMode, setEditMode] = useState(false)
  const [editedPresupuesto, setEditedPresupuesto] = useState<Presupuesto | null>(null)
  const [isPending, startTransition] = useTransition()

  const { label, variant, icon: EstadoIcon } = ESTADO_CONFIG[presupuesto.estado]

  async function handleRefresh() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('id', presupuesto.id)
      .single()

    if (error) {
      console.error('❌ Error al refrescar:', error)
      toast.error('Error al actualizar: ' + error.message)
      return
    }

    if (data) {
      setPresupuesto(data as Presupuesto)
      toast.success('Presupuesto actualizado')
    }
  }

  async function handleDataGenerada(tipo: string, datos: unknown) {
    console.log('📥 handleDataGenerada llamado:', { tipo, datosRecibidos: datos })

    const campo = MODULO_CAMPO[tipo]
    console.log('🔍 Campo mapeado:', campo)

    if (!campo) {
      console.warn('⚠️ Tipo no reconocido:', tipo)
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('presupuestos')
      .update({ [campo]: datos })
      .eq('id', presupuesto.id)

    if (error) {
      console.error('❌ Error en Supabase:', error)
      toast.error('Error al guardar datos: ' + error.message)
      return
    }

    console.log('✅ Datos guardados en Supabase')
    setPresupuesto((prev) => ({ ...prev, [campo]: datos }))
    toast.success('Datos guardados correctamente')
  }

  async function handleMensajesActualizados(modulo: ModuloAgente, mensajes: MensajeChat[]) {
    const supabase = createClient()
    await supabase.from('presupuesto_mensajes').upsert(
      { presupuesto_id: presupuesto.id, modulo, messages: mensajes },
      { onConflict: 'presupuesto_id,modulo' }
    )
  }

  async function handleDistribuirPrecios(analisisDatos: unknown) {
    const data = analisisDatos as AnalisisData

    // precio_venta puede venir en 0 si el agente no lo completó bien.
    // Fallback 1: costo_total + ganancia_bruta (siempre presentes)
    // Fallback 2: presupuesto.total (lo que el cliente firmó)
    let precioVenta = data?.precio_venta ?? 0
    if (precioVenta <= 0 && data?.costo_total > 0) {
      precioVenta = (data.costo_total ?? 0) + (data.ganancia_bruta ?? 0)
    }
    if (precioVenta <= 0) {
      precioVenta = presupuesto.total
    }
    if (precioVenta <= 0) {
      toast.error('No se pudo determinar el precio de venta del análisis')
      return
    }

    // precio_venta incluye IVA → calculamos subtotal sin IVA
    const totalSinIva = Math.round(precioVenta / (1 + presupuesto.iva_porcentaje / 100))

    toast.loading('Distribuyendo precios con IA...', { id: 'distribuir' })

    const result = await distribuirPreciosDesdeAnalisis(
      presupuesto.id,
      presupuesto.items,
      totalSinIva,
      presupuesto.iva_porcentaje
    )

    toast.dismiss('distribuir')

    if (result.error) {
      toast.error('Error: ' + result.error)
      return
    }

    setPresupuesto((prev) => ({
      ...prev,
      items: result.items!,
      subtotal: result.subtotal!,
      monto_iva: result.monto_iva!,
      total: result.total!,
    }))
    toast.success('¡Precios distribuidos! Revisá la tab Resumen.')
  }

  function handleAprobar() {
    startTransition(async () => {
      const { error, obraId } = await aprobarPresupuesto(presupuesto.id)
      if (error) {
        toast.error('Error: ' + error)
        return
      }
      toast.success('Presupuesto aprobado. Obra creada correctamente.')
      if (obraId) {
        router.push(`/obras/${obraId}`)
      } else {
        router.refresh()
      }
    })
  }

  function handleCambiarEstado(estado: 'pendiente' | 'rechazado' | 'borrador') {
    startTransition(async () => {
      const { error } = await cambiarEstadoPresupuesto(presupuesto.id, estado)
      if (error) {
        toast.error('Error: ' + error)
        return
      }
      setPresupuesto((prev) => ({ ...prev, estado }))
      toast.success('Estado actualizado')
    })
  }

  function handleEditChange(field: keyof Presupuesto, value: any) {
    setEditedPresupuesto((prev) => {
      if (!prev) return { ...presupuesto, [field]: value }
      return { ...prev, [field]: value }
    })
  }

  function handleCancelEdit() {
    setEditMode(false)
    setEditedPresupuesto(null)
  }

  async function handleGuardarEdicion() {
    const dataToSave = editedPresupuesto || presupuesto
    if (!dataToSave) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('presupuestos')
        .update({
          cliente: dataToSave.cliente,
          cliente_email: dataToSave.cliente_email,
          cliente_telefono: dataToSave.cliente_telefono,
          obra_descripcion: dataToSave.obra_descripcion,
          obra_direccion: dataToSave.obra_direccion,
          obra_localidad: dataToSave.obra_localidad,
          obra_provincia: dataToSave.obra_provincia,
          items: dataToSave.items,
          iva_porcentaje: dataToSave.iva_porcentaje,
          subtotal: dataToSave.subtotal,
          monto_iva: dataToSave.monto_iva,
          total: dataToSave.total,
          anticipo: dataToSave.anticipo,
          validez_dias: dataToSave.validez_dias,
          notas: dataToSave.notas,
        })
        .eq('id', presupuesto.id)

      if (error) throw new Error(error.message)

      setPresupuesto(dataToSave)
      setEditMode(false)
      setEditedPresupuesto(null)
      toast.success('Cambios guardados')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">
              {presupuesto.cliente || 'Sin nombre'}
            </h1>
            <Badge variant={variant} className="flex items-center gap-1">
              <EstadoIcon className="w-3 h-3" />
              {label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{presupuesto.obra_direccion}</p>
          <p className="text-sm text-muted-foreground">
            {presupuesto.obra_localidad}, {presupuesto.obra_provincia}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {presupuesto.obra_id && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/obras/${presupuesto.obra_id}`}>
                <ExternalLink className="w-4 h-4" />
                Ver obra
              </Link>
            </Button>
          )}
          <PresupuestoPDFDownload
            presupuesto={presupuesto}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-700 font-medium h-9"
          />
          {presupuesto.estado === 'borrador' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCambiarEstado('pendiente')}
              disabled={isPending}
            >
              Enviar para aprobación
            </Button>
          )}
          {presupuesto.estado === 'pendiente' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCambiarEstado('rechazado')}
                disabled={isPending}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Rechazar
              </Button>
              <Button
                size="sm"
                onClick={handleAprobar}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-500 text-white"
              >
                {isPending ? 'Aprobando...' : 'Aprobar y crear obra'}
              </Button>
            </>
          )}
          {presupuesto.estado === 'rechazado' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCambiarEstado('borrador')}
              disabled={isPending}
            >
              Volver a borrador
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {TABS.map(({ id, label: tabLabel, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === id
                  ? 'border-yellow-400 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tabLabel}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido del tab */}
      {tab === 'resumen' && (
        <>
          {editMode && (
            <div className="mb-4 flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                className="text-xs text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleGuardarEdicion}
                className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar cambios
              </Button>
            </div>
          )}
          <TabResumen
            presupuesto={editedPresupuesto || presupuesto}
            editMode={editMode}
            onEditChange={handleEditChange}
            onEdit={() => setEditMode(true)}
            onRefresh={handleRefresh}
          />
        </>
      )}
      {tab === 'materiales' && (
        <TabAgente
          modo="materiales"
          presupuesto={presupuesto}
          mensajesIniciales={mensajesPorModulo['materiales']?.messages}
          onDataGenerada={handleDataGenerada}
          onMensajesActualizados={(m) => handleMensajesActualizados('materiales', m)}
          datosGenerados={presupuesto.lista_materiales}
          renderDatos={(d) => <MaterialesView data={d as MaterialesData} />}
          onRefresh={() => setPresupuesto(prev => ({ ...prev }))}
        />
      )}
      {tab === 'personal' && (
        <TabAgente
          modo="personal"
          presupuesto={presupuesto}
          mensajesIniciales={mensajesPorModulo['personal']?.messages}
          onDataGenerada={handleDataGenerada}
          onMensajesActualizados={(m) => handleMensajesActualizados('personal', m)}
          datosGenerados={presupuesto.plan_personal}
          renderDatos={(d) => <PersonalView data={d as PersonalData} />}
          onRefresh={() => setPresupuesto(prev => ({ ...prev }))}
        />
      )}
      {tab === 'herramientas' && (
        <TabAgente
          modo="herramientas"
          presupuesto={presupuesto}
          mensajesIniciales={mensajesPorModulo['herramientas']?.messages}
          onDataGenerada={handleDataGenerada}
          onMensajesActualizados={(m) => handleMensajesActualizados('herramientas', m)}
          datosGenerados={presupuesto.herramientas_seguridad}
          renderDatos={(d) => <HerramientasView data={d as HerramientasData} />}
          onRefresh={() => setPresupuesto(prev => ({ ...prev }))}
        />
      )}
      {tab === 'analisis' && (
        <TabAgente
          modo="analisis"
          presupuesto={presupuesto}
          mensajesIniciales={mensajesPorModulo['analisis']?.messages}
          onDataGenerada={handleDataGenerada}
          onMensajesActualizados={(m) => handleMensajesActualizados('analisis', m)}
          datosGenerados={presupuesto.analisis_economico}
          renderDatos={(d) => <AnalisisView data={d as AnalisisData} />}
          onRefresh={() => setPresupuesto(prev => ({ ...prev }))}
          onDistribuirPrecios={handleDistribuirPrecios}
        />
      )}
    </div>
  )
}

// ─── Tab Resumen ──────────────────────────────────────────────────────────────

function TabResumen({
  presupuesto: p,
  editMode = false,
  onEditChange = () => {},
  onEdit = () => {},
  onRefresh = () => {},
}: {
  presupuesto: Presupuesto
  editMode?: boolean
  onEditChange?: (field: keyof Presupuesto, value: any) => void
  onEdit?: () => void
  onRefresh?: () => void
}) {
  // Frontend always calculates totals, never trusts agent values
  const { subtotal, iva, total } = calculatePresupuestoTotals(p)

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Botones de acción (solo en vista normal) */}
      {!editMode && (
        <div className="lg:col-span-5 flex gap-2 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            title="Actualizar vista previa"
            className="text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="text-xs text-slate-600"
          >
            <Edit className="w-3.5 h-3.5" />
            Editar
          </Button>
        </div>
      )}

      {/* Datos del cliente (editable en modo edit) */}
      <div className="lg:col-span-5 rounded-lg border bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Datos del cliente</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-500 font-medium">Nombre / Razón social</label>
            {editMode ? (
              <input
                type="text"
                value={p.cliente}
                onChange={(e) => onEditChange('cliente', e.target.value)}
                className="w-full border border-slate-200 rounded px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            ) : (
              <p className="text-sm font-medium text-slate-900 mt-1">{p.cliente}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Email</label>
            {editMode ? (
              <input
                type="email"
                value={p.cliente_email || ''}
                onChange={(e) => onEditChange('cliente_email', e.target.value)}
                className="w-full border border-slate-200 rounded px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            ) : (
              <p className="text-sm text-slate-600 mt-1">{p.cliente_email || '—'}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium">Teléfono</label>
            {editMode ? (
              <input
                type="tel"
                value={p.cliente_telefono || ''}
                onChange={(e) => onEditChange('cliente_telefono', e.target.value)}
                className="w-full border border-slate-200 rounded px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            ) : (
              <p className="text-sm text-slate-600 mt-1">{p.cliente_telefono || '—'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-lg border bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Resumen financiero</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal sin IVA</span>
              <span className="font-semibold">{formatARS(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>IVA ({p.iva_porcentaje}%)</span>
              <span className="font-semibold">{formatARS(iva)}</span>
            </div>
            <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-900 text-white mt-2">
              <span className="font-bold">TOTAL</span>
              <span className="font-bold text-base">{formatARS(total)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-yellow-400 p-4 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-black/70">ANTICIPO DE OBRA</p>
            {editMode ? (
              <input
                type="number"
                value={p.anticipo || 0}
                onChange={(e) => onEditChange('anticipo', parseFloat(e.target.value) || 0)}
                className="w-40 border border-yellow-600 rounded px-2 py-1 font-black text-black text-xl bg-yellow-50"
              />
            ) : (
              <p className="text-xl font-black text-black">{formatARS(p.anticipo ?? (total * 0.35))}</p>
            )}
          </div>
          <p className="text-xs text-black/60 text-right">
            Al inicio<br />de la obra
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Condiciones</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Validez</span>
              <span className="font-medium">{p.validez_dias} días</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Moneda</span>
              <span className="font-medium">ARS</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Forma de pago</span>
              <span className="font-medium text-right">35% anticipo + cert. semanales</span>
            </div>
          </div>
        </div>

        {p.fecha_aprobacion && (
          <div className="rounded-lg border bg-green-50 border-green-200 p-4">
            <p className="text-xs text-green-700 font-semibold">Aprobado el</p>
            <p className="text-green-900 font-bold">
              {new Date(p.fecha_aprobacion).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        )}
      </div>

      {/* Tabla de ítems */}
      <div className="lg:col-span-3">
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="px-5 py-3 border-b bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-700">
              Detalle de trabajos ({p.items.length} ítems)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-semibold">#</th>
                  <th className="text-left px-4 py-2.5 text-slate-500 font-semibold">Descripción</th>
                  <th className="text-center px-4 py-2.5 text-slate-500 font-semibold">Unidad</th>
                  <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">Cant.</th>
                  <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">P.U.</th>
                  <th className="text-right px-4 py-2.5 text-slate-500 font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {p.items.map((item, idx) => {
                  const handleItemChange = (field: keyof ItemPresupuesto, value: any) => {
                    const newItems = [...p.items]
                    const newItem = { ...item, [field]: value }
                    // Recalculate subtotal if cantidad or precio_unitario changed
                    if (field === 'cantidad' || field === 'precio_unitario') {
                      newItem.subtotal = newItem.cantidad * newItem.precio_unitario
                    }
                    newItems[idx] = newItem
                    onEditChange('items', newItems)
                  }

                  return (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{item.descripcion}</td>
                      <td className="px-4 py-2.5 text-center text-slate-500">{item.unidad}</td>
                      <td className="px-4 py-2.5 text-right">
                        {editMode ? (
                          <input
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => handleItemChange('cantidad', parseFloat(e.target.value) || 0)}
                            className="w-12 border border-slate-300 rounded px-1 py-0.5 text-right text-slate-600"
                          />
                        ) : (
                          <span className="text-slate-600">{item.cantidad}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {editMode ? (
                          <input
                            type="number"
                            value={item.precio_unitario}
                            onChange={(e) => handleItemChange('precio_unitario', parseFloat(e.target.value) || 0)}
                            className="w-20 border border-slate-300 rounded px-1 py-0.5 text-right text-slate-600"
                          />
                        ) : (
                          <span className="text-slate-600">{formatARS(item.precio_unitario)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">{formatARS(calculateItemSubtotal(item.cantidad, item.precio_unitario))}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={5} className="px-4 py-2.5 font-bold text-slate-700 text-right">TOTAL SIN IVA</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatARS(subtotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {(p.notas || editMode) && (
          <div className="mt-4 rounded-lg border bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Notas y condiciones adicionales</h3>
            {editMode ? (
              <textarea
                value={p.notas || ''}
                onChange={(e) => onEditChange('notas', e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1 text-sm text-slate-600"
                rows={3}
                placeholder="Añadí notas..."
              />
            ) : (
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{p.notas}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab con Agente ───────────────────────────────────────────────────────────

interface TabAgenteProps {
  modo: ModuloAgente
  presupuesto: Presupuesto
  mensajesIniciales?: MensajeChat[]
  onDataGenerada: (tipo: string, datos: unknown) => void
  onMensajesActualizados: (mensajes: MensajeChat[]) => void
  datosGenerados: unknown
  renderDatos: (datos: unknown) => React.JSX.Element
  onRefresh?: () => void
  /** Solo para análisis: distribuye el precio_venta entre los ítems del presupuesto */
  onDistribuirPrecios?: (analisisDatos: unknown) => Promise<void>
}

function TabAgente({
  modo,
  presupuesto,
  mensajesIniciales,
  onDataGenerada,
  onMensajesActualizados,
  datosGenerados,
  renderDatos,
  onRefresh = () => {},
  onDistribuirPrecios,
}: TabAgenteProps) {
  // Estado local: se actualiza inmediatamente cuando llega JSON del agente,
  // sin esperar a que Supabase guarde ni a que el padre re-renderice.
  const [datosLocales, setDatosLocales] = useState<unknown>(datosGenerados)
  const [distribuyendo, setDistribuyendo] = useState(false)

  // Si el padre actualiza (ej: refresh desde DB), sincronizar
  useEffect(() => {
    if (datosGenerados) setDatosLocales(datosGenerados)
  }, [datosGenerados])

  // Interceptar: actualizar local inmediatamente y avisar al padre
  function handleDataGeneradaLocal(tipo: string, datos: unknown) {
    setDatosLocales(datos)
    onDataGenerada(tipo, datos)
  }

  async function handleDistribuir() {
    if (!onDistribuirPrecios || !datosLocales) return
    setDistribuyendo(true)
    await onDistribuirPrecios(datosLocales)
    setDistribuyendo(false)
  }

  const hayDatos = !!datosLocales

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 260px)', minHeight: '480px' }}>
      {/* Chat */}
      <div className="w-5/12 flex flex-col min-h-0 rounded-lg border bg-white overflow-hidden shadow-sm">
        <div className="shrink-0 px-4 py-3 border-b bg-[#0a0a0a] flex items-center gap-2">
          <Bot className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-white">Agente IA</span>
          {hayDatos && (
            <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
          )}
        </div>
        <AgentChat
          modo={modo}
          contexto={{ presupuesto, erroresPrevios: undefined }}
          mensajesIniciales={mensajesIniciales}
          onDataGenerada={handleDataGeneradaLocal}
          onMensajesActualizados={onMensajesActualizados}
        />
      </div>

      {/* Resultado */}
      <div className="flex-1 flex flex-col min-h-0 rounded-lg border bg-white overflow-hidden shadow-sm">
        <div className="shrink-0 px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">
            {hayDatos ? 'Datos generados' : 'Esperando resultados...'}
          </span>
          <div className="flex items-center gap-2">
            {onDistribuirPrecios && hayDatos && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDistribuir}
                disabled={distribuyendo}
                title="Distribuir el precio de venta confirmado entre los ítems del presupuesto"
                className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50 gap-1.5"
              >
                {distribuyendo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Distribuyendo...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Aplicar al presupuesto
                  </>
                )}
              </Button>
            )}
            {hayDatos && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
                title="Actualizar vista previa"
                className="text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {hayDatos ? (
            renderDatos(datosLocales)
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-slate-400">
              <div className="text-4xl opacity-30">💬</div>
              <p className="text-sm">Conversá con el agente para generar esta sección.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Vistas de datos generados ────────────────────────────────────────────────

function MaterialesView({ data }: { data: MaterialesData }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">Lista de materiales</h3>
        <span className="text-sm font-bold text-slate-900">
          Total estimado: {data.total_estimado && data.total_estimado > 0 ? formatARS(data.total_estimado) : '-'}
        </span>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="text-left px-3 py-2 text-slate-500 font-semibold">Material</th>
              <th className="text-center px-3 py-2 text-slate-500 font-semibold">Unidad</th>
              <th className="text-right px-3 py-2 text-slate-500 font-semibold">Cant.</th>
              <th className="text-right px-3 py-2 text-slate-500 font-semibold">Precio est.</th>
              <th className="text-right px-3 py-2 text-slate-500 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.materiales.map((m, i) => {
              const precioValido = m.precio_estimado != null && m.precio_estimado > 0
              const totalItem = precioValido && m.precio_estimado != null ? m.precio_estimado * m.cantidad : 0
              return (
                <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {m.descripcion}
                    {m.notas && <p className="text-slate-400 font-normal text-[10px]">{m.notas}</p>}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-500">{m.unidad}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{m.cantidad}</td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {precioValido && m.precio_estimado != null ? formatARS(m.precio_estimado) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-slate-800">
                    {precioValido ? formatARS(totalItem) : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {data.notas && (
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{data.notas}</div>
      )}
    </div>
  )
}

function PersonalView({ data }: { data: PersonalData }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500">Costo total</p>
          <p className="text-lg font-bold text-slate-900">{formatARS(data.total_mano_obra)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500">Duración</p>
          <p className="text-lg font-bold text-slate-900">{data.duracion_total_dias} días</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500">Especialidades</p>
          <p className="text-lg font-bold text-slate-900">{data.colaboradores.length}</p>
        </div>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="text-left px-3 py-2 text-slate-500 font-semibold">Especialidad</th>
              <th className="text-right px-3 py-2 text-slate-500 font-semibold">Cant.</th>
              <th className="text-right px-3 py-2 text-slate-500 font-semibold">Días</th>
              <th className="text-right px-3 py-2 text-slate-500 font-semibold">Costo/día</th>
              <th className="text-right px-3 py-2 text-slate-500 font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.colaboradores.map((c, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-slate-50/50">
                <td className="px-3 py-2 font-medium text-slate-800">{c.especialidad}</td>
                <td className="px-3 py-2 text-right text-slate-600">{c.cantidad}</td>
                <td className="px-3 py-2 text-right text-slate-600">{c.dias}</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatARS(c.costo_dia)}</td>
                <td className="px-3 py-2 text-right font-bold text-slate-800">{formatARS(c.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t">
              <td colSpan={4} className="px-3 py-2 font-bold text-slate-700 text-right">TOTAL</td>
              <td className="px-3 py-2 text-right font-bold text-slate-900">{formatARS(data.total_mano_obra)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {data.notas && (
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{data.notas}</div>
      )}
    </div>
  )
}

function HerramientasView({ data }: { data: HerramientasData }) {
  return (
    <div className="space-y-6">
      {/* Herramientas */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Herramientas y equipamiento</h3>
        <div className="space-y-2">
          {data.herramientas.map((h, i) => (
            <div key={i} className="flex items-start justify-between p-3 rounded-lg border bg-slate-50/50 text-sm">
              <div>
                <p className="font-medium text-slate-800">{h.nombre}</p>
                {h.observaciones && (
                  <p className="text-xs text-slate-500 mt-0.5">{h.observaciones}</p>
                )}
              </div>
              <div className="text-right ml-4 shrink-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  h.tipo === 'alquiler' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                }`}>
                  {h.tipo === 'alquiler' ? 'Alquiler' : 'Propio'}
                </span>
                {h.costo_estimado != null && h.costo_estimado > 0 && (
                  <p className="text-xs font-bold text-slate-700 mt-1">{formatARS(h.costo_estimado)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seguridad */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-3">Medidas de seguridad</h3>
        <div className="space-y-3">
          {data.medidas_seguridad.map((ms, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-slate-800 text-sm">{ms.categoria}</p>
                {ms.normativa && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">
                    {ms.normativa}
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {ms.medidas.map((m, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-yellow-500 mt-0.5">·</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {data.notas && (
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{data.notas}</div>
      )}
    </div>
  )
}

function AnalisisView({ data }: { data: AnalisisData }) {
  // Defensive: si el agente no incluyó subtotal directo, calcularlo
  const subtotalDirecto =
    typeof data?.costos_directos?.subtotal === 'number' && !isNaN(data.costos_directos.subtotal)
      ? data.costos_directos.subtotal
      : (data?.costos_directos?.materiales ?? 0) + (data?.costos_directos?.mano_obra ?? 0)

  // Si precio_venta viene en 0, reconstruirlo de costo_total + ganancia_bruta
  const precioVentaReal =
    (data?.precio_venta ?? 0) > 0
      ? data.precio_venta
      : (data?.costo_total ?? 0) + (data?.ganancia_bruta ?? 0)

  const rentabilidad =
    precioVentaReal > 0
      ? ((data?.ganancia_bruta ?? 0) / precioVentaReal) * 100
      : (data?.rentabilidad_sobre_ventas ?? 0)
  const rentabilidadColor =
    rentabilidad >= 25
      ? 'text-green-700'
      : rentabilidad >= 10
      ? 'text-yellow-700'
      : 'text-red-700'

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Precio de venta" value={formatARS(precioVentaReal)} />
        <KpiCard label="Costo total" value={formatARS(data?.costo_total ?? 0)} />
        <KpiCard label="Ganancia bruta" value={formatARS(data?.ganancia_bruta ?? 0)} />
        <KpiCard
          label="Rentabilidad s/ ventas"
          value={`${rentabilidad.toFixed(1)}%`}
          className={rentabilidadColor}
        />
      </div>

      {/* Costos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Costos directos</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Materiales</span>
              <span className="font-medium">{formatARS(data?.costos_directos?.materiales ?? 0)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Mano de obra</span>
              <span className="font-medium">{formatARS(data?.costos_directos?.mano_obra ?? 0)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-semibold text-slate-800">
              <span>Subtotal directo</span>
              <span>{formatARS(subtotalDirecto)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Costos indirectos y contingencias</h4>
          <div className="space-y-2 text-sm">
            {data.costos_indirectos.map((ci, i) => (
              <div key={i} className="flex justify-between text-slate-600">
                <span>{ci.descripcion}</span>
                <span className="font-medium">{formatARS(ci.monto)}</span>
              </div>
            ))}
            <div className="flex justify-between text-slate-600">
              <span>Contingencias ({data.contingencias_porcentaje}%)</span>
              <span className="font-medium">{formatARS(data.contingencias_monto)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flujo de caja */}
      {data.flujo_caja && data.flujo_caja.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Flujo de caja proyectado</h4>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-3 py-2 text-slate-500 font-semibold">Concepto</th>
                  <th className="text-right px-3 py-2 text-slate-500 font-semibold">Monto</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-semibold">Cuándo</th>
                </tr>
              </thead>
              <tbody>
                {data.flujo_caja.map((fc, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium text-slate-800">{fc.concepto}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-900">{formatARS(fc.monto)}</td>
                    <td className="px-3 py-2 text-slate-500">{fc.cuando}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      {data.recomendaciones && data.recomendaciones.length > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Recomendaciones</h4>
          <ul className="space-y-1.5">
            {data.recomendaciones.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                <span className="text-blue-400 mt-0.5">·</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.notas && (
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{data.notas}</div>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${className || 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
