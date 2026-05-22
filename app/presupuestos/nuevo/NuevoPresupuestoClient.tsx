'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import AgentChat from '@/components/agente/AgentChat'
import { Button } from '@/components/ui/button'
import { formatARS, calculateItemSubtotal, calculatePresupuestoTotals } from '@/lib/utils'
import type { MensajeChat, Presupuesto, ItemPresupuesto } from '@/lib/types'
import { Save, FileText, Bot, CheckCircle2, RotateCcw, Edit, X } from 'lucide-react'

const PresupuestoPDFDownload = dynamic(
  () => import('@/components/presupuestos/PresupuestoPDFDownload'),
  { ssr: false }
)

interface AgenteDatos {
  cliente: string
  cliente_email?: string
  cliente_telefono?: string
  obra_descripcion?: string
  obra_direccion: string
  obra_localidad: string
  obra_provincia: string
  items: ItemPresupuesto[]
  iva_porcentaje: number
  anticipo?: number
  notas?: string
  validez_dias: number
}

function buildPresupuesto(datos: AgenteDatos): Presupuesto {
  const subtotal = datos.items.reduce((acc, it) => acc + it.subtotal, 0)
  const monto_iva = subtotal * (datos.iva_porcentaje / 100)
  const total = subtotal + monto_iva
  const anticipo = datos.anticipo ?? total * 0.35 // Default 35% si no está especificado
  const now = new Date().toISOString()
  return {
    id: 'preview',
    estado: 'borrador',
    cliente: datos.cliente,
    cliente_email: datos.cliente_email ?? null,
    cliente_telefono: datos.cliente_telefono ?? null,
    obra_descripcion: datos.obra_descripcion ?? '',
    obra_direccion: datos.obra_direccion,
    obra_localidad: datos.obra_localidad,
    obra_provincia: datos.obra_provincia,
    items: datos.items,
    iva_porcentaje: datos.iva_porcentaje,
    subtotal,
    monto_iva,
    total,
    anticipo,
    validez_dias: datos.validez_dias,
    notas: datos.notas ?? null,
    lista_materiales: null,
    plan_personal: null,
    herramientas_seguridad: null,
    analisis_economico: null,
    obra_id: null,
    fecha_aprobacion: null,
    plan_ejecucion: null,
    created_by: '',
    created_at: now,
    updated_at: now,
  }
}

interface Props {
  userId: string
}

