'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import AgentChat from '@/components/agente/AgentChat'
import { Button } from '@/components/ui/button'
import { formatARS } from '@/lib/utils'
import type { MensajeChat, Presupuesto, ItemPresupuesto } from '@/lib/types'
import { Save, FileText, Bot, CheckCircle2 } from 'lucide-react'

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
  notas?: string
  validez_dias: number
}

function buildPresupuesto(datos: AgenteDatos): Presupuesto {
  const subtotal = datos.items.reduce((acc, it) => acc + it.subtotal, 0)
  const monto_iva = subtotal * (datos.iva_porcentaje / 100)
  const total = subtotal + monto_iva
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleDataGenerada(tipo: string, datos: unknown) {
    if (tipo === 'presupuesto_completo') {
      setPresupuesto(buildPresupuesto(datos as AgenteDatos))
    }
  }

  async function handleGuardar() {
    if (!presupuesto) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: p, error } = await supabase
        .from('presupuestos')
        .insert([
          {
            estado: 'borrador',
            cliente: presupuesto.cliente,
            cliente_email: presupuesto.cliente_email,
            cliente_telefono: presupuesto.cliente_telefono,
            obra_descripcion: presupuesto.obra_descripcion,
            obra_direccion: presupuesto.obra_direccion,
            obra_localidad: presupuesto.obra_localidad,
            obra_provincia: presupuesto.obra_provincia,
            items: presupuesto.items,
            iva_porcentaje: presupuesto.iva_porcentaje,
            subtotal: presupuesto.subtotal,
            monto_iva: presupuesto.monto_iva,
            total: presupuesto.total,
            validez_dias: presupuesto.validez_dias,
            notas: presupuesto.notas,
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
            <PreviewPresupuesto presupuesto={presupuesto} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Preview del presupuesto ──────────────────────────────────────────────────

function PreviewPresupuesto({ presupuesto: p }: { presupuesto: Presupuesto }) {
  const anticipo = p.total * 0.35

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
          <InfoItem label="Cliente" value={p.cliente} />
          {p.cliente_email && <InfoItem label="Email" value={p.cliente_email} />}
          {p.cliente_telefono && <InfoItem label="Teléfono" value={p.cliente_telefono} />}
          <InfoItem label="Dirección" value={p.obra_direccion} className="col-span-2" />
          <InfoItem label="Localidad" value={`${p.obra_localidad}, ${p.obra_provincia}`} />
        </div>
        {p.obra_descripcion && (
          <div className="mt-3 p-3 rounded-lg bg-slate-50 text-slate-700 text-xs">
            {p.obra_descripcion}
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
              {p.items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0">
                  <td className="p-2.5 text-slate-400">{idx + 1}</td>
                  <td className="p-2.5 font-medium text-slate-800">{item.descripcion}</td>
                  <td className="p-2.5 text-center text-slate-500">{item.unidad}</td>
                  <td className="p-2.5 text-right text-slate-600">{item.cantidad}</td>
                  <td className="p-2.5 text-right text-slate-600">{formatARS(item.precio_unitario)}</td>
                  <td className="p-2.5 text-right font-semibold text-slate-800">{formatARS(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totales */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between py-1.5 text-slate-600">
            <span>Subtotal sin IVA</span>
            <span className="font-semibold">{formatARS(p.subtotal)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-slate-600">
            <span>IVA ({p.iva_porcentaje}%)</span>
            <span className="font-semibold">{formatARS(p.monto_iva)}</span>
          </div>
          <div className="flex justify-between py-2 px-3 rounded-lg bg-slate-800 text-white">
            <span className="font-bold text-sm">TOTAL</span>
            <span className="font-bold text-base">{formatARS(p.total)}</span>
          </div>
        </div>
      </div>

      {/* Anticipo */}
      <div className="rounded-lg bg-yellow-400 px-4 py-3 flex justify-between items-center">
        <span className="font-bold text-black text-xs">ANTICIPO DE OBRA (35% del total)</span>
        <span className="font-bold text-black text-lg">{formatARS(anticipo)}</span>
      </div>

      {/* Notas */}
      {p.notas && (
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-500 mb-1">Notas adicionales</p>
          <p className="text-slate-700 whitespace-pre-wrap">{p.notas}</p>
        </div>
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
