'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, ChevronDown, ChevronUp, CheckCircle, XCircle, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  crearCompromiso,
  aprobarCompromiso,
  cancelarCompromiso,
  registrarPagoCompromiso,
  eliminarPago,
} from '@/lib/actions/compromisos'
import { formatARS } from '@/lib/utils'
import type { CompromisoResumen, CompromisoPago, CategoriaCompromiso } from '@/lib/types'

const CATEGORIA_LABELS: Record<CategoriaCompromiso, string> = {
  materiales: 'Materiales',
  mano_obra: 'Mano de obra',
  otros: 'Otros',
}

const ESTADO_CONFIG = {
  pendiente_aprobacion: { label: 'Pendiente', variant: 'warning' as const },
  aprobado: { label: 'Aprobado', variant: 'success' as const },
  cancelado: { label: 'Cancelado', variant: 'muted' as const },
}

interface Props {
  obraId: string
  compromisos: CompromisoResumen[]
  pagosPorCompromiso: Record<string, CompromisoPago[]>
  isAdmin: boolean
}

interface NuevoCompromisoForm {
  descripcion: string
  proveedor: string
  categoria: CategoriaCompromiso
  monto_total: string
  notas: string
}

const FORM_EMPTY: NuevoCompromisoForm = {
  descripcion: '',
  proveedor: '',
  categoria: 'materiales',
  monto_total: '',
  notas: '',
}