export function NuevoPresupuestoClient({ userId }: Props) {
  const router = useRouter()
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedPresupuesto, setEditedPresupuesto] = useState<Presupuesto | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleDataGenerada(tipo: string, datos: unknown) {
    if (tipo === 'presupuesto_completo') {
      setPresupuesto(buildPresupuesto(datos as AgenteDatos))
    }
  }

  function handleEditChange(field: keyof Presupuesto, value: any) {
    setEditedPresupuesto((prev) => {
      if (!prev) return presupuesto ? { ...presupuesto, [field]: value } : null
      return { ...prev, [field]: value }
    })
  }

  function handleCancelEdit() {
    setEditMode(false)
    setEditedPresupuesto(null)
  }

  async function handleGuardar() {
    const dataToSave = editedPresupuesto || presupuesto
    if (!dataToSave) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: p, error } = await supabase
        .from('presupuestos')
        .insert([
          {
            estado: 'borrador',
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
            created_by: userId,
          },
        ])
        .select()
        .single()

      if (error) throw new Error(error.message)

      if (mensajes.length > 0) {
        await supabase.from('presupuesto_mensajes').upsert(
          { presupuesto_id: p.id, modulo: 'presupuesto', messages: mensajes },
          { onConflict: 'presupuesto_id,modulo' }
        )
      }

      setSaved(true)
      setEditMode(false)
      setEditedPresupuesto(null)
      toast.success('Presupuesto guardado correctamente')
      router.push(`/presupuestos/${p.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* Panel izquierdo: Chat */}
      <div className="w-5/12 flex flex-col min-h-0 rounded-lg border bg-white overflow-hidden shadow-sm">
        <div className="shrink-0 px-4 py-3 border-b bg-[#0a0a0a] flex items-center gap-2">
          <Bot className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-white">Agente Presupuestador</span>
          {presupuesto && (
            <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />
          )}
        </div>
        <AgentChat
          modo="presupuesto"
          onDataGenerada={handleDataGenerada}
          onMensajesActualizados={setMensajes}
          placeholder="Completá los datos de la obra..."
        />
      </div>

      {/* Panel derecho: Preview */}
      <div className="flex-1 flex flex-col min-h-0 rounded-lg border bg-white overflow-hidden shadow-sm">
        <div className="shrink-0 px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Vista previa del presupuesto</span>
          </div>
          {presupuesto && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPresupuesto(prev => prev ? { ...prev } : null)}
                title="Actualizar vista previa"
                className="text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              {editMode ? (
                <>
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
                    onClick={handleGuardar}
                    disabled={saving || saved}
                    className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditMode(true)}
                    className="text-xs text-slate-600"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  <PresupuestoPDFDownload
                    presupuesto={presupuesto}
                    className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-700 font-medium"
                  />
                  <Button
                    size="sm"
                    onClick={handleGuardar}
                    disabled={saving || saved}
                    className="bg-yellow-400 hover:bg-yellow-300 text-black font-semibold"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar presupuesto'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!presupuesto ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="text-5xl opacity-30">📋</div>
              <div>
                <p className="text-slate-500 font-medium">El presupuesto aparecerá aquí</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Respondé las preguntas del agente para generar el presupuesto.
                </p>
              </div>
            </div>
          ) : (
            <PreviewPresupuesto
              presupuesto={editedPresupuesto || presupuesto}
              editMode={editMode}
              onEditChange={handleEditChange}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Preview del presupuesto ──────────────────────────────────────────────────

function PreviewPresupuesto({
  presupuesto: p,
  editMode = false,
  onEditChange = () => {},
}: {
  presupuesto: Presupuesto
  editMode?: boolean
  onEditChange?: (field: keyof Presupuesto, value: any) => void
}) {
  // Frontend always calculates totals, never trusts agent values
  const { subtotal, iva, total } = calculatePresupuestoTotals(p)

  return (
    <div className="space-y-6 text-sm">
      {/* Header */}
      <div className="rounded-lg bg-[#0a0a0a] p-4 flex justify-between items-start">
        <div>
          <p className="text-yellow-400 font-bold text-base">PRESUPUESTO DE OBRA</p>
          <p className="text-slate-400 text-xs mt-0.5">
            Emitido el {new Date().toLocaleDateString('es-AR')}
          </p>
        </div>
        <span className="text-xs bg-yellow-400 text-black font-bold px-2 py-1 rounded">
          VÁLIDO {p.validez_dias} DÍAS
        </span>
      </div>

      {/* Datos del cliente */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Datos del cliente y la obra
        </p>
        <div className="grid grid-cols-2 gap-3">
          <EditableInfoItem
            label="Cliente"
            value={p.cliente}
            editMode={editMode}
            onChange={(v) => onEditChange('cliente', v)}
          />
          {p.cliente_email && (
            <EditableInfoItem
              label="Email"
              value={p.cliente_email}
              editMode={editMode}
              onChange={(v) => onEditChange('cliente_email', v)}
            />
          )}
          {p.cliente_telefono && (
            <EditableInfoItem
              label="Teléfono"
              value={p.cliente_telefono}
              editMode={editMode}
              onChange={(v) => onEditChange('cliente_telefono', v)}
            />
          )}
          <EditableInfoItem
            label="Dirección"
            value={p.obra_direccion}
            editMode={editMode}
            onChange={(v) => onEditChange('obra_direccion', v)}
            className="col-span-2"
          />
          <div className="col-span-2">
            <p className="text-xs text-slate-400 mb-0.5">Localidad</p>
            {editMode ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={p.obra_localidad}
                  onChange={(e) => onEditChange('obra_localidad', e.target.value)}
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm font-semibold text-slate-800"
                />
                <input
                  type="text"
                  value={p.obra_provincia}
                  onChange={(e) => onEditChange('obra_provincia', e.target.value)}
                  className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm font-semibold text-slate-800"
                />
              </div>
            ) : (
              <p className="font-semibold text-slate-800">{p.obra_localidad}, {p.obra_provincia}</p>
            )}
          </div>
        </div>
        {p.obra_descripcion && (
          <div className="mt-3 p-3 rounded-lg bg-slate-50 text-slate-700 text-xs">
            {editMode ? (
              <textarea
                value={p.obra_descripcion}
                onChange={(e) => onEditChange('obra_descripcion', e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-700"
                rows={2}
              />
            ) : (
              p.obra_descripcion
            )}
          </div>
        )}
      </div>

      {/* Tabla de ítems */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Detalle de trabajos
        </p>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-2.5 text-slate-500 font-semibold w-8">N°</th>
                <th className="text-left p-2.5 text-slate-500 font-semibold">Descripción</th>
                <th className="text-center p-2.5 text-slate-500 font-semibold w-16">Unidad</th>
                <th className="text-right p-2.5 text-slate-500 font-semibold w-16">Cant.</th>
                <th className="text-right p-2.5 text-slate-500 font-semibold w-28">Precio unit.</th>
                <th className="text-right p-2.5 text-slate-500 font-semibold w-28">Subtotal</th>
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
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="p-2.5 text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-medium text-slate-800">{item.descripcion}</td>
                    <td className="p-2.5 text-center text-slate-500">{item.unidad}</td>
                    <td className="p-2.5 text-right">
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
                    <td className="p-2.5 text-right">
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
                    <td className="p-2.5 text-right font-semibold text-slate-800">{formatARS(calculateItemSubtotal(item.cantidad, item.precio_unitario))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between py-1.5 text-slate-600">
            <span>Subtotal sin IVA</span>
            <span className="font-semibold">{formatARS(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-slate-600">
            <span>IVA ({p.iva_porcentaje}%)</span>
            <span className="font-semibold">{formatARS(iva)}</span>
          </div>
          <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-800 text-white">
            <span className="font-bold text-sm">TOTAL</span>
            <span className="font-bold text-base">{formatARS(total)}</span>
          </div>
        </div>
      </div>

      {/* Anticipo */}
      <div className="rounded-lg bg-yellow-400 px-4 py-3 flex justify-between items-center">
        <span className="font-bold text-black text-xs">ANTICIPO DE OBRA</span>
        {editMode ? (
          <input
            type="number"
            value={p.anticipo || 0}
            onChange={(e) => onEditChange('anticipo', parseFloat(e.target.value) || 0)}
            className="w-40 border border-yellow-600 rounded px-2 py-1 font-bold text-black text-lg bg-yellow-50"
          />
        ) : (
          <span className="font-bold text-black text-lg">{formatARS(p.anticipo ?? (total * 0.35))}</span>
        )}
      </div>

      {/* Notas */}
      {(p.notas || editMode) && (
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Notas adicionales</p>
          {editMode ? (
            <textarea
              value={p.notas || ''}
              onChange={(e) => onEditChange('notas', e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-700"
              rows={3}
              placeholder="Añadí notas..."
            />
          ) : (
            <p className="text-slate-700 whitespace-pre-wrap">{p.notas}</p>
          )}
        </div>
      )}
    </div>
  )
}

function EditableInfoItem({
  label,
  value,
  editMode = false,
  onChange = () => {},
  className = '',
}: {
  label: string
  value: string
  editMode?: boolean
  onChange?: (value: string) => void
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      {editMode ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-300 rounded px-2 py-1 text-sm font-semibold text-slate-800"
        />
      ) : (
        <p className="font-semibold text-slate-800">{value}</p>
      )}
    </div>
  )
}

function InfoItem({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  )
}
