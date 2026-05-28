'use client'

import { useState } from 'react'
import { useTransition } from 'react'
import { formatARS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { deleteGasto, updateGasto } from '@/lib/actions/gastos'
import { Trash2, Edit2, Check, X, Upload, FileText, ExternalLink } from 'lucide-react'
import type { GastoObra, CategoriaGastoPersonalizado } from '@/lib/types'

const CATEGORIAS_PREDEFINIDAS = [
  { id: 'materiales', nombre: 'Materiales', color: '#3B82F6' },
  { id: 'mano_obra', nombre: 'Mano de Obra', color: '#10B981' },
  { id: 'otros', nombre: 'Otros', color: '#8B5CF6' },
]

interface GastosTableProps {
  gastos: GastoObra[]
  categoriasPersonalizadas: CategoriaGastoPersonalizado[]
  obraId: string
  onGastoDeleted?: () => void
}

interface EditingGasto {
  id: string
  monto: number
  notas: string
  comprobante_numero: string
}

export function GastosTable({
  gastos,
  categoriasPersonalizadas,
  obraId,
  onGastoDeleted,
}: GastosTableProps) {
  const [isPending, startTransition] = useTransition()
  const [filterCategoria, setFilterCategoria] = useState<string>('')
  const [editingGasto, setEditingGasto] = useState<EditingGasto | null>(null)
  const [editingMonto, setEditingMonto] = useState('')
  const [editingNotas, setEditingNotas] = useState('')
  const [editingComprobanteNumero, setEditingComprobanteNumero] = useState('')
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null)

  const todasLasCategorias = [
    ...CATEGORIAS_PREDEFINIDAS,
    ...categoriasPersonalizadas.map((c) => ({ id: c.nombre, nombre: c.nombre, color: c.color_hex })),
  ]

  const getCategoriaInfo = (categoriaId: string) => {
    return todasLasCategorias.find((c) => c.id === categoriaId)
  }

  const filteredGastos = filterCategoria
    ? gastos.filter((g) => g.categoria === filterCategoria)
    : gastos

  const handleDelete = (gastoId: string) => {
    if (!confirm('¿Eliminar este gasto?')) return

    startTransition(async () => {
      const { error } = await deleteGasto(gastoId)

      if (error) {
        toast.error('Error: ' + error)
        return
      }

      toast.success('Gasto eliminado')
      onGastoDeleted?.()
    })
  }

  const handleEditStart = (gasto: GastoObra) => {
    setEditingGasto({
      id: gasto.id,
      monto: gasto.monto,
      notas: gasto.notas || '',
      comprobante_numero: gasto.comprobante_numero || '',
    })
    setEditingMonto(gasto.monto.toString())
    setEditingNotas(gasto.notas || '')
    setEditingComprobanteNumero(gasto.comprobante_numero || '')
    setArchivoComprobante(null)
  }

  const handleEditSave = () => {
    if (!editingGasto) return

    const montoNum = parseFloat(editingMonto)
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }

    startTransition(async () => {
      const { error } = await updateGasto(
        editingGasto.id,
        {
          monto: montoNum,
          notas: editingNotas || undefined,
          comprobante_numero: editingComprobanteNumero || undefined,
        },
        archivoComprobante || undefined
      )

      if (error) {
        toast.error('Error: ' + error)
        return
      }

      toast.success('Gasto actualizado')
      setEditingGasto(null)
      setArchivoComprobante(null)
      onGastoDeleted?.() // Trigger refresh
    })
  }

  const handleEditCancel = () => {
    setEditingGasto(null)
    setArchivoComprobante(null)
  }

  const categoriaStats = todasLasCategorias.map((cat) => {
    const total = gastos
      .filter((g) => g.categoria === cat.id)
      .reduce((sum, g) => sum + g.monto, 0)
    return { ...cat, total, count: gastos.filter((g) => g.categoria === cat.id).length }
  })

  if (gastos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-muted-foreground">No hay gastos registrados aún</p>
        <p className="text-xs text-muted-foreground mt-1">Usa el botón "Registrar Gasto" para agregar el primer gasto</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Categoría Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {categoriaStats.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategoria(filterCategoria === cat.id ? '' : cat.id)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              filterCategoria === cat.id
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <p className="text-sm font-medium truncate">{cat.nombre}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {cat.count} {cat.count === 1 ? 'gasto' : 'gastos'}
            </p>
            <p className="text-sm font-semibold text-slate-900 mt-1">
              {formatARS(cat.total)}
            </p>
          </button>
        ))}
      </div>

      {/* Gastos Table - Desktop View */}
      <div className="hidden sm:block rounded-lg border border-slate-200">
        {filteredGastos.map((gasto, idx) => {
          const isEditing = editingGasto?.id === gasto.id
          const catInfo = getCategoriaInfo(gasto.categoria)

          return (
            <div
              key={gasto.id}
              className={`border-b last:border-b-0 ${idx === 0 ? '' : 'border-t'} ${
                isEditing ? 'bg-yellow-50' : 'hover:bg-slate-50'
              }`}
            >
              {/* Main row */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                <div className="col-span-2">
                  <p className="text-sm text-slate-600 font-medium">
                    {new Date(gasto.fecha).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="col-span-2">
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: catInfo?.color + '20',
                      borderColor: catInfo?.color,
                      color: catInfo?.color,
                    }}
                  >
                    {catInfo?.nombre || gasto.categoria}
                  </Badge>
                </div>
                <div className="col-span-3">
                  <div className="text-sm text-slate-900 font-medium truncate">
                    {gasto.descripcion}
                  </div>
                  {gasto.proveedor && (
                    <p className="text-xs text-muted-foreground">{gasto.proveedor}</p>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editingMonto}
                      onChange={(e) => setEditingMonto(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-right text-sm"
                      disabled={isPending}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">{formatARS(gasto.monto)}</p>
                  )}
                </div>
                <div className="col-span-2 text-right flex gap-1 justify-end">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditSave}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditCancel}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {gasto.comprobante_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="h-8 w-8 p-0"
                          title="Ver comprobante"
                        >
                          <a href={gasto.comprobante_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-4 h-4 text-blue-500" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditStart(gasto)}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(gasto.id)}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Editing details row */}
              {isEditing && (
                <div className="border-t border-yellow-200 bg-yellow-50 px-4 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Número Comprobante</Label>
                      <input
                        type="text"
                        value={editingComprobanteNumero}
                        onChange={(e) => setEditingComprobanteNumero(e.target.value)}
                        placeholder="Ej: FAC-001234"
                        className="w-full mt-1 px-2 py-1 border border-slate-300 rounded text-sm"
                        disabled={isPending}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-700">Notas</Label>
                      <input
                        type="text"
                        value={editingNotas}
                        onChange={(e) => setEditingNotas(e.target.value)}
                        placeholder="Observaciones adicionales..."
                        className="w-full mt-1 px-2 py-1 border border-slate-300 rounded text-sm"
                        disabled={isPending}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">
                      Comprobante (PDF o imagen)
                      {gasto.comprobante_url && (
                        <span className="text-xs text-green-600 ml-2">✓ Archivo actual</span>
                      )}
                    </Label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 mt-1 text-center hover:border-slate-400 transition-colors">
                      <input
                        id={`comprobante-${gasto.id}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('El archivo debe ser menor a 10 MB')
                              return
                            }
                            setArchivoComprobante(file)
                          }
                        }}
                        disabled={isPending}
                        className="hidden"
                      />
                      {archivoComprobante ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-slate-700 font-medium">
                              {archivoComprobante.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setArchivoComprobante(null)}
                            disabled={isPending}
                            className="p-1 hover:bg-slate-200 rounded"
                          >
                            <X className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor={`comprobante-${gasto.id}`} className="cursor-pointer block">
                          <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                          <p className="text-xs text-slate-600">Haz clic para seleccionar archivo</p>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Gastos Cards - Mobile View */}
      <div className="space-y-3 sm:hidden">
        {filteredGastos.map((gasto) => {
          const isEditing = editingGasto?.id === gasto.id
          const catInfo = getCategoriaInfo(gasto.categoria)

          return (
            <div
              key={gasto.id}
              className={`rounded-lg border p-3 transition-colors ${
                isEditing ? 'border-yellow-300 bg-yellow-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{gasto.descripcion}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(gasto.fecha).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: catInfo?.color + '20',
                    borderColor: catInfo?.color,
                    color: catInfo?.color,
                    fontSize: '11px',
                  }}
                >
                  {catInfo?.nombre}
                </Badge>
              </div>

              {gasto.proveedor && (
                <p className="text-xs text-muted-foreground mb-2">Proveedor: {gasto.proveedor}</p>
              )}

              {!isEditing && gasto.comprobante_numero && (
                <p className="text-xs text-muted-foreground mb-2">Comprobante: {gasto.comprobante_numero}</p>
              )}

              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-slate-900">
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editingMonto}
                      onChange={(e) => setEditingMonto(e.target.value)}
                      className="w-32 px-2 py-1 border rounded text-right text-sm"
                      disabled={isPending}
                    />
                  ) : (
                    formatARS(gasto.monto)
                  )}
                </div>

                {isEditing ? (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditSave}
                      disabled={isPending}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditCancel}
                      disabled={isPending}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    {gasto.comprobante_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        className="h-8 w-8 p-0"
                        title="Ver comprobante"
                      >
                        <a href={gasto.comprobante_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="w-4 h-4 text-blue-500" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditStart(gasto)}
                      disabled={isPending}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(gasto.id)}
                      disabled={isPending}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Editing details for mobile */}
              {isEditing && (
                <div className="border-t border-yellow-200 pt-3 mt-3 space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-slate-700">Número Comprobante</Label>
                    <input
                      type="text"
                      value={editingComprobanteNumero}
                      onChange={(e) => setEditingComprobanteNumero(e.target.value)}
                      placeholder="Ej: FAC-001234"
                      className="w-full mt-1 px-2 py-1 border border-slate-300 rounded text-sm"
                      disabled={isPending}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">Notas</Label>
                    <input
                      type="text"
                      value={editingNotas}
                      onChange={(e) => setEditingNotas(e.target.value)}
                      placeholder="Observaciones adicionales..."
                      className="w-full mt-1 px-2 py-1 border border-slate-300 rounded text-sm"
                      disabled={isPending}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-slate-700">
                      Comprobante
                      {gasto.comprobante_url && (
                        <span className="text-xs text-green-600 ml-2">✓ Archivo actual</span>
                      )}
                    </Label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 mt-1 text-center">
                      <input
                        id={`comprobante-mobile-${gasto.id}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('El archivo debe ser menor a 10 MB')
                              return
                            }
                            setArchivoComprobante(file)
                          }
                        }}
                        disabled={isPending}
                        className="hidden"
                      />
                      {archivoComprobante ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-slate-700 font-medium">
                              {archivoComprobante.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setArchivoComprobante(null)}
                            disabled={isPending}
                            className="p-1 hover:bg-slate-200 rounded"
                          >
                            <X className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                      ) : (
                        <label htmlFor={`comprobante-mobile-${gasto.id}`} className="cursor-pointer block">
                          <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                          <p className="text-xs text-slate-600">Toca para seleccionar archivo</p>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary Footer */}
      <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Total {filterCategoria ? 'filtrado' : ''}</p>
          <p className="text-lg font-bold text-slate-900">
            {formatARS(
              filteredGastos.reduce((sum, g) => sum + g.monto, 0)
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