export function CompromisosPanel({ obraId, compromisos, pagosPorCompromiso, isAdmin }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NuevoCompromisoForm>(FORM_EMPTY)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pagandoId, setPagandoId] = useState<string | null>(null)
  const [pagoForm, setPagoForm] = useState({ monto: '', descripcion: '', fecha: new Date().toISOString().split('T')[0] })

  // Totals
  const aprobados = compromisos.filter(c => c.estado === 'aprobado')
  const totalComprometido = aprobados.reduce((s, c) => s + c.monto_total, 0)
  const totalPagado = aprobados.reduce((s, c) => s + c.monto_pagado, 0)
  const totalPendiente = totalComprometido - totalPagado

  function handleField(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmitCompromiso(e: React.FormEvent) {
    e.preventDefault()
    const monto = parseFloat(form.monto_total.replace(/\./g, '').replace(',', '.'))
    if (!form.descripcion || isNaN(monto) || monto <= 0) {
      toast.error('Completá descripción y monto')
      return
    }
    startTransition(async () => {
      const res = await crearCompromiso({
        obra_id: obraId,
        descripcion: form.descripcion,
        proveedor: form.proveedor || undefined,
        categoria: form.categoria,
        monto_total: monto,
        notas: form.notas || undefined,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success('Compromiso cargado — pendiente de aprobación')
      setForm(FORM_EMPTY)
      setShowForm(false)
    })
  }

  function handleAprobar(id: string) {
    startTransition(async () => {
      const res = await aprobarCompromiso(id, obraId)
      if (res.error) toast.error(res.error)
      else toast.success('Compromiso aprobado')
    })
  }

  function handleCancelar(id: string) {
    startTransition(async () => {
      const res = await cancelarCompromiso(id, obraId)
      if (res.error) toast.error(res.error)
      else toast.success('Compromiso cancelado')
    })
  }

  function handlePago(e: React.FormEvent, compromisoId: string) {
    e.preventDefault()
    const monto = parseFloat(pagoForm.monto.replace(/\./g, '').replace(',', '.'))
    if (isNaN(monto) || monto <= 0) { toast.error('Ingresá un monto válido'); return }
    startTransition(async () => {
      const res = await registrarPagoCompromiso({
        compromiso_id: compromisoId,
        obra_id: obraId,
        monto,
        fecha: pagoForm.fecha,
        descripcion: pagoForm.descripcion || undefined,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success('Pago registrado')
      setPagandoId(null)
      setPagoForm({ monto: '', descripcion: '', fecha: new Date().toISOString().split('T')[0] })
    })
  }

  function handleEliminarPago(pagoId: string) {
    startTransition(async () => {
      const res = await eliminarPago(pagoId, obraId)
      if (res.error) toast.error(res.error)
      else toast.success('Pago eliminado')
    })
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {aprobados.length > 0 && (
        <div className="grid grid-cols-3 gap-3 rounded-lg border bg-slate-50 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Comprometido</p>
            <p className="font-bold text-slate-900">{formatARS(totalComprometido)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pagado</p>
            <p className="font-bold text-green-700">{formatARS(totalPagado)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo pendiente</p>
            <p className="font-bold text-orange-600">{formatARS(totalPendiente)}</p>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {compromisos.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay compromisos cargados en esta obra.
          </p>
        )}
        {compromisos.map(c => {
          const pagos = pagosPorCompromiso[c.id] ?? []
          const pct = c.monto_total > 0 ? Math.round((c.monto_pagado / c.monto_total) * 100) : 0
          const isOpen = expanded === c.id
          const { label, variant } = ESTADO_CONFIG[c.estado]

          return (
            <div key={c.id} className="rounded-lg border bg-white overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50"
                onClick={() => setExpanded(isOpen ? null : c.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-900 truncate">{c.descripcion}</span>
                    <Badge variant={variant} className="text-xs">{label}</Badge>
                    <span className="text-xs text-muted-foreground">{CATEGORIA_LABELS[c.categoria]}</span>
                  </div>
                  {c.proveedor && (
                    <p className="text-xs text-muted-foreground mt-0.5">{c.proveedor}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900">{formatARS(c.monto_total)}</p>
                  {c.estado === 'aprobado' && (
                    <p className="text-xs text-orange-600">
                      Saldo: {formatARS(c.saldo_pendiente)}
                    </p>
                  )}
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t px-3 pb-3 space-y-3">
                  {/* Progress bar */}
                  {c.estado === 'aprobado' && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Pagado {formatARS(c.monto_pagado)} ({pct}%)</span>
                        <span>Total {formatARS(c.monto_total)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Admin actions */}
                  {isAdmin && c.estado === 'pendiente_aprobacion' && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm" variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50"
                        disabled={isPending}
                        onClick={() => handleAprobar(c.id)}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={isPending}
                        onClick={() => handleCancelar(c.id)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {/* Historial de pagos */}
                  {c.estado === 'aprobado' && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-600">Pagos realizados</p>
                      {pagos.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sin pagos registrados.</p>
                      )}
                      {pagos.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                          <span className="text-slate-600">{p.fecha} {p.descripcion ? `— ${p.descripcion}` : ''}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-green-700">{formatARS(p.monto)}</span>
                            {isAdmin && (
                              <button
                                onClick={() => handleEliminarPago(p.id)}
                                className="text-red-400 hover:text-red-600"
                                disabled={isPending}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Registrar pago */}
                      {c.saldo_pendiente > 0 && (
                        pagandoId === c.id ? (
                          <form onSubmit={(e) => handlePago(e, c.id)} className="space-y-2 pt-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Monto</Label>
                                <Input
                                  className="h-8 text-sm"
                                  placeholder={`Máx. ${formatARS(c.saldo_pendiente)}`}
                                  value={pagoForm.monto}
                                  onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Fecha</Label>
                                <Input
                                  type="date" className="h-8 text-sm"
                                  value={pagoForm.fecha}
                                  onChange={e => setPagoForm(f => ({ ...f, fecha: e.target.value }))}
                                />
                              </div>
                            </div>
                            <Input
                              className="h-8 text-sm"
                              placeholder="Descripción (opcional)"
                              value={pagoForm.descripcion}
                              onChange={e => setPagoForm(f => ({ ...f, descripcion: e.target.value }))}
                            />
                            <div className="flex gap-2">
                              <Button type="submit" size="sm" disabled={isPending}>Registrar pago</Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => setPagandoId(null)}>Cancelar</Button>
                            </div>
                          </form>
                        ) : (
                          <Button
                            size="sm" variant="outline" className="mt-1"
                            onClick={() => { setPagandoId(c.id); setPagoForm({ monto: '', descripcion: '', fecha: new Date().toISOString().split('T')[0] }) }}
                          >
                            <Banknote className="h-3.5 w-3.5 mr-1" />
                            Registrar pago
                          </Button>
                        )
                      )}
                    </div>
                  )}

                  {c.notas && (
                    <p className="text-xs text-muted-foreground italic">{c.notas}</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Form nuevo compromiso */}
      {showForm ? (
        <form onSubmit={handleSubmitCompromiso} className="rounded-lg border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Nuevo compromiso</h3>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Descripción *</Label>
              <Input name="descripcion" value={form.descripcion} onChange={handleField} placeholder="Ej: Estructura metálica" className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Proveedor</Label>
                <Input name="proveedor" value={form.proveedor} onChange={handleField} placeholder="Ej: Herrería López" className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Monto total *</Label>
                <Input name="monto_total" value={form.monto_total} onChange={handleField} placeholder="500000" className="h-8 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Categoría</Label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleField}
                className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="materiales">Materiales</option>
                <option value="mano_obra">Mano de obra</option>
                <option value="otros">Otros</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Notas</Label>
              <Input name="notas" value={form.notas} onChange={handleField} placeholder="Incluye montaje, entrega en 15 días…" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>Cargar compromiso</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setForm(FORM_EMPTY) }}>Cancelar</Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo compromiso
        </Button>
      )}
    </div>
  )
}
